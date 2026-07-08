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
  KICKOFF_PHASE_META,
  KICKOFF_PROJECT_KEY_FALLBACKS,
  formatKickoffDescription,
  mapKickoffPhaseStatus,
  mapKickoffPriority,
  parseKickoffDueDate,
  type KickoffPhase,
} from "../src/lib/seed-ebac-kickoff";

const prisma = new PrismaClient();

type Summary = {
  created: string[];
  updated: string[];
  skipped: string[];
  failed: Array<{ title: string; error: string }>;
};

function parseArgs(argv: string[]) {
  return {
    dryRun: argv.includes("--dry-run"),
    ensureProject: argv.includes("--ensure-project"),
  };
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
        description: "Kickoff, rollout, and hypercare work for EBAC Projects.",
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
        description: "Kickoff, rollout, and hypercare work for EBAC Projects.",
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

async function ensurePhaseLabels(
  workspaceId: string,
  dryRun: boolean,
): Promise<Record<KickoffPhase, TicketLabel>> {
  const labels = {} as Record<KickoffPhase, TicketLabel>;

  for (const [phase, meta] of Object.entries(KICKOFF_PHASE_META) as Array<
    [KickoffPhase, (typeof KICKOFF_PHASE_META)[KickoffPhase]]
  >) {
    const labelName = phase;
    if (dryRun) {
      labels[phase] = {
        id: `dry-run-${phase}`,
        name: labelName,
        color: meta.labelColor,
        workspaceId,
        createdAt: new Date(),
      };
      continue;
    }

    labels[phase] = await prisma.ticketLabel.upsert({
      where: { workspaceId_name: { workspaceId, name: labelName } },
      update: { color: meta.labelColor },
      create: { name: labelName, color: meta.labelColor, workspaceId },
    });
  }

  return labels;
}

async function seedKickoffCards(dryRun: boolean, ensureProject: boolean): Promise<Summary> {
  const summary: Summary = { created: [], updated: [], skipped: [], failed: [] };

  const workspace = await resolveWorkspace();
  const project = await resolveProject(workspace.id, ensureProject, dryRun);
  const phaseLabels = await ensurePhaseLabels(workspace.id, dryRun);

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
    const status = mapKickoffPhaseStatus(card.phase);
    const dueDate = parseKickoffDueDate(card.dueDate);
    const phaseLabel = phaseLabels[card.phase];

    try {
      const existing = await prisma.ticket.findFirst({
        where: {
          projectId: project.id,
          title: card.title,
          isArchived: false,
        },
        include: {
          labels: { select: { labelId: true } },
        },
      });

      if (existing) {
        const needsUpdate =
          existing.description !== description ||
          existing.priority !== priority ||
          existing.status !== status ||
          existing.dueDate?.toISOString() !== dueDate.toISOString() ||
          !existing.labels.some((l) => l.labelId === phaseLabel.id);

        if (!needsUpdate) {
          summary.skipped.push(card.title);
          console.log(`  skip  ${card.title}`);
          continue;
        }

        if (dryRun) {
          summary.updated.push(card.title);
          console.log(`  update (dry-run) ${card.title}`);
          continue;
        }

        await prisma.$transaction(async (tx) => {
          await tx.ticket.update({
            where: { id: existing.id },
            data: {
              description,
              priority,
              status,
              dueDate,
            },
          });

          const hasPhaseLabel = existing.labels.some((l) => l.labelId === phaseLabel.id);
          if (!hasPhaseLabel) {
            await tx.ticketLabelOnTicket.create({
              data: { ticketId: existing.id, labelId: phaseLabel.id },
            });
          }
        });

        summary.updated.push(card.title);
        console.log(`  update ${card.title}`);
        continue;
      }

      if (dryRun) {
        summary.created.push(card.title);
        console.log(`  create (dry-run) ${card.title} → ${status} [${card.phase}]`);
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const { ticketSeq } = await tx.project.update({
          where: { id: project.id },
          data: { ticketSeq: { increment: 1 } },
          select: { ticketSeq: true },
        });

        const ticket = await tx.ticket.create({
          data: {
            number: ticketSeq,
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
              create: [{ labelId: phaseLabel.id }],
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
      });

      summary.created.push(card.title);
      console.log(`  create ${card.title} → ${status} [${card.phase}]`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      summary.failed.push({ title: card.title, error: message });
      console.error(`  fail  ${card.title}: ${message}`);
    }
  }

  return summary;
}

async function main() {
  const { dryRun, ensureProject } = parseArgs(process.argv.slice(2));

  try {
    const summary = await seedKickoffCards(dryRun, ensureProject);

    console.log("");
    console.log("Summary");
    console.log(`  created: ${summary.created.length}`);
    console.log(`  updated: ${summary.updated.length}`);
    console.log(`  skipped: ${summary.skipped.length}`);
    console.log(`  failed:  ${summary.failed.length}`);

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
