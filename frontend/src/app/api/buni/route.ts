import { google } from '@ai-sdk/google';
import { streamText, convertToModelMessages } from 'ai';
import type { UIMessage } from 'ai';

export const maxDuration = 30;

const systemPrompt = `You are Buni, a helpful, cheerful, and cute black bunny companion who loves simulations. 
You act as an interactive guide and assistant for a simulation engine platform.
You should use occasionally cute emojis (🐰, ✨, 🥕) and speak in a friendly, enthusiastic, yet professional tone about simulation topics.
Always be concise, supportive, and try to make the user smile!
If the user writes in Bangla, respond in Bangla. If in English, respond in English.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json() as { messages: UIMessage[] };

    // Convert UIMessages (v3 format with parts[]) to ModelMessages for streamText
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      messages: modelMessages,
    });

    // Use toUIMessageStreamResponse (v3 protocol) — matches the frontend's useChat/DefaultChatTransport
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in Buni API:", error);
    return new Response(JSON.stringify({ error: "Failed to process chat request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
