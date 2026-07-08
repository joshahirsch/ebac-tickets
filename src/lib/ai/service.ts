import "server-only";

/**
 * AI extension points.
 *
 * These are intentionally NO-OP placeholders. They never call an external API
 * unless a provider is explicitly configured (see `isAiEnabled`). This keeps
 * the surface area stable so real implementations can be dropped in later
 * without changing call sites or the UI.
 */

export function isAiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.AI_PROVIDER);
}

type Unavailable = { available: false; reason: string };
type Available<T> = { available: true; data: T };
export type AiResult<T> = Available<T> | Unavailable;

const disabled = (): Unavailable => ({
  available: false,
  reason: "AI features are not configured. Set AI_PROVIDER and a provider API key to enable.",
});

/** Summarize a ticket's description + comments into a short paragraph. */
export async function summarizeTicket(_ticketId: string): Promise<AiResult<string>> {
  if (!isAiEnabled()) return disabled();
  // TODO: fetch ticket context and call provider.
  return disabled();
}

/** Suggest a priority based on title/description signals. */
export async function suggestPriority(
  _input: { title: string; description?: string },
): Promise<AiResult<"LOW" | "MEDIUM" | "HIGH" | "URGENT">> {
  if (!isAiEnabled()) return disabled();
  return disabled();
}

/** Detect likely duplicate tickets within a project. */
export async function detectDuplicates(
  _input: { projectId: string; title: string },
): Promise<AiResult<Array<{ ticketId: string; score: number }>>> {
  if (!isAiEnabled()) return disabled();
  return disabled();
}

/** Generate a weekly status report for a project. */
export async function generateWeeklyReport(_projectId: string): Promise<AiResult<string>> {
  if (!isAiEnabled()) return disabled();
  return disabled();
}

/** Convert freeform meeting notes into draft ticket payloads. */
export async function meetingNotesToTickets(
  _notes: string,
): Promise<AiResult<Array<{ title: string; description: string }>>> {
  if (!isAiEnabled()) return disabled();
  return disabled();
}
