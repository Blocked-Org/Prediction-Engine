import { streamText, generateText } from 'ai';
import { getLanguageModel } from '@/lib/llm/provider';
import neo4j from 'neo4j-driver';

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD));

/**
 * Helper to get the Neo4j schema dynamically.
 * In a production app, this could be cached.
 */
async function getNeo4jSchema(): Promise<string> {
  const session = driver.session();
  try {
    const result = await session.run(`
      CALL apoc.meta.schema() YIELD value
      RETURN value
    `);
    
    if (result.records.length > 0) {
      return JSON.stringify(result.records[0].get('value'), null, 2);
    }
    return "Schema unavailable.";
  } catch (error) {
    console.warn("Failed to retrieve schema using APOC. Using hardcoded fallback schema.", error);
    // Fallback if APOC is not installed
    return `
      Nodes: User, Campaign, Channel, AgentCluster, Competitor, MacroContext, Outcome
      Relationships: OWNS, ALLOCATED_TO, TARGETS, COMPETES_WITH, OPERATES_IN, GENERATES
      Properties: 
      - Campaign: campaign_id, name, description, budget, historical_revenue, cpc, base_price, discount_rate, aov, cac, ltv
      - Channel: name
      - AgentCluster: name, regions, target_age_range, intent_clusters
      - Competitor: name
      - MacroContext: flag
      - Outcome: revenue, conversions, impressions
    `;
  } finally {
    await session.close();
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, provider = 'cloud' } = body;

    if (!messages || messages.length === 0) {
      return new Response("Missing messages", { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage.content;

    const schema = await getNeo4jSchema();
    const model = getLanguageModel(provider);

    // Step 1: Translate NL to Cypher
    const cypherPrompt = `
You are an expert Neo4j Cypher translator.
Given the following graph schema:
${schema}

Translate the user's question into a valid, READ-ONLY Cypher query.
DO NOT use CREATE, SET, DELETE, MERGE, or REMOVE.
Return ONLY the raw Cypher query string. No markdown formatting, no backticks, no explanations.

User Question: ${userQuery}
Cypher Query:`;

    const cypherGeneration = await generateText({
      model,
      prompt: cypherPrompt,
    });

    let cypherQuery = cypherGeneration.text.trim();
    // Remove backticks if the model ignored instructions
    if (cypherQuery.startsWith('\`\`\`cypher')) {
      cypherQuery = cypherQuery.replace(/^\`\`\`cypher\n?|\n?\`\`\`$/g, '');
    } else if (cypherQuery.startsWith('\`\`\`')) {
      cypherQuery = cypherQuery.replace(/^\`\`\`\n?|\n?\`\`\`$/g, '');
    }

    // Security check: deny mutations
    if (/CREATE|SET|DELETE|MERGE|REMOVE|DROP/i.test(cypherQuery)) {
      throw new Error("Generated Cypher query contains forbidden mutation keywords.");
    }

    // Step 2: Execute Cypher Query
    const session = driver.session();
    let dbResultsStr = "No results.";
    try {
      const result = await session.run(cypherQuery);
      const records = result.records.map((r) => r.toObject());
      dbResultsStr = JSON.stringify(records, null, 2);
    } catch (e: any) {
      dbResultsStr = \`Error executing query: \${e.message}\`;
    } finally {
      await session.close();
    }

    // Step 3: Stream the final answer back to the user
    const finalSystemPrompt = `
You are an expert Marketing Data Analyst interacting directly with the user.
You translated their question into a graph database query and got the following results.

Original Question: ${userQuery}
Executed Cypher Query:
${cypherQuery}

Database Results:
${dbResultsStr}

Provide a conversational, easy-to-understand answer to the user's question based strictly on the database results.
Include the actual Cypher query that was run in a markdown code block at the end of your response for provenance and auditability.
Do not invent data. If the database results are empty or contain an error, explain that to the user.
    `;

    // We only pass the system prompt for the final answer to stream back
    const stream = await streamText({
      model,
      system: finalSystemPrompt,
      prompt: "Please provide the final answer.",
    });

    return stream.toDataStreamResponse();
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new Response(error.message || "An error occurred", { status: 500 });
  }
}
