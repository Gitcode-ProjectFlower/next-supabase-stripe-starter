'use client';

import { ArrowLeft, Download, MessageSquare } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { getVisibleColumns, type UserPlan } from '@/libs/plan-config';
import { useSelectionDetailQuery, useUsageStatsQuery } from '@/libs/queries';
import { createSupabaseBrowserClient } from '@/libs/supabase/supabase-browser-client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/utils/cn';

type ColumnKey = 'name' | 'email' | 'phone' | 'city' | 'street' | 'sectors' | 'experience_years' | 'similarity';

interface SelectionItem {
  doc_id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  street?: string;
  sectors?: string[];
  experience_years?: number;
  similarity?: number;
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

const COLUMN_CONFIG: Record<
  ColumnKey,
  {
    label: string;
    render: (row: SelectionItem) => React.ReactNode;
  }
> = {
  name: { label: 'Name', render: (row) => row.name },
  email: { label: 'Email', render: (row) => row.email || '-' },
  phone: { label: 'Phone', render: (row) => row.phone || '-' },
  city: { label: 'City', render: (row) => row.city || '-' },
  street: { label: 'Street', render: (row) => row.street || '-' },
  sectors: { label: 'Sector', render: (row) => row.sectors?.[0] || '-' },
  experience_years: {
    label: 'Experience',
    render: (row) => (row.experience_years ? `${row.experience_years} years` : '-'),
  },
  similarity: {
    label: 'Fit Score',
    render: (row) =>
      row.similarity ? (
        <div className='flex items-center gap-2'>
          <div className='h-2 w-24 overflow-hidden rounded-full bg-gray-200'>
            <div
              className='h-full bg-gradient-to-r from-blue-500 to-green-500'
              style={{ width: `${(row.similarity * 100).toFixed(0)}%` }}
            />
          </div>
          <span className='text-xs font-medium text-gray-700'>{(row.similarity * 100).toFixed(0)}%</span>
        </div>
      ) : (
        '-'
      ),
  },
};

export default function SelectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();
  const isDemo = params.id === 'demo';
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isQAModalOpen, setIsQAModalOpen] = useState(false);
  const [qaPrompt, setQaPrompt] = useState('');
  const [isProcessingQA, setIsProcessingQA] = useState(false);
  const [qaProgress, setQaProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [userPlan, setUserPlan] = useState<UserPlan>('anonymous');
  const { data: usageStats, error: usageError } = useUsageStatsQuery({ retry: 0 });
  const {
    data: selectionData,
    isLoading: isSelectionLoading,
    error: selectionError,
  } = useSelectionDetailQuery(params.id as string, {
    enabled: !isCheckingAuth && !!params.id && !isDemo,
    retry: 0,
  });

  const visibleColumns = useMemo<ColumnKey[]>(() => {
    // Get columns allowed for this plan
    const allowedColumns = getVisibleColumns(userPlan);

    // Filter to only include columns that exist in COLUMN_CONFIG
    const cols = allowedColumns.filter((c): c is ColumnKey => Object.prototype.hasOwnProperty.call(COLUMN_CONFIG, c));

    // Debug: Log column visibility (remove in production if needed)
    if (process.env.NODE_ENV === 'development') {
      console.log('[SelectionDetail] Column visibility:', {
        userPlan,
        allowedColumns,
        filteredColumns: cols,
      });
    }

    // Always include 'name' as fallback, but ensure we only show what's allowed
    return cols.length > 0 ? cols : ['name'];
  }, [userPlan]);

  useEffect(() => {
    if (usageStats?.plan) {
      setUserPlan((usageStats.plan as UserPlan) || 'free_tier');
    } else if (usageError) {
      setUserPlan('free_tier');
    }
  }, [usageError, usageStats]);

  useEffect(() => {
    if (isDemo) {
      // Allow demo selection without auth redirects to keep previews and tests stable.
      setIsCheckingAuth(false);
      return;
    }

    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setIsCheckingAuth(false);
    };
    checkAuth();
  }, [isDemo, router, supabase]);

  useEffect(() => {
    if (selectionError) {
      toast({
        title: 'Error',
        description: selectionError.message || 'Failed to load selection',
        variant: 'destructive',
      });
      if ((selectionError as any).status === 401) {
        router.push('/login');
      } else if ((selectionError as any).status === 404) {
        router.push('/selections');
      }
    }
  }, [router, selectionError, toast]);

  const demoSelection: SelectionDetail | null = useMemo(() => {
    if (!isDemo) return null;
    return {
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
        top_k: 100,
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
          similarity: 0.95,
        },
        {
          doc_id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          city: 'Manchester',
          street: 'High St',
          sectors: ['Finance'],
          experience_years: 12,
          similarity: 0.88,
        },
        {
          doc_id: '3',
          name: 'Bob Johnson',
          email: 'bob@example.com',
          city: 'London',
          street: 'Oxford St',
          sectors: ['IT'],
          experience_years: 5,
          similarity: 0.82,
        },
        {
          doc_id: '4',
          name: 'Alice Brown',
          email: 'alice@example.com',
          city: 'Leeds',
          street: 'Main St',
          sectors: ['Marketing'],
          experience_years: 3,
          similarity: 0.75,
        },
        {
          doc_id: '5',
          name: 'Charlie Wilson',
          email: 'charlie@example.com',
          city: 'Liverpool',
          street: 'Dock Rd',
          sectors: ['Sales'],
          experience_years: 15,
          similarity: 0.65,
        },
      ],
    };
  }, [isDemo]);

  const selection = demoSelection ?? (selectionData?.selection as SelectionDetail | null);
  const isLoading = isCheckingAuth || isSelectionLoading;

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
    console.log('[handleQA] Button clicked');

    if (!qaPrompt.trim()) {
      console.log('[handleQA] Empty prompt');
      toast({
        title: 'Validation Error',
        description: 'Please enter a question',
        variant: 'destructive',
      });
      return;
    }

    if (!params.id) {
      console.error('[handleQA] Missing params.id');
      return;
    }

    console.log('[handleQA] Starting request for selection:', params.id);
    setIsProcessingQA(true);
    setQaProgress(0);

    try {
      // Start Q&A job
      const response = await fetch(`/api/selections/${params.id}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: qaPrompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 403 && errorData.error === 'CAP_REACHED') {
          toast({
            title: 'Limit Reached',
            description: errorData.message || 'You have reached your AI usage limit.',
            variant: 'destructive',
          });
          // Optional: You could redirect to pricing here
          // router.push('/pricing');
          throw new Error('Limit reached');
        }

        throw new Error(errorData.error || 'Failed to start Q&A job');
      }

      const data = await response.json();

      toast({
        title: 'Success',
        description: 'Q&A job started! Processing in background...',
      });

      setIsProcessingQA(false);
      setIsQAModalOpen(false);
      setQaPrompt('');

      // Redirect to QA results page
      if (data.qaSessionId) {
        router.push(`/selections/${params.id}/qa/${data.qaSessionId}`);
      } else {
        // Fallback for demo or error
        console.warn('No QA Session ID returned, redirecting to demo');
        setTimeout(() => {
          router.push(`/selections/${params.id}/qa/demo-qa-1`);
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error processing Q&A:', error);
      if (error.message !== 'Limit reached') {
        toast({
          title: 'Error',
          description: error.message || 'Failed to process Q&A',
          variant: 'destructive',
        });
      }
      setIsProcessingQA(false);
      setQaProgress(0);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/selections/${params.id}/export`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      toast({
        title: 'Export started',
        description: 'You will receive an email when your export is ready',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isCheckingAuth || isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-center'>
          <div className='text-lg font-medium text-gray-900'>Loading selection...</div>
        </div>
      </div>
    );
  }

  if (!selection) {
    return null;
  }

  return (
    <div className='min-h-screen bg-gray-50 p-6'>
      <div className='mx-auto max-w-7xl'>
        {/* Header */}
        <div className='mb-6'>
          <Button variant='ghost' className='-ml-2 mb-4 hover:bg-gray-100' onClick={() => router.push('/selections')}>
            <ArrowLeft className='mr-2 h-4 w-4' />
            Back to Selections
          </Button>

          <div className='flex items-start justify-between'>
            <div>
              <h1 className='text-3xl font-bold text-black'>{selection.name}</h1>
              <div className='mt-2 flex items-center gap-4 text-sm text-gray-600'>
                <span>{selection.item_count} candidates</span>
                <span>•</span>
                <span>Created: {formatDate(selection.created_at)}</span>
                <span>•</span>
                <span>Expires: {formatDate(selection.expires_at)}</span>
              </div>
            </div>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                className='rounded-lg px-4 py-2 hover:bg-gray-100'
                onClick={() => setIsQAModalOpen(true)}
              >
                <MessageSquare className='mr-2 h-4 w-4' />
                Ask Q&A
              </Button>
              <Button
                className='rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
                onClick={handleExport}
                disabled={isExporting}
              >
                <Download className='mr-2 h-4 w-4' />
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Summary */}
        {selection.criteria && (
          <div className='mb-6 rounded-2xl border bg-white p-4 shadow-sm'>
            <h2 className='mb-2 font-semibold text-gray-900'>Search Criteria</h2>
            <div className='flex flex-wrap gap-2'>
              {selection.criteria.names && selection.criteria.names.length > 0 && (
                <div className='rounded-lg bg-gray-100 px-3 py-1.5 text-sm'>
                  <span className='font-medium text-gray-700'>Names:</span>{' '}
                  <span className='text-gray-600'>{selection.criteria.names.join(', ')}</span>
                </div>
              )}
              {selection.criteria.sectors && selection.criteria.sectors.length > 0 && (
                <div className='rounded-lg bg-gray-100 px-3 py-1.5 text-sm'>
                  <span className='font-medium text-gray-700'>Sectors:</span>{' '}
                  <span className='text-gray-600'>{selection.criteria.sectors.length} selected</span>
                </div>
              )}
              {selection.criteria.regions && selection.criteria.regions.length > 0 && (
                <div className='rounded-lg bg-gray-100 px-3 py-1.5 text-sm'>
                  <span className='font-medium text-gray-700'>Regions:</span>{' '}
                  <span className='text-gray-600'>{selection.criteria.regions.length} selected</span>
                </div>
              )}
              {selection.criteria.top_k && (
                <div className='rounded-lg bg-gray-100 px-3 py-1.5 text-sm'>
                  <span className='font-medium text-gray-700'>Top-K:</span>{' '}
                  <span className='text-gray-600'>{selection.criteria.top_k}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Candidates Table */}
        <div className='overflow-hidden rounded-2xl border bg-white shadow-sm'>
          <div className='overflow-auto'>
            <Table>
              <TableHeader className='bg-gray-50'>
                <TableRow className='hover:bg-transparent'>
                  {visibleColumns.map((key) => (
                    <TableHead key={key} className='whitespace-nowrap px-4 py-3 font-semibold text-gray-700'>
                      {COLUMN_CONFIG[key].label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {selection.items?.map((item) => (
                  <TableRow key={item.doc_id} className='hover:bg-gray-50'>
                    {visibleColumns.map((key) => (
                      <TableCell
                        key={key}
                        className={cn(
                          'px-4 py-3 text-sm text-gray-600',
                          key === 'name' && 'font-medium text-gray-900',
                          key === 'email' || key === 'sectors' || key === 'city' || key === 'street'
                            ? 'max-w-[220px] truncate'
                            : 'whitespace-nowrap'
                        )}
                        title={
                          key === 'email'
                            ? item.email
                            : key === 'sectors'
                            ? item.sectors?.join(', ')
                            : key === 'city' || key === 'street'
                            ? (item as any)[key] || ''
                            : undefined
                        }
                      >
                        {COLUMN_CONFIG[key].render(item)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Q&A Modal */}
      <Dialog open={isQAModalOpen} onOpenChange={setIsQAModalOpen}>
        <DialogContent className='bg-white sm:max-w-[600px]'>
          <DialogHeader>
            <DialogTitle>Ask Questions to Candidates</DialogTitle>
            <DialogDescription className='text-gray-700'>
              Enter your question(s) below. Each candidate will be asked the same question(s) and their answers will be
              generated based on their CV.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <Textarea
              placeholder='e.g., What is your experience with React? Do you have leadership experience?'
              value={qaPrompt}
              onChange={(e) => setQaPrompt(e.target.value)}
              className='focus:bo min-h-[120px] border-gray-700 placeholder:text-gray-500'
              disabled={isProcessingQA}
            />

            {isProcessingQA && (
              <div className='space-y-2'>
                <div className='flex items-center justify-between text-sm text-gray-600'>
                  <span>Processing Q&A...</span>
                  <span>{qaProgress}%</span>
                </div>
                <div className='h-2 w-full overflow-hidden rounded-full bg-gray-200'>
                  <div className='h-full bg-blue-600 transition-all duration-500' style={{ width: `${qaProgress}%` }} />
                </div>
                <p className='text-xs text-gray-500'>
                  This may take a few minutes depending on the number of candidates...
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant='outline'
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
              className='bg-blue-600 hover:bg-blue-700'
            >
              {isProcessingQA ? 'Processing...' : 'Generate Answers'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
