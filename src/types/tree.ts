export type TreeNode = {
    id: string;
    name: string;
    children?: TreeNode[];
    hasChildren?: boolean;
};

export type CheckState = 'checked' | 'unchecked' | 'indeterminate';
