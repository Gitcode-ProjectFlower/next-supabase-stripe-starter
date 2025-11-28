'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';

interface CandidateAnswer {
    doc_id: string;
    name: string;
    email: string;
    city: string;
    answer: string;
    status: 'success' | 'failed';
    error_message?: string;
}

interface QAResult {
    id: string;
    selection_id: string;
    selection_name: string;
    prompt: string;
    status: 'processing' | 'completed' | 'failed';
    progress: number;
    created_at: string;
    completed_at?: string;
    error_message?: string;
    csv_url?: string;
    answers: CandidateAnswer[];
}

export default function QAResultsPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [qaResult, setQaResult] = useState<QAResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (params.id && params.qa_id) {
            fetchQAResult(params.id as string, params.qa_id as string);
        }
    }, [params.id, params.qa_id]);

    const fetchQAResult = async (selectionId: string, qaId: string) => {
        setIsLoading(true);

        // Mock data for demo
        if (selectionId === 'demo' && qaId === 'demo-qa-1') {
            const mockResult: QAResult = {
                id: 'demo-qa-1',
                selection_id: 'demo',
                selection_name: 'Demo Selection',
                prompt: 'What is your experience with React and TypeScript?',
                status: 'completed',
                progress: 100,
                created_at: new Date(Date.now() - 3600000).toISOString(),
                completed_at: new Date().toISOString(),
                csv_url: '#',
                answers: [
                    {
                        doc_id: '1',
                        name: 'John Doe',
                        email: 'john@example.com',
                        city: 'London',
                        answer: 'I have 5 years of experience with React and 3 years with TypeScript. I have built multiple large-scale applications using these technologies, including e-commerce platforms and SaaS products.',
                        status: 'success'
                    },
                    {
                        doc_id: '2',
                        name: 'Jane Smith',
                        email: 'jane@example.com',
                        city: 'Manchester',
                        answer: 'I have extensive experience with both React and TypeScript. I have been using React for 7 years and TypeScript for 4 years. I specialize in building complex UI components and state management solutions.',
                        status: 'success'
                    },
                    {
                        doc_id: '3',
                        name: 'Bob Johnson',
                        email: 'bob@example.com',
                        city: 'London',
                        answer: 'I have worked with React for 3 years and recently started using TypeScript. I am comfortable building modern web applications with hooks and functional components.',
                        status: 'success'
                    },
                    {
                        doc_id: '4',
                        name: 'Alice Brown',
                        email: 'alice@example.com',
                        city: 'Leeds',
                        answer: '',
                        status: 'failed',
                        error_message: 'Insufficient information in CV'
                    },
                    {
                        doc_id: '5',
                        name: 'Charlie Wilson',
                        email: 'charlie@example.com',
                        city: 'Liverpool',
                        answer: 'I have 2 years of experience with React. I am currently learning TypeScript and have used it in a few small projects.',
                        status: 'success'
                    }
                ]
            };

            setTimeout(() => {
                setQaResult(mockResult);
                setIsLoading(false);
            }, 500);
            return;
        }

        try {
            const response = await fetch(`/api/selections/${selectionId}/qa/${qaId}`);
            if (!response.ok) throw new Error('Failed to fetch Q&A results');
            const data = await response.json();
            setQaResult(data);

            // Poll if still processing
            if (data.status === 'processing') {
                setTimeout(() => fetchQAResult(selectionId, qaId), 2000);
            }
        } catch (error) {
            console.error('Error fetching Q&A results:', error);
            toast({
                title: 'Error',
                description: 'Failed to load Q&A results',
                variant: 'destructive',
            });
            router.push(`/selections/${selectionId}`);
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

    const getStatusBadge = (status: string) => {
        const styles = {
            processing: 'bg-blue-100 text-blue-800',
            completed: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800',
        };
        return (
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status as keyof typeof styles]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const handleDownloadCSV = () => {
        if (qaResult?.csv_url) {
            window.open(qaResult.csv_url, '_blank');
        } else {
            toast({
                title: 'Coming soon',
                description: 'CSV download will be available soon',
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="text-lg font-medium text-gray-900">Loading Q&A results...</div>
                </div>
            </div>
        );
    }

    if (!qaResult) {
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
                        onClick={() => router.push(`/selections/${params.id}`)}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Selection
                    </Button>

                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-black">Q&A Results</h1>
                            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                                <span>{qaResult.selection_name}</span>
                                <span>•</span>
                                <span>Created: {formatDate(qaResult.created_at)}</span>
                                {qaResult.completed_at && (
                                    <>
                                        <span>•</span>
                                        <span>Completed: {formatDate(qaResult.completed_at)}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {getStatusBadge(qaResult.status)}
                            {qaResult.status === 'completed' && (
                                <Button
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                                    onClick={handleDownloadCSV}
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download CSV
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Question Card */}
                <div className="mb-6 rounded-2xl border bg-white p-6">
                    <h2 className="mb-2 font-semibold text-gray-900">Question</h2>
                    <p className="text-gray-700">{qaResult.prompt}</p>

                    {qaResult.status === 'processing' && (
                        <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>Processing...</span>
                                <span>{qaResult.progress}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                <div
                                    className="h-full bg-blue-600 transition-all duration-500"
                                    style={{ width: `${qaResult.progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {qaResult.status === 'failed' && qaResult.error_message && (
                        <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
                            <strong>Error:</strong> {qaResult.error_message}
                        </div>
                    )}
                </div>

                {/* Results Table */}
                {qaResult.answers.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border bg-white">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="px-4 py-3 font-semibold text-gray-700">Name</TableHead>
                                    <TableHead className="px-4 py-3 font-semibold text-gray-700">Email</TableHead>
                                    <TableHead className="px-4 py-3 font-semibold text-gray-700">City</TableHead>
                                    <TableHead className="px-4 py-3 font-semibold text-gray-700">Answer</TableHead>
                                    <TableHead className="px-4 py-3 font-semibold text-gray-700">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {qaResult.answers.map((answer) => (
                                    <TableRow key={answer.doc_id} className="hover:bg-gray-50">
                                        <TableCell className="px-4 py-3 font-medium">{answer.name}</TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-gray-600">{answer.email}</TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-gray-600">{answer.city}</TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-gray-700">
                                            {answer.status === 'success' ? (
                                                <div className="max-w-md">{answer.answer}</div>
                                            ) : (
                                                <div className="text-red-600">
                                                    {answer.error_message || 'Failed to generate answer'}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <span
                                                className={`rounded-full px-2 py-1 text-xs font-medium ${answer.status === 'success'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}
                                            >
                                                {answer.status}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );
}
