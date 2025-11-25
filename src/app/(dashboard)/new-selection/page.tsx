'use client';

import React, { useState } from 'react';

import { FilterSidebar } from '@/components/selection/filter-sidebar';
import { ResultsWorkspace } from '@/components/selection/results-workspace';
import { useToast } from '@/components/ui/use-toast';

export interface LookalikeResult {
    doc_id: string;
    name: string;
    email: string;
    city: string;
    street: string;
    sectors: string[];
    experience_years: number;
    similarity: number;
}

export default function NewSelectionPage() {
    const { toast } = useToast();

    // State for filters
    const [names, setNames] = useState<string[]>([]);
    const [sectors, setSectors] = useState<string[]>([]);
    const [regions, setRegions] = useState<string[]>([]);
    const [experience, setExperience] = useState<string[]>([]);

    // State for results
    const [results, setResults] = useState<LookalikeResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/lookalikes/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    names,
                    sectors,
                    regions,
                    experience_years: experience.map(e => parseInt(e.split('-')[0])), // Simple parsing for now
                    top_k: 100, // Default for now
                }),
            });

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const data = await response.json();
            setResults(data.results || []);

            toast({
                title: 'Search completed',
                description: `Found ${data.results?.length || 0} candidates`,
            });
        } catch (error) {
            console.error('Search error:', error);
            toast({
                title: 'Search failed',
                description: 'Please try again later',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
                <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
                    <div className="ml-auto flex items-center gap-2">
                        <input
                            className="rounded-lg border px-3 py-1.5 text-sm w-64 bg-white"
                            defaultValue="New selection"
                        />
                        <button className="rounded-lg bg-gray-900 text-white text-sm px-4 py-2 hover:bg-black transition-colors">
                            Save
                        </button>
                        <button className="rounded-lg border text-sm px-3 py-2 hover:bg-gray-100 transition-colors bg-white">
                            Export CSV
                        </button>
                        <button className="rounded-lg border text-sm px-3 py-2 hover:bg-gray-100 transition-colors bg-white">
                            History
                        </button>
                        <div className="h-6 w-px bg-gray-200" />
                        <div className="text-sm text-gray-600">Profile</div>
                    </div>
                </div>
            </header>

            {/* Body */}
            <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-12 gap-6">
                {/* Left: Filters */}
                <aside className="col-span-12 lg:col-span-3">
                    <FilterSidebar
                        names={names}
                        setNames={setNames}
                        sectors={sectors}
                        setSectors={setSectors}
                        regions={regions}
                        setRegions={setRegions}
                        experience={experience}
                        setExperience={setExperience}
                        onSearch={handleSearch}
                        isLoading={isLoading}
                        resultsCount={results.length}
                    />
                </aside>

                {/* Right: Workspace */}
                <main className="col-span-12 lg:col-span-9 relative">
                    <ResultsWorkspace
                        names={names}
                        sectors={sectors}
                        regions={regions}
                        experience={experience}
                        results={results}
                        isLoading={isLoading}
                    />
                </main>
            </div>
        </div>
    );
}
