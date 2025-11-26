/* eslint-disable simple-import-sort/imports */
'use client';


import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';

import type { CheckState, TreeNode } from '@/types/tree';



type NodeId = string;

// Helper functions
function buildParentMap(nodes: TreeNode[]): Record<NodeId, NodeId | null> {
    const map: Record<NodeId, NodeId | null> = {};
    const dfs = (list: TreeNode[], parent: NodeId | null) => {
        for (const n of list) {
            map[n.id] = parent;
            if (n.children) dfs(n.children, n.id);
        }
    };
    dfs(nodes, null);
    return map;
}

function computeState(node: TreeNode, selected: Set<NodeId>): CheckState {
    if (!node.children || node.children.length === 0) {
        return selected.has(node.id) ? 'checked' : 'unchecked';
    }
    let checked = 0;
    let indet = false;
    for (const c of node.children) {
        const st = computeState(c, selected);
        if (st === 'checked') checked++;
        if (st === 'indeterminate') indet = true;
    }
    if (checked === node.children.length) return 'checked';
    if (checked === 0 && !indet) return 'unchecked';
    return 'indeterminate';
}

function toggleSubtree(node: TreeNode, next: Set<NodeId>, value: boolean) {
    const recur = (n: TreeNode) => {
        if (value) next.add(n.id);
        else next.delete(n.id);
        if (n.children) n.children.forEach(recur);
    };
    recur(node);
}

function updateAncestorsFor(
    nodes: TreeNode[],
    selected: Set<NodeId>,
    id: NodeId
) {
    const parentMap = buildParentMap(nodes);
    let p = parentMap[id];
    while (p) {
        const parentNode = findNode(nodes, p)!;
        const st = computeState(parentNode, selected);
        if (st === 'checked') selected.add(parentNode.id);
        else if (st === 'unchecked') selected.delete(parentNode.id);
        else selected.delete(parentNode.id);
        p = parentMap[p];
    }
}

function findNode(nodes: TreeNode[], id: NodeId): TreeNode | null {
    const stack: TreeNode[] = [...nodes];
    while (stack.length) {
        const n = stack.pop()!;
        if (n.id === id) return n;
        if (n.children) stack.push(...n.children);
    }
    return null;
}

function flattenVisible(
    nodes: TreeNode[],
    expanded: Set<NodeId>,
    search: string
): { id: NodeId; depth: number; node: TreeNode }[] {
    const out: { id: NodeId; depth: number; node: TreeNode }[] = [];
    const q = search.trim().toLowerCase();

    const matches = (n: TreeNode) => n.name.toLowerCase().includes(q);

    const keep = (n: TreeNode): boolean => {
        if (q === '') return true;
        if (matches(n)) return true;
        if (n.children) return n.children.some(keep);
        return false;
    };

    const dfs = (list: TreeNode[], depth: number) => {
        for (const n of list) {
            if (!keep(n)) continue;
            out.push({ id: n.id, depth, node: n });
            const isOpen =
                expanded.has(n.id) || (q !== '' && (n.children?.some(keep) ?? false));
            if (isOpen && n.children && n.children.length) dfs(n.children, depth + 1);
        }
    };
    dfs(nodes, 0);
    return out;
}

interface TreeMultiSelectProps {
    data: TreeNode[];
    selected: Set<NodeId>;
    onChange: (selected: Set<NodeId>) => void;
    placeholder?: string;
    className?: string;
}

