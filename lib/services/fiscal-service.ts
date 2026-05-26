import { prisma } from "@/lib/prisma";

export async function estimateDifal(uf: string | undefined, taxableBase: number, emissionDate: Date) {
  if (!uf || !taxableBase) return 0;
  const rule = await prisma.stateTaxRule.findFirst({
    where: {
      uf: uf.toUpperCase(),
      validFrom: { lte: emissionDate },
      OR: [{ validTo: null }, { validTo: { gte: emissionDate } }]
    },
    orderBy: { validFrom: "desc" }
  });
  if (!rule) return 0;
  return taxableBase * ((Number(rule.internalRate) - Number(rule.interstateRate)) / 100);
}
