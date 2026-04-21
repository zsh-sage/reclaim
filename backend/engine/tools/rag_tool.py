import sys
from uuid import UUID
from typing import List

from sqlmodel import Session, select
from sqlalchemy import text as sql_text

from core.models import PolicySection, SupportingDocumentEmbedding


def policy_rag_search(
    query_embedding: List[float],
    policy_id: UUID,
    session: Session,
    k: int = 5,
) -> List[dict]:
    """
    Return top-k policy section dicts most similar to query_embedding,
    filtered to the given policy_id. Uses cosine distance.

    Returns list of dicts with 'content' and 'metadata_data' keys.
    """
    # Try 1: SQLModel select with pgvector descriptor
    try:
        stmt = (
            select(PolicySection)
            .where(PolicySection.policy_id == policy_id)
            .order_by(PolicySection.embedding.cosine_distance(query_embedding))
            .limit(k)
        )
        results = session.exec(stmt).all()
        return [{"content": r.content, "metadata_data": r.metadata_data} for r in results]
    except Exception as e:
        print(f"[policy_rag_search] ORM approach failed: {e}", file=sys.stderr)

    # Fallback: Raw SQL via text()
    try:
        vec_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
        rows = session.execute(
            sql_text(
                "SELECT content, metadata FROM policy_sections "
                "WHERE policy_id = CAST(:pid AS uuid) "
                "ORDER BY embedding <=> CAST(:vec AS vector) "
                "LIMIT :k"
            ),
            {"pid": str(policy_id), "vec": vec_str, "k": k},
        ).mappings().all()
        return [{"content": r["content"], "metadata_data": r["metadata"]} for r in rows]
    except Exception as e:
        print(f"[policy_rag_search] Raw SQL fallback failed: {e}", file=sys.stderr)

    return []


def document_rag_search(
    query_embedding: List[float],
    document_ids: List[UUID],
    session: Session,
    k: int = 5,
) -> List[dict]:
    """
    Return top-k supporting document embedding dicts most similar to query_embedding,
    filtered to the given list of document_ids.

    Returns list of dicts with 'content' key.
    """
    # Try 1: SQLModel select with pgvector descriptor
    try:
        stmt = (
            select(SupportingDocumentEmbedding)
            .where(SupportingDocumentEmbedding.document_id.in_(document_ids))
            .order_by(SupportingDocumentEmbedding.embedding.cosine_distance(query_embedding))
            .limit(k)
        )
        results = session.exec(stmt).all()
        return [{"content": r.content} for r in results]
    except Exception as e:
        print(f"[document_rag_search] ORM approach failed: {e}", file=sys.stderr)

    # Fallback: Raw SQL via text()
    try:
        str_ids = [str(d) for d in document_ids]
        vec_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
        rows = session.execute(
            sql_text(
                "SELECT content FROM supporting_documents_embeddings "
                "WHERE document_id = ANY(CAST(:ids AS uuid[])) "
                "ORDER BY embedding <=> CAST(:vec AS vector) "
                "LIMIT :k"
            ),
            {"ids": str_ids, "vec": vec_str, "k": k},
        ).mappings().all()
        return [{"content": r["content"]} for r in rows]
    except Exception as e:
        print(f"[document_rag_search] Raw SQL fallback failed: {e}", file=sys.stderr)

    return []
