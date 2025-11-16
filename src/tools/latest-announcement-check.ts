/**
 * Tool: Check latest announcements for a class
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readAnnouncements, fileExists, getAnnouncementPath } from "../utils/index.js";

export function registerLatestAnnouncementCheck(server: McpServer): void {
  server.registerTool(
    "latest_announcement_check",
    {
      title: "Check latest announcements for a class",
      description:
        "Whenever you heard the word announcement, use this tool. This tool fetches the latest announcements for a given class and query.\n\n" +
        "Examples of queries:\n" +
        "- 'Any updates about the curve in the past 5 announcements?'\n" +
        "- 'What are the latest announcements for CSC160?'",
      inputSchema: z.object({
        classId: z.string().describe("The ID of the class (e.g., 'csc160')."),
        query: z
          .string()
          .describe(
            "The type of information requested (e.g., 'office hour', 'lab hour', 'exam revision', 'curve', or 'general').",
          ),
      }),
    },
    async (args) => {
      const { classId, query } = args;
      const announcementFilePath = getAnnouncementPath(classId);

      try {
        // Check if the announcement file exists
        const exists = await fileExists(announcementFilePath);
        if (!exists) {
          return {
            content: [
              {
                type: "text",
                text: "Announcement file not found.",
              },
            ],
          };
        }

        // Read and parse the announcement file
        const announcements = await readAnnouncements(classId);

        // Filter the last 5 announcements
        const recentAnnouncements = announcements.slice(-5).reverse();

        // Handle specific queries
        if (query !== "general") {
          for (const announcement of recentAnnouncements) {
            const field = announcement.announcement[query];
            if (field) {
              return {
                content: [
                  {
                    type: "text",
                    text: field,
                  },
                ],
              };
            }
          }
          return {
            content: [
              {
                type: "text",
                text: "No relevant updates found.",
              },
            ],
          };
        }

        // Handle general query
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(recentAnnouncements),
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching announcements:", error);
        return {
          content: [
            {
              type: "text",
              text: "Failed to fetch announcements. Check logs for details.",
            },
          ],
        };
      }
    },
  );
}
