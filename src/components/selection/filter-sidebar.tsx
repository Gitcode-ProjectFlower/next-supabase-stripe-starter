'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FilterSidebarProps {
    names: string[];
    setNames: (names: string[]) => void;
    sectors: string[];
    setSectors: (sectors: string[]) => void;
    regions: string[];
    setRegions: (regions: string[]) => void;
    experience: string[];
    setExperience: (experience: string[]) => void;
    onSearch: () => void;
    isLoading: boolean;
    resultsCount: number;
}

const REGION_OPTIONS = [
    'Scotland',
    'East of England',
    'West Midlands',
    'South West',
    'London',
    'Northern Ireland',
];

const SECTOR_OPTIONS = [
    '3PL / Warehousing',
    'E‑commerce Fulfillment',
    'Freight Forwarding',
    'Distribution',
];

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

    const handleMultiSelectChange = (
        e: React.ChangeEvent<HTMLSelectElement>,
        setter: (values: string[]) => void
    ) => {
        const selectedOptions = Array.from(e.target.selectedOptions, (option) => option.value);
        setter(selectedOptions);
    };

    return (
        <div className="sticky top-[80px] space-y-6">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    Input
                </h3>

                {/* Names */}
                <label className="text-sm text-gray-600">Names (press Enter to add)</label>
                <div className="mt-2 flex gap-2 flex-wrap">
                    {names.map((name, idx) => (
                        <Badge
                            key={idx}
                            variant="secondary"
                            className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-white border shadow-sm font-normal"
                        >
                            {name}
                            <button
                                onClick={() => removeName(idx)}
                                className="rounded-full p-0.5 hover:bg-gray-100 transition-colors"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                    <Input
                        className="flex-1 rounded-lg border px-3 py-2 text-sm bg-white"
                        placeholder={names.length >= 4 ? "Max 4 names" : "e.g. Jordan Lee"}
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
                <div className="mt-4">
                    <label className="block text-sm text-gray-600 mb-1">Sector</label>
                    <select
                        multiple
                        className="w-full rounded-lg border px-2 py-2 text-sm h-24 bg-white focus:ring-2 focus:ring-black focus:outline-none"
                        value={sectors}
                        onChange={(e) => handleMultiSelectChange(e, setSectors)}
                    >
                        {SECTOR_OPTIONS.map((s) => (
                            <option key={s} value={s} className="py-1 px-2 rounded hover:bg-gray-100 cursor-pointer">
                                {s}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Region */}
                <div className="mt-4">
                    <label className="block text-sm text-gray-600 mb-1">Region</label>
                    <select
                        multiple
                        className="w-full rounded-lg border px-2 py-2 text-sm h-40 bg-white focus:ring-2 focus:ring-black focus:outline-none"
                        value={regions}
                        onChange={(e) => handleMultiSelectChange(e, setRegions)}
                    >
                        {REGION_OPTIONS.map((r) => (
                            <option key={r} value={r} className="py-1 px-2 rounded hover:bg-gray-100 cursor-pointer">
                                {r}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Years experience */}
                <div className="mt-4">
                    <label className="block text-sm text-gray-600 mb-1">Years experience</label>
                    <div className="flex flex-wrap gap-2">
                        {EXPERIENCE_OPTIONS.map((sz) => (
                            <button
                                key={sz}
                                onClick={() => toggleExperience(sz)}
                                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${experience.includes(sz)
                                    ? 'bg-gray-900 text-white border-gray-900'
                                    : 'bg-white hover:bg-gray-50 text-gray-700'
                                    }`}
                            >
                                {sz}
                            </button>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="mt-4 flex items-center gap-2">
                    <Button
                        className="rounded-lg bg-blue-600 text-white text-sm px-4 py-2 hover:bg-blue-700 w-full justify-center"
                        onClick={onSearch}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Searching...' : names.length > 0 ? 'Find lookalikes' : 'Search candidates'}
                    </Button>
                    {resultsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 whitespace-nowrap">
                            {resultsCount} candidates
                        </span>
                    )}
                </div>
            </div>

            <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    Info
                </h3>
                <ul className="text-sm text-gray-600 space-y-1 list-disc ml-4">
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
