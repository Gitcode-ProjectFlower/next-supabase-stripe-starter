'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { FullPageLoader } from '@/components/full-page-loader';
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
import { useToast } from '@/components/ui/use-toast';
import { trackEvent } from '@/libs/analytics/posthog';
import { ApiError } from '@/libs/api-client';
import { useSelectionsQuery } from '@/libs/queries';
import { QUERY_KEYS } from '@/libs/query-keys';
import { getLocalePath } from '@/utils/get-locale-path';

export function Selections() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'uk';

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useSelectionsQuery();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use query data directly instead of redundant state
  const selections = data?.selections || [];

  useEffect(() => {
    if (error && (error as ApiError).status !== 401) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load selections',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/selections/${deleteId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete selection');

      // Track selection deleted event
      trackEvent.selectionDeleted({
        selectionId: deleteId,
      });

      toast({
        title: 'Success',
        description: 'Selection deleted successfully',
        variant: 'success',
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.selections.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.usage.stats });

      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting selection:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete selection',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (isLoading) return <FullPageLoader text='Loading selections...' />;

  return selections.length === 0 ? (
    <div className='flex h-full items-center justify-center p-6'>
      <div className='text-center'>
        <svg className='mx-auto h-24 w-24 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={1.5}
            d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
          />
        </svg>
        <h2 className='mt-4 text-2xl font-bold text-gray-900'>No selections yet</h2>
        <p className='mt-2 text-gray-600'>Create your first selection to save and manage candidate lists</p>
        <Button
          className='mt-6 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700'
          onClick={() => router.push(getLocalePath(locale, '/'))}
        >
          Create New Selection
        </Button>
      </div>
    </div>
  ) : (
    <>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>My Selections</h1>
          <p className='mt-1 text-gray-600'>Manage your saved candidate selections</p>
        </div>
        <Button
          className='rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
          onClick={() => router.push(getLocalePath(locale, '/'))}
        >
          Create New Selection
        </Button>
      </div>

      <div className='overflow-hidden rounded-2xl border bg-white shadow-sm'>
        <Table>
          <TableHeader className='bg-gray-50'>
            <TableRow className='hover:bg-transparent'>
              <TableHead className='px-4 py-3 font-semibold text-gray-700'>Name</TableHead>
              <TableHead className='px-4 py-3 font-semibold text-gray-700'>Candidates</TableHead>
              <TableHead className='px-4 py-3 font-semibold text-gray-700'>Created</TableHead>
              <TableHead className='px-4 py-3 font-semibold text-gray-700'>Expires</TableHead>
              <TableHead className='px-4 py-3 text-right font-semibold text-gray-700'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selections.map((selection) => {
              const daysLeft = getDaysUntilExpiry(selection.expires_at);
              const isExpiringSoon = daysLeft <= 2;

              return (
                <TableRow key={selection.id} className='cursor-pointer hover:bg-gray-50'>
                  <TableCell className='px-4 py-3 font-medium'>{selection.name}</TableCell>
                  <TableCell className='px-4 py-3'>
                    <span className='rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700'>
                      {selection.item_count}
                    </span>
                  </TableCell>
                  <TableCell className='whitespace-nowrap px-4 py-3 text-sm text-gray-600'>
                    {formatDate(selection.created_at)}
                  </TableCell>
                  <TableCell className='whitespace-nowrap px-4 py-3'>
                    <div className='flex items-center gap-2'>
                      <span className={`text-sm ${isExpiringSoon ? 'font-semibold text-red-600' : 'text-gray-600'}`}>
                        {formatDate(selection.expires_at)}
                      </span>
                      {isExpiringSoon && (
                        <span className='rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700'>
                          {daysLeft}d left
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='px-4 py-3 text-right'>
                    <div className='flex items-center justify-end gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        className='hover:bg-gray-100'
                        onClick={() => router.push(getLocalePath(locale, `/selections/${selection.id}`))}
                      >
                        Open
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        className='hover:bg-red-50 hover:text-red-600'
                        onClick={() => setDeleteId(selection.id)}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selection</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this selection? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
