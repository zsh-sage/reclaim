import re
import json
import math
import uuid
from typing import TypedDict, List, Dict, Any, Optional
from datetime import datetime, timezone
from pathlib import Path

import pymupdf4llm
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langgraph.graph import StateGraph, START, END
from sqlmodel import Session

from core.models import Policy, PolicySection
from engine.llm import get_chat_llm, get_embeddings
from engine.prompts.policy_prompts import (
    POLICY_CATEGORY_SUMMARY_PROMPT,
    POLICY_CONDITIONS_PROMPT,
)


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

class PolicyWorkflowState(TypedDict):
    file_paths: List[str]          # Absolute paths to saved PDFs
    alias: str                      # HR-provided alias name
    markdown_docs: List[Dict]       # [{file: str, text: str}]
    split_chunks: List[Dict]        # [{file: str, text: str, metadata: dict}]
    title: str
    extracted_categories: List[str]
    overview_summary: str
    mandatory_procedures: Dict      # {CategoryName: {required_documents: [], condition: []}}
    error: Optional[str]
    policy_id: Optional[str]


# ---------------------------------------------------------------------------
# Node 1: process_pdfs
# ---------------------------------------------------------------------------

def process_pdfs(state: PolicyWorkflowState) -> dict:
    markdown_docs = []
    for path in state["file_paths"]:
        try:
            md_text = pymupdf4llm.to_markdown(path)
            # Replace image placeholders with marker text
            md_text = re.sub(r'!\[.*?\]\(.*?\)', '[IMAGE - OCR not available]', md_text)
            markdown_docs.append({"file": path, "text": md_text})
        except Exception as e:
            print(f"Error processing {path}: {e}")
    return {"markdown_docs": markdown_docs}


# ---------------------------------------------------------------------------
# Node 2: split_markdown
# ---------------------------------------------------------------------------

def split_markdown(state: PolicyWorkflowState) -> dict:
    split_chunks = []
    for doc in state["markdown_docs"]:
        text = doc["text"]
        if len(text) > 1500:
            num_chunks = math.ceil(len(text) / 1000)
            target_chunk_size = len(text) // num_chunks
            chunk_size = target_chunk_size + 100
            chunk_overlap = min(150, chunk_size - 1)
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                separators=["\n\n", "\n", "(?<=\\. )", " ", ""],
            )
            chunks = splitter.create_documents([text])
            for i, chunk in enumerate(chunks):
                split_chunks.append({
                    "file": doc["file"],
                    "text": chunk.page_content,
                    "metadata": {"source_file": doc["file"], "chunk_index": i},
                })
        else:
            split_chunks.append({
                "file": doc["file"],
                "text": text,
                "metadata": {"source_file": doc["file"], "chunk_index": 0},
            })
    print(f"Split into {len(split_chunks)} total chunks.")
    return {"split_chunks": split_chunks}


# ---------------------------------------------------------------------------
# Node 3: extract_categories_and_summary
# ---------------------------------------------------------------------------

def extract_categories_and_summary(state: PolicyWorkflowState) -> dict:
    if not state["markdown_docs"]:
        return {
            "error": "No PDFs could be parsed.",
            "title": "",
            "extracted_categories": [],
            "overview_summary": "",
        }

    combined_text = "\n\n--- CONTINUATION / APPENDIX ---\n\n".join(
        [doc["text"] for doc in state["markdown_docs"]]
    )[:80000]

    prompt = PromptTemplate.from_template(POLICY_CATEGORY_SUMMARY_PROMPT)
    chain = prompt | get_chat_llm() | JsonOutputParser()

    try:
        res = chain.invoke({"text": combined_text})
        return {
            "title": res.get("title", ""),
            "extracted_categories": res.get("reimbursement_available_category", []),
            "overview_summary": res.get("overview_summary", ""),
        }
    except Exception as e:
        print(f"Error in extract_categories_and_summary: {e}")
        return {"title": "", "extracted_categories": [], "overview_summary": ""}


