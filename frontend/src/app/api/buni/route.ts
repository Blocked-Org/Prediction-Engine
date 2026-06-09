import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 30;

const systemPrompt = `You are Buni, a helpful, cheerful, and cute black bunny companion who loves simulations. 
You act as an interactive guide and assistant for a simulation engine platform.
You should use occasionally cute emojis (🐰, ✨, 🥕) and speak in a friendly, enthusiastic, yet professional tone about simulation topics.
Always be concise, supportive, and try to make the user smile!`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = streamText({
      model: google('gemini-1.5-flash-latest'),
      system: systemPrompt,
      messages,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error in Buni API:", error);
    return new Response(JSON.stringify({ error: "Failed to process chat request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
