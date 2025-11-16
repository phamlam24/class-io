/**
 * N8N Webhook service for external integrations
 */

import axios from "axios";
import { N8N_WEBHOOK_URL } from "../config/environment.js";
import { DEFAULT_HTTP_HEADERS } from "../utils/constants.js";

/**
 * Send a request to the N8N webhook
 * @param payload The data to send to the webhook
 * @returns The webhook response data
 */
export async function sendWebhookRequest(payload: any): Promise<any> {
  if (!N8N_WEBHOOK_URL) {
    throw new Error("N8N_WEBHOOK_URL is not set in environment variables");
  }

  try {
    const response = await axios.get(N8N_WEBHOOK_URL, {
      headers: DEFAULT_HTTP_HEADERS,
      data: JSON.stringify({ chatInput: payload }),
    });
    return response.data;
  } catch (error) {
    console.error("Webhook error:", error);
    throw error;
  }
}
