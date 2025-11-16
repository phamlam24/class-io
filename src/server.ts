/**
 * Express and MCP server configuration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { PORT } from "./config/environment.js";
import { registerAllTools } from "./tools/index.js";

/**
 * Create and configure the MCP server
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "mcp-server",
    version: "1.0.0",
  });

  // Register all tools
  registerAllTools(server);

  return server;
}

/**
 * Create and configure the Express application
 */
export function createExpressApp(mcpServer: McpServer): express.Application {
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
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Error handling /mcp request:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal MCP server error" });
      }
    }
  });

  return app;
}

/**
 * Start the HTTP server
 */
export function startServer(app: express.Application): void {
  app
    .listen(PORT, () => {
      console.log(`MCP Server running on http://localhost:${PORT}/mcp`);
    })
    .on("error", (error) => {
      console.error("Server error:", error);
      process.exit(1);
    });
}
