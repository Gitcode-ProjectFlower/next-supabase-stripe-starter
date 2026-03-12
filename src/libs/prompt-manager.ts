/**
 * Prompt Manager with hot-reload support.
 * Reads prompt .txt files from disk and caches them.
 * Uses fs.statSync mtime to detect file changes without server restart.
 */

import * as fs from 'fs';
import * as path from 'path';

interface CacheEntry {
  content: string;
  mtimeMs: number;
}

const cache = new Map<string, CacheEntry>();

const PROMPTS_DIR = path.join(process.cwd(), 'src', 'prompts', 'standard_questions');

/**
 * Returns the prompt text for a given standard question ID.
 * Checks mtime on every call — reloads from disk only if file changed.
 */
export function getPrompt(standardQuestionId: string): string {
  const filePath = path.join(PROMPTS_DIR, `standard_${standardQuestionId}.txt`);

  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    throw new Error(`Prompt file not found for standard question ${standardQuestionId}: ${filePath}`);
  }

  const cached = cache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached.content;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  cache.set(filePath, { content, mtimeMs: stat.mtimeMs });

  console.log(`[PromptManager] Loaded prompt for SQ${standardQuestionId} from disk (mtime: ${stat.mtimeMs})`);

  return content;
}

/**
 * Injects variables into a prompt template.
 * Replaces {{ form_input }} and {{ website_data }} placeholders.
 */
export function buildPrompt(
  standardQuestionId: string,
  variables: { form_input?: string; website_data?: string }
): string {
  let template = getPrompt(standardQuestionId);

  if (variables.form_input !== undefined) {
    template = template.replace(/\{\{\s*form_input\s*\}\}/g, variables.form_input);
  }
  if (variables.website_data !== undefined) {
    template = template.replace(/\{\{\s*website_data\s*\}\}/g, variables.website_data);
  }

  return template;
}

/**
 * Returns the mtime-based version string for a prompt file.
 * Used for logging in qa_standard_runs.prompt_version.
 */
export function getPromptVersion(standardQuestionId: string): string {
  const filePath = path.join(PROMPTS_DIR, `standard_${standardQuestionId}.txt`);
  try {
    const stat = fs.statSync(filePath);
    return String(Math.floor(stat.mtimeMs));
  } catch {
    return 'unknown';
  }
}

/** Clears the cache (useful for testing). */
export function clearPromptCache(): void {
  cache.clear();
}
