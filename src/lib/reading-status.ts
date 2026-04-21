import type { ReadingStatus } from "@prisma/client";

export const READING_STATUS_VALUES: ReadingStatus[] = [
  "READING",
  "COMPLETED",
  "DROPPED",
  "PLAN_TO_READ",
];

export function isReadingStatus(value: unknown): value is ReadingStatus {
  return (
    typeof value === "string" &&
    (READING_STATUS_VALUES as string[]).includes(value)
  );
}