export function TreeMultiSelect({
    data,
    selected,
    onChange,
    placeholder = 'Please select',
    className = '',
}: TreeMultiSelectProps) {
    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState<Set<NodeId>>(new Set());
    const [search, setSearch] = useState('');
    const listboxId = useMemo(() => `tree-listbox-${Math.random().toString(36).substr(2, 9)}`, []);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const rows = useMemo(
        () => flattenVisible(data, expanded, search),
        [data, expanded, search]
    );

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => containerRef.current,
        estimateSize: () => 36,
        overscan: 6,
    });

    const toggleExpand = (id: NodeId) => {
        const next = new Set(expanded);
        if (expanded.has(id)) next.delete(id);
        else next.add(id);
        setExpanded(next);
    };

    const toggleCheck = (id: NodeId) => {
        const next = new Set(selected);
        const node = findNode(data, id)!;
        const st = computeState(node, next);
        const makeChecked = st !== 'checked';
        if (node.children && node.children.length > 0) {
            toggleSubtree(node, next, makeChecked);
        } else {
            if (makeChecked) next.add(id);
            else next.delete(id);
        }
        updateAncestorsFor(data, next, id);
        onChange(next);
    };

    const selectedLabels = useMemo(() => {
        const labels: string[] = [];
        const collect = (list: TreeNode[]) => {
            for (const n of list) {
                if (selected.has(n.id) && (!n.children || n.children.length === 0))
                    labels.push(n.name);
                if (n.children) collect(n.children);
            }
        };
        collect(data);
        return labels.slice(0, 3).join(', ') + (labels.length > 3 ? ` +${labels.length - 3}` : '');
    }, [selected, data]);

    return (
        <div className={className} ref={wrapperRef}>
            <button
                role="combobox"
                aria-expanded={open}
                aria-controls={listboxId}
                onClick={() => setOpen((v) => !v)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:border-black disabled:cursor-not-allowed disabled:opacity-50"
            >
                <span className={selectedLabels ? 'text-foreground' : 'text-muted-foreground'}>
                    {selectedLabels || placeholder}
                </span>
                <svg
                    className="h-4 w-4 opacity-50"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div
                    id={listboxId}
                    className="absolute z-50 mt-2 w-full rounded-md border bg-popover p-0 text-popover-foreground shadow-md"
                >
                    <div className="border-b p-2">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search..."
                            className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Search"
                        />
                    </div>

                    <div
                        ref={containerRef}
                        style={{ height: 320, overflow: 'auto', position: 'relative' }}
                    >
                        <div
                            style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}
                        >
                            {rowVirtualizer.getVirtualItems().map((vi) => {
                                const { node, depth, id } = rows[vi.index];
                                const isExpanded = expanded.has(id);
                                const st = computeState(node, selected);
                                const hasKids = !!node.children?.length || node.hasChildren;
                                return (
                                    <div
                                        key={id}
                                        role="treeitem"
                                        aria-level={depth + 1}
                                        aria-expanded={hasKids ? isExpanded : undefined}
                                        aria-selected={selected.has(id)}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            transform: `translateY(${vi.start}px)`,
                                            width: '100%',
                                        }}
                                        className="flex h-9 items-center gap-2 px-2"
                                    >
                                        <div style={{ width: depth * 16 }} />
                                        {hasKids ? (
                                            <button
                                                className="flex h-5 w-5 items-center justify-center rounded border text-xs"
                                                onClick={() => toggleExpand(id)}
                                                aria-label={
                                                    isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`
                                                }
                                            >
                                                {isExpanded ? '▾' : '▸'}
                                            </button>
                                        ) : (
                                            <span className="w-5" />
                                        )}

                                        <TriCheckbox state={st} onChange={() => toggleCheck(id)} />

                                        <span className="truncate text-sm">{node.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t p-2 text-sm">
                        <button
                            className="rounded border px-3 py-1.5"
                            onClick={() => {
                                onChange(new Set());
                            }}
                        >
                            Clear selection
                        </button>
                        <div className="text-muted-foreground">
                            Selected: {Array.from(selected).length}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function TriCheckbox({
    state,
    onChange,
}: {
    state: CheckState;
    onChange: () => void;
}) {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.indeterminate = state === 'indeterminate';
            ref.current.checked = state === 'checked';
        }
    }, [state]);
    return (
        <input
            ref={ref}
            type="checkbox"
            aria-checked={state === 'indeterminate' ? 'mixed' : state === 'checked'}
            onChange={onChange}
            className="h-4 w-4 shrink-0 rounded border"
        />
    );
}
