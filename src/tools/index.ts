/**
 * Tool registry - Central export and registration point for all tools
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetNextCourseExam } from "./get-next-course-exam.js";
import { registerGetAllCourseNextExam } from "./get-all-course-next-exam.js";
import { registerFindClosestLectures } from "./find-closest-lectures.js";
import { registerSummarizeLectures } from "./summarize-lectures.js";
import { registerNotionWrite } from "./notion-write.js";
import { registerGoogleCalendar } from "./google-calendar.js";
import { registerLatestAnnouncementCheck } from "./latest-announcement-check.js";

/**
 * Register all tools with the MCP server
 * @param server The MCP server instance
 */
export function registerAllTools(server: McpServer): void {
  registerGetNextCourseExam(server);
  registerGetAllCourseNextExam(server);
  registerFindClosestLectures(server);
  registerSummarizeLectures(server);
  registerNotionWrite(server);
  registerGoogleCalendar(server);
  registerLatestAnnouncementCheck(server);
}
