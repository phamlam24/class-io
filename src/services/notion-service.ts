/**
 * Notion API service for page creation and search
 */

import axios from "axios";
import { NOTION_TOKEN, NOTION_VERSION } from "../config/environment.js";

/**
 * Notion API headers
 */
const getNotionHeaders = () => ({
  Authorization: `Bearer ${NOTION_TOKEN}`,
  "Notion-Version": NOTION_VERSION,
});

/**
 * Extract title text from Notion page properties
 */
function getParentTitle(page: any): string {
  const props = page?.properties ?? {};
  for (const key of Object.keys(props)) {
    const p = props[key];
    if (p?.type === "title") return textFromRich(p?.title);
  }
  return page?.title ? textFromRich(page.title) : "";
}

/**
 * Extract plain text from Notion rich text array
 */
function textFromRich(arr: any[]): string {
  return (arr ?? [])
    .map((t: any) => t?.plain_text ?? t?.text?.content ?? "")
    .join("");
}

/**
 * Search result for page lookup
 */
export interface PageSearchResult {
  id: string | null;
  candidates: { id: string; title: string }[];
}

/**
 * Search for a Notion page by title
 * @param query The search query
 * @param preferExact Whether to prefer exact case-insensitive matches
 * @returns Object containing the matched page ID and all candidates
 */
export async function searchPageIdByTitle(
  query: string,
  preferExact: boolean,
): Promise<PageSearchResult> {
  try {
    const { data } = await axios.post(
      "https://api.notion.com/v1/search",
      {
        query,
        filter: { value: "page", property: "object" },
        sort: { direction: "descending", timestamp: "last_edited_time" },
        page_size: 10,
      },
      { headers: getNotionHeaders() },
    );

    const pages = (data?.results ?? []).filter(
      (r: any) => r?.object === "page",
    );

    if (!pages.length) {
      return {
        id: null,
        candidates: [],
      };
    }

    const candidates = pages.map((p: any) => ({
      id: p.id,
      title: getParentTitle(p),
    }));

    if (preferExact) {
      const hit = candidates.find(
        (c: { id: string; title: string }) =>
          (c.title || "").trim().toLowerCase() === query.trim().toLowerCase(),
      );
      if (hit) return { id: hit.id, candidates };
    }

    return { id: candidates[0].id, candidates };
  } catch (error) {
    console.error("Error searching for page ID:", error);
    throw error;
  }
}

/**
 * Create a new Notion page with content
 * @param parentId The parent page ID
 * @param title The new page title
 * @param pageContent The page content (plain text)
 * @returns The created page data from Notion API
 */
export async function createPage(
  parentId: string,
  title: string,
  pageContent: string,
): Promise<any> {
  try {
    const response = await axios.post(
      "https://api.notion.com/v1/pages",
      {
        parent: {
          page_id: parentId,
        },
        properties: {
          title: [
            {
              text: {
                content: title,
              },
            },
          ],
        },
        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: pageContent,
                  },
                },
              ],
            },
          },
        ],
      },
      { headers: getNotionHeaders() },
    );
    return response.data;
  } catch (error) {
    console.error("Error creating page:", error);
    throw error;
  }
}
