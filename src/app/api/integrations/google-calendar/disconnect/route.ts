import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revokeGoogleToken } from "@/lib/integrations/google-calendar/oauth";
import { decryptSecret } from "@/lib/integrations/google-calendar/tokens";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { userId: user.id },
  });

  if (!connection) {
    return NextResponse.json({ ok: true, disconnected: true });
  }

  // Best-effort token revoke; never block disconnect on revoke failure.
  try {
    if (connection.refreshTokenEncrypted) {
      await revokeGoogleToken(decryptSecret(connection.refreshTokenEncrypted));
    } else if (connection.accessTokenEncrypted) {
      await revokeGoogleToken(decryptSecret(connection.accessTokenEncrypted));
    }
  } catch {
    // ignore
  }

  await prisma.googleCalendarConnection.update({
    where: { id: connection.id },
    data: {
      status: "DISCONNECTED",
      disconnectedAt: new Date(),
      // Clear ciphertext so reconnect requires a fresh OAuth dance.
      accessTokenEncrypted: encryptPlaceholder(),
      refreshTokenEncrypted: null,
      lastSyncError: null,
    },
  });

  return NextResponse.json({ ok: true, disconnected: true });
}

function encryptPlaceholder(): string {
  // Keep NOT NULL column populated without retaining a usable token.
  return "v1:disconnected:disconnected:disconnected";
}
