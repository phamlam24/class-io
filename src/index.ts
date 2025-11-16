/**
 * ClassIO MCP Server - Entry Point
 *
 * A modular MCP server for course management with tools for:
 * - Exam scheduling and tracking
 * - Lecture content retrieval
 * - Announcement monitoring
 * - Notion integration
 * - Google Calendar integration via N8N
 */

import { createMcpServer, createExpressApp, startServer } from "./server.js";

// Create and configure the MCP server
const mcpServer = createMcpServer();

// Create the Express application
const app = createExpressApp(mcpServer);

// Start the HTTP server
startServer(app);

// Export server for testing or external use
export { mcpServer as server };
