import "server-only";
import type { ActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Record a single activity entry. Pass a tx client to include in a transaction. */
export async function recordActivity(params: {
  ticketId: string;
  actorId: string | null;
  type: ActivityType;
  message: string;
  fromValue?: string | null;
  toValue?: string | null;
  tx?: Prisma.TransactionClient;
}) {
  const client = params.tx ?? prisma;
  return client.ticketActivity.create({
    data: {
      ticketId: params.ticketId,
      actorId: params.actorId,
      type: params.type,
      message: params.message,
      fromValue: params.fromValue ?? null,
      toValue: params.toValue ?? null,
    },
  });
}
