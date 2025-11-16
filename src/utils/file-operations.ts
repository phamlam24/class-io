/**
 * File system operation utilities for reading course data
 */

import { promises as fs } from "fs";
import { getSchedulePath, getAnnouncementPath, STATIC_DIR } from "./constants.js";
import type { Schedule, AnnouncementList } from "../types/index.js";

/**
 * Read and parse a course schedule file
 * @param courseId The course ID (e.g., 'csc254')
 * @returns Parsed schedule data
 */
export async function readSchedule(courseId: string): Promise<Schedule> {
  const schedulePath = getSchedulePath(courseId);
  const content = await fs.readFile(schedulePath, "utf-8");
  return JSON.parse(content);
}

/**
 * Read and parse a course announcements file
 * @param courseId The course ID (e.g., 'csc160')
 * @returns Parsed announcements array
 */
export async function readAnnouncements(courseId: string): Promise<AnnouncementList> {
  const announcementPath = getAnnouncementPath(courseId);
  const content = await fs.readFile(announcementPath, "utf-8");
  return JSON.parse(content);
}

/**
 * Get all course directory names from the static folder
 * @returns Array of course directory names
 */
export async function getAllCourseIds(): Promise<string[]> {
  return await fs.readdir(STATIC_DIR);
}

/**
 * Read a lecture file content
 * @param lectureFilePath Full path to the lecture file
 * @returns The lecture file content
 */
export async function readLectureFile(lectureFilePath: string): Promise<string> {
  return await fs.readFile(lectureFilePath, "utf-8");
}

/**
 * Check if a file exists
 * @param filePath Path to the file
 * @returns True if the file exists, false otherwise
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
