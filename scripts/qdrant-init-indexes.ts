/**
 * Create the keyword payload indexes that the lookalike and Q&A pipelines
 * need on every Qdrant collection used by the product.
 *
 * Run this every time a collection is replaced — payload indexes live
 * inside the collection, so dropping/recreating the collection also drops
 * the indexes, and filtered vector search will silently start timing out.
 *
 * Usage:
 *   QDRANT_URL=http://207.180.237.68:6333 \
 *     npx tsx scripts/qdrant-init-indexes.ts
 *
 *   QDRANT_URL=http://207.180.237.68:6333 \
 *     npx tsx scripts/qdrant-init-indexes.ts collection_uk collection_de
 *
 * The PUT requests are idempotent — calling them again on an already
 * indexed field is a no-op.
 */

const DEFAULT_COLLECTIONS = ['collection_uk', 'collection_de'];
const REQUIRED_FIELDS: ReadonlyArray<{ field: string; schema: string; usedBy: string }> = [
  { field: 'meta.domain', schema: 'keyword', usedBy: 'Lookalike domain lookup (/similarity)' },
  { field: 'meta.type', schema: 'keyword', usedBy: 'Chunk vs. profile filtering in Q&A' },
  { field: 'meta.document_type', schema: 'keyword', usedBy: 'Profile-only filter when locating a reference point' },
];

async function ensureIndex(qdrantUrl: string, collection: string, field: string, schema: string): Promise<void> {
  const response = await fetch(`${qdrantUrl}/collections/${collection}/index`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ field_name: field, field_schema: schema }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`PUT index ${field} on ${collection} failed: ${response.status} ${body}`);
  }
}

async function fetchPayloadSchema(qdrantUrl: string, collection: string): Promise<Record<string, { points: number }>> {
  const response = await fetch(`${qdrantUrl}/collections/${collection}`);
  if (!response.ok) {
    throw new Error(`GET ${collection} failed: ${response.status}`);
  }
  const data = (await response.json()) as { result?: { payload_schema?: Record<string, { points: number }> } };
  return data.result?.payload_schema ?? {};
}

async function main(): Promise<void> {
  const qdrantUrl = process.env.QDRANT_URL;
  if (!qdrantUrl) {
    console.error('QDRANT_URL is required (e.g. http://207.180.237.68:6333)');
    process.exit(1);
  }

  const collections = process.argv.slice(2);
  const targets = collections.length > 0 ? collections : DEFAULT_COLLECTIONS;

  for (const collection of targets) {
    console.log(`\n=== ${collection} ===`);

    for (const { field, schema, usedBy } of REQUIRED_FIELDS) {
      process.stdout.write(`  ${field} (${usedBy}) ... `);
      try {
        await ensureIndex(qdrantUrl, collection, field, schema);
        console.log('ok');
      } catch (err) {
        console.log('FAILED');
        console.error(err);
        process.exit(1);
      }
    }

    const payloadSchema = await fetchPayloadSchema(qdrantUrl, collection);
    const missing = REQUIRED_FIELDS.filter(({ field }) => !payloadSchema[field]);
    if (missing.length > 0) {
      console.error(`  verification failed — missing: ${missing.map((m) => m.field).join(', ')}`);
      process.exit(1);
    }

    console.log('  verification: payload_schema =');
    for (const { field } of REQUIRED_FIELDS) {
      const entry = payloadSchema[field];
      console.log(`    ${field}: ${entry.points.toLocaleString()} points`);
    }
  }

  console.log('\nAll indexes are in place.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
