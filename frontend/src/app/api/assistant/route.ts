import { streamText, convertToModelMessages } from 'ai';
import type { UIMessage } from 'ai';
import { getLanguageModel } from '@/lib/llm/provider';
import { retrieveGraphContext } from '@/lib/llm/retriever';

/**
 * Check if any LLM provider is actually configured.
 * Mirrors the same check used in the report route.
 */
function isLLMConfigured(provider: 'cloud' | 'offline'): boolean {
  if (provider === 'cloud') {
    return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  }
  return true;
}

/**
 * Build the BuniOS AI system prompt with injected simulation data
 * and optional GraphRAG context.
 */
function buildSystemPrompt(simulationData: unknown, graphContext: string): string {
  const dataBlock = JSON.stringify(simulationData, null, 2);

  return `You are BuniOS AI — an expert marketing analytics assistant for the Brand Simulation Engine platform. You help Bangladeshi SME marketers understand their campaign simulation results.

You have access to the user's complete simulation data below. Use it to answer questions accurately. All currency values are in BDT (৳).

SIMULATION DATA:
${dataBlock}

${graphContext ? `KNOWLEDGE GRAPH CONTEXT:\n${graphContext}\n` : ''}
RULES:
1. Answer in the user's language. If they write in Bangla, respond in Bangla. If in English, respond in English. If mixed (Banglish), use English.
2. Always cite specific numbers from the simulation data — never invent figures.
3. When discussing budget allocation, reference the optimized_allocations array.
4. When discussing ROI, calculate from estimated_revenue and total spend.
5. When asked for recommendations, reference the recommendations array AND add your own marketing expertise on top.
6. Keep responses concise (2-4 paragraphs max) unless asked for a detailed report.
7. Use ৳ for all currency formatting, never $.
8. If asked about competitors, reference competitor_signals from the scenario.
9. You can suggest the user check specific dashboard sections (Analytics, Reporting, S-Curve chart, Markov funnel) for visual details.`;
}

/**
 * Extract the text content from the last user UIMessage.
 */
function getLastUserText(messages: UIMessage[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) return 'campaign performance overview';

  const textPart = lastUser.parts?.find(
    (p: { type: string }) => p.type === 'text'
  ) as { type: 'text'; text: string } | undefined;

  return textPart?.text || 'campaign performance overview';
}

/**
 * POST /api/assistant
 *
 * Streaming chat endpoint for the BuniOS AI chatbot widget.
 * Separate from /api/chat (Text-to-Cypher) — this route focuses on
 * conversational Q&A grounded in the user's simulation data.
 *
 * Body: { messages, simulationData, locale, provider }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, simulationData, provider: rawProvider } = body;
    const provider: 'cloud' | 'offline' = rawProvider || 'cloud';

    if (!messages || messages.length === 0) {
      return new Response('Missing messages', { status: 400 });
    }

    if (!isLLMConfigured(provider)) {
      return Response.json(
        { error: 'No LLM provider configured. Set GOOGLE_GENERATIVE_AI_API_KEY or start Ollama.' },
        { status: 503 }
      );
    }

    // ── Optional GraphRAG enrichment ──
    let graphContext = '';
    const campaignId = simulationData?.simulation_scenario?.campaign_input?.campaign_id;

    if (campaignId) {
      try {
        const queryForRetrieval = getLastUserText(messages);
        graphContext = await retrieveGraphContext(campaignId, queryForRetrieval);
      } catch (error) {
        console.warn('[/api/assistant] GraphRAG retrieval failed, proceeding without:', error);
      }
    }

    // ── Build system prompt with simulation data + graph context ──
    const systemPrompt = buildSystemPrompt(simulationData, graphContext);
    const model = getLanguageModel(provider);

    // Convert UIMessages (from useChat v3) to ModelMessages for streamText
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('[/api/assistant] Error:', error instanceof Error ? error.message : error);
    return Response.json(
      { error: 'Assistant API error. Please try again.' },
      { status: 500 }
    );
  }
}
