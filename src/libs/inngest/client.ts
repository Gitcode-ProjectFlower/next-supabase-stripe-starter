import { Inngest } from 'inngest';

// For Inngest Cloud, use INNGEST_EVENT_KEY from environment variables
// For local development, this will be undefined and Inngest will use the dev server
export const inngest = new Inngest({
  id: 'resume-platform',
  name: 'Resume Platform',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
