/**
 * Tool: Find the closest lectures before a given date
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { readSchedule } from "../utils/index.js";

export function registerFindClosestLectures(server: McpServer): void {
  server.registerTool(
    "find_closest_lectures",
    {
      title: "Find the closest lectures",
      description:
        "Use this tool to find the 3 lectures closest/latest to the given date and time (but before it) for a specific course. It retrieves the topics of the lectures.",
      inputSchema: z.object({
        courseId: z
          .string()
          .describe(
            "The course ID the user mentions, for example: 'csc254', 'CSC 254', or 'CSC-254'.",
          ),
        asOf: z
          .string()
          .describe("ISO date string representing the current date and time."),
      }),
    },
    async (args) => {
      const { courseId, asOf } = args;

      try {
        const scheduleData = await readSchedule(courseId);

        if (!scheduleData || !Array.isArray(scheduleData.schedule)) {
          throw new Error(`Invalid schedule format for course: ${courseId}`);
        }

        const currentDate = new Date(asOf);

        const closestLectures = scheduleData.schedule
          .filter((item: { date: string | number | Date; type: string }) => {
            const lectureDate = new Date(item.date);
            return lectureDate <= currentDate && item.type === "lecture";
          })
          .sort(
            (
              a: { date: string | number | Date },
              b: { date: string | number | Date },
            ) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          )
          .slice(0, 3);

        if (closestLectures.length > 0) {
          return {
            content: [
              {
                type: "text",
                text:
                  JSON.stringify(
                    closestLectures.map((lecture) => ({
                      topic: lecture.topic,
                    })),
                  ) +
                  "\nDo you want me to give you a quick summary of any of these topics?",
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: "No lectures found before the given date.",
              },
            ],
          };
        }
      } catch (error) {
        console.error("Error:", error);
        throw new McpError(
          ErrorCode.InternalError,
          "Failed to fetch the closest lectures",
        );
      }
    },
  );
}
