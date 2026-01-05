'use client';

import { Send } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { createSupabaseBrowserClient } from '@/libs/supabase/supabase-browser-client';

export function Help() {
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your question before sending.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user if logged in
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const response = await fetch('/api/help/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          userId: user?.id || null,
          userEmail: user?.email || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      toast({
        title: 'Message sent',
        description: 'Your question has been sent successfully. We will get back to you soon!',
      });

      // Clear the form
      setQuestion('');
    } catch (error: any) {
      console.error('Error sending help message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send your message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='mx-auto w-full max-w-3xl'>
      <div className='rounded-2xl border border-gray-200 bg-white p-8 shadow-sm'>
        <h1 className='mb-2 text-3xl font-bold text-gray-900'>Help & Support</h1>
        <p className='mb-8 text-gray-600'>
          Have a question? We're here to help! Send us your question and we'll get back to you as soon as possible.
        </p>

        <form onSubmit={handleSubmit} className='space-y-6'>
          <Field>
            <Label htmlFor='question'>Your Question</Label>
            <Textarea
              id='question'
              name='question'
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder='Ask your question here...'
              rows={6}
              className='w-full resize-none'
              disabled={isSubmitting}
            />
          </Field>

          <Button type='submit' disabled={isSubmitting} className='w-full sm:w-auto'>
            {isSubmitting ? (
              <>
                <span className='mr-2'>Sending...</span>
              </>
            ) : (
              <>
                <Send className='mr-2 h-4 w-4' />
                Send Message
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
