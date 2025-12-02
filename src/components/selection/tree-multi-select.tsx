/* eslint-disable simple-import-sort/imports */
'use client';


import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';

import { useVirtualizer } from '@tanstack/react-virtual';

import type { CheckState, TreeNode } from '@/types/tree';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';



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
    const listboxId = React.useId();

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
        estimateSize: () => 32, // Slightly smaller row height
        overscan: 10,
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
                // If node is selected and has no children (leaf), OR all children are selected (simplified view)
                // Actually, standard behavior is usually listing leaves or collapsed parents.
                // Let's list leaves for now.
                if (selected.has(n.id) && (!n.children || n.children.length === 0))
                    labels.push(n.name);
                if (n.children) collect(n.children);
            }
        };
        collect(data);

        if (labels.length === 0) return '';
        return labels.join(', ');
    }, [selected, data]);

    return (
        <div className={cn("relative", className)} ref={wrapperRef}>
            <button
                role="combobox"
                aria-expanded={open}
                aria-controls={listboxId}
                onClick={() => setOpen((v) => !v)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <span className={cn("truncate", selectedLabels ? 'text-gray-900 font-medium' : 'text-muted-foreground')}>
                    {selectedLabels || placeholder}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
            </button>

            {open && (
                <div
                    id={listboxId}
                    className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95"
                >
                    <div className="p-2 border-b">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search..."
                                className="h-9 pl-8"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div
                        ref={containerRef}
                        className="max-h-[300px] overflow-y-auto overflow-x-hidden py-1"
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
                                            height: `${vi.size}px`,
                                        }}
                                        className="flex items-center gap-1 px-2 hover:bg-accent hover:text-accent-foreground"
                                    >
                                        <div style={{ width: depth * 16 }} className="shrink-0" />

                                        {hasKids ? (
                                            <button
                                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm hover:bg-gray-100 text-gray-500"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleExpand(id);
                                                }}
                                            >
                                                {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                )}
                                            </button>
                                        ) : (
                                            <span className="w-6 shrink-0" />
                                        )}

                                        <div
                                            className="flex flex-1 items-center gap-2 cursor-pointer py-1"
                                            onClick={() => toggleCheck(id)}
                                        >
                                            <TriCheckbox state={st} />
                                            <span className="truncate text-sm select-none">{node.name}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {rows.length === 0 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                No results found.
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between border-t p-2 bg-white">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => onChange(new Set())}
                            disabled={selected.size === 0}
                        >
                            Clear selection
                        </Button>
                        <span className="text-xs text-accent-foreground px-2">
                            Selected: {selected.size}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

function TriCheckbox({ state }: { state: CheckState }) {
    return (
        <div
            className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                state === 'checked' || state === 'indeterminate'
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-gray-300"
            )}
        >
            {state === 'checked' && (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3"
                >
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            )}
            {state === 'indeterminate' && (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3"
                >
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            )}
        </div>
    );
}
