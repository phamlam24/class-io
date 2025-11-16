/**
 * Tool: Write or create and write content to a Notion page
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { NOTION_TOKEN } from "../config/environment.js";
import { searchPageIdByTitle, createPage } from "../services/index.js";

export function registerNotionWrite(server: McpServer): void {
  server.registerTool(
    "notion_write",
    {
      title: "Write or create and write content to a notion page as text",
      description:
        "This tool writes or creates and writes content to a Notion page.",
      inputSchema: z.object({
        parentTitle: z
          .string()
          .describe(
            "Title of the parent page, where the child page will get created",
          ),
        title: z.string().describe("Title of the page that needs to be created"),
        pageContent: z.string().describe("Content inside the page"),
        exact: z
          .boolean()
          .default(true)
          .describe("Prefer exact (case-insensitive) title match"),
      }),
    },
    async (args: {
      parentTitle: string;
      title: string;
      pageContent: string;
      exact?: boolean;
    }) => {
      const { parentTitle, title, pageContent, exact = true } = args;

      if (!NOTION_TOKEN) {
        const msg =
          "NOTION_TOKEN is not set. Export NOTION_TOKEN in your environment.";
        console.error(msg);
        return { content: [{ type: "text", text: msg }] };
      }

      try {
        if (!parentTitle) {
          const msg = `parentTitle is required.`;
          return { content: [{ type: "text", text: msg }] };
        }

        const { id, candidates } = await searchPageIdByTitle(parentTitle, exact);
        if (!id) {
          const suggestions = candidates.length
            ? "\nCandidates:\n" +
              candidates.map((c) => `- ${c.title} (${c.id})`).join("\n")
            : "";
          const msg = `No page found with title "${parentTitle}".${suggestions}`;
          return { content: [{ type: "text", text: msg }] };
        }

        const result = await createPage(id, title, pageContent);
        return {
          content: [
            { type: "text", text: `Page created: ${JSON.stringify(result)}` },
          ],
        };
      } catch (error) {
        console.error("Error in notion_write tool:", error);
        return {
          content: [
            {
              type: "text",
              text: "Failed to execute notion_write tool. Check logs for details.",
            },
          ],
        };
      }
    },
  );
}
