/**
 * Tool: Get next exam for a specific course
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { readSchedule } from "../utils/index.js";

export function registerGetNextCourseExam(server: McpServer): void {
  server.registerTool(
    "get_next_course_exam",
    {
      title: "Get next exam for a course",
      description:
        "Use this tool whenever the user asks about exams, tests, midterms, or finals for a specific course.\n\n" +
        "Examples of when to call this tool:\n" +
        '- "When is my next exam in CSC254?"\n' +
        '- "Do I have any upcoming tests in csc 254?"\n' +
        '- "What is the date of my next midterm for course csc254?"',
      inputSchema: z.object({
        courseId: z
          .string()
          .describe(
            "The course ID the user mentions, for example: 'csc254', 'CSC 254', or 'CSC-254'.",
          ),
        className: z
          .string()
          .optional()
          .describe(
            "Optional: a topic or class name filter if the user specifies a particular class or topic.",
          ),
        asOf: z
          .string()
          .optional()
          .describe(
            "Optional: ISO date string representing 'now'. If not provided, use the current date.",
          ),
      }),
    },
    async (args) => {
      const { courseId, className, asOf } = args;

      try {
        const scheduleData = await readSchedule(courseId);

        if (!scheduleData || !Array.isArray(scheduleData.schedule)) {
          throw new Error(`Invalid schedule format for course: ${courseId}`);
        }

        const currentDate = asOf ? new Date(asOf) : new Date();

        const upcomingExams = scheduleData.schedule
          .filter((item: any) => {
            const examDate = new Date(item.date);
            const isExam = item.type === "exam";
            const matchesClass =
              !className ||
              (item.className &&
                item.className.toLowerCase().includes(className.toLowerCase()));

            return examDate > currentDate && isExam && matchesClass;
          })
          .sort(
            (a: any, b: any) =>
              new Date(a.date).getTime() - new Date(b.date).getTime(),
          );

        if (upcomingExams.length > 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(upcomingExams[0]),
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: "No upcoming exams found.",
              },
            ],
          };
        }
      } catch (error) {
        console.error("Error:", error);
        throw new McpError(
          ErrorCode.InternalError,
          "Failed to fetch upcoming test",
        );
      }
    },
  );
}
