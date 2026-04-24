"""
Compliance workflow tools for LangGraph agent.
Provides tools for date lookups and policy section search with strict typing.
"""
import threading
from datetime import date

from langchain_core.tools import tool
from pydantic import BaseModel
from sqlmodel import Session

from engine.tools.rag_tool import search_policy_sections

_session_lock = threading.Lock()


class GetCurrentDateInput(BaseModel):
    """No input required."""


class SearchPolicyInput(BaseModel):
    """Input for policy search tool."""
    query: str


@tool(args_schema=GetCurrentDateInput)
def get_current_date() -> str:
    """Returns today's date in YYYY-MM-DD format. Use this to check late submission policy."""
    return date.today().isoformat()


def make_search_policy_rag_tool(policy_id: str, session: Session):
    """Factory that binds policy_id and session into the RAG tool closure."""

    @tool(args_schema=SearchPolicyInput)
    def search_policy_rag(query: str) -> str:
        """
        Search the HR policy document for specific conditions, rank limits, per-diem rates,
        accommodation caps, or any other policy rule relevant to this reimbursement claim.
        The query should describe what you are looking for, e.g. 'accommodation limit rank 2'.
        """
        keywords = [kw.strip() for kw in query.split() if kw.strip()]
        # Lock ensures thread-safe access to the shared SQLAlchemy session
        # when called concurrently from per-receipt worker threads.
        with _session_lock:
            result = search_policy_sections(
                policy_id=policy_id,
                session=session,
                keywords=keywords,
                limit=6,
            )
        return result or "(no matching policy sections found)"

    return search_policy_rag
