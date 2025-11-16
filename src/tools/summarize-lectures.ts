/**
 * Tool: Summarize a lecture by fuzzy-matching the lecture name
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { getLecturesDir, calculateSimilarityScore } from "../utils/index.js";

export function registerSummarizeLectures(server: McpServer): void {
  server.registerTool(
    "summarize_lectures",
    {
      title: "Summarize a lecture",
      description:
        "This tool summarizes the content of a lecture based on the course ID and a partial or approximate lecture name.",
      inputSchema: z.object({
        courseId: z
          .string()
          .describe(
            "The course ID the user mentions, for example: 'csc254', 'CSC 254', or 'CSC-254'.",
          ),
        lectureName: z
          .string()
          .describe(
            "The approximate name of the lecture to summarize. Doesn't need to be exact.",
          ),
      }),
    },
    async (args) => {
      const { courseId, lectureName } = args;

      try {
        const lecturesDir = getLecturesDir(courseId);
        const files = await fs.readdir(lecturesDir);

        if (!files || files.length === 0) {
          throw new Error(`No lecture files found for course: ${courseId}`);
        }

        // Find the closest matching lecture file using similarity scoring
        const txtFiles = files.filter((file) => file.endsWith(".txt"));

        // Calculate similarity scores for each file
        const scoredFiles = txtFiles.map((file) => {
          // Remove the .txt extension for comparison
          const fileNameWithoutExt = file.replace(/\.txt$/, "");
          const score = calculateSimilarityScore(lectureName, fileNameWithoutExt);
          return { file, score };
        });

        // Sort by score in descending order (highest similarity first)
        scoredFiles.sort((a, b) => b.score - a.score);

        // Get the best match
        const closestFile = scoredFiles.length > 0 ? scoredFiles[0].file : null;

        if (!closestFile) {
          return {
            content: [
              {
                type: "text",
                text: `No lecture found matching the name: ${lectureName}`,
              },
            ],
          };
        }

        const lecturePath = path.join(lecturesDir, closestFile);
        const lectureContent = await fs.readFile(lecturePath, "utf-8");

        return {
          content: [
            {
              type: "text",
              text: lectureContent,
            },
          ],
        };
      } catch (error) {
        console.error("Error:", error);
        throw new McpError(
          ErrorCode.InternalError,
          "Failed to summarize the lecture",
        );
      }
    },
  );
}
