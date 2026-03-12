import { HaystackClient, QAResponse } from './client';

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
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
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
     * Serializes the form_input dictionary into the target FORM_INPUT textual format
     * using the template specified in System Spec 0.6.
     */
    public serializeFormInput(formInput?: Record<string, any>, standardQuestionId?: string): string {
        if (!formInput || !standardQuestionId) return '';

        const lines: string[] = [];

        switch (standardQuestionId) {
            case '1':
                // Sales Priority Score
                if (formInput.productName) lines.push(`Product/Service Name: ${formInput.productName}`);
                if (formInput.productDescription) lines.push(`Product/Service Description: ${formInput.productDescription}`);
                if (formInput.icpCharacteristics) lines.push(`Ideal Customer Profile Characteristics (free text): ${formInput.icpCharacteristics}`);
                if (formInput.icpSignals && Array.isArray(formInput.icpSignals)) {
                    lines.push(`Ideal Customer Profile Signals (checkboxes ticked): ${formInput.icpSignals.join(', ')}`);
                }
                if (formInput.commercialSignals && Array.isArray(formInput.commercialSignals)) {
                    lines.push(`Commercial Attractiveness Signals (checkboxes ticked): ${formInput.commercialSignals.join(', ')}`);
                }
                if (formInput.otherCommercialSignal) lines.push(`Other Commercial Signal (free text): ${formInput.otherCommercialSignal}`);
                if (formInput.exclusions) lines.push(`Exclusions / Red Flags (free text): ${formInput.exclusions}`);
                if (formInput.scoringFocus) lines.push(`Scoring Focus (Fit Mode | Revenue Mode): ${formInput.scoringFocus}`);
                break;

            case '2':
                // Marketing Segmentation
                if (formInput.primaryCustomerType) lines.push(`Primary Customer Type: ${formInput.primaryCustomerType}`);
                if (formInput.targetCustomerSegment) lines.push(`Target Customer Segment: ${formInput.targetCustomerSegment}`);
                if (formInput.geographicScope) lines.push(`Geographic Scope: ${formInput.geographicScope}`);
                if (formInput.organizationalSophistication) lines.push(`Organizational Sophistication: ${formInput.organizationalSophistication}`);
                if (formInput.marketPositioning) lines.push(`Market Positioning: ${formInput.marketPositioning}`);
                if (formInput.operationalCriticality) lines.push(`Operational Criticality: ${formInput.operationalCriticality}`);

                if (formInput.customDimensionName) {
                    lines.push(`Custom Dimension Name: ${formInput.customDimensionName}`);
                    if (formInput.customDimensionValues && Array.isArray(formInput.customDimensionValues)) {
                        lines.push(`Allowed Values: ${formInput.customDimensionValues.join(', ')}`);
                    }
                }
                break;

            case '3':
                // Account Intelligence Brief
                if (formInput.productContext) lines.push(`Product / Service Context: ${formInput.productContext}`);
                if (formInput.conversationPerspective) lines.push(`Intended Conversation Perspective: ${formInput.conversationPerspective}`);
                if (formInput.salesObjective) lines.push(`Sales Objective: ${formInput.salesObjective}`);
                if (formInput.primaryFocusPreference) lines.push(`Primary Focus Preference: ${formInput.primaryFocusPreference}`);
                if (formInput.conversationTonePreference) lines.push(`Conversation Tone Preference: ${formInput.conversationTonePreference}`);
                break;

            case '4':
                // Personalized Outreach Draft Message
                if (formInput.whatYouSell) lines.push(`What do you sell?: ${formInput.whatYouSell}`);
                if (formInput.whoIsItFor) lines.push(`Who is it for?: ${formInput.whoIsItFor}`);
                if (formInput.coreOutcome) lines.push(`What is the core outcome?: ${formInput.coreOutcome}`);

                if (formInput.usps && Array.isArray(formInput.usps)) {
                    formInput.usps.forEach((usp: string, index: number) => {
                        lines.push(`USP ${index + 1}: ${usp}`);
                    });
                }

                if (formInput.channel) lines.push(`Channel: ${formInput.channel}`);
                if (formInput.messageLength) lines.push(`Message Length: ${formInput.messageLength}`);
                if (formInput.tonePreference) lines.push(`Tone Preference: ${formInput.tonePreference}`);
                break;

            default:
                // Generic fallback
                for (const [key, value] of Object.entries(formInput)) {
                    if (Array.isArray(value)) {
                        lines.push(`${key}: ${value.join(', ')}`);
                    } else if (typeof value === 'object' && value !== null) {
                        lines.push(`${key}: ${JSON.stringify(value)}`);
                    } else {
                        lines.push(`${key}: ${value}`);
                    }
                }
                break;
        }

        return lines.join('\n');
    }

    /**
     * Build a concise retrieval query for vector search from the form input.
     * Per ТЗ §3.1 & §3.3: retrieval_query drives Qdrant; llm_prompt drives GPT.
     * Applies toLower, stop-word removal, dedup, max 8 terms.
     */
    public buildRetrievalQuery(prompt: string, formInput?: Record<string, any>, standardQuestionId?: string): string {
        if (!formInput || !standardQuestionId) return prompt;

        let rawTexts: string[] = [];

        switch (standardQuestionId) {
            case '1':
                rawTexts = [
                    formInput.productName,
                    formInput.productDescription,
                    formInput.icpCharacteristics,
                    ...(Array.isArray(formInput.icpSignals) ? formInput.icpSignals : []),
                ];
                break;
            case '2':
                rawTexts = [
                    formInput.primaryCustomerType,
                    formInput.targetCustomerSegment,
                    formInput.geographicScope,
                    formInput.customDimensionName,
                ];
                break;
            case '3':
                rawTexts = [
                    formInput.productContext,
                    formInput.salesObjective,
                    formInput.primaryFocusPreference,
                ];
                break;
            case '4':
                rawTexts = [
                    formInput.whatYouSell,
                    formInput.whoIsItFor,
                    formInput.coreOutcome,
                    ...(Array.isArray(formInput.usps) ? [formInput.usps[0]] : []),
                ];
                break;
            default:
                return prompt;
        }

        const result = extractKeywords(rawTexts.filter(Boolean));
        return result || prompt;
    }

    /**
     * Run the standard question via the API.
     * Under the hood, this will need a new API endpoint on the Haystack side,
     * or we will modify the existing `/qa` endpoint payload to support structured standard questions.
     */
    public async runStandardQuestion(
        items: StandardQuestionItem[],
        standardQuestionId: string,
        prompt: string, // This will be the llm_prompt (loaded from .txt file)
        formInput?: Record<string, any>,
        collection?: string,
        timeout?: number
    ): Promise<QAResponse[]> {

        const formInputText = this.serializeFormInput(formInput, standardQuestionId);
        const retrievalQuery = this.buildRetrievalQuery(prompt, formInput);

        // Call the haystack client with the specific parameters
        // We might need to add `askStandardBatch` to HaystackClient to support separate llm_prompt vs retrieval_query
        return []; // TODO implement implementation
    }
}
