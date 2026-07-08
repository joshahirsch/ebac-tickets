import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pmgt = await prisma.project.findFirst({
    where: { key: "PMGT" },
    select: { id: true, key: true, name: true, ticketSeq: true, workspaceId: true },
  });
  console.log("PMGT project:", pmgt);
  if (!pmgt) {
    console.log("No PMGT project found");
    return;
  }

  const tickets = await prisma.ticket.findMany({
    where: { projectId: pmgt.id },
    orderBy: { number: "desc" },
    take: 5,
    select: {
      id: true,
      number: true,
      title: true,
      description: true,
      isArchived: true,
    },
  });

  for (const t of tickets) {
    const desc = t.description ?? "";
    console.log("---");
    console.log("id:", t.id);
    console.log("key:", `PMGT-${t.number}`);
    console.log("title:", t.title);
    console.log("descLen:", desc.length);
    console.log("hasPurpose:", desc.includes("## Purpose"));
    console.log("hasChecklist:", desc.includes("## Checklist"));
    console.log("hasAcceptance:", desc.includes("## Acceptance criteria"));
  }

  const ops3 = await prisma.ticket.findFirst({
    where: { project: { key: "OPS" }, number: 3 },
    select: { id: true, number: true, title: true },
  });
  console.log("OPS-3:", ops3);

  const bad = await prisma.ticket.findFirst({
    where: {
      id: undefined as unknown as string,
      project: { workspaceId: pmgt.workspaceId },
    },
    select: {
      id: true,
      title: true,
      number: true,
      project: { select: { key: true } },
    },
  });
  console.log("findFirst with undefined id (workspace scoped):", bad);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
