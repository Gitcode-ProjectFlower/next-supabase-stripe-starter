'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { FilterSidebar } from '@/components/selection/filter-sidebar';
import { ResultsWorkspace } from '@/components/selection/results-workspace';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

import { REGIONS_TREE } from '@/data/regions-tree';
import { SECTORS_TREE } from '@/data/sectors-tree';
import { trackEvent } from '@/libs/analytics/posthog';
import { getTopKLimit, type UserPlan } from '@/libs/plan-config';
import { useUsageStatsQuery } from '@/libs/queries';
import { requiresUpgrade } from '@/libs/soft-gating';

import type { LookalikeResult } from '@/types/selection';
import type { TreeNode } from '@/types/tree';
import { cn } from '@/utils/cn';

export default function DashboardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { data: usageStats, error: usageError } = useUsageStatsQuery({
    retry: 0,
  });

  // State for filters
  const [names, setNames] = useState<string[]>([]);
  const [sectors, setSectors] = useState<Set<string>>(new Set());
  const [regions, setRegions] = useState<Set<string>>(new Set());
  const [experience, setExperience] = useState<string[]>([]);
  const [topK, setTopK] = useState<number>(3);

  // State for selection metadata
  const [selectionName, setSelectionName] = useState('New selection');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // State for user plan and preview mode
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // State for results
  const [results, setResults] = useState<LookalikeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const saveUnavailableReason = useMemo(() => {
    if (selectedIds.size === 0) return 'Select at least one candidate before saving.';
    if (!userPlan || userPlan === 'anonymous') return 'Sign in to save your selections.';
    if (userPlan && requiresUpgrade(userPlan, 'save')) return 'Please upgrade your plan to save selections.';
    return null;
  }, [selectedIds.size, userPlan]);

  const exportUnavailableReason = useMemo(() => {
    if (results.length === 0) return 'Run a search before exporting.';
    if (selectedIds.size === 0) return 'Select candidates to include in the CSV export.';
    if (!userPlan || userPlan === 'anonymous') return 'Sign in to export CSV.';
    if (userPlan && requiresUpgrade(userPlan, 'export')) return 'Upgrade your plan to export CSV.';
    return null;
  }, [results.length, selectedIds.size, userPlan]);

  const historyUnavailableReason = useMemo(() => {
    if (!userPlan || userPlan === 'anonymous') return 'Sign in to view your history.';
    if (selectedIds.size === 0) return 'Save a selection first to view its history.';
    return null;
  }, [selectedIds.size, userPlan]);

  useEffect(() => {
    if (usageStats?.plan) {
      setUserPlan(usageStats.plan);
      const planLimit = getTopKLimit(usageStats.plan);
      setTopK((current) => Math.min(planLimit, current > 0 ? current : planLimit));
    } else if (usageError) {
      // Treat unauthorized as anonymous / logged-out flow
      setUserPlan('anonymous');
      setTopK(3);
    }
  }, [usageError, usageStats]);

  useEffect(() => {
    if (userPlan) {
      const planLimit = getTopKLimit(userPlan);
      if (topK > planLimit) {
        setTopK(planLimit);
      } else if (topK < 3 && planLimit > 3) {
        setTopK(Math.min(planLimit, 100));
      }
    }
  }, [userPlan]); // eslint-disable-line react-hooks/exhaustive-deps

  const getNamesFromIds = (ids: Set<string>, tree: TreeNode[]): string[] => {
    const names: string[] = [];
    const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findNodeById(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    ids.forEach((id) => {
      const node = findNodeById(tree, id);
      if (node) {
        if (!node.children || node.children.length === 0) {
          names.push(node.name);
        }
      }
    });
    return names;
  };

  const buildExperienceYears = () => {
    const experienceYears: number[] = [];
    experience.forEach((range) => {
      if (range === '26+') {
        for (let year = 26; year <= 100; year++) {
          experienceYears.push(year);
        }
      } else {
        const [start, end] = range.split('-').map((n) => parseInt(n, 10));
        if (!isNaN(start) && !isNaN(end)) {
          for (let year = start; year <= end; year++) {
            experienceYears.push(year);
          }
        }
      }
    });
    return experienceYears;
  };

  const handleSearch = async () => {
    setIsLoading(true);
    // Clear selection on new search to avoid stale IDs
    setSelectedIds(new Set());

    try {
      const experienceYears = buildExperienceYears();

      // Convert selected IDs to names for sectors and regions
      const sectorNames = sectors.size > 0 ? getNamesFromIds(sectors, SECTORS_TREE) : [];
      const regionNames = regions.size > 0 ? getNamesFromIds(regions, REGIONS_TREE) : [];

      // Prepare request body matching backend format (per curl-filter-tests.md)
      const requestBody = {
        names: names.length > 0 ? names : [''],
        sectors: sectorNames.length > 0 ? sectorNames : [],
        regions: regionNames.length > 0 ? regionNames : [],
        experience_years: experienceYears.length > 0 ? experienceYears : [],
        top_k: topK,
      };

      // Debug: Log what we're sending to backend
      console.log('[Frontend] Sending request to /api/lookalikes/search:', {
        url: '/api/lookalikes/search',
        method: 'POST',
        body: requestBody,
        formatted: JSON.stringify(requestBody, null, 2),
      });

      const response = await fetch('/api/lookalikes/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMessage = 'Search failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || 'Search failed';

          if (topK > 3 && userPlan === 'anonymous') {
            errorMessage = 'You are not allowed to search more than 3 candidates';
          }
        } catch {
          errorMessage = response.statusText || 'Search failed';
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      // API returns { success: true, data: { preview, total, plan, limit, isAnonymous } }
      console.log('[Frontend] Received response from /api/lookalikes/search:', data);
      setResults(data.data?.preview || []);

      // Track user plan and preview mode
      const plan = data.data?.plan || null;
      const isAnonymous = data.data?.isAnonymous || false;
      setUserPlan(plan);
      setIsPreviewMode(isAnonymous || plan === 'anonymous' || plan === 'free_tier');

      // Update topK to match plan limit if current value exceeds it
      const planLimit = data.data?.limit || 3;
      if (topK > planLimit) {
        setTopK(planLimit);
      }

      // Track search completed event
      trackEvent.searchCompleted({
        namesCount: names.length,
        topK,
        filterCount: sectors.size + regions.size + experience.length,
        resultsCount: data.data?.total || 0,
      });

      toast({
        title: 'Search completed',
        description: `Found ${data.data?.total || 0} candidates`,
        variant: 'success',
      });
    } catch (error) {
      console.error('Search error:', error);

      // Track search failed event
      trackEvent.searchFailed({
        namesCount: names.length,
        topK,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      toast({
        title: 'Search failed',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClick = (unavailableReason?: string | null) => {
    if (unavailableReason) {
      toast({
        title: 'Save unavailable',
        description: unavailableReason,
        variant: 'destructive',
      });
      return;
    }

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
      const experienceYears = buildExperienceYears();
      const sectorNames = sectors.size > 0 ? getNamesFromIds(sectors, SECTORS_TREE) : [];
      const regionNames = regions.size > 0 ? getNamesFromIds(regions, REGIONS_TREE) : [];
      const requestPayload = {
        name: selectionName,
        criteria: {
          names,
          sectors: sectorNames,
          regions: regionNames,
          experience_years: experienceYears,
        },
        top_k: topK, // This should ideally match what was searched
        items: selectedItems,
      };

      const response = await fetch('/api/selections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        let errorMessage = 'Failed to save selection';

        if (errorData?.error === 'Validation error' && Array.isArray(errorData.details)) {
          errorMessage = errorData.details
            .map((detail: any) => {
              const path = Array.isArray(detail.path) ? detail.path.join('.') : 'field';
              return `${path}: ${detail.message || detail.code || 'is invalid'}`;
            })
            .join('; ');
        } else if (errorData?.error === 'Top-K exceeds your plan limit' && errorData?.planCap) {
          errorMessage = `Top-K ${errorData.requested} exceeds your plan limit (${errorData.planCap}).`;
        } else if (errorData?.error === 'Number of items exceeds your plan limit' && errorData?.planCap) {
          errorMessage = `You can save up to ${errorData.planCap} items on your current plan.`;
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Track selection created event
      trackEvent.selectionCreated({
        selectionId: data.selection_id,
        itemCount: selectedItems.length,
        hasFilters: sectors.size > 0 || regions.size > 0 || experience.length > 0,
      });

      toast({
        title: 'Selection saved',
        description: `Successfully saved ${selectedItems.length} candidates.`,
        variant: 'success',
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
    }
  };

  const handleExportClick = (unavailableReason?: string | null) => {
    if (unavailableReason) {
      toast({
        title: 'Export unavailable',
        description: unavailableReason,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Export from saved selections',
      description: 'Please save this selection first, then export CSV from the selection detail page.',
      variant: 'destructive',
    });
  };

  const handleHistoryClick = (unavailableReason?: string | null) => {
    if (unavailableReason) {
      toast({
        title: 'History unavailable',
        description: unavailableReason,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'History coming soon',
      description: 'History will be available after saving this selection.',
      variant: 'destructive',
    });
  };

  return (
    <div className='min-h-screen bg-gray-50 text-gray-900'>
      {/* Header */}
      <header className='sticky top-0 z-40 border-b bg-white/90 backdrop-blur'>
        <div className='mx-auto flex max-w-7xl items-center gap-3 px-4 py-3'>
          <div className='ml-auto flex items-center gap-2'>
            <Input
              value={selectionName}
              onChange={(e) => setSelectionName(e.target.value)}
              placeholder='Selection Name'
            />
            <Button
              onClick={() => handleSaveClick(saveUnavailableReason)}
              disabled={isSaving}
              aria-disabled={!!saveUnavailableReason || isSaving}
              className={cn(
                'rounded-lg bg-gray-900 px-4 py-2 text-sm text-white transition-colors hover:bg-black',
                (saveUnavailableReason || isSaving) && 'cursor-not-allowed opacity-60'
              )}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant='outline'
              className={cn(
                'rounded-lg border bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-100',
                exportUnavailableReason && 'cursor-not-allowed opacity-60'
              )}
              aria-disabled={!!exportUnavailableReason}
              onClick={() => handleExportClick(exportUnavailableReason)}
            >
              Export CSV
            </Button>
            <Button
              variant='outline'
              className={cn(
                'rounded-lg border bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-100',
                historyUnavailableReason && 'cursor-not-allowed opacity-60'
              )}
              aria-disabled={!!historyUnavailableReason}
              onClick={() => handleHistoryClick(historyUnavailableReason)}
            >
              History
            </Button>
            <div className='h-6 w-px bg-gray-200' />
            <div className='text-sm text-gray-600'>Profile</div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className='mx-auto grid max-w-7xl grid-cols-12 gap-6 px-4 py-6'>
        {/* Left: Filters */}
        <aside className='col-span-12 lg:col-span-3'>
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
            userPlan={userPlan}
          />
        </aside>

        {/* Right: Workspace */}
        <main className='relative col-span-12 lg:col-span-9'>
          <ResultsWorkspace
            results={results}
            isLoading={isLoading}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            isPreviewMode={isPreviewMode}
            userPlan={userPlan}
            topK={topK}
          />
        </main>
      </div>

      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className='bg-white sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>Save Selection</DialogTitle>
          </DialogHeader>

          <div className='space-y-3 pt-4'>
            <div className='text-sm text-gray-700'>
              You are about to save <span className='font-semibold text-gray-900'>{selectedIds.size} candidates</span>{' '}
              to &quot;{selectionName}&quot;.
            </div>

            {/* Filters Summary */}
            {(names.length > 0 || sectors.size > 0 || regions.size > 0 || experience.length > 0) && (
              <div className='rounded-lg border border-gray-200 bg-white p-3 text-sm'>
                <div className='mb-2 font-semibold text-gray-900'>Filters applied:</div>
                <ul className='space-y-1 text-gray-700'>
                  {names.length > 0 && <li>• Names: {names.join(', ')}</li>}
                  {sectors.size > 0 && <li>• Sectors: {sectors.size} selected</li>}
                  {regions.size > 0 && <li>• Regions: {regions.size} selected</li>}
                  {experience.length > 0 && <li>• Experience: {experience.join(', ')} years</li>}
                  <li>• Top-K: {topK}</li>
                </ul>
              </div>
            )}

            {/* Expiration Info */}
            <div className='flex items-center gap-2 text-sm text-gray-700'>
              <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
              <span>
                Expires on:{' '}
                <span className='font-semibold text-gray-900'>
                  {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>{' '}
                (7 days)
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsSaveModalOpen(false)}>
              Cancel
            </Button>
            <Button className='bg-blue-600 hover:bg-blue-700' onClick={confirmSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Confirm Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
