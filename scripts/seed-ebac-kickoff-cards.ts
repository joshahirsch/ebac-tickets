/**
 * Idempotent seed for EBAC project kickoff cards.
 *
 * Run:
 *   npm run seed:ebac-kickoff-cards -- --dry-run
 *   npm run seed:ebac-kickoff-cards
 *
 * Environment:
 *   EBAC_KICKOFF_PROJECT_KEY — project key to target (default: PMGT)
 *   DATABASE_URL / DIRECT_URL — same as prisma/seed.ts
 */
import {
  ActivityType,
  PrismaClient,
  ProjectStatus,
  TicketType,
  type Project,
  type TicketLabel,
  type Workspace,
} from "@prisma/client";
import {
  DEFAULT_KICKOFF_PROJECT_KEY,
  EBAC_KICKOFF_CARDS,
  EBAC_WORKSPACE_SLUG,
  KICKOFF_CARD_NUMBERS,
  KICKOFF_DEFAULT_STATUS,
  KICKOFF_LABEL_META,
  KICKOFF_PROJECT_KEY_FALLBACKS,
  collectKickoffLabelNames,
  formatKickoffDescription,
  mapKickoffPriority,
  parseKickoffDueDate,
  planKickoffCardSeedAction,
} from "../src/lib/seed-ebac-kickoff";

const prisma = new PrismaClient();

type Summary = {
  created: string[];
  updated: string[];
  skipped: string[];
  archived: string[];
  failed: Array<{ title: string; error: string }>;
};

function parseArgs(argv: string[]) {
  return {
    dryRun: argv.includes("--dry-run"),
    ensureProject: argv.includes("--ensure-project"),
  };
}

function ticketKey(number: number, title: string): string {
  return `PMGT-${number}: ${title}`;
}

function labelsMatch(
  existingLabelIds: string[],
  expectedLabelIds: string[],
): boolean {
  if (existingLabelIds.length !== expectedLabelIds.length) return false;
  const existing = [...existingLabelIds].sort();
  const expected = [...expectedLabelIds].sort();
  return existing.every((id, index) => id === expected[index]);
}

async function resolveWorkspace(): Promise<Workspace> {
  const workspace = await prisma.workspace.findUnique({
    where: { slug: EBAC_WORKSPACE_SLUG },
  });
  if (!workspace) {
    throw new Error(
      `Workspace "${EBAC_WORKSPACE_SLUG}" not found. Run npm run db:seed first.`,
    );
  }
  return workspace;
}

