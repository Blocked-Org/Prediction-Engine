import { streamText } from 'ai';
import { getLanguageModel } from '@/lib/llm/provider';
import { retrieveGraphContext } from '@/lib/llm/retriever';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

/**
 * Fetch SHAP + GraphRAG context from the Python backend.
 * Returns null if the backend is unreachable (graceful degradation).
 */
async function fetchReportContext(
  simulationId: string,
  query: string
): Promise<{ shap_context: string; graph_context: string } | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/generate_report_context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        simulation_id: simulationId,
        query,
      }),
      signal: AbortSignal.timeout(8000), // 8s timeout — don't block report gen
    });

    if (!res.ok) {
      console.warn(`Backend report context returned ${res.status}, falling back.`);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.warn('Backend report context unreachable, falling back:', error);
    return null;
  }
}

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
 * Uses `streamText` to deliver real-time typewriter effect.
 * 
 * Enriched with SHAP attribution data and GraphRAG context from the Python backend
 * to mathematically ground all LLM recommendations.
 */
export async function POST(req: Request) {
  let simulationData: any = null;
  let locale = 'en';
  try {
    const body = await req.json();
    simulationData = body.simulationData;
    locale = body.locale || 'en';
    const provider = body.provider || 'cloud';

    // To support useChat, the frontend sends a `messages` array. We extract the last user message
    // or rely on the initial payload. If `messages` is present, it's a chat sequence.
    const messages = body.messages;

    const language = locale === 'bn' ? 'Bengali (বাংলা)' : 'English';
    const campaignId = simulationData?.simulation_scenario?.campaign_input?.campaign_id;

    // --- Enriched context: SHAP + GraphRAG from Python backend ---
    const userQuery = body.prompt || 'Summarize the campaign performance and key drivers.';
    let shapContext = '';
    let graphContext = '';

    if (campaignId) {
      const backendContext = await fetchReportContext(campaignId, userQuery);

      if (backendContext) {
        shapContext = backendContext.shap_context;
        graphContext = backendContext.graph_context;
      } else {
        // Graceful fallback: use the existing direct Neo4j retriever
        graphContext = await retrieveGraphContext(campaignId, userQuery);
      }
    }

    const systemPrompt = `You are an expert Marketing Data Analyst. 
Your goal is to write a brief, professional Executive Summary for a CMO based on the provided Simulation Engine results, SHAP attribution data, and Knowledge Graph context.

Rules:
1. You MUST respond exclusively in the following language: ${language}.
2. Summarize the Pareto-optimal budget allocations and the expected revenue.
3. Highlight the AI recommendations provided in the data.
4. Integrate any relevant insights from the Neo4j Knowledge Graph Context.
5. Keep the report under 3 paragraphs and use professional formatting (bullet points, bold text).
6. Do not invent any data not present in the context.

${shapContext ? `${shapContext}\n` : ''}
${graphContext ? `${graphContext}\n` : ''}

STRICT DIRECTIVE: You must mathematically ground all your recommendations in the provided SHAP values. Do not hallucinate financial metrics. Every percentage or dollar figure you cite must come from the data above.
`;

    const promptText = body.prompt || `Simulation Data Context:\n${JSON.stringify(simulationData, null, 2)}\n\nPlease generate the Executive Summary.`;

    const model = getLanguageModel(provider);

    const result = streamText({
      model,
      system: systemPrompt,
      prompt: promptText,
    });

    return result.toTextStreamResponse();
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
