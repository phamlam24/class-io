/**
 * Environment configuration and validation
 */

import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Notion API configuration
 */
export const NOTION_TOKEN = process.env.NOTION_TOKEN;
export const DEFAULT_BLOCK_ID = process.env.DEFAULT_BLOCK_ID;
export const NOTION_VERSION = "2022-06-28";

/**
 * N8N Webhook configuration
 */
export const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

/**
 * Server configuration
 */
export const PORT = parseInt(process.env.PORT || "8000", 10);

/**
 * Validate required environment variables
 */
export function validateEnvironment(): void {
  if (!DEFAULT_BLOCK_ID) {
    console.error("❌ DEFAULT_BLOCK_ID is not set in .env");
    process.exit(1);
  }
}

/**
 * Check if Notion is configured
 */
export function isNotionConfigured(): boolean {
  return !!NOTION_TOKEN;
}

/**
 * Check if N8N webhook is configured
 */
export function isN8NConfigured(): boolean {
  return !!N8N_WEBHOOK_URL;
}
