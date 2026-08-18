import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate: string | null;
}

/** Provider-agnostic web search interface (spec section 11). */
export interface WebSearchProvider {
  search(input: { query: string; maxResults: number }): Promise<SearchResult[]>;
}

/**
 * Default provider: disabled. The core application must never require a
 * paid search API. Company research stays fully functional through
 * user-pasted URLs/text when no provider is configured.
 */
class DisabledWebSearchProvider implements WebSearchProvider {
  async search(): Promise<SearchResult[]> {
    return [];
  }
}

let provider: WebSearchProvider = new DisabledWebSearchProvider();

/** Swap in a real provider (e.g. an approved search API) via typed adapter. */
export function setWebSearchProvider(next: WebSearchProvider) {
  provider = next;
}

export const webSearchTool = createTool({
  id: "web-search",
  description:
    "Search the web for publicly available company and interview-process information. " +
    "Returns an empty result set when no search provider is configured — treat that as " +
    "'no research available', never as evidence of anything.",
  inputSchema: z.object({
    query: z.string().describe("Search query, e.g. 'Acme Corp software engineer interview process'"),
    maxResults: z.number().min(1).max(10).default(5),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        snippet: z.string(),
        publishedDate: z.string().nullable(),
      }),
    ),
  }),
  execute: async ({ query, maxResults }) => {
    const results = await provider.search({ query, maxResults });
    return { results };
  },
});
