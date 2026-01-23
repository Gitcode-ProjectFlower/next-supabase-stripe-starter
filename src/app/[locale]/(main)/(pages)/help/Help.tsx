'use client';

import { ChevronDown, Send } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

  // State for FAQ sections
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    const newOpenSections = new Set(openSections);
    if (newOpenSections.has(section)) {
      newOpenSections.delete(section);
    } else {
      newOpenSections.add(section);
    }
    setOpenSections(newOpenSections);
  };

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
    <div className='mx-auto w-full max-w-3xl space-y-8'>
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

      <div className='rounded-2xl border border-gray-200 bg-white p-8 shadow-sm'>
        <h2 className='mb-6 text-2xl font-bold text-gray-900'>Frequently Asked Questions</h2>
        <div className='space-y-4'>
          {/* General Questions */}
          <Collapsible open={openSections.has('general')} onOpenChange={() => toggleSection('general')}>
            <CollapsibleTrigger className='flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-900 transition-colors hover:bg-gray-100'>
              <span>General Questions</span>
              <ChevronDown
                className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                  openSections.has('general') ? 'rotate-180' : ''
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className='space-y-4 px-4 pt-4'>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>What is InsideFirms?</h3>
                <p className='text-gray-600'>
                  InsideFirms is a platform that helps you find and analyze companies based on your specific criteria.
                  You can search for companies using lookalike matching, filter by sector and region, and ask questions
                  to gain insights about selected companies.
                </p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>How does the platform work?</h3>
                <p className='mb-2 text-gray-600'>The platform offers three main features:</p>
                <ol className='ml-4 list-decimal space-y-1 text-gray-600'>
                  <li>
                    <strong>Lookalike Search:</strong> Enter names of companies you like, and we'll find similar
                    companies based on their profiles.
                  </li>
                  <li>
                    <strong>Filter Search:</strong> Search for companies by sector, region, and company size without
                    needing reference companies.
                  </li>
                  <li>
                    <strong>Q&A:</strong> Ask questions to selected companies and get answers based on their data.
                  </li>
                </ol>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>Do I need to create an account?</h3>
                <p className='text-gray-600'>
                  To save selections, export data, and use the Q&A feature, you'll need to create a free account.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Lookalike Search */}
          <Collapsible open={openSections.has('lookalike')} onOpenChange={() => toggleSection('lookalike')}>
            <CollapsibleTrigger className='flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-900 transition-colors hover:bg-gray-100'>
              <span>Lookalike Search</span>
              <ChevronDown
                className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                  openSections.has('lookalike') ? 'rotate-180' : ''
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className='space-y-4 px-4 pt-4'>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>What is a lookalike search?</h3>
                <p className='text-gray-600'>
                  A lookalike search finds companies similar to the ones you specify. Enter the names of companies
                  you're interested in, and the platform will find companies with similar characteristics.
                </p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>How are lookalikes determined?</h3>
                <p className='text-gray-600'>
                  Lookalikes are found using similarity matching. Companies are compared based on their characteristics.
                  Results are sorted by a fit score — the higher the score, the more similar the company is to your
                  reference companies.
                </p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>Can I search without entering company names?</h3>
                <p className='text-gray-600'>
                  Yes. You can skip the lookalike search and go directly to filtering by sector, region, and company
                  size. Simply leave the company names field empty and use the filter options.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Filtering & Search */}
          <Collapsible open={openSections.has('filtering')} onOpenChange={() => toggleSection('filtering')}>
            <CollapsibleTrigger className='flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-900 transition-colors hover:bg-gray-100'>
              <span>Filtering & Search</span>
              <ChevronDown
                className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                  openSections.has('filtering') ? 'rotate-180' : ''
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className='space-y-4 px-4 pt-4'>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>What is Top-K (number of results)?</h3>
                <p className='text-gray-600'>
                  Top-K defines how many results are returned in a search. The maximum Top-K value depends on your plan.
                </p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>Can I combine lookalike search with filters?</h3>
                <p className='text-gray-600'>
                  Yes. You can enter company names and apply sector and region filters at the same time. The system will
                  return companies that match both your reference companies and your filter criteria.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Q&A Feature */}
          <Collapsible open={openSections.has('qa')} onOpenChange={() => toggleSection('qa')}>
            <CollapsibleTrigger className='flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-900 transition-colors hover:bg-gray-100'>
              <span>Q&A Feature</span>
              <ChevronDown
                className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                  openSections.has('qa') ? 'rotate-180' : ''
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className='space-y-4 px-4 pt-4'>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>What is the Q&A feature?</h3>
                <p className='text-gray-600'>
                  The Q&A feature allows you to ask questions to selected companies. Each company receives the same
                  question or set of questions, and answers are generated based on the available company data.
                </p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>How do I use the Q&A feature?</h3>
                <ol className='ml-4 list-decimal space-y-1 text-gray-600'>
                  <li>Search for companies using lookalike search or filters</li>
                  <li>Select the companies you want to ask questions to</li>
                  <li>Enter your question(s) in the prompt field</li>
                  <li>Click "Generate answers"</li>
                  <li>Wait for processing to complete</li>
                  <li>View the answers in the results table or download them as CSV</li>
                </ol>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>What kind of questions can I ask?</h3>
                <p className='mb-2 text-gray-600'>You can ask questions such as:</p>
                <ul className='ml-4 list-disc space-y-1 text-gray-600'>
                  <li>"What products or services do they offer?"</li>
                  <li>"What kind of materials do they use?"</li>
                  <li>"Which technologies or processes do they use?"</li>
                  <li>"How many locations do they have?"</li>
                </ul>
                <p className='mt-2 text-gray-600'>
                  To assess commercial potential, you can also evaluate the fit between your product and selected
                  companies.
                </p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>How long does it take to generate answers?</h3>
                <p className='text-gray-600'>
                  Processing time depends on the number of selected companies. Larger selections typically take a few
                  minutes. A progress indicator shows the completion status in real time. You can receive an email
                  notification when processing is complete by enabling notifications in Settings.
                </p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>Are there limits on Q&A?</h3>
                <p className='text-gray-600'>
                  Yes. Each plan has a monthly limit on calls. Each selected company counts as <strong>one call</strong>
                  . If your limit is reached, generation is blocked until your rolling 30-day window resets or you
                  upgrade your plan.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Selections & Saving */}
          <Collapsible open={openSections.has('selections')} onOpenChange={() => toggleSection('selections')}>
            <CollapsibleTrigger className='flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-900 transition-colors hover:bg-gray-100'>
              <span>Selections & Saving</span>
              <ChevronDown
                className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                  openSections.has('selections') ? 'rotate-180' : ''
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className='space-y-4 px-4 pt-4'>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>What is a selection?</h3>
                <p className='text-gray-600'>
                  A selection is a saved list of companies that you have chosen. Selections can be reused for exports or
                  Q&A.
                </p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>How do I save a selection?</h3>
                <ol className='ml-4 list-decimal space-y-1 text-gray-600'>
                  <li>Search for companies</li>
                  <li>Select the companies you want</li>
                  <li>Click "Save Selection"</li>
                  <li>Give the selection a name</li>
                  <li>Click "Save"</li>
                </ol>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>How many selections can I save?</h3>
                <p className='text-gray-600'>You can save unlimited selections, regardless of your plan.</p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>How long are selections available?</h3>
                <p className='text-gray-600'>
                  Selections are available for 7 days after creation. After that, they expire and are automatically
                  removed.
                </p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>Can I edit a saved selection?</h3>
                <p className='text-gray-600'>
                  Currently, selections cannot be edited. You can view the selection, export it as CSV, ask questions to
                  the companies in the selection, or create a new selection with different companies.
                </p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>Can I delete a selection?</h3>
                <p className='text-gray-600'>Yes. You can delete selections from your selections list page.</p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* CSV Export */}
          <Collapsible open={openSections.has('csv')} onOpenChange={() => toggleSection('csv')}>
            <CollapsibleTrigger className='flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-900 transition-colors hover:bg-gray-100'>
              <span>CSV Export</span>
              <ChevronDown
                className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                  openSections.has('csv') ? 'rotate-180' : ''
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className='space-y-4 px-4 pt-4'>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>How do I export results to CSV?</h3>
                <p className='mb-2 text-gray-600'>There are two ways to export:</p>
                <ol className='ml-4 list-decimal space-y-1 text-gray-600'>
                  <li>From search results: select companies and click "Export CSV"</li>
                  <li>From a saved selection: open the selection and click "Export CSV"</li>
                </ol>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>What information is included in the CSV?</h3>
                <p className='mb-2 text-gray-600'>
                  The CSV includes 17 standard fields per company, included when available:
                </p>
                <ul className='ml-4 list-disc space-y-1 text-gray-600'>
                  <li>Name, Domain, Company Size, Email, Phone</li>
                  <li>Street, City, Postal Code</li>
                  <li>Sector Level 1, 2, 3</li>
                  <li>Region Level 1, 2, 3, 4</li>
                  <li>LinkedIn Company URL, Legal Form</li>
                  <li>Fit Score (if applicable)</li>
                  <li>Answer and Status (if Q&A was performed)</li>
                </ul>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>Are there limits on CSV exports?</h3>
                <p className='text-gray-600'>
                  Yes. Each plan has monthly download limits. Each export counts toward your limit based on the number
                  of records exported.
                </p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>How long are CSV download links valid?</h3>
                <p className='text-gray-600'>
                  CSV download links are valid for 7 days after generation. After that, a new export must be generated.
                </p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>What format is the CSV file?</h3>
                <p className='text-gray-600'>
                  CSV files are exported in UTF-8 format with BOM for proper Excel compatibility. Files are
                  comma-separated with quoted fields.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Plans & Pricing */}
          <Collapsible open={openSections.has('plans')} onOpenChange={() => toggleSection('plans')}>
            <CollapsibleTrigger className='flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-900 transition-colors hover:bg-gray-100'>
              <span>Plans & Pricing</span>
              <ChevronDown
                className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                  openSections.has('plans') ? 'rotate-180' : ''
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className='space-y-4 px-4 pt-4'>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>What plans are available?</h3>
                <p className='mb-2 text-gray-600'>We offer the following plans:</p>
                <ul className='ml-4 list-disc space-y-1 text-gray-600'>
                  <li>Free Tier: Limited access with basic features</li>
                  <li>Small Plan: For individual users and small teams</li>
                  <li>Medium Plan: For growing businesses</li>
                  <li>Large Plan: For enterprise use</li>
                </ul>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>What are the differences between plans?</h3>
                <p className='text-gray-600'>Plans differ in Top-K limits, monthly CSV downloads, and monthly calls.</p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>Can I upgrade or downgrade my plan?</h3>
                <p className='text-gray-600'>
                  Yes. You can change your plan at any time through your account settings. Changes take effect
                  immediately.
                </p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>What happens if I exceed my plan limits?</h3>
                <p className='text-gray-600'>
                  You will receive notifications when approaching or reaching your limits. To continue using the
                  service, you must wait for the rolling 30-day reset or upgrade your plan.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Account & Access */}
          <Collapsible open={openSections.has('account')} onOpenChange={() => toggleSection('account')}>
            <CollapsibleTrigger className='flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-900 transition-colors hover:bg-gray-100'>
              <span>Account & Access</span>
              <ChevronDown
                className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                  openSections.has('account') ? 'rotate-180' : ''
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className='space-y-4 px-4 pt-4'>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>How do I create an account?</h3>
                <p className='text-gray-600'>
                  Click "Get started for free" or "Sign up" on the homepage and register with your email address.
                </p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>
                  Do I need to provide payment information for a free account?
                </h3>
                <p className='text-gray-600'>No. Payment information is only required when upgrading to a paid plan.</p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>How do I manage my subscription?</h3>
                <p className='text-gray-600'>
                  Subscriptions can be managed via the "Manage Subscription" button in account settings, using Stripe's
                  customer portal.
                </p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>Can I cancel my subscription?</h3>
                <p className='text-gray-600'>
                  Yes. You can cancel at any time. Access remains active until the end of the current billing period.
                </p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>What happens to my data if I cancel?</h3>
                <p className='text-gray-600'>
                  Saved selections and exports remain available for 7 days after cancellation and are then automatically
                  removed.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Technical Questions */}
          <Collapsible open={openSections.has('technical')} onOpenChange={() => toggleSection('technical')}>
            <CollapsibleTrigger className='flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-900 transition-colors hover:bg-gray-100'>
              <span>Technical Questions</span>
              <ChevronDown
                className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                  openSections.has('technical') ? 'rotate-180' : ''
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className='space-y-4 px-4 pt-4'>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>Do you have a mobile app?</h3>
                <p className='text-gray-600'>
                  InsideFirms is a web-based platform optimized for desktop and tablet use. It is responsive on mobile
                  browsers, but the experience is optimized for larger screens.
                </p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>How is my data stored and secured?</h3>
                <ul className='ml-4 list-disc space-y-1 text-gray-600'>
                  <li>All data is stored in secured databases with access control and encryption at rest</li>
                  <li>User authentication is handled securely</li>
                  <li>CSV exports are stored temporarily (7 days) in secure cloud storage</li>
                  <li>Industry-standard security practices are followed</li>
                </ul>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>Can I access the API directly?</h3>
                <p className='text-gray-600'>
                  Currently, no public API is available. All functionality is provided through the web interface.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Troubleshooting */}
          <Collapsible open={openSections.has('troubleshooting')} onOpenChange={() => toggleSection('troubleshooting')}>
            <CollapsibleTrigger className='flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-900 transition-colors hover:bg-gray-100'>
              <span>Troubleshooting</span>
              <ChevronDown
                className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                  openSections.has('troubleshooting') ? 'rotate-180' : ''
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className='space-y-4 px-4 pt-4'>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>Why is my search returning no results?</h3>
                <p className='mb-2 text-gray-600'>Try:</p>
                <ul className='ml-4 list-disc space-y-1 text-gray-600'>
                  <li>Removing filters to broaden the search</li>
                  <li>Verifying sector and region selections</li>
                  <li>Checking spelling of company names for lookalike searches</li>
                </ul>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>Why can't I export my selection?</h3>
                <p className='mb-2 text-gray-600'>Possible reasons:</p>
                <ul className='ml-4 list-disc space-y-1 text-gray-600'>
                  <li>Monthly download limit reached</li>
                  <li>The selection is empty</li>
                  <li>You are not signed in</li>
                </ul>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>The CSV download link expired. What should I do?</h3>
                <p className='text-gray-600'>
                  Generate a new export from the saved selection. Links are valid for 7 days.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Feature Requests & Feedback */}
          <Collapsible open={openSections.has('feedback')} onOpenChange={() => toggleSection('feedback')}>
            <CollapsibleTrigger className='flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-900 transition-colors hover:bg-gray-100'>
              <span>Feature Requests & Feedback</span>
              <ChevronDown
                className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                  openSections.has('feedback') ? 'rotate-180' : ''
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className='space-y-4 px-4 pt-4'>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>Can I suggest new features?</h3>
                <p className='text-gray-600'>
                  Yes. Feature requests and feedback can be submitted through the contact form or support channels.
                </p>
              </div>
              <div>
                <h3 className='mb-2 font-semibold text-gray-900'>Where can I find more information?</h3>
                <p className='text-gray-600'>
                  Refer to this FAQ, available help documentation, or your account settings for plan details and usage
                  statistics.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
