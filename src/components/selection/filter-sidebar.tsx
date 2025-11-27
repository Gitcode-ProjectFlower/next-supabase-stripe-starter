'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

import { TreeMultiSelect } from '@/components/selection/tree-multi-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { REGIONS_TREE } from '@/data/regions-tree';
import { SECTORS_TREE } from '@/data/sectors-tree';

interface FilterSidebarProps {
    names: string[];
    setNames: (names: string[]) => void;
    sectors: Set<string>;
    setSectors: (sectors: Set<string>) => void;
    regions: Set<string>;
    setRegions: (regions: Set<string>) => void;
    experience: string[];
    setExperience: (experience: string[]) => void;
    topK: number;
    setTopK: (topK: number) => void;
    onSearch: () => void;
    isLoading: boolean;
    resultsCount: number;
}

const EXPERIENCE_OPTIONS = ['1-5', '6-10', '11-15', '16-20', '21-25'];

export function FilterSidebar({
    names,
    setNames,
    sectors,
    setSectors,
    regions,
    setRegions,
    experience,
    setExperience,
    topK,
    setTopK,
    onSearch,
    isLoading,
    resultsCount,
}: FilterSidebarProps) {
    const [nameInput, setNameInput] = useState('');

    const handleAddName = () => {
        if (nameInput.trim() && names.length < 4) {
            setNames([...names, nameInput.trim()]);
            setNameInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddName();
        }
    };

    const removeName = (index: number) => {
        setNames(names.filter((_, i) => i !== index));
    };

    const toggleExperience = (value: string) => {
        if (experience.includes(value)) {
            setExperience(experience.filter((e) => e !== value));
        } else {
            setExperience([...experience, value]);
        }
    };

    return (
        <div className="sticky top-[80px] space-y-6">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
                    Input
                </h3>

                {/* Names */}
                <label className="text-sm text-gray-600">Names (press Enter to add)</label>
                <div className="mt-2 flex flex-wrap gap-2">
                    {names.map((name, idx) => (
                        <Badge
                            key={idx}
                            variant="secondary"
                            className="inline-flex items-center gap-2 border bg-white px-3 py-1 text-sm font-normal shadow-sm"
                        >
                            {name}
                            <button
                                onClick={() => removeName(idx)}
                                className="rounded-full p-0.5 transition-colors hover:bg-gray-100"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                    <Input
                        placeholder={names.length >= 4 ? 'Max 4 names' : 'e.g. Jordan Lee'}
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={names.length >= 4}
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleAddName}
                        disabled={names.length >= 4 || !nameInput.trim()}
                        className="shrink-0 bg-white"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                {/* Sector */}
                <div className="relative mt-4">
                    <label className="mb-1 block text-sm text-gray-600">Sector</label>
                    <TreeMultiSelect
                        data={SECTORS_TREE}
                        selected={sectors}
                        onChange={setSectors}
                        placeholder="Select sectors..."
                    />
                </div>

                {/* Region */}
                <div className="relative mt-4">
                    <label className="mb-1 block text-sm text-gray-600">Region</label>
                    <TreeMultiSelect
                        data={REGIONS_TREE}
                        selected={regions}
                        onChange={setRegions}
                        placeholder="Select regions..."
                    />
                </div>

                {/* Years experience */}
                <div className="mt-4">
                    <label className="mb-1 block text-sm text-gray-600">Years experience</label>
                    <div className="flex flex-wrap gap-2">
                        {EXPERIENCE_OPTIONS.map((sz) => (
                            <button
                                key={sz}
                                onClick={() => toggleExperience(sz)}
                                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${experience.includes(sz)
                                    ? 'border-gray-900 bg-gray-900 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {sz}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Top-K */}
                <div className="mt-4">
                    <label className="mb-1 block text-sm text-gray-600">
                        Number of results (Top-K)
                    </label>
                    <Input
                        type="number"
                        min="1"
                        max="5000"
                        value={topK}
                        onChange={(e) => {
                            const value = parseInt(e.target.value) || 100;
                            setTopK(Math.min(5000, Math.max(1, value)));
                        }}
                        placeholder="100"
                        className="w-full"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Plan cap: <span className="font-semibold">100</span> (Small plan)
                    </p>
                </div>

                {/* CTA */}
                <div className="mt-4 flex items-center gap-2">
                    <Button
                        className="w-full justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                        onClick={onSearch}
                        disabled={isLoading}
                    >
                        {isLoading
                            ? 'Searching...'
                            : names.length > 0
                                ? 'Find lookalikes'
                                : 'Search candidates'}
                    </Button>
                    {resultsCount > 0 && (
                        <span className="whitespace-nowrap rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {resultsCount} candidates
                        </span>
                    )}
                </div>
            </div>

            <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
                    Info
                </h3>
                <ul className="ml-4 list-disc space-y-1 text-sm text-gray-600">
                    <li>
                        Sector labels are <b>country-specific</b>.
                    </li>
                    <li>
                        Lookalikes are sorted by <b>fit score</b>.
                    </li>
                    <li>Export to CSV with one click.</li>
                </ul>
            </div>
        </div>
    );
}
