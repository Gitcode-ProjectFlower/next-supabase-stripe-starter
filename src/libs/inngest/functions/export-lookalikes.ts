import { inngest } from '@/libs/inngest/client';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export const exportLookalikesJob = inngest.createFunction(
    {
        id: 'export-lookalikes-job',
        name: 'Export Lookalikes to CSV',
        retries: 1,
    },
    { event: 'lookalikes/export' },
    async ({ event, step }) => {
        const { selectionId, userId } = event.data;

        console.log(`Starting Lookalikes CSV export for selection ${selectionId}`);

        const items = await step.run('fetch-selection-items', async () => {
            const supabase = await createSupabaseServerClient();

            const { data, error } = await supabase
                .from('selection_items')
                .select('*')
                .eq('selection_id', selectionId)
                .order('similarity', { ascending: false });

            if (error) {
                throw new Error(`Failed to fetch selection items: ${error.message}`);
            }

            return data || [];
        });

        console.log(`Found ${items.length} items to export`);

        const downloadUrl = await step.run('generate-and-upload-csv', async () => {
            const supabase = await createSupabaseServerClient();

            const headers = [
                'Name',
                'Email',
                'Phone',
                'City',
                'Street',
                'Sectors',
                'Experience Years',
                'Similarity',
            ];

            const rows = items.map((item) => [
                item.name || '',
                item.email || '',
                item.phone || '',
                item.city || '',
                item.street || '',
                Array.isArray(item.sectors) ? item.sectors.join('; ') : '',
                item.experience_years?.toString() || '',
                item.similarity?.toFixed(4) || '',
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
            ].join('\n');

            const csvWithBOM = '\uFEFF' + csvContent;

            const fileName = `lookalikes_${selectionId}_${Date.now()}.csv`;
            const filePath = `${userId}/${selectionId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('exports')
                .upload(filePath, csvWithBOM, {
                    contentType: 'text/csv; charset=utf-8',
                    upsert: false,
                });

            if (uploadError) {
                throw new Error(`Failed to upload CSV: ${uploadError.message}`);
            }

            const { data: urlData } = await supabase.storage
                .from('exports')
                .createSignedUrl(filePath, 60 * 60 * 24 * 7);

            if (!urlData) {
                throw new Error('Failed to create signed URL');
            }

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            await supabase.from('downloads').insert({
                user_id: userId,
                selection_id: selectionId,
                type: 'lookalikes',
                url: urlData.signedUrl,
                row_count: items.length,
                expires_at: expiresAt.toISOString(),
            });

            return urlData.signedUrl;
        });

        console.log(`Lookalikes CSV export completed. Download URL: ${downloadUrl}`);

        return {
            selectionId,
            exported: items.length,
            downloadUrl,
        };
    }
);
