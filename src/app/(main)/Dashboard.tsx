'use client';

import { useQueryClient } from '@tanstack/react-query';
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
import { QUERY_KEYS } from '@/libs/query-keys';
import { requiresUpgrade } from '@/libs/soft-gating';
import { createSupabaseBrowserClient } from '@/libs/supabase/supabase-browser-client';

import type { LookalikeResult } from '@/types/selection';
import type { TreeNode } from '@/types/tree';
import { cn } from '@/utils/cn';

export function Dashboard() {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
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
  const [isExporting, setIsExporting] = useState(false);
  const [isNewSelectionModalOpen, setIsNewSelectionModalOpen] = useState(false);
  const [savedSelectionId, setSavedSelectionId] = useState<string | null>(null);

  // State for user plan and preview mode
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // State for results
  const [results, setResults] = useState<LookalikeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // State for Q&A processing
  const [isProcessingQA, setIsProcessingQA] = useState(false);
  const [qaSessionId, setQaSessionId] = useState<string | null>(null);
  const [qaSelectionId, setQaSelectionId] = useState<string | null>(null);

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

  // Detect unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    // Check if user has selected candidates
    if (selectedIds.size > 0) return true;
    // Check if user has modified filters
    if (names.length > 0) return true;
    if (sectors.size > 0) return true;
    if (regions.size > 0) return true;
    if (experience.length > 0) return true;
    // Check if user has search results
    if (results.length > 0) return true;
    return false;
  }, [selectedIds.size, names.length, sectors.size, regions.size, experience.length, results.length]);

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

  /**
   * Get leaf node names from tree (for saving criteria - backward compatibility)
   */
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

  /**
   * Get hierarchical values from tree nodes for filtering
   * Returns object with level1, level2, level3 (and level4 for regions) arrays
   */
  const getHierarchicalValuesFromIds = (
    ids: Set<string>,
    tree: TreeNode[],
    isRegion: boolean = false
  ): {
    level1: string[];
    level2: string[];
    level3: string[];
    level4?: string[];
  } => {
    const result: {
      level1: string[];
      level2: string[];
      level3: string[];
      level4?: string[];
    } = {
      level1: [],
      level2: [],
      level3: [],
    };

    if (isRegion) {
      result.level4 = [];
    }

    /**
     * Find path from root to target node
     * Returns array of nodes from root to target (inclusive)
     */
    const getPathToNode = (targetId: string, nodes: TreeNode[], currentPath: TreeNode[] = []): TreeNode[] | null => {
      for (const node of nodes) {
        const newPath = [...currentPath, node];

        // If this is the target node, return the path
        if (node.id === targetId) {
          return newPath;
        }

        // Recursively search children
        if (node.children && node.children.length > 0) {
          const found = getPathToNode(targetId, node.children, newPath);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };

    ids.forEach((id) => {
      const path = getPathToNode(id, tree);

      if (path && path.length > 0) {
        // Path is from root to selected node
        // path[0] = level1 (root), path[1] = level2, path[2] = level3, path[3] = level4 (for regions)

        // Add level1 (always first in path)
        if (path.length > 0 && !result.level1.includes(path[0].name)) {
          result.level1.push(path[0].name);
        }

        // Add level2 (if exists)
        if (path.length > 1 && !result.level2.includes(path[1].name)) {
          result.level2.push(path[1].name);
        }

        // Add level3 (if exists)
        if (path.length > 2 && !result.level3.includes(path[2].name)) {
          result.level3.push(path[2].name);
        }

        // Add level4 for regions (if exists)
        if (isRegion && path.length > 3 && result.level4 && !result.level4.includes(path[3].name)) {
          result.level4.push(path[3].name);
        }
      }
    });

    return result;
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

      // Get hierarchical values for sectors and regions
      const sectorHierarchy = sectors.size > 0 ? getHierarchicalValuesFromIds(sectors, SECTORS_TREE, false) : null;
      const regionHierarchy = regions.size > 0 ? getHierarchicalValuesFromIds(regions, REGIONS_TREE, true) : null;

      // Prepare request body with hierarchical filters
      // Backend expects sector_level1, sector_level2, sector_level3, region_level1, etc.
      const requestBody: Record<string, any> = {
        names: names.length > 0 ? names : [''],
        experience_years: experienceYears.length > 0 ? experienceYears : [],
        top_k: topK,
      };

      // Add hierarchical sector filters
      if (sectorHierarchy) {
        if (sectorHierarchy.level1.length > 0) {
          requestBody.sector_level1 = sectorHierarchy.level1;
        }
        if (sectorHierarchy.level2.length > 0) {
          requestBody.sector_level2 = sectorHierarchy.level2;
        }
        if (sectorHierarchy.level3.length > 0) {
          requestBody.sector_level3 = sectorHierarchy.level3;
        }
      }

      // Add hierarchical region filters
      if (regionHierarchy) {
        if (regionHierarchy.level1.length > 0) {
          requestBody.region_level1 = regionHierarchy.level1;
        }
        if (regionHierarchy.level2.length > 0) {
          requestBody.region_level2 = regionHierarchy.level2;
        }
        if (regionHierarchy.level3.length > 0) {
          requestBody.region_level3 = regionHierarchy.level3;
        }
        if (regionHierarchy.level4 && regionHierarchy.level4.length > 0) {
          requestBody.region_level4 = regionHierarchy.level4;
        }
      }

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
      const selectedItems = results
        .filter((r) => selectedIds.has(r.doc_id))
        .map((item) => ({
          ...item,
          similarity: item.similarity ?? 0, // Ensure similarity is always present, default to 0
        }));
      const experienceYears = buildExperienceYears();
      const sectorNames = sectors.size > 0 ? getNamesFromIds(sectors, SECTORS_TREE) : [];
      const regionNames = regions.size > 0 ? getNamesFromIds(regions, REGIONS_TREE) : [];
      const criteria = {
        names,
        sectors: sectorNames,
        regions: regionNames,
        experience_years: experienceYears,
      };

      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Unauthorized. Please sign in to save selections.');
      }

      let selectionId: string;
      const isUpdate = savedSelectionId !== null;

      if (isUpdate) {
        // UPDATE: Verify ownership and update existing selection
        const { data: existingSelection, error: checkError } = await supabase
          .from('selections')
          .select('id, user_id, expires_at')
          .eq('id', savedSelectionId)
          .eq('user_id', user.id)
          .single();

        if (checkError || !existingSelection) {
          setSavedSelectionId(null); // Clear invalid ID
          throw new Error('Selection not found or access denied');
        }

        // Deduplicate items by doc_id before processing (prevent duplicate keys)
        const uniqueItems = Array.from(new Map(selectedItems.map((item) => [item.doc_id, item])).values());

        // Update selection metadata (name and criteria only - item_count will be updated by RPC)
        const { error: updateError } = await supabase
          .from('selections')
          // @ts-expect-error - Supabase browser client has TypeScript inference issue with update queries
          .update({
            name: selectionName,
            criteria_json: criteria,
            updated_at: new Date().toISOString(),
          })
          .eq('id', savedSelectionId);

        if (updateError) {
          throw new Error(`Failed to update selection: ${updateError.message}`);
        }

        // Use RPC function to atomically replace all items (delete + insert in transaction)
        // The RPC function will also update item_count to match the actual number of items
        // @ts-expect-error - Supabase RPC type inference issue, p_items accepts Json array
        const { error: rpcError } = await supabase.rpc('update_selection_items', {
          p_selection_id: savedSelectionId,
          p_items: uniqueItems.map((item) => ({
            doc_id: item.doc_id,
            name: item.name,
            email: item.email,
            phone: item.phone,
            city: item.city,
            street: item.street,
            sectors: item.sectors,
            experience_years: item.experience_years,
            similarity: item.similarity,
          })),
        });

        if (rpcError) {
          throw new Error(`Failed to update selection items: ${rpcError.message}`);
        }

        selectionId = savedSelectionId;
      } else {
        // CREATE: Call create_selection RPC
        // Ensure all fields are explicitly mapped to guarantee full data is saved
        const uniqueItems = Array.from(new Map(selectedItems.map((item) => [item.doc_id, item])).values());

        // @ts-expect-error - Supabase RPC type inference issue, p_items accepts Json array
        const { data: newSelectionId, error: rpcError } = await supabase.rpc('create_selection', {
          p_name: selectionName,
          p_criteria_json: criteria,
          p_items: uniqueItems.map((item) => ({
            doc_id: item.doc_id,
            name: item.name,
            email: item.email,
            phone: item.phone,
            city: item.city,
            street: item.street,
            sectors: item.sectors,
            experience_years: item.experience_years,
            similarity: item.similarity,
          })),
        });

        if (rpcError) {
          throw new Error(`Failed to create selection: ${rpcError.message}`);
        }

        selectionId = newSelectionId;
        setSavedSelectionId(selectionId);

        // Log usage (only on create)
        try {
          // @ts-expect-error - Supabase browser client has TypeScript inference issue with insert queries
          const { error: logError } = await supabase.from('usage_log').insert({
            user_id: user.id,
            action: 'selection_created',
            count: 1,
          });
          if (logError) {
            console.error('[Save] Failed to log usage:', logError);
          }
        } catch (logErr) {
          console.error('[Save] Failed to log usage:', logErr);
        }

        // Track analytics (only on create)
        trackEvent.selectionCreated({
          selectionId,
          itemCount: selectedItems.length,
          hasFilters: sectors.size > 0 || regions.size > 0 || experience.length > 0,
        });
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.selections.all });
      if (selectionId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.selections.detail(selectionId) });
      }
      // Also invalidate usage stats since selection creation affects it
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.usage.stats });

      toast({
        title: 'Saved',
        description: isUpdate
          ? `Selection updated with ${selectedItems.length} candidates.`
          : `Successfully saved ${selectedItems.length} candidates.`,
        variant: 'success',
      });

      setIsSaveModalOpen(false);
      setIsSaving(false);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Please try again later',
        variant: 'destructive',
      });
      setIsSaving(false);
    }
  };

  const handleExportClick = async (unavailableReason?: string | null) => {
    if (unavailableReason) {
      toast({
        title: 'Export unavailable',
        description: unavailableReason,
        variant: 'destructive',
      });
      return;
    }

    // Client-side verification: Check usage limits before making request
    if (usageStats) {
      const itemCount = selectedIds.size || 0;
      const remainingDownloads = usageStats.downloadsLimit - usageStats.downloads;

      if (remainingDownloads < itemCount) {
        toast({
          title: 'Download Limit Reached',
          description: `You need to download ${itemCount} records but only have ${remainingDownloads} remaining. Upgrade your plan to continue.`,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsExporting(true);

    try {
      // Step 1: Save the selection first
      const selectedItems = results
        .filter((r) => selectedIds.has(r.doc_id))
        .map((item) => ({
          ...item,
          similarity: item.similarity ?? 0,
        }));

      if (selectedItems.length === 0) {
        toast({
          title: 'No candidates selected',
          description: 'Please select at least one candidate to export',
          variant: 'destructive',
        });
        setIsExporting(false);
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Unauthorized. Please sign in to export.');
      }

      const experienceYears = buildExperienceYears();
      const sectorNames = sectors.size > 0 ? getNamesFromIds(sectors, SECTORS_TREE) : [];
      const regionNames = regions.size > 0 ? getNamesFromIds(regions, REGIONS_TREE) : [];
      const criteria = {
        names,
        sectors: sectorNames,
        regions: regionNames,
        experience_years: experienceYears,
      };

      let selectionId: string;
      const isUpdate = savedSelectionId !== null;

      if (isUpdate) {
        // UPDATE: Verify ownership and update existing selection
        const { data: existingSelection, error: checkError } = await supabase
          .from('selections')
          .select('id, user_id')
          .eq('id', savedSelectionId)
          .eq('user_id', user.id)
          .single();

        if (checkError || !existingSelection) {
          setSavedSelectionId(null);
          throw new Error('Selection not found or access denied');
        }

        // Deduplicate items by doc_id before processing (prevent duplicate keys)
        const uniqueItems = Array.from(new Map(selectedItems.map((item) => [item.doc_id, item])).values());

        // Update selection metadata (name and criteria only - item_count will be updated by RPC)
        const { error: updateError } = await supabase
          .from('selections')
          // @ts-expect-error - Supabase browser client has TypeScript inference issue with update queries
          .update({
            name: selectionName,
            criteria_json: criteria,
            updated_at: new Date().toISOString(),
          })
          .eq('id', savedSelectionId);

        if (updateError) {
          throw new Error(`Failed to update selection: ${updateError.message}`);
        }

        // Use RPC function to atomically replace all items (delete + insert in transaction)
        // The RPC function will also update item_count to match the actual number of items
        // @ts-expect-error - Supabase RPC type inference issue, p_items accepts Json array
        const { error: rpcError } = await supabase.rpc('update_selection_items', {
          p_selection_id: savedSelectionId,
          p_items: uniqueItems.map((item) => ({
            doc_id: item.doc_id,
            name: item.name,
            email: item.email,
            phone: item.phone,
            city: item.city,
            street: item.street,
            sectors: item.sectors,
            experience_years: item.experience_years,
            similarity: item.similarity,
          })),
        });

        if (rpcError) {
          throw new Error(`Failed to update selection items: ${rpcError.message}`);
        }

        selectionId = savedSelectionId;
      } else {
        // CREATE: Call create_selection RPC
        // Ensure all fields are explicitly mapped to guarantee full data is saved
        const uniqueItems = Array.from(new Map(selectedItems.map((item) => [item.doc_id, item])).values());

        // @ts-expect-error - Supabase RPC type inference issue, p_items accepts Json array
        const { data: newSelectionId, error: rpcError } = await supabase.rpc('create_selection', {
          p_name: selectionName,
          p_criteria_json: criteria,
          p_items: uniqueItems.map((item) => ({
            doc_id: item.doc_id,
            name: item.name,
            email: item.email,
            phone: item.phone,
            city: item.city,
            street: item.street,
            sectors: item.sectors,
            experience_years: item.experience_years,
            similarity: item.similarity,
          })),
        });

        if (rpcError) {
          throw new Error(`Failed to create selection: ${rpcError.message}`);
        }

        selectionId = newSelectionId;
        setSavedSelectionId(selectionId);

        // Log usage (only on create)
        try {
          // @ts-expect-error - Supabase browser client has TypeScript inference issue with insert queries
          const { error: logError } = await supabase.from('usage_log').insert({
            user_id: user.id,
            action: 'selection_created',
            count: 1,
          });
          if (logError) {
            console.error('[Export] Failed to log usage:', logError);
          }
        } catch (logErr) {
          console.error('[Export] Failed to log usage:', logErr);
        }
      }

      // Store the selection ID for future updates
      if (selectionId) {
        setSavedSelectionId(selectionId);
      }

      // Step 2: Immediately trigger export
      const exportResponse = await fetch(`/api/selections/${selectionId}/export`, {
        method: 'POST',
      });

      if (!exportResponse.ok) {
        const errorData = await exportResponse.json().catch(() => ({}));

        // Handle different error cases
        if (exportResponse.status === 401) {
          toast({
            title: 'Authentication Required',
            description: 'Please sign in to export selections',
            variant: 'destructive',
          });
          router.push('/login');
          return;
        }

        if (exportResponse.status === 403) {
          if (errorData.error === 'CAP_REACHED') {
            const message =
              errorData.type === 'download_limit'
                ? `You've reached your download limit (${errorData.current}/${errorData.limit}). Upgrade your plan to continue.`
                : errorData.message || 'You have reached your usage limit.';
            toast({
              title: 'Limit Reached',
              description: message,
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Access Denied',
              description: errorData.message || 'You do not have permission to export this selection',
              variant: 'destructive',
            });
          }
          return;
        }

        if (exportResponse.status === 404) {
          toast({
            title: 'Selection Not Found',
            description: 'The selection was saved but could not be found for export',
            variant: 'destructive',
          });
          return;
        }

        // Generic error
        toast({
          title: 'Export Failed',
          description: errorData.error || errorData.message || 'Failed to start export. Please try again later.',
          variant: 'destructive',
        });
        return;
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.selections.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.selections.detail(selectionId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.downloads.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.usage.stats });

      // Success: Selection saved and export started
      toast({
        title: 'Export Started',
        description:
          'Your selection has been saved and the export has been started. You will receive an email when your CSV is ready.',
      });

      // Track selection created event
      trackEvent.selectionCreated({
        selectionId,
        itemCount: selectedItems.length,
        hasFilters: sectors.size > 0 || regions.size > 0 || experience.length > 0,
      });

      // Optionally redirect to the selection detail page
      router.push(`/selections/${selectionId}`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to save and export selection. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
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

  const handleGenerateAnswers = async (prompt: string) => {
    if (!prompt.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a question',
        variant: 'destructive',
      });
      return;
    }

    if (selectedIds.size === 0) {
      toast({
        title: 'No candidates selected',
        description: 'Please select at least one candidate before asking questions.',
        variant: 'destructive',
      });
      return;
    }

    // Check usage limits before starting Q&A
    if (usageStats) {
      const itemCount = selectedIds.size;
      const requiredCalls = itemCount;
      const remainingCalls = usageStats.aiCallsLimit - usageStats.ai_calls;

      if (remainingCalls < requiredCalls) {
        toast({
          title: 'AI Limit Reached',
          description: `You need ${requiredCalls} AI calls but only have ${remainingCalls} remaining. Upgrade your plan to continue.`,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsProcessingQA(true);

    try {
      // Create or use existing selection
      const selectedItems = results
        .filter((r) => selectedIds.has(r.doc_id))
        .map((item) => ({
          ...item,
          similarity: item.similarity ?? 0,
        }));

      if (selectedItems.length === 0) {
        toast({
          title: 'No candidates selected',
          description: 'Please select at least one candidate to ask questions',
          variant: 'destructive',
        });
        setIsProcessingQA(false);
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Unauthorized. Please sign in to use Q&A features.');
      }

      const experienceYears = buildExperienceYears();
      const sectorNames = sectors.size > 0 ? getNamesFromIds(sectors, SECTORS_TREE) : [];
      const regionNames = regions.size > 0 ? getNamesFromIds(regions, REGIONS_TREE) : [];
      const criteria = {
        names,
        sectors: sectorNames,
        regions: regionNames,
        experience_years: experienceYears,
      };

      let selectionId: string | null = null;
      const isUpdate = savedSelectionId !== null;

      if (isUpdate) {
        // UPDATE: Verify ownership and update existing selection
        const { data: existingSelection, error: checkError } = await supabase
          .from('selections')
          .select('id, user_id')
          .eq('id', savedSelectionId)
          .eq('user_id', user.id)
          .single();

        if (checkError || !existingSelection) {
          setSavedSelectionId(null);
          // Fall through to create new selection
        } else {
          // Deduplicate items by doc_id before processing
          const uniqueItems = Array.from(new Map(selectedItems.map((item) => [item.doc_id, item])).values());

          // Update selection metadata
          const { error: updateError } = await supabase
            .from('selections')
            // @ts-expect-error - Supabase browser client has TypeScript inference issue with update queries
            .update({
              name: selectionName,
              criteria_json: criteria,
              updated_at: new Date().toISOString(),
            })
            .eq('id', savedSelectionId);

          if (updateError) {
            throw new Error(`Failed to update selection: ${updateError.message}`);
          }

          // Use RPC function to atomically replace all items
          // @ts-expect-error - Supabase RPC type inference issue, p_items accepts Json array
          const { error: rpcError } = await supabase.rpc('update_selection_items', {
            p_selection_id: savedSelectionId,
            p_items: uniqueItems.map((item) => ({
              doc_id: item.doc_id,
              name: item.name,
              email: item.email,
              phone: item.phone,
              city: item.city,
              street: item.street,
              sectors: item.sectors,
              experience_years: item.experience_years,
              similarity: item.similarity,
            })),
          });

          if (rpcError) {
            throw new Error(`Failed to update selection items: ${rpcError.message}`);
          }

          selectionId = savedSelectionId;
        }
      }

      // CREATE: If not updating or update failed, create new selection
      if (!selectionId) {
        const uniqueItems = Array.from(new Map(selectedItems.map((item) => [item.doc_id, item])).values());

        // @ts-expect-error - Supabase RPC type inference issue, p_items accepts Json array
        const { data: newSelectionId, error: rpcError } = await supabase.rpc('create_selection', {
          p_name: selectionName,
          p_criteria_json: criteria,
          p_items: uniqueItems.map((item) => ({
            doc_id: item.doc_id,
            name: item.name,
            email: item.email,
            phone: item.phone,
            city: item.city,
            street: item.street,
            sectors: item.sectors,
            experience_years: item.experience_years,
            similarity: item.similarity,
          })),
        });

        if (rpcError) {
          throw new Error(`Failed to create selection: ${rpcError.message}`);
        }

        if (!newSelectionId) {
          throw new Error('Failed to create selection: No ID returned');
        }

        selectionId = newSelectionId;
        setSavedSelectionId(selectionId);

        // Log usage (only on create)
        try {
          // @ts-expect-error - Supabase browser client has TypeScript inference issue with insert queries
          const { error: logError } = await supabase.from('usage_log').insert({
            user_id: user.id,
            action: 'selection_created',
            count: 1,
          });
          if (logError) {
            console.error('[QA] Failed to log usage:', logError);
          }
        } catch (logErr) {
          console.error('[QA] Failed to log usage:', logErr);
        }
      }

      // Ensure we have a selection ID before proceeding
      if (!selectionId) {
        throw new Error('Failed to create or update selection');
      }

      // Store the selection ID for future updates
      setSavedSelectionId(selectionId);
      setQaSelectionId(selectionId);

      // Step 2: Start Q&A job
      const response = await fetch(`/api/selections/${selectionId}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle different error cases
        if (response.status === 401) {
          toast({
            title: 'Authentication Required',
            description: 'Please sign in to use Q&A features',
            variant: 'destructive',
          });
          router.push('/login');
          return;
        }

        if (response.status === 403) {
          if (errorData.error === 'CAP_REACHED') {
            const message =
              errorData.type === 'ai_limit'
                ? `You've reached your AI question limit (${errorData.current}/${errorData.limit}). Upgrade your plan to continue.`
                : errorData.message || 'You have reached your usage limit.';
            toast({
              title: 'Limit Reached',
              description: message,
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Access Denied',
              description: errorData.message || 'You do not have permission to perform this action',
              variant: 'destructive',
            });
          }
          setIsProcessingQA(false);
          return;
        }

        if (response.status === 404) {
          toast({
            title: 'Selection Not Found',
            description: 'The selection you are trying to access no longer exists',
            variant: 'destructive',
          });
          setIsProcessingQA(false);
          return;
        }

        if (response.status === 400) {
          toast({
            title: 'Invalid Request',
            description: errorData.error || errorData.message || 'Please check your input and try again',
            variant: 'destructive',
          });
          setIsProcessingQA(false);
          return;
        }

        // Generic error for 500 or other status codes
        toast({
          title: 'Error',
          description: errorData.error || errorData.message || 'Failed to start Q&A job. Please try again later.',
          variant: 'destructive',
        });
        setIsProcessingQA(false);
        return;
      }

      const data = await response.json();

      if (!data.qaSessionId) {
        toast({
          title: 'Error',
          description: 'Q&A session was not created. Please try again.',
          variant: 'destructive',
        });
        setIsProcessingQA(false);
        return;
      }

      // Store session ID and navigate to Q&A page
      setQaSessionId(data.qaSessionId);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.selections.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.selections.detail(selectionId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.usage.stats });

      toast({
        title: 'Q&A Started',
        description: 'Your question is being processed. Redirecting to results...',
      });

      // Navigate to Q&A page
      router.push(`/selections/${selectionId}/qa/${data.qaSessionId}`);
    } catch (error: any) {
      console.error('Q&A error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start Q&A. Please try again.',
        variant: 'destructive',
      });
      setIsProcessingQA(false);
    }
  };

  // Reset all state to initial values
  const resetSelection = () => {
    // Clear names input
    setNames([]);
    // Clear sector filters
    setSectors(new Set());
    // Clear region filters
    setRegions(new Set());
    // Clear experience years filters
    setExperience([]);
    // Clear selected candidates list
    setSelectedIds(new Set());
    // Clear results list
    setResults([]);
    // Reset selection name to default
    setSelectionName('New selection');
    // Clear saved selection ID
    setSavedSelectionId(null);
    // Keep country/cluster context unchanged (not implemented yet, so nothing to reset)
  };

  // Handle New Selection button click
  const handleNewSelectionClick = () => {
    if (hasUnsavedChanges) {
      // Show confirmation modal
      setIsNewSelectionModalOpen(true);
    } else {
      // No unsaved changes, reset immediately
      resetSelection();
    }
  };

  // Handle confirmation to discard changes
  const handleConfirmDiscard = () => {
    resetSelection();
    setIsNewSelectionModalOpen(false);
    toast({
      title: 'Selection reset',
      description: 'All filters and selections have been cleared.',
    });
  };

  return (
    <>
      {/* Header */}
      <header className='sticky top-0 z-40 border-b bg-white/90 backdrop-blur'>
        <div className='mx-auto flex max-w-7xl items-center gap-3 px-4 py-3'>
          <div className='ml-auto flex items-center gap-2'>
            <Button
              variant='outline'
              className='rounded-lg border bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-100'
              onClick={handleNewSelectionClick}
            >
              New Selection
            </Button>
            <div className='h-6 w-px bg-gray-200' />
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
                (exportUnavailableReason || isExporting) && 'cursor-not-allowed opacity-60'
              )}
              aria-disabled={!!exportUnavailableReason || isExporting}
              onClick={() => handleExportClick(exportUnavailableReason)}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
            {/* <Button
              variant='outline'
              className={cn(
                'rounded-lg border bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-100',
                historyUnavailableReason && 'cursor-not-allowed opacity-60'
              )}
              aria-disabled={!!historyUnavailableReason}
              onClick={() => handleHistoryClick(historyUnavailableReason)}
            >
              History
            </Button> */}
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
            onGenerateAnswers={handleGenerateAnswers}
            isProcessingQA={isProcessingQA}
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
              {isSaving ? 'Saving...' : savedSelectionId ? 'Confirm Update' : 'Confirm Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Selection Confirmation Modal */}
      <Dialog open={isNewSelectionModalOpen} onOpenChange={setIsNewSelectionModalOpen}>
        <DialogContent className='bg-white sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>Discard current selection?</DialogTitle>
          </DialogHeader>
          <div className='py-4'>
            <p className='text-sm text-gray-600'>
              You have unsaved changes. If you proceed, all filters, selected candidates, and search results will be
              cleared.
            </p>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsNewSelectionModalOpen(false)}>
              Cancel
            </Button>
            <Button className='bg-red-600 hover:bg-red-700' onClick={handleConfirmDiscard}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
