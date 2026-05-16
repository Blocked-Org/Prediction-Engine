import { google } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const ollamaBaseURL = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434/v1';
export const ollamaModelName = process.env.OLLAMA_MODEL ?? 'gemma4:26b';
export const googleModelName = process.env.GOOGLE_MODEL ?? 'gemini-2.5-flash';

// Ollama exposes an OpenAI-compatible REST API at /v1.
export const ollamaProvider = createOpenAICompatible({
  name: 'ollama',
  baseURL: ollamaBaseURL,
});

/**
 * Returns the configured Language Model based on the requested provider.
 * @param provider 'cloud' or 'offline'
 */
export function getLanguageModel(provider: 'cloud' | 'offline') {
  if (provider === 'offline') {
    return ollamaProvider(ollamaModelName);
  }
  return google(googleModelName);
}
