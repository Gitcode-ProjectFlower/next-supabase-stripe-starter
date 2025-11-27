'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

import { FilterSidebar } from '@/components/selection/filter-sidebar';
import { ResultsWorkspace } from '@/components/selection/results-workspace';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
    const router = useRouter();

    // State for filters
    const [names, setNames] = useState<string[]>([]);
    const [sectors, setSectors] = useState<Set<string>>(new Set());
    const [regions, setRegions] = useState<Set<string>>(new Set());
    const [experience, setExperience] = useState<string[]>([]);
    const [topK, setTopK] = useState<number>(100);

    // State for selection metadata
    const [selectionName, setSelectionName] = useState('New selection');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

    // State for results
    const [results, setResults] = useState<LookalikeResult[]>([
        {
            doc_id: '1',
            name: 'John Smith',
            email: 'john.smith@example.com',
            city: 'London',
            street: '123 Baker Street',
            sectors: ['INFORMATION AND COMMUNICATION', 'PROFESSIONAL'],
            experience_years: 8,
            similarity: 0.95,
        },
        {
            doc_id: '2',
            name: 'Emma Johnson',
            email: 'emma.johnson@example.com',
            city: 'Manchester',
            street: '456 Oxford Road',
            sectors: ['FINANCIAL AND INSURANCE ACTIVITIES'],
            experience_years: 12,
            similarity: 0.92,
        },
        {
            doc_id: '3',
            name: 'Michael Brown',
            email: 'michael.brown@example.com',
            city: 'Birmingham',
            street: '789 High Street',
            sectors: ['MANUFACTURING', 'CONSTRUCTION'],
            experience_years: 15,
            similarity: 0.88,
        },
        {
            doc_id: '4',
            name: 'Sarah Davis',
            email: 'sarah.davis@example.com',
            city: 'Leeds',
            street: '321 Park Lane',
            sectors: ['EDUCATION'],
            experience_years: 6,
            similarity: 0.85,
        },
        {
            doc_id: '5',
            name: 'James Wilson',
            email: 'james.wilson@example.com',
            city: 'Liverpool',
            street: '654 Church Street',
            sectors: ['HUMAN HEALTH AND SOCIAL WORK ACTIVITIES'],
            experience_years: 10,
            similarity: 0.82,
        },
        {
            doc_id: '6',
            name: 'Olivia Taylor',
            email: 'olivia.taylor@example.com',
            city: 'Bristol',
            street: '987 Queen Street',
            sectors: ['ARTS', 'OTHER SERVICE ACTIVITIES'],
            experience_years: 4,
            similarity: 0.78,
        },
        {
            doc_id: '7',
            name: 'William Anderson',
            email: 'william.anderson@example.com',
            city: 'Newcastle',
            street: '147 King Street',
            sectors: ['TRANSPORTATION AND STORAGE'],
            experience_years: 20,
            similarity: 0.75,
        },
        {
            doc_id: '8',
            name: 'Sophia Martinez',
            email: 'sophia.martinez@example.com',
            city: 'Sheffield',
            street: '258 Market Street',
            sectors: ['WHOLESALE AND RETAIL TRADE; REPAIR OF MOTOR VEHICLES AND MOTORCYCLES'],
            experience_years: 7,
            similarity: 0.72,
        },
        {
            doc_id: '9',
            name: 'Daniel Thomas',
            email: 'daniel.thomas@example.com',
            city: 'Nottingham',
            street: '369 Station Road',
            sectors: ['REAL ESTATE ACTIVITIES'],
            experience_years: 9,
            similarity: 0.68,
        },
        {
            doc_id: '10',
            name: 'Emily White',
            email: 'emily.white@example.com',
            city: 'Leicester',
            street: '741 Bridge Street',
            sectors: ['ACCOMMODATION AND FOOD SERVICE ACTIVITIES'],
            experience_years: 5,
            similarity: 0.65,
        },
    ]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = async () => {
        setIsLoading(true);
        // Clear selection on new search to avoid stale IDs
        setSelectedIds(new Set());

        try {
            const response = await fetch('/api/lookalikes/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    names,
                    sectors: Array.from(sectors),
                    regions: Array.from(regions),
                    experience_years: experience.map((e) => parseInt(e.split('-')[0])),
                    top_k: 100,
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

    const handleSaveClick = () => {
        if (selectedIds.size === 0) {
            toast({
                title: 'No candidates selected',
                description: 'Please select at least one candidate to save.',
                variant: 'destructive',
            });
            return;
        }
        setIsSaveModalOpen(true);
    };

    const confirmSave = async () => {
        setIsSaving(true);
        try {
            const selectedItems = results.filter((r) => selectedIds.has(r.doc_id));

            const response = await fetch('/api/selections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: selectionName,
                    criteria: {
                        names,
                        sectors: Array.from(sectors),
                        regions: Array.from(regions),
                        experience_years: experience.map((e) => parseInt(e.split('-')[0])),
                    },
                    top_k: 100, // This should ideally match what was searched
                    items: selectedItems,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save selection');
            }

            const data = await response.json();

            toast({
                title: 'Selection saved',
                description: `Successfully saved ${selectedItems.length} candidates.`,
            });

            // Redirect to the new selection page
            router.push(`/selections/${data.selection_id}`);
        } catch (error) {
            console.error('Save error:', error);
            toast({
                title: 'Save failed',
                description: error instanceof Error ? error.message : 'Please try again later',
                variant: 'destructive',
            });
            setIsSaving(false); // Only reset if failed, otherwise we redirect
            setIsSaveModalOpen(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            {/* Header */}
            <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
                    <div className="ml-auto flex items-center gap-2">
                        <Input
                            value={selectionName}
                            onChange={(e) => setSelectionName(e.target.value)}
                            placeholder="Selection Name"
                        />
                        <Button
                            onClick={handleSaveClick}
                            disabled={isSaving || selectedIds.size === 0}
                            className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button variant="outline" className="rounded-lg border bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-100">
                            Export CSV
                        </Button>
                        <Button variant="outline" className="rounded-lg border bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-100">
                            History
                        </Button>
                        <div className="h-6 w-px bg-gray-200" />
                        <div className="text-sm text-gray-600">Profile</div>
                    </div>
                </div>
            </header>

            {/* Body */}
            <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-4 py-6">
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
                        topK={topK}
                        setTopK={setTopK}
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
                        selectedIds={selectedIds}
                        onSelectionChange={setSelectedIds}
                    />
                </main>
            </div>

            <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
                <DialogContent className="bg-white sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Save Selection</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 pt-4">
                        <div className="text-sm text-gray-700">
                            You are about to save <span className="font-semibold text-gray-900">{selectedIds.size} candidates</span> to &quot;{selectionName}&quot;.
                        </div>

                        {/* Filters Summary */}
                        {(names.length > 0 || sectors.size > 0 || regions.size > 0 || experience.length > 0) && (
                            <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                                <div className="font-semibold text-gray-900 mb-2">Filters applied:</div>
                                <ul className="space-y-1 text-gray-700">
                                    {names.length > 0 && (
                                        <li>• Names: {names.join(', ')}</li>
                                    )}
                                    {sectors.size > 0 && (
                                        <li>• Sectors: {sectors.size} selected</li>
                                    )}
                                    {regions.size > 0 && (
                                        <li>• Regions: {regions.size} selected</li>
                                    )}
                                    {experience.length > 0 && (
                                        <li>• Experience: {experience.join(', ')} years</li>
                                    )}
                                    <li>• Top-K: {topK}</li>
                                </ul>
                            </div>
                        )}

                        {/* Expiration Info */}
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>
                                Expires on: <span className="font-semibold text-gray-900">
                                    {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </span> (7 days)
                            </span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSaveModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmSave} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Confirm Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