async function resolveProject(
  workspaceId: string,
  ensureProject: boolean,
  dryRun: boolean,
): Promise<Project> {
  const preferredKey = process.env.EBAC_KICKOFF_PROJECT_KEY ?? DEFAULT_KICKOFF_PROJECT_KEY;
  const keysToTry = [
    preferredKey,
    ...KICKOFF_PROJECT_KEY_FALLBACKS.filter((key) => key !== preferredKey),
  ];

  for (const key of keysToTry) {
    const project = await prisma.project.findFirst({
      where: { workspaceId, key },
    });
    if (project) return project;
  }

  const byName = await prisma.project.findFirst({
    where: {
      workspaceId,
      OR: [
        { name: { contains: "Project Management", mode: "insensitive" } },
        { name: { contains: "EBAC Project", mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  if (byName) return byName;

  if (ensureProject) {
    const owner = await prisma.user.findFirst({
      where: { workspaceId, role: "ADMIN" },
      orderBy: { createdAt: "asc" },
    });

    if (dryRun) {
      console.log(
        `  ensure-project (dry-run) would create project "${preferredKey}" — EBAC Project Management`,
      );
      return {
        id: "dry-run-project",
        key: preferredKey,
        name: "EBAC Project Management",
        description:
          "Responsible AI integration and adoption roadmap engagement for East Bay Agency for Children.",
        category: "Operations",
        status: ProjectStatus.ACTIVE,
        workspaceId,
        ownerId: owner?.id ?? null,
        ticketSeq: 0,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return prisma.project.upsert({
      where: { workspaceId_key: { workspaceId, key: preferredKey } },
      update: {},
      create: {
        key: preferredKey,
        name: "EBAC Project Management",
        description:
          "Responsible AI integration and adoption roadmap engagement for East Bay Agency for Children.",
        category: "Operations",
        status: ProjectStatus.ACTIVE,
        workspaceId,
        ownerId: owner?.id ?? null,
      },
    });
  }

  const projects = await prisma.project.findMany({
    where: { workspaceId },
    select: { key: true, name: true },
    orderBy: { key: "asc" },
  });

  throw new Error(
    [
      `Kickoff project not found in workspace "${EBAC_WORKSPACE_SLUG}".`,
      `Set EBAC_KICKOFF_PROJECT_KEY to one of: ${projects.map((p) => p.key).join(", ") || "(none)"}`,
      "Create the EBAC project management project in Settings → Projects, or rerun with --ensure-project.",
    ].join("\n"),
  );
}

async function ensureTopicLabels(
  workspaceId: string,
  dryRun: boolean,
): Promise<Record<string, TicketLabel>> {
  const labels = {} as Record<string, TicketLabel>;
  const labelNames = collectKickoffLabelNames(EBAC_KICKOFF_CARDS);

  for (const name of labelNames) {
    const meta = KICKOFF_LABEL_META[name] ?? { color: "#64748b" };

    if (dryRun) {
      const existing = await prisma.ticketLabel.findUnique({
        where: { workspaceId_name: { workspaceId, name } },
      });
      labels[name] =
        existing ??
        ({
          id: `dry-run-${name}`,
          name,
          color: meta.color,
          workspaceId,
          createdAt: new Date(),
        } as TicketLabel);
      continue;
    }

    labels[name] = await prisma.ticketLabel.upsert({
      where: { workspaceId_name: { workspaceId, name } },
      update: { color: meta.color },
      create: { name, color: meta.color, workspaceId },
    });
  }

  return labels;
}

async function syncTicketLabels(
  ticketId: string,
  expectedLabelIds: string[],
  dryRun: boolean,
): Promise<void> {
  if (dryRun) return;

  await prisma.$transaction(async (tx) => {
    await tx.ticketLabelOnTicket.deleteMany({
      where: {
        ticketId,
        labelId: { notIn: expectedLabelIds },
      },
    });

    for (const labelId of expectedLabelIds) {
      await tx.ticketLabelOnTicket.upsert({
        where: {
          ticketId_labelId: { ticketId, labelId },
        },
        update: {},
        create: { ticketId, labelId },
      });
    }
  });
}

async function archiveStaleKickoffTickets(
  projectId: string,
  dryRun: boolean,
): Promise<string[]> {
  const stale = await prisma.ticket.findMany({
    where: {
      projectId,
      isArchived: false,
      number: { notIn: KICKOFF_CARD_NUMBERS },
    },
    select: { id: true, number: true, title: true },
    orderBy: { number: "asc" },
  });

  const archived: string[] = [];

  for (const ticket of stale) {
    const label = ticketKey(ticket.number, ticket.title);
    if (dryRun) {
      archived.push(label);
      console.log(`  archive (dry-run) ${label}`);
      continue;
    }

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { isArchived: true },
    });
    archived.push(label);
    console.log(`  archive ${label}`);
  }

  return archived;
}

async function seedKickoffCards(dryRun: boolean, ensureProject: boolean): Promise<Summary> {
  const summary: Summary = {
    created: [],
    updated: [],
    skipped: [],
    archived: [],
    failed: [],
  };

  const workspace = await resolveWorkspace();
  const project = await resolveProject(workspace.id, ensureProject, dryRun);
  const topicLabels = await ensureTopicLabels(workspace.id, dryRun);

  const reporter = await prisma.user.findFirst({
    where: { workspaceId: workspace.id, role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Workspace: ${workspace.name} (${workspace.slug})`);
  console.log(`Project:   ${project.name} (${project.key})`);
  console.log(`Cards:     ${EBAC_KICKOFF_CARDS.length}`);
  console.log(`Mode:      ${dryRun ? "DRY RUN (no writes)" : "APPLY"}`);
  console.log("");

  for (const card of EBAC_KICKOFF_CARDS) {
    const description = formatKickoffDescription(card);
    const priority = mapKickoffPriority(card.priority);
    const status = KICKOFF_DEFAULT_STATUS;
    const dueDate = parseKickoffDueDate(card.dueDate);
    const expectedLabelIds = card.labels.map((name) => topicLabels[name].id);
    const cardLabel = ticketKey(card.number, card.title);

    try {
      const existing = await prisma.ticket.findFirst({
        where: {
          projectId: project.id,
          number: card.number,
        },
        include: {
          labels: { select: { labelId: true } },
        },
      });

      if (existing) {
        const existingLabelIds = existing.labels.map((l) => l.labelId);
        const action = planKickoffCardSeedAction({
          exists: true,
          existingTitle: existing.title,
          expectedTitle: card.title,
          existingDescription: existing.description,
          expectedDescription: description,
          labelsMatch: labelsMatch(existingLabelIds, expectedLabelIds),
        });

        const fieldsChanged =
          action === "update" ||
          existing.priority !== priority ||
          existing.status !== status ||
          existing.isArchived ||
          existing.dueDate?.toISOString() !== dueDate.toISOString();

        if (!fieldsChanged) {
          summary.skipped.push(cardLabel);
          console.log(`  skip  ${cardLabel}`);
          continue;
        }

        if (dryRun) {
          summary.updated.push(cardLabel);
          console.log(`  update (dry-run) ${cardLabel}`);
          continue;
        }

        await prisma.$transaction(async (tx) => {
          await tx.ticket.update({
            where: { id: existing.id },
            data: {
              title: card.title,
              description,
              priority,
              status,
              dueDate,
              isArchived: false,
            },
          });

          if (project.ticketSeq < card.number) {
            await tx.project.update({
              where: { id: project.id },
              data: { ticketSeq: card.number },
            });
            project.ticketSeq = card.number;
          }
        });

        await syncTicketLabels(existing.id, expectedLabelIds, dryRun);

        summary.updated.push(cardLabel);
        console.log(`  update ${cardLabel}`);
        continue;
      }

      if (dryRun) {
        summary.created.push(cardLabel);
        console.log(`  create (dry-run) ${cardLabel} → ${status}`);
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const ticket = await tx.ticket.create({
          data: {
            number: card.number,
            title: card.title,
            description,
            status,
            priority,
            type: TicketType.TASK,
            dueDate,
            projectId: project.id,
            reporterId: reporter?.id ?? null,
            assigneeId: null,
            labels: {
              create: expectedLabelIds.map((labelId) => ({ labelId })),
            },
          },
        });

        await tx.ticketActivity.create({
          data: {
            type: ActivityType.TICKET_CREATED,
            message: `${reporter?.name ?? reporter?.email ?? "Kickoff seed"} created this ticket`,
            ticketId: ticket.id,
            actorId: reporter?.id ?? null,
          },
        });

        if (project.ticketSeq < card.number) {
          await tx.project.update({
            where: { id: project.id },
            data: { ticketSeq: card.number },
          });
          project.ticketSeq = card.number;
        }
      });

      summary.created.push(cardLabel);
      console.log(`  create ${cardLabel} → ${status}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      summary.failed.push({ title: cardLabel, error: message });
      console.error(`  fail  ${cardLabel}: ${message}`);
    }
  }

  console.log("");
  console.log("Stale cards");
  summary.archived = await archiveStaleKickoffTickets(project.id, dryRun);

  return summary;
}

async function main() {
  const { dryRun, ensureProject } = parseArgs(process.argv.slice(2));

  try {
    const summary = await seedKickoffCards(dryRun, ensureProject);

    console.log("");
    console.log("Summary");
    console.log(`  created:  ${summary.created.length}`);
    console.log(`  updated:  ${summary.updated.length}`);
    console.log(`  skipped:  ${summary.skipped.length}`);
    console.log(`  archived: ${summary.archived.length}`);
    console.log(`  failed:   ${summary.failed.length}`);

    if (summary.failed.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("Kickoff seed failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
