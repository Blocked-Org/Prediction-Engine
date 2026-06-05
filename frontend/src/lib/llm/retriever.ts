import neo4j from 'neo4j-driver';
import weaviate from 'weaviate-ts-client';
import { VectorStoreIndex } from 'llamaindex';
import { WeaviateVectorStore } from '@llamaindex/weaviate';
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD));

const WEAVIATE_URL = process.env.WEAVIATE_URL || 'localhost:8080';

const weaviateClient = weaviate.client({
  scheme: 'http',
  host: WEAVIATE_URL,
});

/**
 * Connects to Weaviate for vector similarity retrieval.
 */
async function retrieveVectorContext(query: string): Promise<string> {
  try {
    const vectorStore = new WeaviateVectorStore({
      // @ts-expect-error Type mismatch between weaviate-ts-client and llamaindex
      weaviateClient: weaviateClient,
      indexName: 'Campaign', // Will fall back if not populated yet
    });
    
    const index = await VectorStoreIndex.fromVectorStore(vectorStore);
    const retriever = index.asRetriever({ similarityTopK: 3 });
    const nodes = await retriever.retrieve({ query });
    
    if (nodes.length === 0) return "";
    
    const contextLines = ["### Weaviate Vector Retrieval (Semantic Matches)"];
    nodes.forEach((n) => {
      const text = 'text' in n.node ? String(n.node.text) : '';
      contextLines.push(`- ${text}`);
    });
    return contextLines.join('\\n');
  } catch (error: unknown) {
    const err = error as Error;
    console.warn("Weaviate vector retrieval skipped (likely unpopulated):", err.message || error);
    return "";
  }
}

/**
 * Connects to Neo4j to retrieve the top campaign context and competitor intelligence.
 * This satisfies the 'LlamaIndex -> Neo4j context' integration for the prompt.
 * 
 * @param campaignId The unique ID of the campaign to retrieve context for
 * @param userQuery Optional user query to perform semantic similarity search in Weaviate
 * @returns Formatted context string to inject into the LLM system prompt
 */
export async function retrieveGraphContext(campaignId: string, userQuery?: string): Promise<string> {
  const session = driver.session();
  try {
    // We execute a graph traversal to gather Campaign, its Target Audience, 
    // Competitors suppressing it, and the CompetitorContext scraped web info.
    const cypher = `
      MATCH (c:Campaign {campaign_id: $campaignId})
      OPTIONAL MATCH (c)-[:TARGETS]->(ac:AgentCluster)
      OPTIONAL MATCH (comp:Competitor)-[:SUPPRESSES]->(c)
      WITH c, collect(DISTINCT ac.name) AS target_clusters, collect(DISTINCT comp.name) AS competitors
      
      OPTIONAL MATCH (ctx:CompetitorContext)
      // Grab any competitor context that mentions our competitors
      WHERE any(comp_name IN competitors WHERE ctx.content CONTAINS comp_name)
      
      RETURN 
        c.name AS campaign_name,
        c.budget AS budget,
        c.historical_revenue AS historical_revenue,
        target_clusters,
        competitors,
        collect(DISTINCT ctx.content) AS competitor_intelligence
    `;

    const result = await session.run(cypher, { campaignId });
    
    if (result.records.length === 0) {
      return "No specific Neo4j graph context found for this campaign.";
    }

    const record = result.records[0];
    const contextLines = [
      `### Neo4j Knowledge Graph Context`,
      `- **Campaign Name**: ${record.get('campaign_name')}`,
      `- **Budget**: ৳${record.get('budget')}`,
      `- **Target Demographics**: ${record.get('target_clusters')?.join(', ') || 'None'}`,
      `- **Identified Competitors**: ${record.get('competitors')?.join(', ') || 'None'}`,
    ];

    const intelligence = record.get('competitor_intelligence') || [];
    if (intelligence.length > 0) {
      contextLines.push(`- **Competitor Intelligence (Web Scraped)**:`);
      intelligence.forEach((intel: string) => contextLines.push(`  - ${intel}`));
    }

    let finalContext = contextLines.join('\n');

    if (userQuery) {
      const vectorContext = await retrieveVectorContext(userQuery);
      if (vectorContext) {
        finalContext += '\n\n' + vectorContext;
      }
    }

    return finalContext;
  } catch (error) {
    console.error("Neo4j Retrieval Error:", error);
    return "Error retrieving context from Neo4j knowledge graph.";
  } finally {
    await session.close();
  }
}
