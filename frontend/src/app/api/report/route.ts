import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const ollamaBaseURL = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434/v1';
const ollamaModel = process.env.OLLAMA_MODEL ?? 'gemma4:26b';
const googleModel = process.env.GOOGLE_MODEL ?? 'gemini-2.0-flash';

// Ollama exposes an OpenAI-compatible REST API at /v1.
const ollamaProvider = createOpenAICompatible({
  name: 'ollama',
  baseURL: ollamaBaseURL,
});

/**
 * Local AI Strategy Generator
 * Converts JSON simulation parameters into a readable executive summary.
 * Built to bypass Vercel serverless timeouts during fallback local inferences.
 * 
 * @param {any} simulationData - The parsed JSON result holding optimization and scenario data.
 * @param {string} locale - Target UI language (e.g., 'en', 'bn').
 * @returns {string} Formatted markdown fallback report.
 */
function buildFallbackReport(simulationData: any, locale: string) {
  const optimization = simulationData?.optimization_result;
  const forecast = optimization?.expected_forecast;
  const allocations = optimization?.optimized_allocations ?? [];
  const recommendations = optimization?.recommendations ?? [];
  const currency = locale === 'bn' ? 'ডলার' : 'USD';

  const allocationLines = allocations.length > 0
    ? allocations.map((allocation: any) => `- ${allocation.channel_name}: ${allocation.spend.toLocaleString()} ${currency}`).join('\n')
    : '- No optimized allocations were provided.';

  const recommendationLines = recommendations.length > 0
    ? recommendations.map((recommendation: any) => `- ${recommendation.action}: ${recommendation.recommendation_reasoning}`).join('\n')
    : '- No recommendations were provided.';

  const estimatedRevenue = forecast?.estimated_revenue;
  const revenueLine = typeof estimatedRevenue === 'number'
    ? `${estimatedRevenue.toLocaleString()} ${currency}`
    : 'unavailable';

  return [
    '**Executive Summary**',
    `- Expected revenue: ${revenueLine}`,
    '- Optimized budget allocation:',
    allocationLines,
    '- Recommendations:',
    recommendationLines,
    '',
    'The local model did not return a streamed summary, so this fallback report was generated from the simulation payload.'
  ].join('\n');
}

/**
 * Next.js API Route for `/api/report`
 * Handles POST requests to generate AI-driven executive reports dynamically.
 * Routes traffic either to a local Ollama instance (`offline`) or Google Gemini (`cloud`).
 * Returns a fallback deterministic generation if the local LLM times out or is offline.
 * 
 * @param {Request} req - The incoming Next.js API request containing JSON body `{ simulationData, locale, provider }`.
 * @returns {Promise<Response>} An HTTP Response delivering the generated markdown report.
 */
export async function POST(req: Request) {
  let simulationData: any = null;
  let locale = 'en';
  try {
    const body = await req.json();
    simulationData = body.simulationData;
    locale = body.locale;
    const provider = body.provider;

    const language = locale === 'bn' ? 'Bengali (বাংলা)' : 'English';

    const systemPrompt = `You are an expert Marketing Data Analyst. 
Your goal is to write a brief, professional Executive Summary for a CMO based on the provided Simulation Engine results.

Rules:
1. You MUST respond exclusively in the following language: ${language}.
2. Summarize the Pareto-optimal budget allocations and the expected revenue.
3. Highlight the AI recommendations provided in the data.
4. Keep the report under 3 paragraphs and use professional formatting (bullet points, bold text).
5. Do not invent any data not present in the context.`;

    const prompt = `Simulation Data Context:\n${JSON.stringify(simulationData, null, 2)}\n\nPlease generate the Executive Summary.`;

    const model = provider === 'offline'
      ? ollamaProvider(ollamaModel)
      : google(googleModel);

    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: prompt,
    });

    const text = result.text?.trim() || buildFallbackReport(simulationData, locale);
    return new Response(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('LLM API Error:', error instanceof Error ? error.message : error);
    return new Response(buildFallbackReport(simulationData, locale), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
      status: 200,
    });
  }
}
