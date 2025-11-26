import { serve } from 'inngest/next';

import { inngest } from '@/libs/inngest/client';
import { exportLookalikesJob } from '@/libs/inngest/functions/export-lookalikes';
import { processQAJob } from '@/libs/inngest/functions/process-qa';

export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [processQAJob, exportLookalikesJob],
});
