export type DownloadTypeLabel = 'Lookalike Excel' | 'Insights Excel' | 'Combined Excel';

export function downloadTypeLabel(type: string | null | undefined, url: string | null | undefined): DownloadTypeLabel {
  if (type === 'lookalike') return 'Lookalike Excel';
  if (url && url.includes('/combined_')) return 'Combined Excel';
  return 'Insights Excel';
}
