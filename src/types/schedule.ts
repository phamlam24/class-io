/**
 * Schedule-related type definitions
 */

export interface ScheduleItem {
  date: string;
  type: "lecture" | "exam" | "assignment" | "other";
  topic?: string;
  className?: string;
  description?: string;
}

export interface Schedule {
  course_code: string;
  schedule: ScheduleItem[];
}

export interface ExamResult extends ScheduleItem {
  course?: string;
}
