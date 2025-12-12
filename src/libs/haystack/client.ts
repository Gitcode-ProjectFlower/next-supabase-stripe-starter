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
        items: Array<{ doc_id: string; name?: string; email?: string; city?: string;[key: string]: any }>,
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

            const response = await fetch(`${this.baseUrl}/qa`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    selection_items: items.map(item => {
                        const { doc_id, name, email, city, ...rest } = item;
                        return {
                            doc_id,
                            name: name || '',
                            email: email || '',
                            city: city || '',
                            ...rest
                        };
                    }),
                    prompt
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('Batch QA Error:', error);
            // Fallback: return error responses for all items
            return items.map(item => ({
                status: 'ERROR',
                answer: null,
                sources: [],
                error_message: error instanceof Error ? error.message : 'Unknown error',
                // We might need to attach doc_id to the response to map it back, 
                // but the current interface doesn't have it. 
                // The VPS returns results in the same order or with doc_id.
                // Let's assume the caller handles mapping if needed, or we update QAResponse.
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
