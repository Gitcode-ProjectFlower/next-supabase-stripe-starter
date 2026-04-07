# Qdrant Payload Indexing — Lookalike & QA Pipeline

## Why this exists

The lookalike search and Q&A pipelines both run **filtered vector search** against the Qdrant collections (`collection_uk`, `collection_de`). Without payload indexes on the filtered fields, Qdrant has to do a full scan over all points (5.3M+ for the UK collection) on every query, which causes the Python pipeline to fail with:

```
QdrantEmbeddingRetriever
Error: timed out
```

The fix is to create **keyword payload indexes** on the fields we filter by. Indexing is not required by Qdrant for unfiltered vector search, but becomes mandatory as soon as any `must`/`must_not` filter is added on large collections.

## Fields that must be indexed

Three payload fields need to be indexed on every collection used by the product:

| Field                 | Type    | Used by                                             |
| --------------------- | ------- | --------------------------------------------------- |
| `meta.domain`         | keyword | Lookalike domain lookup (`/similarity` endpoint)    |
| `meta.type`           | keyword | Chunk vs. profile filtering in Q&A                  |
| `meta.document_type`  | keyword | Profile-only filter when locating a reference point |

## How to create the indexes

Run these three `PUT` requests against the Qdrant HTTP API for each collection. They are idempotent — calling them again on an already-indexed field is a no-op.

```bash
COLLECTION="collection_uk"  # or collection_de

curl -X PUT "http://localhost:6333/collections/${COLLECTION}/index" \
  -H "Content-Type: application/json" \
  -d '{"field_name": "meta.domain", "field_schema": "keyword"}'

curl -X PUT "http://localhost:6333/collections/${COLLECTION}/index" \
  -H "Content-Type: application/json" \
  -d '{"field_name": "meta.type", "field_schema": "keyword"}'

curl -X PUT "http://localhost:6333/collections/${COLLECTION}/index" \
  -H "Content-Type: application/json" \
  -d '{"field_name": "meta.document_type", "field_schema": "keyword"}'
```

Qdrant returns immediately with `{"status":"acknowledged"}`. Index building happens in the background; for a fresh collection of a few million points it takes under a minute.

## How to verify

Query the collection metadata and confirm `payload_schema` contains the three entries:

```bash
curl -s "http://localhost:6333/collections/${COLLECTION}" | jq '.result.payload_schema'
```

Expected output:

```json
{
  "meta.domain":        { "data_type": "keyword", "points": <N> },
  "meta.type":          { "data_type": "keyword", "points": <N> },
  "meta.document_type": { "data_type": "keyword", "points": <N> }
}
```

`points` should roughly match the collection's total point count for `meta.domain` (it is present on every vector), and a subset for `meta.type` / `meta.document_type`.

## When to re-run this

**Every time you replace a collection.** Payload indexes are stored inside the collection; deleting or recreating the collection also drops them. Add this step to the collection replacement procedure so it is not forgotten — otherwise lookalike and Q&A will silently start timing out again the next day.

## Related code

- Python pipeline: `/opt/haystack-app/src/cv_rag.py` (retriever builder)
- Similarity lookup: `/opt/haystack-app/src/main.py` (filtered `qdrant_client.scroll` by `meta.domain`)
- Frontend calls: `src/app/api/lookalikes/search/route.ts`, `src/libs/haystack/client.ts`
