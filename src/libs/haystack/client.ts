export interface QARequest {
  question: string;
  email: string;
  doc_id: string;
}

export interface QAResponse {
  doc_id?: string;
  status: 'OK' | 'NO_INFO' | 'ERROR' | 'TIMEOUT' | 'success'; // 'success' is from VPS
  answer: string | null;
  sources?: QASource[];
  error_message: string | null;
}

export interface QASource {
  source_file: string;
  chunk_id: number;
  name: string;
  email: string;
  score: number | null;
  content_preview: string;
}

export class HaystackClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;

  constructor(baseUrl: string, apiKey?: string, timeout: number = 20000) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.timeout = timeout;
  }

  async ask(request: QARequest): Promise<QAResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/qa`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result as QAResponse;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            status: 'TIMEOUT',
            answer: null,
            sources: [],
            error_message: `Request timeout after ${this.timeout}ms`,
          };
        }

        return {
          status: 'ERROR',
          answer: null,
          sources: [],
          error_message: error.message,
        };
      }

      return {
        status: 'ERROR',
        answer: null,
        sources: [],
        error_message: 'Unknown error occurred',
      };
    }
  }

  async askBatch(
    items: Array<{ doc_id: string; name?: string; email?: string; city?: string; [key: string]: any }>,
    prompt: string
  ): Promise<QAResponse[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      // Format items for backend - backend expects QACandidate model:
      // - doc_id: str (required)
      // - name: str (required)
      // - email: str (required) - backend uses email to find resume chunks via pipeline.ask()
      // - city: Optional[str] = None
      const formattedItems = items
        .map((item) => {
          // Ensure name is present
          if (!item.name || item.name.trim() === '') {
            console.warn(`Item with doc_id ${item.doc_id} has no name, skipping`);
            return null;
          }

          // Ensure email is present - backend uses email to find resume chunks
          // If email is missing, we can't process this candidate
          if (!item.email || item.email.trim() === '') {
            console.warn(
              `Item with doc_id ${item.doc_id} has no email, skipping (backend requires email to find resume)`
            );
            return null;
          }

          return {
            doc_id: item.doc_id,
            name: item.name.trim(),
            email: item.email.trim(), // Backend uses email to find resume chunks
            city: item.city?.trim() || undefined, // Optional field - send undefined if not available (not empty string)
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (formattedItems.length === 0) {
        throw new Error('No valid items with names to process');
      }

      // Validate and clean prompt - must not be empty after trimming
      const cleanedPrompt = prompt.trim();
      if (!cleanedPrompt || cleanedPrompt.length === 0) {
        throw new Error('Prompt cannot be empty');
      }

      // Log the request for debugging
      console.log('[Haystack askBatch] Request:', {
        itemCount: formattedItems.length,
        promptLength: cleanedPrompt.length,
        promptPreview: cleanedPrompt.substring(0, 100),
      });

      // Backend expects QARequest model:
      // {
      //   "selection_items": [
      //     {
      //       "doc_id": "string",
      //       "name": "string",
      //       "email": "string",  // Required - backend uses email to find resume chunks
      //       "city": "string"     // Optional
      //     }
      //   ],
      //   "prompt": "string"
      // }
      const requestBody = {
        selection_items: formattedItems,
        prompt: cleanedPrompt,
      };

      // Log the exact request being sent (matches curl format)
      console.log('[Haystack askBatch] Sending request to Haystack API:', {
        url: `${this.baseUrl}/qa`,
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody, null, 2),
        formattedItems: formattedItems.map((item) => ({
          doc_id: item.doc_id,
          name: item.name,
          email: item.email,
          city: item.city,
        })),
      });

      const response = await fetch(`${this.baseUrl}/qa`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          // Try to parse as JSON for structured error
          const errorJson = JSON.parse(errorText);
          if (errorJson.status?.error) {
            console.error('Haystack API Error (structured):', errorJson);
            throw new Error(`Haystack API error: ${errorJson.status.error}`);
          }
        } catch (parseError) {
          // If not JSON, use raw text
        }

        console.error('Haystack API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });

        // Provide user-friendly error message for common issues
        if (errorText.includes('Vector dimension error')) {
          if (errorText.includes('got 0')) {
            throw new Error(
              'Unable to process Q&A: The question could not be processed. Please ensure your question contains valid text and try again.'
            );
          } else {
            throw new Error(
              'Unable to process Q&A: Resume data not found. Please ensure candidate names match the database.'
            );
          }
        }

        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText || response.statusText}`);
      }

      const data = await response.json();

      // Ensure responses have doc_id for mapping
      const results = (data.results || []).map((result: any, index: number) => ({
        ...result,
        doc_id: result.doc_id || formattedItems[index]?.doc_id || 'unknown',
      }));

      return results;
    } catch (error) {
      console.error('Batch QA Error:', error);
      // Fallback: return error responses for all items with doc_id attached
      return items.map((item) => ({
        doc_id: item.doc_id,
        status: 'ERROR' as const,
        answer: null,
        sources: [],
        error_message: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }
}

export function createHaystackClient(): HaystackClient {
  const baseUrl = process.env.HAYSTACK_BASE_URL;
  const apiKey = process.env.HAYSTACK_API_KEY;

  if (!baseUrl) {
    throw new Error('HAYSTACK_BASE_URL environment variable is required');
  }

  return new HaystackClient(baseUrl, apiKey);
}
