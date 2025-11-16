import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import axios from "axios";
import dotenv from "dotenv";
import { promises as fs } from "fs";
import path from "path";
dotenv.config();

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const baseDir = __dirname;

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DEFAULT_BLOCK_ID = process.env.DEFAULT_BLOCK_ID;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const NOTION_VERSION = "2022-06-28";

// Add headers to the request
const headers = {
  "Content-Type": "application/json",
  Accept: "*/*",
  "User-Agent": "PostmanRuntime/7.43.0",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
};
// Helper function: Calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
  }

  return dp[m][n];
}

// Helper function: Calculate similarity score between query and target string
function calculateSimilarityScore(query: string, target: string): number {
  const queryLower = query.toLowerCase().trim();
  const targetLower = target.toLowerCase().trim();

  // Exact match gets highest score
  if (queryLower === targetLower) return 1.0;

  // Substring match bonus
  const substringBonus = targetLower.includes(queryLower) ? 0.3 : 0;

  // Normalized Levenshtein distance (0 = identical, 1 = completely different)
  const maxLen = Math.max(queryLower.length, targetLower.length);
  const levDistance = levenshteinDistance(queryLower, targetLower);
  const normalizedLevDistance = 1 - levDistance / maxLen;

  // Word overlap score
  const queryWords = new Set(queryLower.split(/\s+/));
  const targetWords = new Set(targetLower.split(/\s+/));
  const intersection = new Set(
    [...queryWords].filter((x) => targetWords.has(x)),
  );
  const union = new Set([...queryWords, ...targetWords]);
  const wordOverlapScore = union.size > 0 ? intersection.size / union.size : 0;

  // Combined score with weights
  const combinedScore =
    normalizedLevDistance * 0.4 + wordOverlapScore * 0.3 + substringBonus;

  return combinedScore;
}

// Create MCP server (no manual capabilities)
const server = new McpServer({
  name: "mcp-server",
  version: "1.0.0",
});

// Register tool
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
      const schedulePath = path.join(
        baseDir,
        "..",
        "static",
        courseId,
        "schedule.json",
      );
      const scheduleData = JSON.parse(await fs.readFile(schedulePath, "utf-8"));

      // const webhookResponse = await getWebhookTest();
      // console.log("Webhook Response:", webhookResponse);

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

// Register tool
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
      const staticDir = path.join(baseDir, "../static");
      const courseDirs = await fs.readdir(staticDir);

      const currentDate = asOf ? new Date(asOf) : new Date();

      const nextExams = [];

      for (const course of courseDirs) {
        const schedulePath = path.join(staticDir, course, "schedule.json");

        try {
          const scheduleData = JSON.parse(
            await fs.readFile(schedulePath, "utf-8"),
          );

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

// Register tool
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
      const schedulePath = path.join(
        baseDir,
        "..",
        "static",
        courseId,
        "schedule.json",
      );
      const scheduleData = JSON.parse(await fs.readFile(schedulePath, "utf-8"));

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
                  closestLectures.map((lecture: { topic: any }) => ({
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

// Register tool
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
      const lecturesDir = path.join(
        baseDir,
        "..",
        "static",
        courseId,
        "lectures",
      );
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

// Register tool
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

    if (!DEFAULT_BLOCK_ID) {
      console.error("❌ DEFAULT_BLOCK_ID is not set in .env");
      process.exit(1);
    }

    const headers = {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
    };

    const getParentTitle = (page: any): string => {
      const props = page?.properties ?? {};
      for (const key of Object.keys(props)) {
        const p = props[key];
        if (p?.type === "title") return textFromRich(p?.title);
      }
      return page?.title ? textFromRich(page.title) : "";
    };

    const textFromRich = (arr: any[]): string =>
      (arr ?? [])
        .map((t: any) => t?.plain_text ?? t?.text?.content ?? "")
        .join("");

    const searchPageIdByTitle = async (
      q: string,
      preferExact: boolean,
    ): Promise<{
      id: string | null;
      candidates: { id: string; title: string }[];
    }> => {
      try {
        const { data } = await axios.post(
          "https://api.notion.com/v1/search",
          {
            query: q,
            filter: { value: "page", property: "object" },
            sort: { direction: "descending", timestamp: "last_edited_time" },
            page_size: 10,
          },
          { headers },
        );

        const pages = (data?.results ?? []).filter(
          (r: any) => r?.object === "page",
        );
        if (!pages.length)
          return {
            id: null,
            candidates: pages.map((p: any) => ({
              id: p.id,
              title: getParentTitle(p),
            })),
          };

        const candidates = pages.map((p: any) => ({
          id: p.id,
          title: getParentTitle(p),
        }));

        if (preferExact) {
          const hit = candidates.find(
            (c: { title: any }) =>
              (c.title || "").trim().toLowerCase() === q.trim().toLowerCase(),
          );
          if (hit) return { id: hit.id, candidates };
        }

        return { id: candidates[0].id, candidates };
      } catch (error) {
        console.error("Error searching for page ID:", error);
        throw error;
      }
    };

    const createPage = async (parentId: string): Promise<any> => {
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
          { headers },
        );
        return response.data;
      } catch (error) {
        console.error("Error creating page:", error);
        throw error;
      }
    };

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
        const msg = `No page found with title \"${parentTitle}\".${suggestions}`;
        return { content: [{ type: "text", text: msg }] };
      }

      const result = await createPage(id);
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

// Updated logic to ensure proper tool usage
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
      const response = await getWebhookTest(prompt);
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

// Register tool
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
    const announcementFilePath = path.join(
      baseDir,
      "../static",
      classId,
      "announcements/announcement.json",
    );

    try {
      // Check if the announcement file exists
      await fs.access(announcementFilePath);

      // Read and parse the announcement file
      const fileContent = await fs.readFile(announcementFilePath, "utf-8");
      const announcements = JSON.parse(fileContent);

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

async function getWebhookTest(payload: any) {
  if (!N8N_WEBHOOK_URL) {
    throw new Error("N8N_WEBHOOK_URL is not set in environment variables");
  }

  try {
    const response = await axios.get(N8N_WEBHOOK_URL, {
      headers: headers, // Ensure JSON content type
      data: JSON.stringify({ chatInput: payload }), // Convert payload to JSON string with exact field name
    });
    return response.data;
  } catch (error) {
    console.error("Webhook error:", error);
    throw error;
  }
}

// -----------------------
// Modern HTTP Streaming Server
// -----------------------

const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
  // Create a new transport for each request to prevent request ID collisions
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on("close", () => {
    transport
      .close()
      .catch((err) => console.error("Error closing transport:", err));
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling /mcp request:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal MCP server error" });
    }
  }
});

const port = parseInt(process.env.PORT || "8000", 10);
app
  .listen(port, () => {
    console.log(`MCP Server running on http://localhost:${port}/mcp`);
  })
  .on("error", (error) => {
    console.error("Server error:", error);
    process.exit(1);
  });

// Export server if you need to connect it from tests / other modules
export { server };
export default getWebhookTest;
