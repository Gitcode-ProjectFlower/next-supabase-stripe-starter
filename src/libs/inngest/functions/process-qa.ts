import { inngest } from '@/libs/inngest/client';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

export const processQAJob = inngest.createFunction(
  {
    id: 'process-qa-job',
    name: 'Process Q&A Job',
    retries: 1,
    concurrency: {
      limit: 5,
    },
  },
  { event: 'qa/process' },
  async ({ event, step }) => {
    console.log('[Inngest processQAJob] ===== FUNCTION STARTED =====');
    console.log('[Inngest processQAJob] Event received:', {
      eventName: event.name,
      eventData: event.data,
    });

    const { selectionId, prompt, userId, qaSessionId } = event.data;

    if (!selectionId || !prompt || !userId || !qaSessionId) {
      const error = new Error('Missing required parameters');
      console.error('[Inngest processQAJob] Missing parameters:', {
        selectionId: !!selectionId,
        prompt: !!prompt,
        userId: !!userId,
        qaSessionId: !!qaSessionId,
      });
      throw error;
    }

    console.log('[Inngest processQAJob] Starting Q&A job:', {
      selectionId,
      qaSessionId,
      userId,
      promptLength: prompt?.length || 0,
      promptPreview: prompt?.substring(0, 100) || '',
    });

    // Step 1: Fetch selection items from Supabase
    const items = await step.run('fetch-selection-items', async () => {
      console.log('[Inngest processQAJob] Fetching selection items from Supabase...');

      const { data, error } = await supabaseAdminClient
        .from('selection_items')
        .select('*')
        .eq('selection_id', selectionId)
        .order('similarity', { ascending: false });

      if (error) {
        console.error('[Inngest processQAJob] Error fetching selection items:', error);
        throw new Error(`Failed to fetch selection items: ${error.message}`);
      }

      console.log('[Inngest processQAJob] Fetched selection items:', {
        count: data?.length || 0,
        items: data?.map((item: any) => ({
          doc_id: item.doc_id,
          name: item.name,
          email: item.email,
          hasEmail: !!item.email,
        })),
      });

      return data || [];
    });

    if (!items || items.length === 0) {
      console.warn('[Inngest processQAJob] No items found for selection');
      // Update session to failed
      await supabaseAdminClient
        .from('qa_sessions')
        .update({
          status: 'failed',
          error_message: 'No selection items found',
        })
        .eq('id', qaSessionId);
      return { selectionId, processed: 0, total: 0 };
    }

    // Step 2: Determine max profiles based on plan
    const maxProfiles = await step.run('determine-max-profiles', async () => {
      console.log('[Inngest processQAJob] Determining max profiles based on plan...');

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
        free_tier: 20,
        promo_medium: 500,
      };

      const planCap = planName ? planCaps[planName.toLowerCase()] || 100 : 100;
      const maxProfiles = Math.min(1000, planCap, items.length);

      console.log('[Inngest processQAJob] Max profiles determined:', {
        planName,
        planCap,
        itemsCount: items.length,
        maxProfiles,
      });

      return maxProfiles;
    });

    const batchSize = 10;
    const itemsToProcess = items.slice(0, maxProfiles);
    const results: any[] = [];

    console.log('[Inngest processQAJob] Starting batch processing:', {
      totalItems: items.length,
      itemsToProcess: itemsToProcess.length,
      maxProfiles,
      batchSize,
      numberOfBatches: Math.ceil(itemsToProcess.length / batchSize),
    });

    // Step 3: Process items in batches
    for (let i = 0; i < itemsToProcess.length; i += batchSize) {
      const batch = itemsToProcess.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(itemsToProcess.length / batchSize);

      console.log(
        `[Inngest processQAJob] Processing batch ${batchNumber}/${totalBatches} (items ${i} to ${i + batchSize - 1})`
      );

      const batchResults = await step.run(`process-batch-${i}`, async () => {
        // Import HaystackClient dynamically
        const { HaystackClient } = await import('@/libs/haystack/client');

        const haystackUrl = process.env.HAYSTACK_BASE_URL || 'http://207.180.237.68:8000';
        const haystackApiKey = process.env.HAYSTACK_API_KEY;

        console.log('[Inngest processQAJob] Creating Haystack client:', {
          haystackUrl,
          hasApiKey: !!haystackApiKey,
        });

        const haystackClient = new HaystackClient(haystackUrl, haystackApiKey);

        // Filter and format items for Haystack API
        const batchItems = batch
          .filter((item: any) => {
            if (!item.name || item.name.trim() === '') {
              console.warn(`[Inngest processQAJob] Skipping item ${item.doc_id} - missing name`);
              return false;
            }
            if (!item.email || item.email.trim() === '') {
              console.warn(`[Inngest processQAJob] Skipping item ${item.doc_id} - missing email`);
              return false;
            }
            return true;
          })
          .map((item: any) => ({
            doc_id: item.doc_id,
            name: item.name.trim(),
            email: item.email.trim(),
            city: item.city?.trim() || undefined,
          }));

        if (batchItems.length === 0) {
          console.warn(`[Inngest processQAJob] No valid items in batch ${batchNumber} after filtering`);
          return [];
        }

        // Validate and clean prompt
        const cleanedPrompt = prompt.trim();
        if (!cleanedPrompt || cleanedPrompt.length === 0) {
          throw new Error('Prompt is empty or contains only whitespace');
        }

        console.log(`[Inngest processQAJob] ===== BATCH ${batchNumber} - CALLING HAYSTACK API =====`);
        console.log('[Inngest processQAJob] Request details:', {
          batchNumber,
          batchSize: batchItems.length,
          haystackUrl: `${haystackUrl}/qa`,
          items: batchItems.map((i) => ({
            doc_id: i.doc_id,
            name: i.name,
            email: i.email,
            city: i.city,
          })),
          promptLength: cleanedPrompt.length,
          promptPreview: cleanedPrompt.substring(0, 100),
        });

        // Call Haystack API
        let qaResponses: any[];
        try {
          qaResponses = await haystackClient.askBatch(batchItems, cleanedPrompt);
          console.log(`[Inngest processQAJob] ===== BATCH ${batchNumber} - HAYSTACK RESPONSE RECEIVED =====`);
          console.log('[Inngest processQAJob] Response details:', {
            batchNumber,
            responseCount: qaResponses.length,
            responses: qaResponses.map((r: any) => ({
              doc_id: r.doc_id,
              name: r.name,
              email: r.email,
              status: r.status,
              hasAnswer: !!r.answer,
              answerLength: r.answer?.length || 0,
              errorMessage: r.error_message,
            })),
          });
        } catch (haystackError) {
          console.error(`[Inngest processQAJob] Haystack API error for batch ${batchNumber}:`, haystackError);
          // Return error responses for all items in batch
          return batch.map((item: any) => ({
            doc_id: item.doc_id,
            name: item.name || '',
            email: item.email || '',
            city: item.city || null,
            street: item.street || '',
            sectors: item.sectors || [],
            experience_years: item.experience_years || 0,
            similarity: item.similarity || 0,
            answer: null,
            status: 'failed',
            error_message: haystackError instanceof Error ? haystackError.message : 'Haystack API call failed',
          }));
        }

        // Map Haystack responses to our format
        const mappedResults = qaResponses.map((response: any, index: number) => {
          const haystackResponse = response as any;

          // Find original item by doc_id
          let originalItem = batch.find((item: any) => item.doc_id === haystackResponse.doc_id);

          // If not found, try by index
          if (!originalItem && batchItems[index]) {
            originalItem = batch.find((item: any) => item.doc_id === batchItems[index]?.doc_id);
          }

          const responseName = haystackResponse.name || '';
          const responseEmail = haystackResponse.email || '';
          const responseCity = haystackResponse.city || null;
          const answerText = haystackResponse.answer || null;

          // Check response status - handle TIMEOUT, ERROR, and other failure statuses
          const responseStatus = haystackResponse.status?.toUpperCase() || '';
          const isSuccess =
            (responseStatus === 'SUCCESS' || responseStatus === 'OK') && answerText && answerText.trim().length > 0;

          // Get error message - handle "operation was aborted" specifically
          let errorMessage = haystackResponse.error_message || null;
          if (!isSuccess && !errorMessage) {
            if (responseStatus === 'TIMEOUT' || responseStatus === 'ABORTED') {
              errorMessage = 'Request timed out. Please try again.';
            } else if (responseStatus === 'ERROR' || responseStatus === 'NO_INFO') {
              errorMessage = 'Failed to generate answer from resume data.';
            } else {
              errorMessage = 'Failed to generate answer';
            }
          }

          // Clean up error messages that mention "aborted"
          if (errorMessage && (errorMessage.includes('aborted') || errorMessage.includes('AbortError'))) {
            errorMessage = 'Request timed out. Please try again.';
          }

          if (originalItem) {
            return {
              doc_id: originalItem.doc_id,
              name: originalItem.name || responseName,
              email: originalItem.email || responseEmail,
              city: originalItem.city || responseCity,
              street: originalItem.street || '',
              sectors: originalItem.sectors || [],
              experience_years: originalItem.experience_years || 0,
              similarity: originalItem.similarity || 0,
              answer: answerText,
              status: isSuccess ? 'success' : 'failed',
              error_message: errorMessage,
            };
          }

          // Fallback: use response data
          console.warn(`[Inngest processQAJob] Original item not found for response, using response data:`, {
            responseDocId: haystackResponse.doc_id,
            index,
          });

          return {
            doc_id: haystackResponse.doc_id || batchItems[index]?.doc_id || 'unknown',
            name: responseName || batchItems[index]?.name || 'Unknown',
            email: responseEmail || batchItems[index]?.email || '',
            city: responseCity || batchItems[index]?.city || null,
            street: '',
            sectors: [],
            experience_years: 0,
            similarity: 0,
            answer: answerText,
            status: isSuccess ? 'success' : 'failed',
            error_message: haystackResponse.error_message || null,
          };
        });

        console.log(`[Inngest processQAJob] Batch ${batchNumber} mapped results:`, {
          count: mappedResults.length,
          successCount: mappedResults.filter((r) => r.status === 'success').length,
          failedCount: mappedResults.filter((r) => r.status === 'failed').length,
        });

        return mappedResults;
      });

      // Step 4: Save answers to database
      if (qaSessionId && batchResults.length > 0) {
        await step.run(`save-answers-${i}`, async () => {
          console.log(`[Inngest processQAJob] Saving answers for batch ${batchNumber}...`);

          const answersToInsert = batchResults
            .filter((r) => r.doc_id)
            .map((r) => ({
              session_id: qaSessionId,
              doc_id: String(r.doc_id),
              name: String(r.name || ''),
              email: String(r.email || ''),
              city: r.city ? String(r.city) : null,
              answer: r.answer ? String(r.answer) : null,
              status: r.status === 'success' ? 'success' : 'failed',
              error_message: r.error_message ? String(r.error_message) : null,
            }));

          if (answersToInsert.length === 0) {
            console.warn(`[Inngest processQAJob] No answers to insert for batch ${batchNumber}`);
            return [];
          }

          console.log(`[Inngest processQAJob] Inserting ${answersToInsert.length} answers for batch ${batchNumber}:`, {
            firstAnswer: {
              doc_id: answersToInsert[0].doc_id,
              name: answersToInsert[0].name,
              hasAnswer: !!answersToInsert[0].answer,
              answerLength: answersToInsert[0].answer?.length || 0,
              status: answersToInsert[0].status,
            },
          });

          const { error: insertError, data: insertedData } = await supabaseAdminClient
            .from('qa_answers')
            .insert(answersToInsert)
            .select();

          if (insertError) {
            console.error(`[Inngest processQAJob] Failed to insert answers for batch ${batchNumber}:`, {
              error: insertError,
              batchSize: answersToInsert.length,
              errorDetails: {
                message: insertError.message,
                code: insertError.code,
                details: insertError.details,
                hint: insertError.hint,
              },
            });
            throw new Error(`Failed to insert answers: ${insertError.message}`);
          }

          console.log(
            `[Inngest processQAJob] Successfully inserted ${insertedData?.length || 0} answers for batch ${batchNumber}`
          );

          // Update progress
          const progress = Math.round(((i + batchSize) / itemsToProcess.length) * 100);
          const { error: progressError } = await supabaseAdminClient
            .from('qa_sessions')
            .update({ progress: Math.min(progress, 99) })
            .eq('id', qaSessionId);

          if (progressError) {
            console.error(`[Inngest processQAJob] Failed to update progress:`, progressError);
          } else {
            console.log(`[Inngest processQAJob] Progress updated to ${Math.min(progress, 99)}%`);
          }

          return insertedData || [];
        });
      } else if (batchResults.length === 0) {
        console.warn(`[Inngest processQAJob] No batch results to save for batch ${batchNumber}`);
      }

      results.push(...batchResults);
      console.log(`[Inngest processQAJob] Batch ${batchNumber} completed. Total results so far: ${results.length}`);
    }

    // Step 5: Generate CSV and update session
    const downloadUrl = await step.run('generate-csv', async () => {
      console.log('[Inngest processQAJob] Generating CSV...');

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
        console.error('[Inngest processQAJob] Failed to upload CSV:', uploadError);
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

      console.log('[Inngest processQAJob] CSV generated and uploaded:', {
        fileName,
        filePath,
        downloadUrl: urlData.signedUrl,
      });

      return urlData.signedUrl;
    });

    // Step 6: Log usage only after successful completion (moved before status update to check success rate)
    // This will be called only if session is marked as completed (not failed)
    // We'll move this after status check

    // Step 7: Check success rate and update session status accordingly
    await step.run('update-session-status', async () => {
      console.log('[Inngest processQAJob] Checking success rate and updating session status...');

      // Calculate success rate
      const successfulAnswers = results.filter((r) => r.status === 'success' && r.answer && r.answer.trim().length > 0);
      const successCount = successfulAnswers.length;
      const totalCount = results.length;
      const successRate = totalCount > 0 ? successCount / totalCount : 0;

      console.log('[Inngest processQAJob] Success rate analysis:', {
        successCount,
        totalCount,
        successRate: `${(successRate * 100).toFixed(1)}%`,
        failedCount: totalCount - successCount,
      });

      // Mark as failed if success rate is too low (< 10% or all failed)
      const shouldMarkAsFailed = successRate < 0.1 || successCount === 0;

      if (shouldMarkAsFailed) {
        const errorMessage =
          successCount === 0
            ? 'All Q&A requests failed. Please check your question and try again.'
            : `Only ${successCount} out of ${totalCount} answers were generated successfully. The session is marked as failed.`;

        console.warn('[Inngest processQAJob] Marking session as failed due to low success rate:', {
          successCount,
          totalCount,
          successRate,
        });

        const { error: updateError } = await supabaseAdminClient
          .from('qa_sessions')
          .update({
            status: 'failed',
            progress: 100,
            completed_at: new Date().toISOString(),
            error_message: errorMessage,
            csv_url: downloadUrl, // Still save CSV even if failed
          })
          .eq('id', qaSessionId);

        if (updateError) {
          console.error('[Inngest processQAJob] Failed to update session status:', updateError);
          throw new Error(`Failed to update session: ${updateError.message}`);
        }

        console.log('[Inngest processQAJob] Session marked as failed due to low success rate');
        // Don't log usage if session failed
        return;
      }

      // Mark as completed if success rate is acceptable
      const { error: updateError } = await supabaseAdminClient
        .from('qa_sessions')
        .update({
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString(),
          csv_url: downloadUrl,
        })
        .eq('id', qaSessionId);

      if (updateError) {
        console.error('[Inngest processQAJob] Failed to update session status:', updateError);
        throw new Error(`Failed to update session: ${updateError.message}`);
      }

      console.log('[Inngest processQAJob] Session updated to completed');

      // Log usage only if session was marked as completed (not failed)
      console.log('[Inngest processQAJob] Logging usage for successful Q&A job...');
      const { logUsage } = await import('@/libs/usage-tracking');

      try {
        await logUsage(userId, 'ai_question', successCount); // Only count successful answers
        console.log(`[Inngest processQAJob] Usage logged: ${successCount} AI calls (only successful answers)`);
      } catch (usageError) {
        console.error('[Inngest processQAJob] Failed to log usage:', usageError);
        // Don't fail the job if usage logging fails - it's not critical
      }
    });

    console.log('[Inngest processQAJob] ===== FUNCTION COMPLETED SUCCESSFULLY =====');
    console.log('[Inngest processQAJob] Final summary:', {
      selectionId,
      processed: results.length,
      total: items.length,
      downloadUrl,
    });

    return {
      selectionId,
      processed: results.length,
      total: items.length,
      downloadUrl,
    };
  }
);
