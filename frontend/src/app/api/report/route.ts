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
 * Check if any LLM provider is actually configured.
 * If neither Google API key nor Ollama are available, we should skip the LLM call
 * entirely to prevent silent hangs.
 */
function isLLMConfigured(provider: 'cloud' | 'offline'): boolean {
  if (provider === 'cloud') {
    return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  }
  // For offline, Ollama should be running — we can't easily check, so assume true
  // (the catch block will handle the failure)
  return true;
}

/**
 * Rich fallback executive report generator.
 * Produces professional markdown from raw simulation data — used when LLM is
 * unavailable. The output is streamed word-by-word to preserve the typewriter effect.
 */
function buildFallbackReport(simulationData: any, locale: string): string {
  const optimization = simulationData?.optimization_result;
  const forecast = optimization?.expected_forecast;
  const allocations = optimization?.optimized_allocations ?? [];
  const recommendations = optimization?.recommendations ?? [];
  const isBengali = locale === 'bn';

  const totalSpend = allocations.reduce((sum: number, a: any) => sum + (a.spend || 0), 0);
  const estimatedRevenue = forecast?.estimated_revenue ?? 0;
  const roi = totalSpend > 0 ? (estimatedRevenue / totalSpend).toFixed(1) : 'N/A';

  if (isBengali) {
    const allocationLines = allocations.map((a: any) =>
      `- **${a.channel_name}**: ৳${a.spend?.toLocaleString() ?? 0} (${totalSpend > 0 ? ((a.spend / totalSpend) * 100).toFixed(0) : 0}% বরাদ্দ)`
    ).join('\n');

    const recLines = recommendations.map((r: any) =>
      `- **${(r.action || '').replace(/_/g, ' ')}**: ${r.recommendation_reasoning}`
    ).join('\n');

    return [
      '## 📊 নির্বাহী সারাংশ (Executive Summary)',
      '',
      `সিমুলেশন ইঞ্জিন বিশ্লেষণ সম্পন্ন হয়েছে। **Pareto-optimal** বাজেট বরাদ্দ অনুযায়ী প্রত্যাশিত আয় **৳${estimatedRevenue.toLocaleString()}** (আনুমানিক ROI: **${roi}×**)।`,
      '',
      '### 💰 অপ্টিমাইজড বাজেট বরাদ্দ',
      allocationLines || '- কোনো বরাদ্দ নেই।',
      '',
      `মোট ব্যয়: **৳${totalSpend.toLocaleString()}**`,
      '',
      '### 🧠 AI সুপারিশসমূহ',
      recLines || '- বর্তমানে কোনো সুপারিশ নেই।',
      '',
      '### 📈 পরবর্তী পদক্ষেপ',
      '- SHAP মান পর্যালোচনা করে সর্বাধিক প্রভাবশালী চ্যানেল শনাক্ত করুন',
      '- Markov attribution ব্যবহার করে কার্যকারণ সম্পর্ক যাচাই করুন',
      '- What-If Simulator দিয়ে বিকল্প বাজেট পরিস্থিতি পরীক্ষা করুন',
      '',
      '---',
      '*— Brand Simulation Engine AI দ্বারা তৈরি*',
    ].join('\n');
  }

  const allocationLines = allocations.map((a: any) =>
    `- **${a.channel_name}**: $${a.spend?.toLocaleString() ?? 0} (${totalSpend > 0 ? ((a.spend / totalSpend) * 100).toFixed(0) : 0}% of total budget)`
  ).join('\n');

  const recLines = recommendations.map((r: any) => {
    const action = (r.action || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    return `- **${action}**: ${r.recommendation_reasoning}`;
  }).join('\n');

  return [
    '## 📊 Executive Summary',
    '',
    `The simulation engine has completed its analysis. Based on the **Pareto-optimal** budget allocation computed by the NSGA-II genetic algorithm, the projected revenue is **$${estimatedRevenue.toLocaleString()}** with an estimated ROI of **${roi}×** across ${allocations.length} channel${allocations.length !== 1 ? 's' : ''}.`,
    '',
    '### 💰 Optimized Budget Allocation',
    allocationLines || '- No allocations available.',
    '',
    `**Total Campaign Spend:** $${totalSpend.toLocaleString()}`,
    '',
    '### 🧠 AI-Powered Recommendations',
    recLines || '- No recommendations generated for this scenario.',
    '',
    '### 📈 Recommended Next Steps',
    '- Review SHAP feature contributions to identify the highest-impact channels',
    '- Cross-reference with Markov attribution to validate causal relationships',
    '- Use the What-If Simulator to test alternative budget scenarios',
    '- Monitor iROAS trends weekly to track campaign learning curves',
    '',
    '---',
    '*— Generated by Brand Simulation Engine AI*',
  ].join('\n');
}

/**
 * Streams a plain text string word-by-word as a ReadableStream.
 * This preserves the typewriter effect in the frontend even when using
 * the fallback report (no LLM needed).
 */
function streamFallbackText(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const words = text.split(/(\s+)/); // split but keep whitespace tokens

  return new ReadableStream({
    async start(controller) {
      for (const word of words) {
        controller.enqueue(encoder.encode(word));
        // Small delay between words for typewriter effect
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
      controller.close();
    },
  });
}

/**
 * Next.js API Route for `/api/report`
 * Handles POST requests to generate AI-driven executive reports dynamically.
 * Routes traffic either to a local Ollama instance (`offline`) or Google Gemini (`cloud`).
 * Uses `streamText` to deliver real-time typewriter effect.
 * 
 * Enriched with SHAP attribution data and GraphRAG context from the Python backend
 * to mathematically ground all LLM recommendations.
 * 
 * Falls back gracefully to a rich markdown report streamed word-by-word
 * if the LLM provider is not configured or unreachable.
 */
export async function POST(req: Request) {
  let simulationData: any = null;
  let locale = 'en';
  try {
    const body = await req.json();
    simulationData = body.simulationData;
    locale = body.locale || 'en';
    const provider: 'cloud' | 'offline' = body.provider || 'cloud';

    // ── Early exit: if no LLM is configured, stream the fallback directly ──
    if (!isLLMConfigured(provider)) {
      console.warn(`No LLM configured for provider "${provider}" — streaming fallback report.`);
      const fallback = buildFallbackReport(simulationData, locale);
      return new Response(streamFallbackText(fallback), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
        status: 200,
      });
    }

    const isBengali = locale === 'bn';
    const languageInfo = isBengali
      ? 'Bengali (বাংলা). Use natural, modern business Bengali suitable for SME marketers. Keep technical marketing terms (like ROI, ROAS, SHAP, Budget) in English or common transliteration if it reads more naturally. Avoid overly archaic formal terms.'
      : 'English';

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
        try {
          graphContext = await retrieveGraphContext(campaignId, userQuery);
        } catch {
          // Neo4j also unreachable — proceed without graph context
          console.warn('Neo4j retriever also unreachable, proceeding without graph context.');
        }
      }
    }

    const systemPrompt = `You are an expert Marketing Data Analyst and Consultant. 
Your goal is to write a brief, professional Executive Summary for an SME (Small/Medium Enterprise) Marketer or CMO based on the provided Simulation Engine results, SHAP attribution data, and Knowledge Graph context.

Rules:
1. You MUST respond exclusively in the following language: ${languageInfo}.
2. Summarize the Pareto-optimal budget allocations and the expected revenue.
3. Highlight the AI recommendations provided in the data.
4. Integrate any relevant insights from the Neo4j Knowledge Graph Context.
5. Keep the report under 3 paragraphs and use professional formatting (bullet points, bold text).
6. Adopt a consultative, supportive tone tailored to SME marketers. Ensure your language is practical, actionable, and easy to understand.
7. Do not invent any data not present in the context.

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
    // Stream the fallback with typewriter effect instead of returning plain text
    const fallback = buildFallbackReport(simulationData, locale);
    return new Response(streamFallbackText(fallback), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
      status: 200,
    });
  }
}
