#!/usr/bin/env python3

import argparse
import json
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import requests

2 == "2"
2 === "2"


HARD_EXCLUDE_PHRASES = [
    "privacy policy",
    "cookie policy",
    "cookies",
    "terms of use",
    "terms and conditions",
    "acceptable use",
    "personal data",
    "legal obligation",
    "marketing messages",
    "gdpr",
    "all rights reserved",
]

POSITIVE_TERMS = [
    "about us",
    "who we are",
    "what we do",
    "services",
    "solutions",
    "products",
    "customers",
    "clients",
    "industries",
    "markets",
    "business",
    "commercial",
    "enterprise",
    "technology",
    "case study",
    "case studies",
    "certified",
    "certification",
    "partnership",
    "renewable",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill compound_text points from existing chunk points.")
    parser.add_argument("--qdrant-url", default="http://127.0.0.1:6333")
    parser.add_argument("--collection", required=True)
    parser.add_argument("--domain")
    parser.add_argument("--profile-batch-size", type=int, default=100)
    parser.add_argument("--chunk-limit", type=int, default=40)
    parser.add_argument("--max-chunks", type=int, default=8)
    parser.add_argument("--max-chars", type=int, default=12000)
    parser.add_argument("--min-score", type=int, default=7)
    parser.add_argument("--limit-domains", type=int)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def post_json(url: str, body: Dict[str, Any]) -> Dict[str, Any]:
    response = requests.post(url, json=body, timeout=120)
    response.raise_for_status()
    return response.json()


def put_json(url: str, body: Dict[str, Any]) -> Dict[str, Any]:
    response = requests.put(url, json=body, timeout=120)
    response.raise_for_status()
    return response.json()


def scroll_points(
    qdrant_url: str,
    collection: str,
    filter_body: Dict[str, Any],
    limit: int,
    with_vectors: bool,
    offset: Optional[Any] = None,
) -> Dict[str, Any]:
    body: Dict[str, Any] = {
        "limit": limit,
        "with_payload": True,
        "with_vector": with_vectors,
        "filter": filter_body,
    }
    if offset is not None:
        body["offset"] = offset
    return post_json(f"{qdrant_url}/collections/{collection}/points/scroll", body).get("result", {})


def normalize_space(text: str) -> str:
    return " ".join(text.split())


def is_hard_excluded(text: str) -> bool:
    lowered = text.lower()
    return any(phrase in lowered for phrase in HARD_EXCLUDE_PHRASES)


def chunk_score(text: str) -> int:
    lowered = text.lower()
    score = min(6, len(text) // 400)
    score += sum(2 for term in POSITIVE_TERMS if term in lowered)
    score -= 6 if "skip to content" in lowered else 0
    score -= 4 if "javascript" in lowered else 0
    return score


def average_vectors(vectors: List[List[float]]) -> List[float]:
    if not vectors:
        return []
    length = len(vectors[0])
    totals = [0.0] * length
    for vector in vectors:
        for index, value in enumerate(vector):
            totals[index] += value
    return [value / len(vectors) for value in totals]


def build_compound_point(
    domain: str,
    chunk_points: List[Dict[str, Any]],
    max_chunks: int,
    max_chars: int,
    min_score: int,
) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
    candidates: List[Dict[str, Any]] = []
    seen_previews = set()

    for point in chunk_points:
        payload = point.get("payload") or {}
        content = (payload.get("content") or "").strip()
        vector = point.get("vector")
        if not content or not vector:
            continue

        preview_key = normalize_space(content[:280]).lower()
        if preview_key in seen_previews:
            continue
        seen_previews.add(preview_key)

        hard_excluded = is_hard_excluded(content)
        score = chunk_score(content)
        candidates.append(
            {
                "content": content,
                "vector": vector,
                "score": score,
                "hard_excluded": hard_excluded,
                "chunk_id": (payload.get("meta") or {}).get("chunk_id"),
                "source_file": (payload.get("meta") or {}).get("source_file"),
            }
        )

    preferred = [candidate for candidate in candidates if not candidate["hard_excluded"] and candidate["score"] >= min_score]
    if not preferred:
        preferred = [candidate for candidate in candidates if not candidate["hard_excluded"]]
    if not preferred:
        return None

    preferred.sort(key=lambda candidate: candidate["score"], reverse=True)

    selected: List[Dict[str, Any]] = []
    current_chars = 0
    for candidate in preferred:
        if len(selected) >= max_chunks:
            break
        next_chars = current_chars + len(candidate["content"]) + (2 if selected else 0)
        if selected and next_chars > max_chars:
            continue
        selected.append(candidate)
        current_chars = next_chars

    if not selected:
        return None

    combined_text = "\n\n".join(candidate["content"] for candidate in selected)[:max_chars].strip()
    if not combined_text:
        return None

    point = {
        "id": f"compound_text:{domain}",
        "vector": average_vectors([candidate["vector"] for candidate in selected]),
        "payload": {
            "content": combined_text,
            "meta": {
                "type": "compound_text",
                "domain": domain,
                "source_file": "compound_text_backfill_from_chunks",
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "selected_chunk_count": len(selected),
                "selected_chunk_ids": [candidate["chunk_id"] for candidate in selected if candidate["chunk_id"] is not None],
            },
        },
    }
    stats = {
        "domain": domain,
        "selected_chunk_count": len(selected),
        "selected_chunk_ids": point["payload"]["meta"]["selected_chunk_ids"],
        "char_count": len(combined_text),
    }
    return point, stats


def fetch_domain_chunks(qdrant_url: str, collection: str, domain: str, chunk_limit: int) -> List[Dict[str, Any]]:
    result = scroll_points(
        qdrant_url,
        collection,
        {
            "must": [
                {"key": "meta.domain", "match": {"value": domain}},
                {"key": "meta.type", "match": {"value": "chunk"}},
            ]
        },
        limit=chunk_limit,
        with_vectors=True,
    )
    return result.get("points", [])


def fetch_profiles(
    qdrant_url: str,
    collection: str,
    batch_size: int,
    domain: Optional[str] = None,
    offset: Optional[Any] = None,
) -> Dict[str, Any]:
    must = [{"key": "meta.document_type", "match": {"value": "profile"}}]
    if domain:
        must.append({"key": "meta.domain", "match": {"value": domain}})
    return scroll_points(
        qdrant_url,
        collection,
        {"must": must},
        limit=batch_size,
        with_vectors=False,
        offset=offset,
    )


def upsert_points(qdrant_url: str, collection: str, points: List[Dict[str, Any]]) -> None:
    if not points:
        return
    put_json(f"{qdrant_url}/collections/{collection}/points?wait=true", {"points": points})


def main() -> int:
    args = parse_args()
    processed = 0
    created = 0
    skipped = 0
    batch: List[Dict[str, Any]] = []
    offset: Optional[Any] = None
    seen_domains = set()

    while True:
        profile_page = fetch_profiles(
            args.qdrant_url,
            args.collection,
            batch_size=1 if args.domain else args.profile_batch_size,
            domain=args.domain,
            offset=offset,
        )
        profile_points = profile_page.get("points", [])
        if not profile_points:
            break

        for profile in profile_points:
            meta = ((profile.get("payload") or {}).get("meta") or {})
            domain = meta.get("domain")
            if not domain or domain in seen_domains:
                continue
            seen_domains.add(domain)

            chunk_points = fetch_domain_chunks(args.qdrant_url, args.collection, domain, args.chunk_limit)
            built = build_compound_point(
                domain=domain,
                chunk_points=chunk_points,
                max_chunks=args.max_chunks,
                max_chars=args.max_chars,
                min_score=args.min_score,
            )
            processed += 1

            if not built:
                skipped += 1
                continue

            point, stats = built
            if args.dry_run:
                print(json.dumps({"dry_run": True, **stats}, ensure_ascii=True))
            else:
                batch.append(point)
                if len(batch) >= 50:
                    upsert_points(args.qdrant_url, args.collection, batch)
                    created += len(batch)
                    print(json.dumps({"upserted": created, "processed": processed, "skipped": skipped}, ensure_ascii=True))
                    batch = []

            if args.limit_domains and processed >= args.limit_domains:
                break

        if args.limit_domains and processed >= args.limit_domains:
            break
        if args.domain:
            break
        offset = profile_page.get("next_page_offset")
        if offset is None:
            break

    if batch and not args.dry_run:
        upsert_points(args.qdrant_url, args.collection, batch)
        created += len(batch)

    summary = {
        "collection": args.collection,
        "processed": processed,
        "created": created if not args.dry_run else None,
        "skipped": skipped,
        "dry_run": args.dry_run,
    }
    print(json.dumps(summary, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
