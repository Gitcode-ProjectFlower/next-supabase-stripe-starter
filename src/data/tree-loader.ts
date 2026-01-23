import type { TreeNode } from '@/types/tree';

/**
 * Get sectors tree for a specific locale
 * @param locale - Locale code (e.g., 'uk', 'de')
 * @returns Sectors tree for the locale
 */
export function getSectorsTree(locale: string): TreeNode[] {
  switch (locale.toLowerCase()) {
    case 'de':
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('./sectors-tree-de').SECTORS_TREE_DE;
    case 'uk':
    default:
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('./sectors-tree-uk').SECTORS_TREE_UK;
  }
}

/**
 * Get regions tree for a specific locale
 * @param locale - Locale code (e.g., 'uk', 'de')
 * @returns Regions tree for the locale
 */
export function getRegionsTree(locale: string): TreeNode[] {
  switch (locale.toLowerCase()) {
    case 'de':
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('./regions-tree-de').REGIONS_TREE_DE;
    case 'uk':
    default:
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('./regions-tree-uk').REGIONS_TREE_UK;
  }
}
