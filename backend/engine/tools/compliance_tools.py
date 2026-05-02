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


from datetime import datetime


class GetDisparanceDateInput(BaseModel):
    """Input for date disparance calculation."""
    receipt_date: str


class SearchPolicyInput(BaseModel):
    """Input for policy search tool."""
    query: str


@tool(args_schema=GetDisparanceDateInput)
def get_disparance_date(receipt_date: str) -> str:
    """
    Calculate the time difference between receipt date and today.
    Returns the disparance in days (e.g., '23 days before today') or marks future dates as invalid.
    This tool ensures accurate date comparison using Python instead of LLM reasoning.
    """
    try:
        receipt_dt = datetime.strptime(receipt_date, "%Y-%m-%d").date()
    except ValueError:
        return f"Invalid date format: {receipt_date}. Use YYYY-MM-DD format."

    today = date.today()

    if receipt_dt > today:
        return "It is future date! Invalid"
    elif receipt_dt == today:
        return "0 days before today (today)"
    else:
        delta = today - receipt_dt
        return f"{delta.days} days before today"


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
