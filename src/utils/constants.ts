/**
 * Application constants and paths
 */

import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "path";

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Base directory for the application
 */
export const BASE_DIR = path.resolve(__dirname, "..");

/**
 * Static files directory containing course data
 */
export const STATIC_DIR = path.join(BASE_DIR, "..", "static");

/**
 * HTTP headers for API requests
 */
export const DEFAULT_HTTP_HEADERS = {
  "Content-Type": "application/json",
  Accept: "*/*",
  "User-Agent": "PostmanRuntime/7.43.0",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
};

/**
 * Get the path to a course's schedule file
 */
export function getSchedulePath(courseId: string): string {
  return path.join(STATIC_DIR, courseId, "schedule.json");
}

/**
 * Get the path to a course's lectures directory
 */
export function getLecturesDir(courseId: string): string {
  return path.join(STATIC_DIR, courseId, "lectures");
}

/**
 * Get the path to a course's announcements file
 */
export function getAnnouncementPath(courseId: string): string {
  return path.join(STATIC_DIR, courseId, "announcements/announcement.json");
}
