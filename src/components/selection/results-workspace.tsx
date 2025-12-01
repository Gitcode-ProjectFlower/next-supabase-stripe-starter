/* eslint-disable simple-import-sort/imports */
'use client';

import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { LookalikeResult } from '@/types/selection';

interface ResultsWorkspaceProps {
    names: string[];
    sectors: Set<string>;
    regions: Set<string>;
    experience: string[];
    results: LookalikeResult[];
    isLoading: boolean;
    selectedIds: Set<string>;
    onSelectionChange: (ids: Set<string>) => void;
}

const TABLE_HEADERS = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'sectors', label: 'Sector' },
    { key: 'regions', label: 'Region' }, // Simplified for display
    { key: 'experience_years', label: 'Years Experience' },
    { key: 'similarity', label: 'Fit Score' },
] as const;

type SortKey = (typeof TABLE_HEADERS)[number]['key'];
type SortDirection = 'asc' | 'desc';

export function ResultsWorkspace({
    names,
    sectors,
    regions,
    experience,
    results,
    isLoading,
    selectedIds,
    onSelectionChange,
}: ResultsWorkspaceProps) {
    const [sortKey, setSortKey] = useState<SortKey>('similarity');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [activeTab, setActiveTab] = useState<'candidates' | 'selected'>('candidates');

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('desc'); // Default to desc for new key (usually better for scores/dates)
        }
    };

    const displayedResults = useMemo(() => {
        let data = results;
        if (activeTab === 'selected') {
            data = data.filter((r) => selectedIds.has(r.doc_id));
        }

        if (!data.length) return [];

        return [...data].sort((a, b) => {
            let aVal: any = a[keyToProperty(sortKey)];
            let bVal: any = b[keyToProperty(sortKey)];

            // Handle arrays (sectors/regions) - take first item
            if (Array.isArray(aVal)) aVal = aVal[0] || '';
            if (Array.isArray(bVal)) bVal = bVal[0] || '';

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [results, sortKey, sortDirection, activeTab, selectedIds]);

    const handleSelectAll = () => {
        // If on "Selected" tab, select all doesn't make sense to add more, maybe just clear?
        // But let's keep it simple: Select All always operates on the current view?
        // Actually, standard behavior:
        // If on Candidates (All): Select All -> Selects all candidates
        // If on Selected: They are already selected. Maybe "Deselect All" clears them.

        if (activeTab === 'selected') {
            // If we are viewing selected, "Select All" checkbox should probably be checked if all visible are selected (which they are).
            // Unchecking it should deselect all visible (which is all selected).
            onSelectionChange(new Set());
            return;
        }

        // On Candidates tab
        if (selectedIds.size === results.length) {
            onSelectionChange(new Set());
        } else {
            onSelectionChange(new Set(results.map((r) => r.doc_id)));
        }
    };

    const handleSelectRow = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onSelectionChange(next);
    };

    return (
        <>
            {/* Tabs */}
            <div className="mb-3 flex items-center gap-2">
                <Button
                    variant={activeTab === 'candidates' ? 'default' : 'outline'}
                    className={cn(
                        "rounded-xl text-sm",
                        activeTab === 'candidates'
                            ? "bg-gray-900 text-white hover:bg-black"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                    )}
                    onClick={() => setActiveTab('candidates')}
                >
                    Candidates
                </Button>
                <Button
                    variant={activeTab === 'selected' ? 'default' : 'outline'}
                    className={cn(
                        "rounded-xl text-sm",
                        activeTab === 'selected'
                            ? "bg-gray-900 text-white hover:bg-black"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                    )}
                    onClick={() => setActiveTab('selected')}
                >
                    Selected
                </Button>
                <div className="ml-auto flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-white hover:bg-gray-50"
                        onClick={handleSelectAll}
                        disabled={results.length === 0}
                    >
                        {selectedIds.size > 0 && selectedIds.size === results.length
                            ? 'Deselect all'
                            : 'Select all'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-white hover:bg-gray-50"
                        onClick={() => onSelectionChange(new Set())}
                        disabled={selectedIds.size === 0}
                    >
                        Clear
                    </Button>
                    <Badge
                        variant="secondary"
                        className="border-none bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-100"
                    >
                        {selectedIds.size} selected
                    </Badge>
                </div>
            </div>

            {/* Table */}
            <div className="min-h-[400px] overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="max-h-[600px] overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-gray-50">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[40px] px-3 py-2">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300"
                                        checked={
                                            results.length > 0 && selectedIds.size === results.length
                                        }
                                        onChange={handleSelectAll}
                                        disabled={results.length === 0}
                                    />
                                </TableHead>
                                {TABLE_HEADERS.map((h) => (
                                    <TableHead
                                        key={h.key}
                                        className="cursor-pointer whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 hover:bg-gray-100"
                                        onClick={() => handleSort(h.key)}
                                    >
                                        <div className="flex items-center gap-1">
                                            {h.label}
                                            {sortKey === h.key ? (
                                                sortDirection === 'asc' ? (
                                                    <ArrowUp className="h-3 w-3" />
                                                ) : (
                                                    <ArrowDown className="h-3 w-3" />
                                                )
                                            ) : (
                                                <ArrowUpDown className="h-3 w-3 opacity-30" />
                                            )}
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        Loading candidates...
                                    </TableCell>
                                </TableRow>
                            ) : displayedResults.length === 0 ? (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell
                                        colSpan={7}
                                        className="h-24 text-center text-gray-500"
                                    >
                                        {activeTab === 'selected'
                                            ? "No candidates selected yet."
                                            : "No candidates found. Try adjusting your filters or adding names."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                displayedResults.map((r, idx) => {
                                    const isSelected = selectedIds.has(r.doc_id);
                                    return (
                                        <TableRow
                                            key={r.doc_id || idx}
                                            className={cn(
                                                'cursor-pointer hover:bg-gray-50',
                                                isSelected && 'bg-blue-50/50 hover:bg-blue-100'
                                            )}
                                            onClick={() => handleSelectRow(r.doc_id)}
                                        >
                                            <TableCell className="px-3 py-2">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleSelectRow(r.doc_id)}
                                                    className="rounded border-gray-300"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap px-3 py-2 font-medium">
                                                {r.name}
                                            </TableCell>
                                            <TableCell
                                                className="max-w-[200px] truncate px-3 py-2"
                                                title={r.email}
                                            >
                                                {r.email}
                                            </TableCell>
                                            <TableCell
                                                className="max-w-[150px] truncate px-3 py-2"
                                                title={r.sectors?.join(', ') || ''}
                                            >
                                                {r.sectors?.[0] || '-'}
                                            </TableCell>
                                            <TableCell
                                                className="max-w-[150px] truncate px-3 py-2"
                                                title={r.city || ''}
                                            >
                                                {r.city || '-'}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap px-3 py-2">
                                                {r.experience_years
                                                    ? `${r.experience_years} years`
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap px-3 py-2">
                                                {r.similarity ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                                                                style={{
                                                                    width: `${(r.similarity * 100).toFixed(0)}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-medium text-gray-700">
                                                            {(r.similarity * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                ) : (
                                                    '-'
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Prompt bar */}
            <div className="sticky bottom-2 z-10 mt-4">
                <div className="rounded-2xl border bg-white p-3 shadow-lg">
                    <div className="flex items-start gap-3">
                        <Textarea
                            className="min-h-[72px] flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-gray-900"
                            placeholder="Ask your question here (multiple questions allowed) — each resume gives an answer..."
                        />
                        <div className="w-56 space-y-2">
                            <Button className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">
                                Generate answers
                            </Button>
                            <div className="flex items-center justify-between text-xs text-gray-600">
                                <span>Status</span>
                                <span>0%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                <div
                                    className="h-full bg-blue-600 transition-all duration-500"
                                    style={{ width: '0%' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function keyToProperty(key: SortKey): keyof LookalikeResult {
    // Map sort keys to actual property names if they differ
    // For 'regions', we're using 'city' as a proxy for now.
    if (key === 'regions') return 'city';
    return key as keyof LookalikeResult;
}
