'use client';

import React from 'react';

import { Badge } from '@/components/ui/badge';
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
    sectors: string[];
    regions: string[];
    experience: string[];
    results: LookalikeResult[];
    isLoading: boolean;
}

const TABLE_HEADERS = [
    'Name',
    'Email',
    'Sector Level 1',
    'Sector Level 2',
    'Region Level 1',
    'Region Level 2',
    'Years Experience',
] as const;

export function ResultsWorkspace({
    names,
    sectors,
    regions,
    experience,
    results,
    isLoading,
}: ResultsWorkspaceProps) {
    return (
        <>
            {/* Tabs */}
            <div className="mb-3 flex items-center gap-2">
                <Button
                    variant="default"
                    className="rounded-xl text-sm bg-gray-900 text-white hover:bg-black"
                >
                    Candidates
                </Button>
                <Button
                    variant="outline"
                    className="rounded-xl text-sm bg-white hover:bg-gray-50 border-gray-200"
                >
                    Selected
                </Button>
                <div className="ml-auto flex items-center gap-2">
                    <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50">
                        Select all
                    </Button>
                    <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50">
                        Clear
                    </Button>
                    <Badge
                        variant="secondary"
                        className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 hover:bg-green-100 border-none"
                    >
                        {results.length} selected
                    </Badge>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-auto max-h-[600px]">
                    <Table>
                        <TableHeader className="bg-gray-50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-[40px] px-3 py-2">
                                    <input type="checkbox" className="rounded border-gray-300" />
                                </TableHead>
                                {TABLE_HEADERS.map((h) => (
                                    <TableHead
                                        key={h}
                                        className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap"
                                    >
                                        {h}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        Loading candidates...
                                    </TableCell>
                                </TableRow>
                            ) : results.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-gray-500">
                                        No candidates found. Try adjusting your filters or adding names.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                results.map((r, idx) => (
                                    <TableRow key={r.doc_id || idx} className="hover:bg-gray-50">
                                        <TableCell className="px-3 py-2">
                                            <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                                        </TableCell>
                                        <TableCell className="px-3 py-2 font-medium whitespace-nowrap">
                                            {r.name}
                                        </TableCell>
                                        <TableCell className="px-3 py-2 max-w-[200px] truncate" title={r.email}>
                                            {r.email}
                                        </TableCell>
                                        <TableCell className="px-3 py-2 max-w-[150px] truncate" title={r.sectors?.[0] || ''}>
                                            {r.sectors?.[0] || '-'}
                                        </TableCell>
                                        <TableCell className="px-3 py-2 max-w-[150px] truncate" title={r.sectors?.[1] || ''}>
                                            {r.sectors?.[1] || '-'}
                                        </TableCell>
                                        <TableCell className="px-3 py-2 whitespace-nowrap">{r.city || '-'}</TableCell>
                                        <TableCell className="px-3 py-2 whitespace-nowrap">{r.street || '-'}</TableCell>
                                        <TableCell className="px-3 py-2 whitespace-nowrap">
                                            {r.experience_years ? `${r.experience_years} years` : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Prompt bar */}
            <div className="sticky bottom-2 mt-4 z-10">
                <div className="rounded-2xl border bg-white shadow-lg p-3">
                    <div className="flex items-start gap-3">
                        <Textarea
                            className="flex-1 min-h-[72px] rounded-lg border px-3 py-2 text-sm resize-none focus-visible:ring-1 focus-visible:ring-gray-900"
                            placeholder="Ask your question here (multiple questions allowed) — each resume gives an answer..."
                        />
                        <div className="w-56 space-y-2">
                            <Button className="w-full rounded-lg bg-blue-600 text-white px-3 py-2 text-sm hover:bg-blue-700">
                                Generate answers
                            </Button>
                            <div className="flex items-center justify-between text-xs text-gray-600">
                                <span>Status</span>
                                <span>0%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: '0%' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
