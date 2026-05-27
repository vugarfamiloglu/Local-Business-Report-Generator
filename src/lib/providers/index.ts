/* LLM provider router — single chatJson() dispatcher. */

import { chatOpenAi }    from './openai';
import { chatAnthropic } from './anthropic';
import { chatGemini }    from './gemini';

export type ProviderId = 'openai' | 'anthropic' | 'gemini';

export interface ChatJsonRequest {
  provider: ProviderId; apiKey: string; model?: string;
  system: string; user: string; maxTokens?: number;
}
export interface ChatJsonResult { data: unknown; model: string; raw?: string; }

export async function chatJson(req: ChatJsonRequest): Promise<ChatJsonResult> {
  switch (req.provider) {
    case 'openai':    return chatOpenAi(req);
    case 'anthropic': return chatAnthropic(req);
    case 'gemini':    return chatGemini(req);
    default: throw new Error(`unknown provider: ${req.provider}`);
  }
}

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  openai:    'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-5',
  gemini:    'gemini-2.0-flash',
};
export const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai:    'OpenAI',
  anthropic: 'Anthropic',
  gemini:    'Google Gemini',
};
