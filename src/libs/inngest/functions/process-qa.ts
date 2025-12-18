import { inngest } from '@/libs/inngest/client';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

export const processQAJob = inngest.createFunction(
  {
    id: 'process-qa-job',
    name: 'Process Q&A Job',
    retries: 1,
    concurrency: {
      limit: 10,
    },
  },
  { event: 'qa/process' },
  async ({ event, step }) => {
    const { selectionId, prompt, userId, qaSessionId } = event.data;

    console.log(`Starting Q&A job for selection ${selectionId}`);

    const items = await step.run('fetch-selection-items', async () => {
      const { data, error } = await supabaseAdminClient
        .from('selection_items')
        .select('*')
        .eq('selection_id', selectionId)
        .order('similarity', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch selection items: ${error.message}`);
      }

      return data || [];
    });

    console.log(`Found ${items.length} items to process`);

    const maxProfiles = await step.run('determine-max-profiles', async () => {
      const { data: subscription } = await supabaseAdminClient
        .from('subscriptions')
        .select('metadata, prices(products(metadata))')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      const productMetadata = (subscription?.prices as any)?.products?.metadata;
      const planName = productMetadata?.plan_name;

      const planCaps: Record<string, number> = {
        small: 100,
        medium: 500,
        large: 5000,
      };

      const planCap = planName ? planCaps[planName] : 100;

      return Math.min(1000, planCap, items.length);
    });

    console.log(`Processing up to ${maxProfiles} profiles`);

    const batchSize = 10;
    const itemsToProcess = items.slice(0, maxProfiles);
    const results: any[] = [];

    for (let i = 0; i < itemsToProcess.length; i += batchSize) {
      const batch = itemsToProcess.slice(i, i + batchSize);

      const batchResults = await step.run(`process-batch-${i}`, async () => {
        const { HaystackClient } = await import('@/libs/haystack/client');

        const haystackClient = new HaystackClient(
          process.env.HAYSTACK_BASE_URL || 'http://207.180.237.68:8000',
          process.env.HAYSTACK_API_KEY
        );

        // Format items for Haystack - backend expects QACandidate model:
        // - doc_id: str (required)
        // - name: str (required)
        // - email: str (required) - backend uses email to find resume chunks via pipeline.ask()
        // - city: Optional[str] = None
        const batchItems = batch
          .filter((item) => {
            // Filter out items without names
            if (!item.name || item.name.trim() === '') {
              console.warn(`Skipping item with doc_id ${item.doc_id} - missing name`);
              return false;
            }
            // Filter out items without emails - backend requires email to find resume chunks
            if (!item.email || item.email.trim() === '') {
              console.warn(
                `Skipping item with doc_id ${item.doc_id} - missing email (backend requires email to find resume)`
              );
              return false;
            }
            return true;
          })
          .map((item) => ({
            doc_id: item.doc_id,
            name: item.name!.trim(),
            email: item.email!.trim(), // Required: backend uses email to find resume chunks
            city: item.city?.trim() || undefined, // Optional field - send undefined if not available
          }));

        try {
          // Validate prompt before processing
          const cleanedPrompt = prompt.trim();
          if (!cleanedPrompt || cleanedPrompt.length === 0) {
            throw new Error('Prompt is empty or contains only whitespace');
          }

          console.log(
            `Processing batch with ${batchItems.length} items:`,
            batchItems.map((i) => ({ doc_id: i.doc_id, name: i.name })),
            `Prompt length: ${cleanedPrompt.length}, Preview: ${cleanedPrompt.substring(0, 100)}`
          );

          const qaResponses = await haystackClient.askBatch(batchItems, cleanedPrompt);

          console.log(`Received ${qaResponses.length} responses from Haystack`);

          // Map responses back to the full item structure
          return qaResponses.map((response, index) => {
            // Try to find by doc_id first, then fall back to index
            const originalItem =
              batch.find((i) => i.doc_id === response.doc_id) || batchItems[index]
                ? batch.find((i) => i.doc_id === batchItems[index]?.doc_id)
                : null;

            if (!originalItem) {
              console.error(`Original item not found for response:`, {
                responseDocId: response.doc_id,
                index,
                batchItemDocId: batchItems[index]?.doc_id,
              });
              return {
                doc_id: response.doc_id || batchItems[index]?.doc_id || 'unknown',
                name: batchItems[index]?.name || 'Unknown',
                email: '',
                city: '',
                street: '',
                sectors: [],
                experience_years: 0,
                similarity: 0,
                answer: null,
                status: 'ERROR',
                error_message: response.error_message || 'Original item lost in batch processing',
              };
            }

            return {
              doc_id: originalItem.doc_id,
              name: originalItem.name,
              email: originalItem.email,
              city: originalItem.city,
              street: originalItem.street,
              sectors: originalItem.sectors,
              experience_years: originalItem.experience_years,
              similarity: originalItem.similarity,
              answer: response.answer,
              status: response.status === 'success' || response.status === 'OK' ? 'success' : 'failed',
              error_message: response.error_message,
            };
          });
        } catch (error) {
          console.error('Batch processing failed:', error);
          // Fallback for entire batch failure
          return batch.map((item) => ({
            doc_id: item.doc_id,
            name: item.name,
            email: item.email,
            city: item.city,
            street: item.street,
            sectors: item.sectors,
            experience_years: item.experience_years,
            similarity: item.similarity,
            answer: null,
            status: 'ERROR',
            error_message: error instanceof Error ? error.message : 'Batch processing failed',
          }));
        }
      });

      // Insert answers into DB
      if (qaSessionId) {
        await step.run(`save-answers-${i}`, async () => {
          const answersToInsert = batchResults.map((r) => ({
            session_id: qaSessionId,
            doc_id: r.doc_id,
            name: r.name,
            email: r.email,
            city: r.city,
            answer: r.answer,
            status: r.status === 'success' ? 'success' : 'failed',
            error_message: r.error_message,
          }));

          const { error: insertError } = await supabaseAdminClient.from('qa_answers').insert(answersToInsert);

          if (insertError) {
            console.error('Failed to insert QA answers:', insertError);
            throw new Error(`Failed to insert answers: ${insertError.message}`);
          }

          // Update progress
          const progress = Math.round(((i + batchSize) / itemsToProcess.length) * 100);
          await supabaseAdminClient
            .from('qa_sessions')
            .update({ progress: Math.min(progress, 99) })
            .eq('id', qaSessionId);
        });
      }

      results.push(...batchResults);

      console.log(`Processed batch ${i / batchSize + 1}, total: ${results.length}`);
    }

    const downloadUrl = await step.run('generate-csv', async () => {
      const headers = [
        'Name',
        'Email',
        'City',
        'Street',
        'Sectors',
        'Experience Years',
        'Answer',
        'Similarity',
        'Status',
        'Error Message',
      ];

      const rows = results.map((r) => [
        r.name || '',
        r.email || '',
        r.city || '',
        r.street || '',
        Array.isArray(r.sectors) ? r.sectors.join('; ') : '',
        r.experience_years || '',
        r.answer || '',
        r.similarity || '',
        r.status || '',
        r.error_message || '',
      ]);

      const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

      const csvWithBOM = '\uFEFF' + csvContent;

      const fileName = `qa_${selectionId}_${Date.now()}.csv`;
      const filePath = `${userId}/${selectionId}/${fileName}`;

      const { error: uploadError } = await supabaseAdminClient.storage.from('exports').upload(filePath, csvWithBOM, {
        contentType: 'text/csv',
        upsert: false,
      });

      if (uploadError) {
        throw new Error(`Failed to upload CSV: ${uploadError.message}`);
      }

      const { data: urlData } = await supabaseAdminClient.storage
        .from('exports')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7);

      if (!urlData) {
        throw new Error('Failed to create signed URL');
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await supabaseAdminClient.from('downloads').insert({
        user_id: userId,
        selection_id: selectionId,
        type: 'qa',
        url: urlData.signedUrl,
        row_count: results.length,
        expires_at: expiresAt.toISOString(),
      });

      return urlData.signedUrl;
    });

    // Update session as completed
    if (qaSessionId) {
      await supabaseAdminClient
        .from('qa_sessions')
        .update({
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString(),
          csv_url: downloadUrl,
        })
        .eq('id', qaSessionId);
    }

    console.log(`Q&A job completed. Download URL: ${downloadUrl}`);

    return {
      selectionId,
      processed: results.length,
      total: items.length,
      downloadUrl,
    };
  }
);
