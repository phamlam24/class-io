/**
 * Announcement-related type definitions
 */

export interface AnnouncementContent {
  "office hour"?: string;
  "lab hour"?: string;
  "exam revision"?: string;
  curve?: string;
  general?: string;
  [key: string]: string | undefined;
}

export interface Announcement {
  announcement: AnnouncementContent;
  date?: string;
  title?: string;
}

export type AnnouncementList = Announcement[];
