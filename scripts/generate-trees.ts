import fs from 'fs';
import path from 'path';

const CSV_PATH = path.join(process.cwd(), 'filters_sectors_and_region2.csv');
const REGIONS_OUTPUT = path.join(process.cwd(), 'src/data/regions-tree.ts');
const SECTORS_OUTPUT = path.join(process.cwd(), 'src/data/sectors-tree.ts');

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

// Simple CSV parser that handles quoted fields
function parseCSV(text: string): Record<string, string>[] {
    const lines = text.split(/\r?\n/);
    const headers = parseLine(lines[0]);
    const result: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = parseLine(line);
        const record: Record<string, string> = {};

        for (let j = 0; j < headers.length; j++) {
            record[headers[j]] = values[j] || '';
        }
        result.push(record);
    }
    return result;
}

function parseLine(line: string): string[] {
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                currentValue += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(currentValue);
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    values.push(currentValue);
    return values;
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

            let node = currentLevel.find(n => n.name === name);

            if (!node) {
                node = {
                    id: id,
                    name: name,
                    children: []
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

function generate() {
    console.log('Reading CSV...');
    const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');

    console.log('Parsing CSV...');
    const records = parseCSV(fileContent);
    console.log(`Parsed ${records.length} records.`);

    // Build Regions Tree
    // region_level1 -> region_level2 -> region_level3 -> region_level4
    console.log('Building Regions Tree...');
    const regionsTree = buildTree(records, ['region_level1', 'region_level2', 'region_level3', 'region_level4']);

    // Build Sectors Tree
    // sector_level1 -> sector_level2 -> sector_level3
    console.log('Building Sectors Tree...');
    const sectorsTree = buildTree(records, ['sector_level1', 'sector_level2', 'sector_level3']);

    // Write Outputs
    const fileHeader = `// Auto-generated from filters_sectors_and_region2.csv
// Do not edit manually

export type TreeNode = {
  id: string;
  name: string;
  children?: TreeNode[];
};
`;

    const regionsContent = `${fileHeader}

export const REGIONS_TREE: TreeNode[] = ${JSON.stringify(regionsTree, null, 2)};
`;

    const sectorsContent = `${fileHeader}

export const SECTORS_TREE: TreeNode[] = ${JSON.stringify(sectorsTree, null, 2)};
`;

    fs.writeFileSync(REGIONS_OUTPUT, regionsContent);
    fs.writeFileSync(SECTORS_OUTPUT, sectorsContent);

    console.log('Trees generated successfully!');
    console.log(`Regions: ${regionsTree.length} top-level nodes`);
    console.log(`Sectors: ${sectorsTree.length} top-level nodes`);
}

generate();
