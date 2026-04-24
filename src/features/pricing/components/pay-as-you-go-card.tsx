'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';

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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

const BULLETS = [
  'Pay per result or insight',
  'No monthly commitment',
  'For occasional use',
];

export function PayAsYouGoCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setEmail('');
    setMessage('');
    setIsSubmitted(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(resetForm, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/pricing/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), message: message.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send request');
      setIsSubmitted(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send your request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className='relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm'>
        <div className='mb-4'>
          <h3 className='text-xl font-bold text-gray-900'>Pay-as-you-go (beta)</h3>
          <p className='mt-2 text-sm text-gray-600'>
            No subscription required. Pay per result or insight.
          </p>
        </div>

        <div className='mb-6'>
          <div className='rounded-lg bg-gray-50 p-3'>
            <div className='text-sm text-gray-600'>Flexible</div>
            <div className='text-2xl font-bold text-gray-900'>—</div>
            <div className='text-xs text-gray-500'>no monthly plan</div>
          </div>
        </div>

        <ul className='mb-6 flex-1 space-y-3'>
          {BULLETS.map((bullet) => (
            <li key={bullet} className='flex items-start gap-2'>
              <Check className='h-5 w-5 shrink-0 text-green-600' />
              <span className='text-sm text-gray-700'>{bullet}</span>
            </li>
          ))}
        </ul>

        <Button variant='outline' className='w-full' onClick={() => setIsOpen(true)}>
          Request access
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={(v) => (v ? setIsOpen(true) : handleClose())}>
        <DialogContent className='bg-white sm:max-w-[520px]'>
          {!isSubmitted ? (
            <>
              <DialogHeader className='text-center sm:text-center'>
                <DialogTitle className='text-xl'>Request access to Pay-as-you-go</DialogTitle>
                <DialogDescription className='pt-1'>
                  Leave your email and we&apos;ll get back to you shortly. No payment required now.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className='space-y-5 py-4'>
                <div className='space-y-1.5'>
                  <Label htmlFor='pay-email'>Email</Label>
                  <Input
                    id='pay-email'
                    type='email'
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder='your@email.com'
                    disabled={isSubmitting}
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='pay-message'>
                    Message <span className='font-normal text-gray-400'>(optional)</span>
                  </Label>
                  <Textarea
                    id='pay-message'
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder='Tell us a bit about your use case'
                    rows={4}
                    className='resize-none'
                    disabled={isSubmitting}
                  />
                </div>

                <div className='flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-center sm:gap-3'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className='sm:min-w-[120px]'
                  >
                    Cancel
                  </Button>
                  <Button
                    type='submit'
                    disabled={isSubmitting || !email.trim()}
                    className='bg-blue-600 text-white hover:bg-blue-700 sm:min-w-[120px]'
                  >
                    {isSubmitting ? 'Sending...' : 'Request'}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <DialogHeader className='text-center sm:text-center'>
                <DialogTitle className='text-xl'>Thanks!</DialogTitle>
                <DialogDescription className='pt-1'>
                  We received your request and will contact you shortly.
                </DialogDescription>
              </DialogHeader>
              <div className='flex justify-center pt-4'>
                <Button onClick={handleClose} className='min-w-[160px] bg-blue-600 text-white hover:bg-blue-700'>
                  Got it
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
