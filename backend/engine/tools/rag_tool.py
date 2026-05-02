"""
Policy section retrieval for compliance evaluation.
Uses pgvector cosine-similarity search on the 1536-dim embedding column.
Falls back to keyword/ILIKE text search if embeddings are unavailable.
"""
from typing import List, Optional
from uuid import UUID

from sqlmodel import Session, select, text, or_

from core.models import PolicySection
from engine.llm import get_embeddings


def search_policy_sections(
    policy_id: str,
    session: Session,
    keywords: Optional[List[str]] = None,
    limit: int = 8,
) -> str:
    """
    Retrieve policy section text relevant to the given keywords.

    Embeds the query string and performs a pgvector cosine-similarity search
    against policy_sections.embedding.  Falls back to in-Python keyword
    filtering if embedding fails.

    Returns a single concatenated string ready to inject into a prompt.
    """
    policy_uuid = UUID(policy_id)
    query_text = " ".join(keywords) if keywords else ""

    # --- Vector similarity path ---
    if query_text:
        try:
            embedder = get_embeddings()
            query_vector = embedder.embed_query(query_text)

            # pgvector cosine distance operator: <=>
            # Lower distance == more similar.  We ORDER ASC and take `limit` rows.
            sql = text("""
                SELECT section_id, content
                FROM policy_sections
                WHERE policy_id = :policy_id AND embedding IS NOT NULL
                ORDER BY embedding <=> CAST(:qvec AS vector)
                LIMIT :lim
            """)
            rows = session.execute(
                sql,
                {
                    "policy_id": str(policy_uuid),
                    "qvec": str(query_vector),
                    "lim": limit,
                },
            ).fetchall()

            if rows:
                parts = [
                    f"[Section {i}]\n{row[1][:1500]}"
                    for i, row in enumerate(rows, 1)
                ]
                return "\n\n".join(parts)

        except Exception as e:
            print(f"Vector search failed, falling back to keyword search: {e}")

    # --- Keyword fallback: push filter to DB with ILIKE ---
    if keywords:
        kw_lower = [k.lower() for k in keywords if k]
        stmt = (
            select(PolicySection)
            .where(
                PolicySection.policy_id == policy_uuid,
                or_(*[PolicySection.content.ilike(f"%{kw}%") for kw in kw_lower]),
            )
            .limit(limit)
        )
    else:
        stmt = select(PolicySection).where(PolicySection.policy_id == policy_uuid).limit(limit)

    sections = session.exec(stmt).all()

    if not sections:
        return ""

    parts = []
    for i, s in enumerate(sections, 1):
        excerpt = s.content[:1500]
        parts.append(f"[Section {i}]\n{excerpt}")

    return "\n\n".join(parts)
