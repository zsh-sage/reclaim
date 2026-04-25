import re
import json
import math
from typing import TypedDict, List, Dict, Optional
from datetime import datetime, timezone
from pathlib import Path

import pymupdf4llm
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_text_splitters import MarkdownTextSplitter
from langgraph.graph import StateGraph, START, END
from sqlmodel import Session

from core.models import Policy, PolicySection, PolicyReimbursableCategory
from core.enums import PolicyStatus
from engine.llm import get_chat_llm, get_embeddings
from engine.prompts.policy_prompts import (
    POLICY_CATEGORY_SUMMARY_PROMPT,
    POLICY_CONDITIONS_PROMPT,
)


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

class PolicyWorkflowState(TypedDict):
    file_paths: List[str]
    alias: str
    user_id: Optional[str]
    markdown_docs: List[Dict]   # [{file: str, text: str}]
    title: str
    extracted_categories: List[str]
    overview_summary: str
    mandatory_procedures: Dict
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
            md_text = re.sub(r'!\[.*?\]\(.*?\)', '[IMAGE - OCR not available]', md_text)
            markdown_docs.append({"file": path, "text": md_text})
        except Exception as e:
            print(f"Error processing {path}: {e}")
    return {"markdown_docs": markdown_docs}


# ---------------------------------------------------------------------------
# Node 2: extract_categories_and_summary
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
        doc["text"] for doc in state["markdown_docs"]
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
# Node 3: extract_conditions
# ---------------------------------------------------------------------------

def extract_conditions(state: PolicyWorkflowState) -> dict:
    categories = state.get("extracted_categories", [])
    if not categories:
        return {"mandatory_procedures": {}}

    combined_text = "\n\n".join(doc["text"] for doc in state["markdown_docs"])[:80000]

    prompt = PromptTemplate.from_template(POLICY_CONDITIONS_PROMPT)
    chain = prompt | get_chat_llm() | JsonOutputParser()

    try:
        res = chain.invoke({
            "categories": json.dumps(categories),
            "text": combined_text,
        })
        return {"mandatory_procedures": res.get("procedures", {})}
    except Exception as e:
        print(f"Error in extract_conditions: {e}")
        return {"mandatory_procedures": {}}


# ---------------------------------------------------------------------------
# Node 4: save_to_db
# ---------------------------------------------------------------------------

def save_to_db(state: PolicyWorkflowState, session: Session) -> dict:
    source_url = " | ".join(
        f"/storage/policies/{Path(p).name}" for p in state["file_paths"]
    )

    policy = Policy(
        alias=state.get("alias") or state.get("title", "Unknown"),
        title=state.get("title", "Unknown"),
        effective_date=datetime.now(timezone.utc),
        overview_summary=state.get("overview_summary", ""),
        mandatory_conditions=json.dumps(state.get("mandatory_procedures", {})),
        source_file_url=source_url,
        status=PolicyStatus.ACTIVE,
        created_by=state.get("user_id"),
    )
    session.add(policy)
    session.commit()
    print(f"Saved policy {policy.policy_id}.")

    # Bulk insert PolicyReimbursableCategory rows
    for category in state.get("extracted_categories", []):
        prc = PolicyReimbursableCategory(
            policy_id=policy.policy_id,
            category=category,
        )
        session.add(prc)

    session.commit()
    return {"policy_id": str(policy.policy_id)}


# ---------------------------------------------------------------------------
# Node 5: embed_and_save_sections
# ---------------------------------------------------------------------------

_CHUNK_THRESHOLD = 1500   # chars — split only if content exceeds this
_TARGET_CHUNK_SIZE = 1000 # chars per chunk (target)


def _split_markdown(text: str) -> List[str]:
    """
    Split markdown text into sections.
    If total length <= _CHUNK_THRESHOLD, returns the whole text as one chunk.
    Otherwise splits into ceil(len/1000) roughly equal chunks using
    MarkdownTextSplitter as the delimiter-aware splitter.
    """
    if len(text) <= _CHUNK_THRESHOLD:
        return [text]

    num_chunks = math.ceil(len(text) / _TARGET_CHUNK_SIZE)
    chunk_size = math.ceil(len(text) / num_chunks)

    splitter = MarkdownTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=100,
    )
    chunks = splitter.split_text(text)
    return chunks if chunks else [text]


def embed_and_save_sections(state: PolicyWorkflowState, session: Session) -> dict:
    """
    Split each markdown doc into sections, embed them, and persist as
    PolicySection rows linked to the newly created policy.
    """
    policy_id = state.get("policy_id")
    if not policy_id:
        print("embed_and_save_sections: no policy_id, skipping.")
        return {}

    markdown_docs = state.get("markdown_docs", [])
    if not markdown_docs:
        return {}

    embedder = get_embeddings()

    for doc in markdown_docs:
        file_name = Path(doc["file"]).name
        chunks = _split_markdown(doc["text"])
        print(f"Embedding {len(chunks)} sections from '{file_name}'...")

        # Batch-embed all chunks in one API call
        try:
            vectors = embedder.embed_documents(chunks)
        except Exception as e:
            print(f"Embedding failed for '{file_name}': {e}")
            continue

        for idx, (chunk, vector) in enumerate(zip(chunks, vectors)):
            section = PolicySection(
                policy_id=policy_id,
                content=chunk,
                section_title=None,
                section_order=idx,
                metadata_data={"source_file": file_name, "chunk_index": idx},
                embedding=vector,
            )
            session.add(section)

    session.commit()
    print(f"Sections embedded and saved for policy {policy_id}.")
    return {}


# ---------------------------------------------------------------------------
# Graph compilation + entry point
# ---------------------------------------------------------------------------

def run_policy_workflow(file_paths: List[str], alias: str, session: Session, user_id: Optional[str] = None) -> str:
    """Run the policy upload pipeline. Returns the policy_id string."""
    def _save_to_db(state): return save_to_db(state, session)
    def _embed_and_save_sections(state): return embed_and_save_sections(state, session)

    graph = StateGraph(PolicyWorkflowState)

    graph.add_node("process_pdfs", process_pdfs)
    graph.add_node("extract_categories_and_summary", extract_categories_and_summary)
    graph.add_node("extract_conditions", extract_conditions)
    graph.add_node("save_to_db", _save_to_db)
    graph.add_node("embed_and_save_sections", _embed_and_save_sections)

    graph.add_edge(START, "process_pdfs")
    graph.add_edge("process_pdfs", "extract_categories_and_summary")
    graph.add_edge("extract_categories_and_summary", "extract_conditions")
    graph.add_edge("extract_conditions", "save_to_db")
    graph.add_edge("save_to_db", "embed_and_save_sections")
    graph.add_edge("embed_and_save_sections", END)

    app = graph.compile()
    result = app.invoke({
        "file_paths": file_paths,
        "alias": alias,
        "user_id": user_id,
        "markdown_docs": [],
        "title": "",
        "extracted_categories": [],
        "overview_summary": "",
        "mandatory_procedures": {},
        "error": None,
        "policy_id": None,
    })
    return result.get("policy_id", "")
