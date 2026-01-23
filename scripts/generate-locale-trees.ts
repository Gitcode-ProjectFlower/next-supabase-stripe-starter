import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const EXCEL_PATH = path.join(process.cwd(), 'filters_sectors_and_region_UK_and_DE.xlsx');

type TreeNode = {
  id: string;
  name: string;
  children?: TreeNode[];
};

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

function buildTree(data: any[], levels: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const row of data) {
    let currentLevel = root;
    let parentId = '';

    for (const levelKey of levels) {
      const name = row[levelKey];
      if (!name || !name.trim()) continue;

      const slug = slugify(name);
      const id = parentId ? `${parentId}-${slug}` : slug;

      let node = currentLevel.find((n) => n.name === name);

      if (!node) {
        node = {
          id: id,
          name: name,
          children: [],
        };
        currentLevel.push(node);
      }

      currentLevel = node.children!;
      parentId = node.id;
    }
  }

  // Clean up empty children arrays
  function clean(nodes: TreeNode[]) {
    for (const node of nodes) {
      if (node.children && node.children.length === 0) {
        delete node.children;
      } else if (node.children) {
        clean(node.children);
      }
    }
  }
  clean(root);

  return root;
}

function generateTreeFile(tree: TreeNode[], fileName: string, exportName: string, locale: string): void {
  const outputPath = path.join(process.cwd(), 'src/data', fileName);
  const fileHeader = `// Auto-generated from filters_sectors_and_region_UK_and_DE.xlsx (${locale.toUpperCase()} worksheet)
// Do not edit manually

export type TreeNode = {
  id: string;
  name: string;
  children?: TreeNode[];
};

`;

  const content = `${fileHeader}export const ${exportName}: TreeNode[] = ${JSON.stringify(tree, null, 2)};
`;

  fs.writeFileSync(outputPath, content);
  console.log(`   ✓ Generated ${fileName}`);
}

function parseWorksheet(worksheet: XLSX.WorkSheet, locale: string): Record<string, string>[] {
  const rows: Record<string, string>[] = [];

  // Convert worksheet to JSON with header row
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  // Convert to array of records
  for (const row of jsonData) {
    const record: Record<string, string> = {};
    for (const [key, value] of Object.entries(row as Record<string, string>)) {
      record[key] = String(value || '').trim();
    }
    rows.push(record);
  }

  return rows;
}

function generate() {
  console.log('📖 Reading Excel file...');

  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`❌ Error: Excel file not found at ${EXCEL_PATH}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheetNames = workbook.SheetNames;

  console.log(`   Found worksheets: ${sheetNames.join(', ')}`);

  // Process each worksheet (UK and DE)
  // Worksheet names are "Collection_uk" and "Collection_de"
  const worksheetMap: Record<string, string> = {
    UK: 'Collection_uk',
    DE: 'Collection_de',
  };

  for (const locale of ['UK', 'DE']) {
    const localeLower = locale.toLowerCase();
    const worksheetName = worksheetMap[locale];
    const worksheet = workbook.Sheets[worksheetName];

    if (!worksheet) {
      console.warn(`⚠️  Warning: Worksheet "${locale}" not found, skipping...`);
      continue;
    }

    console.log(`\n🌍 Processing ${locale} worksheet...`);

    // Parse worksheet data
    const records = parseWorksheet(worksheet, locale);
    console.log(`   Parsed ${records.length} records`);

    // Build Regions Tree
    // region_level1 -> region_level2 -> region_level3 -> region_level4
    console.log(`   Building Regions Tree for ${locale}...`);
    const regionsTree = buildTree(records, ['region_level1', 'region_level2', 'region_level3', 'region_level4']);
    console.log(`   Generated ${regionsTree.length} top-level region nodes`);

    // Build Sectors Tree
    // sector_level1 -> sector_level2 -> sector_level3
    console.log(`   Building Sectors Tree for ${locale}...`);
    const sectorsTree = buildTree(records, ['sector_level1', 'sector_level2', 'sector_level3']);
    console.log(`   Generated ${sectorsTree.length} top-level sector nodes`);

    // Generate tree files
    console.log(`   Writing tree files for ${locale}...`);
    generateTreeFile(sectorsTree, `sectors-tree-${localeLower}.ts`, 'SECTORS_TREE_' + locale.toUpperCase(), locale);
    generateTreeFile(regionsTree, `regions-tree-${localeLower}.ts`, 'REGIONS_TREE_' + locale.toUpperCase(), locale);
  }

  console.log('\n✨ All trees generated successfully!');
  console.log('\nGenerated files:');
  console.log('  - src/data/sectors-tree-uk.ts');
  console.log('  - src/data/sectors-tree-de.ts');
  console.log('  - src/data/regions-tree-uk.ts');
  console.log('  - src/data/regions-tree-de.ts');
}

generate();
