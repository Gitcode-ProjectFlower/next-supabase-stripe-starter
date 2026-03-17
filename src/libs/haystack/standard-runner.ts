import { HaystackClient } from './client';

// Per ТЗ §3.3: stop-words to strip from retrieval keywords
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'that', 'this', 'it', 'as', 'we', 'our',
  'your', 'their', 'they', 'i', 'you', 'he', 'she', 'who', 'what',
  'how', 'when', 'where', 'which', 'not', 'no', 'so', 'if', 'than',
]);

/**
 * Converts raw keyword strings into clean retrieval terms.
 * Per ТЗ §3.3: toLower, strip stop-words, trim to max 8 terms.
 */
function extractKeywords(texts: string[], maxTerms = 8): string {
  const terms: string[] = [];
  for (const text of texts) {
    if (!text) continue;
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
    terms.push(...words);
    if (terms.length >= maxTerms) break;
  }
  return [...new Set(terms)].slice(0, maxTerms).join(' ');
}

export interface StandardQuestionRunnerConfig {
    haystackClient: HaystackClient;
}

export interface StandardQuestionItem {
    doc_id: string;
    name: string;
    domain: string;
    city?: string;
    email?: string;
    [key: string]: any;
}

export class StandardQuestionRunner {
    private client: HaystackClient;

    constructor(config: StandardQuestionRunnerConfig) {
        this.client = config.haystackClient;
    }

    /**
     * Build a concise retrieval query for vector search from the form input.
     * Per ТЗ §3.1 & §3.3: retrieval_query drives Qdrant; llm_prompt drives GPT.
     * Applies toLower, stop-word removal, dedup, max 8 terms.
     */
    public buildRetrievalQuery(prompt: string, formInput?: Record<string, any>, standardQuestionId?: string): string {
        if (!formInput || !standardQuestionId) return prompt;

        let rawTexts: string[] = [];

        // Per-SQ term caps from ТЗ retrieval configs
        // SQ1 §9.5: ICP max 8, Other max 6, total 15
        // SQ3 §11.5: productContext max 10
        // SQ4 §12.5: whoIsItFor 8, coreOutcome 8, USPs 12, total 20
        let maxTerms = 8;

        switch (standardQuestionId) {
            case '1':
                // §9.5: allowed augment = ICP free text + Commercial Other free text
                rawTexts = [
                    formInput.icpCharacteristics,
                    formInput.icpSignalsOther,
                    formInput.commercialSignalsOther,
                ];
                maxTerms = 15;
                break;
            case '2':
                // §10.5: allowed augment = Custom Dimension Name + Allowed Values
                rawTexts = [
                    formInput.customDimensionName,
                    ...(Array.isArray(formInput.customDimensionValues) ? formInput.customDimensionValues.filter(Boolean) : []),
                ];
                maxTerms = 15;
                break;
            case '3':
                // §11.5: allowed augment = Product / Service Context, max 10 terms
                rawTexts = [
                    formInput.productContext,
                ];
                maxTerms = 10;
                break;
            case '4':
                // §12.5: allowed augment = whoIsItFor + coreOutcome + USPs, total cap 20
                rawTexts = [
                    formInput.whoIsItFor,
                    formInput.coreOutcome,
                    ...(Array.isArray(formInput.usps) ? formInput.usps.filter(Boolean) : []),
                ];
                maxTerms = 20;
                break;
            default:
                return prompt;
        }

        const result = extractKeywords(rawTexts.filter(Boolean), maxTerms);
        return result || prompt;
    }

}
