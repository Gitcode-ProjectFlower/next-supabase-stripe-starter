export interface QARequest {
    question: string;
    email: string;
    doc_id: string;
}

export interface QAResponse {
    status: 'OK' | 'NO_INFO' | 'ERROR' | 'TIMEOUT';
    answer: string | null;
    sources: QASource[];
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
        items: Array<{ doc_id: string; email: string }>,
        question: string,
        batchSize: number = 10
    ): Promise<Map<string, QAResponse>> {
        const results = new Map<string, QAResponse>();

        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);

            const promises = batch.map(async (item) => {
                const response = await this.ask({
                    question,
                    email: item.email,
                    doc_id: item.doc_id,
                });

                return { doc_id: item.doc_id, response };
            });

            const batchResults = await Promise.all(promises);

            batchResults.forEach(({ doc_id, response }) => {
                results.set(doc_id, response);
            });
        }

        return results;
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
