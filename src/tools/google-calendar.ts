/**
 * Tool: Add a meeting to Google Calendar via N8N webhook
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { sendWebhookRequest } from "../services/index.js";

export function registerGoogleCalendar(server: McpServer): void {
  server.registerTool(
    "google_calendar",
    {
      title: "Add a meeting to a Google Calendar",
      description:
        "This tool interacts with Google Calendar. It is triggered only when 'Google Calendar' is explicitly mentioned in the prompt.",
      inputSchema: z.object({
        prompt: z
          .string()
          .describe(
            "The user's prompt to be sent as the payload to the webhook.",
          ),
      }),
    },
    async (args) => {
      const { prompt } = args;

      try {
        const response = await sendWebhookRequest(prompt);
        return {
          content: [
            {
              type: "text",
              text: `Webhook response: ${JSON.stringify(response)}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error in Google Calendar tool:", error);
        throw new McpError(
          ErrorCode.InternalError,
          "Failed to interact with Google Calendar",
        );
      }
    },
  );
}
