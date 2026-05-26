import type { UploadType } from "@prisma/client";

export type ImportSummary = {
  uploadId?: string;
  type: UploadType;
  rowsRead: number;
  rowsImported: number;
  rowsUpdated: number;
  errors: Array<{ rowNumber?: number; field?: string; message: string; rawData?: unknown }>;
  detectedFees: string[];
  periodStart?: Date;
  periodEnd?: Date;
};

export type ParsedSheet = {
  name: string;
  rows: Record<string, unknown>[];
  headers: string[];
};
