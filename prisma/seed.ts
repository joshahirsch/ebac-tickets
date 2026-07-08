/**
 * EBAC Projects — seed data.
 *
 * Creates an East Bay Agency for Children workspace, an admin/manager/member/
 * viewer set, starter projects, labels, and a spread of tickets across every
 * status and priority so the app has realistic content on first login.
 *
 * Run with:  npm run db:seed   (uses tsx)
 *
 * NOTE: This seeds the *application* database rows. Auth identities live in
 * Supabase Auth — see README "First admin bootstrap". Seeded users have a null
 * authId until they sign in with a matching email, at which point the bootstrap
 * logic links them.
 */
import {
  PrismaClient,
  Role,
  ProjectStatus,
  TicketStatus,
  TicketPriority,
  TicketType,
  ActivityType,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding EBAC Projects...");

  // --- Workspace ---
  const workspace = await prisma.workspace.upsert({
    where: { slug: "ebac" },
    update: { name: "East Bay Agency for Children" },
    create: { name: "East Bay Agency for Children", slug: "ebac" },
  });

  // --- Users ---
  const admin = await prisma.user.upsert({
    where: { email: "admin@ebac.org" },
    update: { role: Role.ADMIN, workspaceId: workspace.id },
    create: { email: "admin@ebac.org", name: "EBAC Admin", role: Role.ADMIN, workspaceId: workspace.id },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@ebac.org" },
    update: { role: Role.MANAGER, workspaceId: workspace.id },
    create: { email: "manager@ebac.org", name: "Program Manager", role: Role.MANAGER, workspaceId: workspace.id },
  });

  const member = await prisma.user.upsert({
    where: { email: "member@ebac.org" },
    update: { role: Role.MEMBER, workspaceId: workspace.id },
    create: { email: "member@ebac.org", name: "Staff Member", role: Role.MEMBER, workspaceId: workspace.id },
  });

  const viewer = await prisma.user.upsert({
    where: { email: "viewer@ebac.org" },
    update: { role: Role.VIEWER, workspaceId: workspace.id },
    create: { email: "viewer@ebac.org", name: "Board Viewer", role: Role.VIEWER, workspaceId: workspace.id },
  });

  // --- Labels ---
  const labelDefs = [
    { name: "urgent", color: "#dc2626" },
    { name: "quick-win", color: "#16a34a" },
    { name: "grant-deadline", color: "#2563eb" },
    { name: "needs-review", color: "#d97706" },
    { name: "waiting-external", color: "#7c3aed" },
    { name: "board", color: "#0f766e" },
  ];
  const labels = [];
  for (const l of labelDefs) {
    labels.push(
      await prisma.ticketLabel.upsert({
        where: { workspaceId_name: { workspaceId: workspace.id, name: l.name } },
        update: { color: l.color },
        create: { ...l, workspaceId: workspace.id },
      }),
    );
  }

  // --- Projects ---
  const projectDefs = [
    { key: "DEV", name: "Development & Fundraising", description: "Grants, donor campaigns, and fundraising events.", category: "Advancement", ownerId: admin.id },
    { key: "COMMS", name: "Communications & Marketing", description: "The HUB newsletter, blog, website, and social media.", category: "Communications", ownerId: manager.id },
    { key: "PROG", name: "Program Operations", description: "Family Resource Centers, afterschool, and behavioral health program support.", category: "Programs", ownerId: manager.id },
    { key: "OPS", name: "Facilities & IT", description: "Facilities, equipment, and internal technology requests.", category: "Operations", ownerId: admin.id },
  ];

  const projects: Record<string, { id: string; key: string }> = {};
  for (const p of projectDefs) {
    const project = await prisma.project.upsert({
      where: { workspaceId_key: { workspaceId: workspace.id, key: p.key } },
      update: { name: p.name, description: p.description, category: p.category, ownerId: p.ownerId },
      create: {
        key: p.key, name: p.name, description: p.description, category: p.category,
        status: ProjectStatus.ACTIVE, workspaceId: workspace.id, ownerId: p.ownerId,
      },
    });
    projects[p.key] = { id: project.id, key: project.key };

    for (const u of [admin, manager, member]) {
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: project.id, userId: u.id } },
        update: {},
        create: { projectId: project.id, userId: u.id },
      });
    }
  }

  // --- Tickets ---
  const ticketDefs = [
    { key: "DEV", title: "Submit Alameda County behavioral health grant renewal", description: "Compile outcomes data and narrative for the annual renewal application.", status: TicketStatus.IN_PROGRESS, priority: TicketPriority.URGENT, type: TicketType.TASK, assignee: manager, reporter: admin, dueInDays: 3, labelNames: ["grant-deadline", "urgent"] },
    { key: "DEV", title: "Spring donor appeal - final copy review", description: "Review and approve the spring fundraising letter before mail house handoff.", status: TicketStatus.IN_REVIEW, priority: TicketPriority.HIGH, type: TicketType.REQUEST, assignee: member, reporter: manager, dueInDays: 2, labelNames: ["needs-review"] },
    { key: "DEV", title: "Annual gala - reserve venue and set date", description: "Confirm venue availability and lock the date for the fall fundraising gala.", status: TicketStatus.BACKLOG, priority: TicketPriority.MEDIUM, type: TicketType.EVENT, assignee: null, reporter: admin, dueInDays: null, labelNames: [] },
    { key: "COMMS", title: "Publish June issue of The HUB newsletter", description: "Assemble stories, finalize layout, and schedule the monthly e-newsletter.", status: TicketStatus.IN_PROGRESS, priority: TicketPriority.HIGH, type: TicketType.TASK, assignee: member, reporter: manager, dueInDays: 4, labelNames: [] },
    { key: "COMMS", title: "Fix broken links in website services footer", description: "Several footer links on ebac.org return 404. Audit and repair.", status: TicketStatus.TODO, priority: TicketPriority.MEDIUM, type: TicketType.MAINTENANCE, assignee: member, reporter: admin, dueInDays: 7, labelNames: ["quick-win"] },
    { key: "COMMS", title: "Deliver Youth Empowerment story for blog", description: "Write and publish a program spotlight featuring the youth empowerment services team.", status: TicketStatus.DONE, priority: TicketPriority.MEDIUM, type: TicketType.TASK, assignee: member, reporter: manager, dueInDays: -3, labelNames: [] },
    { key: "PROG", title: "Blocked: awaiting district approval for school-based staffing", description: "Cannot finalize the site schedule until the school district confirms room assignments.", status: TicketStatus.BLOCKED, priority: TicketPriority.HIGH, type: TicketType.TASK, assignee: manager, reporter: admin, dueInDays: 5, labelNames: ["waiting-external"] },
    { key: "PROG", title: "Family Resource Center - restock intake supplies", description: "Order intake packets and welcome kits for the Oakland resource center.", status: TicketStatus.TODO, priority: TicketPriority.LOW, type: TicketType.REQUEST, assignee: member, reporter: manager, dueInDays: 10, labelNames: ["quick-win"] },
    { key: "PROG", title: "Afterschool program launch - site readiness milestone", description: "Confirm all sites are staffed, supplied, and enrolled ahead of the program start.", status: TicketStatus.BACKLOG, priority: TicketPriority.MEDIUM, type: TicketType.MILESTONE, assignee: manager, reporter: admin, dueInDays: 21, labelNames: [] },
    { key: "OPS", title: "Overdue: quarterly access review for shared systems", description: "Review who has access to donor CRM, shared drives, and email groups.", status: TicketStatus.TODO, priority: TicketPriority.HIGH, type: TicketType.TASK, assignee: manager, reporter: admin, dueInDays: -4, labelNames: ["needs-review"] },
    { key: "OPS", title: "Replace failing printer at Ford Street office", description: "Front-desk printer is out of service. Evaluate repair vs. replacement.", status: TicketStatus.IN_PROGRESS, priority: TicketPriority.MEDIUM, type: TicketType.MAINTENANCE, assignee: member, reporter: member, dueInDays: 2, labelNames: [] },
    { key: "OPS", title: "Archived: legacy intranet migration", description: "Superseded by the new shared-drive structure.", status: TicketStatus.ARCHIVED, priority: TicketPriority.LOW, type: TicketType.OTHER, assignee: null, reporter: admin, dueInDays: null, labelNames: [], archived: true },
  ];

  const labelByName = Object.fromEntries(labels.map((l) => [l.name, l]));

  for (const t of ticketDefs) {
    const project = projects[t.key];
    const nextNumber = await prisma.project
      .update({ where: { id: project.id }, data: { ticketSeq: { increment: 1 } }, select: { ticketSeq: true } })
      .then((p) => p.ticketSeq);

    const dueDate =
      t.dueInDays === null || t.dueInDays === undefined
        ? null
        : new Date(Date.now() + t.dueInDays * 24 * 60 * 60 * 1000);

    const ticket = await prisma.ticket.create({
      data: {
        number: nextNumber, title: t.title, description: t.description,
        status: t.status, priority: t.priority, type: t.type, dueDate,
        isArchived: Boolean((t as { archived?: boolean }).archived),
        archivedAt: (t as { archived?: boolean }).archived ? new Date() : null,
        projectId: project.id,
        assigneeId: t.assignee?.id ?? null,
        reporterId: t.reporter?.id ?? null,
      },
    });

    for (const ln of t.labelNames) {
      const label = labelByName[ln];
      if (label) {
        await prisma.ticketLabelOnTicket.create({ data: { ticketId: ticket.id, labelId: label.id } });
      }
    }

    await prisma.ticketActivity.create({
      data: {
        type: ActivityType.TICKET_CREATED,
        message: `${t.reporter?.name ?? "System"} created this ticket`,
        ticketId: ticket.id,
        actorId: t.reporter?.id ?? null,
      },
    });

    if (t.status === TicketStatus.IN_REVIEW || t.status === TicketStatus.BLOCKED) {
      await prisma.ticketComment.create({
        data: {
          body: t.status === TicketStatus.BLOCKED
            ? "Following up with the district contact this week."
            : "First draft is ready for review - feedback welcome.",
          ticketId: ticket.id,
          authorId: manager.id,
        },
      });
      await prisma.ticketActivity.create({
        data: {
          type: ActivityType.COMMENT_ADDED,
          message: `${manager.name} added a comment`,
          ticketId: ticket.id,
          actorId: manager.id,
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log(`   Workspace: ${workspace.name}`);
  console.log("   Users: admin@ / manager@ / member@ / viewer@ ebac.org");
  console.log(`   Projects: ${projectDefs.map((p) => p.key).join(", ")}`);
  console.log(`   Tickets: ${ticketDefs.length}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
