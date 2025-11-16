/**
 * Tool: Get next exams for all courses
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { getAllCourseIds, readSchedule } from "../utils/index.js";

export function registerGetAllCourseNextExam(server: McpServer): void {
  server.registerTool(
    "get_all_course_next_exam",
    {
      title: "Get next exams for all courses",
      description:
        "Use this tool to fetch the next upcoming exams for all courses. It checks all schedule.json files in the static folder.",
      inputSchema: z.object({
        asOf: z
          .string()
          .optional()
          .describe(
            "Optional: ISO date string representing 'now'. If not provided, use the current date.",
          ),
      }),
    },
    async (args) => {
      const { asOf } = args;

      try {
        const courseDirs = await getAllCourseIds();
        const currentDate = asOf ? new Date(asOf) : new Date();
        const nextExams = [];

        for (const course of courseDirs) {
          try {
            const scheduleData = await readSchedule(course);

            if (!scheduleData || !Array.isArray(scheduleData.schedule)) {
              continue;
            }

            const upcomingExam = scheduleData.schedule
              .filter((item: { date: string | number | Date; type: string }) => {
                const examDate = new Date(item.date);
                return item.type === "exam" && examDate > currentDate;
              })
              .sort(
                (
                  a: { date: string | number | Date },
                  b: { date: string | number | Date },
                ) => new Date(a.date).getTime() - new Date(b.date).getTime(),
              )[0];

            if (upcomingExam) {
              nextExams.push({
                course: scheduleData.course_code,
                ...upcomingExam,
              });
            }
          } catch (error) {
            console.error(
              `Failed to process schedule for course ${course}:`,
              error,
            );
          }
        }

        if (nextExams.length > 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(nextExams),
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: "No upcoming exams found for any course.",
              },
            ],
          };
        }
      } catch (error) {
        console.error("Error fetching next exams for all courses:", error);
        throw new McpError(
          ErrorCode.InternalError,
          "Failed to fetch next exams for all courses",
        );
      }
    },
  );
}
