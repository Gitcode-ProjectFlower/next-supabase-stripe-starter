'use client';

import { Lock } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SoftGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  featureName: string;
  upgradeUrl?: string;
}

export function SoftGateModal({
  open,
  onOpenChange,
  title,
  description,
  featureName,
  upgradeUrl = '/pricing',
}: SoftGateModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='bg-white sm:max-w-[500px]'>
        <DialogHeader>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-100'>
              <Lock className='h-5 w-5 text-blue-600' />
            </div>
            <div>
              <DialogTitle className='text-lg font-semibold text-gray-900'>{title}</DialogTitle>
            </div>
          </div>
          <DialogDescription className='pt-2 text-sm text-gray-600'>{description}</DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
            <div className='mb-1 text-sm font-medium text-gray-900'>{featureName} is available with a paid plan</div>
            <ul className='mt-2 space-y-2 text-sm text-gray-600'>
              <li className='flex items-start gap-2'>
                <span className='text-blue-600'>•</span>
                <span>Unlock unlimited searches</span>
              </li>
              <li className='flex items-start gap-2'>
                <span className='text-blue-600'>•</span>
                <span>Save and export your selections</span>
              </li>
              <li className='flex items-start gap-2'>
                <span className='text-blue-600'>•</span>
                <span>AI-powered Q&A on candidates</span>
              </li>
              <li className='flex items-start gap-2'>
                <span className='text-blue-600'>•</span>
                <span>Access to full candidate details</span>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className='flex-col-reverse gap-2 sm:flex-row'>
          <Button variant='outline' onClick={() => onOpenChange(false)} className='w-full sm:w-auto'>
            Maybe Later
          </Button>
          <Link href={upgradeUrl} className='w-full sm:w-auto'>
            <Button className='w-full bg-blue-600 text-white hover:bg-blue-700'>Upgrade Plan</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