# ---------------------------------------------------------------------------
# Node 4: extract_conditions
# ---------------------------------------------------------------------------

def extract_conditions(state: PolicyWorkflowState) -> dict:
    categories = state.get("extracted_categories", [])
    if not categories:
        return {"mandatory_procedures": {}}

    combined_chunks = "\n".join([c["text"] for c in state["split_chunks"]])[:80000]

    prompt = PromptTemplate.from_template(POLICY_CONDITIONS_PROMPT)
    chain = prompt | get_chat_llm() | JsonOutputParser()

    try:
        res = chain.invoke({
            "categories": json.dumps(categories),
            "text": combined_chunks,
        })
        return {"mandatory_procedures": res.get("procedures", {})}
    except Exception as e:
        print(f"Error in extract_conditions: {e}")
        return {"mandatory_procedures": {}}


# ---------------------------------------------------------------------------
# Node 5: save_to_db
# ---------------------------------------------------------------------------

def save_to_db(state: PolicyWorkflowState, session: Session) -> dict:
    # Generate embeddings for all chunks
    chunk_texts = [c["text"] for c in state["split_chunks"]]
    embeddings_list = get_embeddings().embed_documents(chunk_texts) if chunk_texts else []

    # Build source URLs
    source_url = " | ".join(
        [f"/storage/policies/{Path(p).name}" for p in state["file_paths"]]
    )

    # Create Policy row
    policy = Policy(
        alias=state.get("alias") or state.get("title", "Unknown"),
        title=state.get("title", "Unknown"),
        reimbursable_category=state.get("extracted_categories", []),
        effective_date=datetime.now(timezone.utc),
        overview_summary=state.get("overview_summary", ""),
        mandatory_conditions=json.dumps(state.get("mandatory_procedures", {})),
        source_file_url=source_url,
        status="ACTIVE",
    )
    session.add(policy)
    session.flush()  # Get policy.policy_id without committing

    # Create PolicySection rows (with embeddings)
    for chunk, embedding in zip(state["split_chunks"], embeddings_list):
        section = PolicySection(
            policy_id=policy.policy_id,
            content=chunk["text"],
            embedding=embedding,
            metadata_data=chunk.get("metadata", {}),
        )
        session.add(section)

    session.commit()
    print(f"Saved policy {policy.policy_id} with {len(state['split_chunks'])} sections.")
    return {"policy_id": str(policy.policy_id)}


# ---------------------------------------------------------------------------
# Graph compilation + entry point
# ---------------------------------------------------------------------------

def run_policy_workflow(file_paths: List[str], alias: str, session) -> str:
    """Run the policy upload pipeline. Returns the policy_id string."""
    # Wrap session-dependent node in closure to keep Session out of LangGraph state
    def _save_to_db(state): return save_to_db(state, session)

    graph = StateGraph(PolicyWorkflowState)

    graph.add_node("process_pdfs", process_pdfs)
    graph.add_node("split_markdown", split_markdown)
    graph.add_node("extract_categories_and_summary", extract_categories_and_summary)
    graph.add_node("extract_conditions", extract_conditions)
    graph.add_node("save_to_db", _save_to_db)

    graph.add_edge(START, "process_pdfs")
    graph.add_edge("process_pdfs", "split_markdown")
    graph.add_edge("split_markdown", "extract_categories_and_summary")
    graph.add_edge("extract_categories_and_summary", "extract_conditions")
    graph.add_edge("extract_conditions", "save_to_db")
    graph.add_edge("save_to_db", END)

    app = graph.compile()
    result = app.invoke({
        "file_paths": file_paths,
        "alias": alias,
        "markdown_docs": [],
        "split_chunks": [],
        "title": "",
        "extracted_categories": [],
        "overview_summary": "",
        "mandatory_procedures": {},
        "error": None,
        "policy_id": None,
    })
    return result.get("policy_id", "")
