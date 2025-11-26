import fs from 'fs';
import path from 'path';

type TreeNode = {
    id: string;
    name: string;
    children?: TreeNode[];
};

type CSVRow = {
    sector_level1: string;
    sector_level2: string;
    sector_level3: string;
    region_level1: string;
    region_level2: string;
    region_level3: string;
    region_level4: string;
};

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function buildTree(
    rows: CSVRow[],
    levelKeys: string[]
): TreeNode[] {
    const root: Map<string, TreeNode> = new Map();

    for (const row of rows) {
        let currentLevel = root;
        let parentId = '';

        for (let i = 0; i < levelKeys.length; i++) {
            const key = levelKeys[i];
            const value = (row as any)[key]?.trim();

            if (!value) break;

            const nodeId = parentId
                ? `${parentId}-${slugify(value)}`
                : slugify(value);

            if (!currentLevel.has(nodeId)) {
                currentLevel.set(nodeId, {
                    id: nodeId,
                    name: value,
                    children: i < levelKeys.length - 1 ? [] : undefined,
                });
            }

            const node = currentLevel.get(nodeId)!;

            if (i < levelKeys.length - 1) {
                if (!node.children) {
                    node.children = [];
                }

                const childrenMap = new Map<string, TreeNode>();
                for (const child of node.children) {
                    childrenMap.set(child.id, child);
                }
                currentLevel = childrenMap;
                parentId = nodeId;
            }
        }
    }

    return Array.from(root.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function parseCSV(filePath: string): CSVRow[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    const headers = lines[0].split(',').map(h => h.trim());
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
        const row: any = {};

        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });

        rows.push(row as CSVRow);
    }

    return rows;
}

function generateTypeScriptFile(
    tree: TreeNode[],
    fileName: string,
    exportName: string
): void {
    const code = `// Auto-generated from filters_sectors_and_region2.csv
// Do not edit manually

export type TreeNode = {
  id: string;
  name: string;
  children?: TreeNode[];
};

export const ${exportName}: TreeNode[] = ${JSON.stringify(tree, null, 2)};
`;

    const outputPath = path.join(process.cwd(), 'src', 'data', fileName);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, code, 'utf-8');

    console.log(`✅ Generated: ${outputPath}`);
}

async function main() {
    const csvPath = path.join(process.cwd(), 'filters_sectors_and_region2.csv');

    console.log('📊 Parsing CSV...');
    const rows = parseCSV(csvPath);
    console.log(`   Found ${rows.length} rows`);

    console.log('\n🌳 Building Sectors tree...');
    const sectorsTree = buildTree(rows, [
        'sector_level1',
        'sector_level2',
        'sector_level3',
    ]);
    console.log(`   Generated ${sectorsTree.length} top-level sectors`);

    console.log('\n🗺️  Building Regions tree...');
    const regionsTree = buildTree(rows, [
        'region_level1',
        'region_level2',
        'region_level3',
        'region_level4',
    ]);
    console.log(`   Generated ${regionsTree.length} top-level regions`);

    console.log('\n📝 Generating TypeScript files...');
    generateTypeScriptFile(sectorsTree, 'sectors-tree.ts', 'SECTORS_TREE');
    generateTypeScriptFile(regionsTree, 'regions-tree.ts', 'REGIONS_TREE');

    console.log('\n✨ Done!');
}

main().catch(console.error);
