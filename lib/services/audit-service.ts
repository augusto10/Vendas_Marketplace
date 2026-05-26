import { prisma } from "@/lib/prisma";

export async function auditLog(input: {
  actorId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      metadata: input.metadata as object | undefined
    }
  });
}
