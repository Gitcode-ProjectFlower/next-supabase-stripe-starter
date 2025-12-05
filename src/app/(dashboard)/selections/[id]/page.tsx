'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

interface SelectionItem {
    doc_id: string;
    name: string;
    email: string;
    city: string;
    street: string;
    sectors: string[];
    experience_years: number;
    similarity: number;
}

interface SelectionDetail {
    id: string;
    name: string;
    item_count: number;
    created_at: string;
    expires_at: string;
    criteria: {
        names?: string[];
        sectors?: string[];
        regions?: string[];
        experience_years?: number[];
        top_k?: number;
    };
    items: SelectionItem[];
}

export default function SelectionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [selection, setSelection] = useState<SelectionDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isQAModalOpen, setIsQAModalOpen] = useState(false);
    const [qaPrompt, setQaPrompt] = useState('');
    const [isProcessingQA, setIsProcessingQA] = useState(false);
    const [qaProgress, setQaProgress] = useState(0);

    useEffect(() => {
        if (params.id) {
            fetchSelection(params.id as string);
        }
    }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchSelection = async (id: string) => {
        setIsLoading(true);

        // Mock data for demo
        if (id === 'demo') {
            const mockSelection: SelectionDetail = {
                id: 'demo',
                name: 'Demo Selection',
                item_count: 5,
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                criteria: {
                    names: ['John', 'Jane'],
                    sectors: ['IT', 'Finance'],
                    regions: ['London'],
                    experience_years: [5, 10],
                    top_k: 100
                },
                items: [
                    {
                        doc_id: '1',
                        name: 'John Doe',
                        email: 'john@example.com',
                        city: 'London',
                        street: 'Baker St',
                        sectors: ['IT'],
                        experience_years: 8,
                        similarity: 0.95
                    },
                    {
                        doc_id: '2',
                        name: 'Jane Smith',
                        email: 'jane@example.com',
                        city: 'Manchester',
                        street: 'High St',
                        sectors: ['Finance'],
                        experience_years: 12,
                        similarity: 0.88
                    },
                    {
                        doc_id: '3',
                        name: 'Bob Johnson',
                        email: 'bob@example.com',
                        city: 'London',
                        street: 'Oxford St',
                        sectors: ['IT'],
                        experience_years: 5,
                        similarity: 0.82
                    },
                    {
                        doc_id: '4',
                        name: 'Alice Brown',
                        email: 'alice@example.com',
                        city: 'Leeds',
                        street: 'Main St',
                        sectors: ['Marketing'],
                        experience_years: 3,
                        similarity: 0.75
                    },
                    {
                        doc_id: '5',
                        name: 'Charlie Wilson',
                        email: 'charlie@example.com',
                        city: 'Liverpool',
                        street: 'Dock Rd',
                        sectors: ['Sales'],
                        experience_years: 15,
                        similarity: 0.65
                    }
                ]
            };

            setTimeout(() => {
                setSelection(mockSelection);
                setIsLoading(false);
            }, 500);
            return;
        }

        try {
            const response = await fetch(`/api/selections/${id}`);
            if (!response.ok) throw new Error('Failed to fetch selection');
            const data = await response.json();
            setSelection(data.selection);
        } catch (error) {
            console.error('Error fetching selection:', error);
            toast({
                title: 'Error',
                description: 'Failed to load selection',
                variant: 'destructive',
            });
            router.push('/selections');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleQA = async () => {
        if (!qaPrompt.trim()) {
            toast({
                title: 'Validation Error',
                description: 'Please enter a question',
                variant: 'destructive',
            });
            return;
        }

        if (!params.id) return;

        setIsProcessingQA(true);
        setQaProgress(0);

        try {
            // Start Q&A job
            const response = await fetch(`/api/selections/${params.id}/qa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: qaPrompt }),
            });

            if (!response.ok) throw new Error('Failed to start Q&A job');

            const data = await response.json();

            toast({
                title: 'Success',
                description: 'Q&A job started! Processing in background...',
            });

            setIsProcessingQA(false);
            setIsQAModalOpen(false);
            setQaPrompt('');

            // For now, redirect to demo results page
            // In production, you'd create a QA record and poll for its status
            setTimeout(() => {
                router.push(`/selections/${params.id}/qa/demo-qa-1`);
            }, 1000);

        } catch (error) {
            console.error('Error processing Q&A:', error);
            toast({
                title: 'Error',
                description: 'Failed to process Q&A',
                variant: 'destructive',
            });
            setIsProcessingQA(false);
            setQaProgress(0);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="text-lg font-medium text-gray-900">Loading selection...</div>
                </div>
            </div>
        );
    }

    if (!selection) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        className="mb-4 -ml-2 hover:bg-gray-100"
                        onClick={() => router.push('/selections')}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Selections
                    </Button>

                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-black">{selection.name}</h1>
                            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                                <span>{selection.item_count} candidates</span>
                                <span>•</span>
                                <span>Created: {formatDate(selection.created_at)}</span>
                                <span>•</span>
                                <span>Expires: {formatDate(selection.expires_at)}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="rounded-lg px-4 py-2 hover:bg-gray-100"
                                onClick={() => setIsQAModalOpen(true)}
                            >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Ask Q&A
                            </Button>
                            <Button
                                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                                onClick={() => {
                                    toast({
                                        title: 'Coming soon',
                                        description: 'CSV export will be available soon',
                                    });
                                }}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Filters Summary */}
                {selection.criteria && (
                    <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
                        <h2 className="mb-2 font-semibold text-gray-900">Search Criteria</h2>
                        <div className="flex flex-wrap gap-2">
                            {selection.criteria.names && selection.criteria.names.length > 0 && (
                                <div className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm">
                                    <span className="font-medium text-gray-700">Names:</span>{' '}
                                    <span className="text-gray-600">{selection.criteria.names.join(', ')}</span>
                                </div>
                            )}
                            {selection.criteria.sectors && selection.criteria.sectors.length > 0 && (
                                <div className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm">
                                    <span className="font-medium text-gray-700">Sectors:</span>{' '}
                                    <span className="text-gray-600">{selection.criteria.sectors.length} selected</span>
                                </div>
                            )}
                            {selection.criteria.regions && selection.criteria.regions.length > 0 && (
                                <div className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm">
                                    <span className="font-medium text-gray-700">Regions:</span>{' '}
                                    <span className="text-gray-600">{selection.criteria.regions.length} selected</span>
                                </div>
                            )}
                            {selection.criteria.top_k && (
                                <div className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm">
                                    <span className="font-medium text-gray-700">Top-K:</span>{' '}
                                    <span className="text-gray-600">{selection.criteria.top_k}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Candidates Table */}
                <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="px-4 py-3 font-semibold text-gray-700">Name</TableHead>
                                <TableHead className="px-4 py-3 font-semibold text-gray-700">Email</TableHead>
                                <TableHead className="px-4 py-3 font-semibold text-gray-700">City</TableHead>
                                <TableHead className="px-4 py-3 font-semibold text-gray-700">Sector</TableHead>
                                <TableHead className="px-4 py-3 font-semibold text-gray-700">Experience</TableHead>
                                <TableHead className="px-4 py-3 font-semibold text-gray-700">Fit Score</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selection.items?.map((item) => (
                                <TableRow key={item.doc_id} className="hover:bg-gray-50">
                                    <TableCell className="px-4 py-3 font-medium">{item.name}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-600">{item.email}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-600">{item.city}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-600">
                                        {item.sectors?.[0] || '-'}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-600">
                                        {item.experience_years ? `${item.experience_years} years` : '-'}
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                                                <div
                                                    className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                                                    style={{
                                                        width: `${(item.similarity * 100).toFixed(0)}%`,
                                                    }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium text-gray-700">
                                                {(item.similarity * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Q&A Modal */}
            <Dialog open={isQAModalOpen} onOpenChange={setIsQAModalOpen}>
                <DialogContent className="sm:max-w-[600px] bg-white">
                    <DialogHeader>
                        <DialogTitle>Ask Questions to Candidates</DialogTitle>
                        <DialogDescription className='text-gray-700'>
                            Enter your question(s) below. Each candidate will be asked the same question(s) and their answers will be generated based on their CV.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <Textarea
                            placeholder="e.g., What is your experience with React? Do you have leadership experience?"
                            value={qaPrompt}
                            onChange={(e) => setQaPrompt(e.target.value)}
                            className="min-h-[120px] placeholder:text-gray-500 border-gray-700 focus:bo"
                            disabled={isProcessingQA}
                        />

                        {isProcessingQA && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm text-gray-600">
                                    <span>Processing Q&A...</span>
                                    <span>{qaProgress}%</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                    <div
                                        className="h-full bg-blue-600 transition-all duration-500"
                                        style={{ width: `${qaProgress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500">
                                    This may take a few minutes depending on the number of candidates...
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsQAModalOpen(false);
                                setQaPrompt('');
                            }}
                            disabled={isProcessingQA}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleQA}
                            disabled={isProcessingQA || !qaPrompt.trim()}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isProcessingQA ? 'Processing...' : 'Generate Answers'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
