export function resolveQaDownloadUrl(csvUrl: string | null | undefined): string | null {
  if (!csvUrl) return null;
  const trimmed = csvUrl.trim();
  if (trimmed === '' || trimmed === '#') return null;
  return trimmed;
}
