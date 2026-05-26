import { z } from "zod";

export const uploadQuerySchema = z.object({
  type: z.enum(["FISCAL_INVOICE", "SHOPEE_WALLET", "SHOPEE_ACCELERA", "SHOPEE_INCOME", "UNKNOWN"]).optional(),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]).optional()
});
