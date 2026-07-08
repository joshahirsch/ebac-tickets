-- CreateEnum
CREATE TYPE "GoogleCalendarConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "TicketCalendarSyncStatus" AS ENUM ('SYNCED', 'PENDING', 'ERROR', 'DELETED');

-- CreateTable
CREATE TABLE "GoogleCalendarConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleAccountEmail" TEXT,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT,
    "scope" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "status" "GoogleCalendarConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT,
    "disconnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketCalendarSync" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "calendarConnectionId" TEXT NOT NULL,
    "googleCalendarId" TEXT NOT NULL DEFAULT 'primary',
    "googleEventId" TEXT NOT NULL,
    "lastSyncedDueDate" TEXT,
    "lastSyncedHash" TEXT,
    "status" "TicketCalendarSyncStatus" NOT NULL DEFAULT 'SYNCED',
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketCalendarSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarConnection_userId_key" ON "GoogleCalendarConnection"("userId");

-- CreateIndex
CREATE INDEX "GoogleCalendarConnection_status_idx" ON "GoogleCalendarConnection"("status");

-- CreateIndex
CREATE INDEX "TicketCalendarSync_googleEventId_idx" ON "TicketCalendarSync"("googleEventId");

-- CreateIndex
CREATE INDEX "TicketCalendarSync_calendarConnectionId_idx" ON "TicketCalendarSync"("calendarConnectionId");

-- CreateIndex
CREATE INDEX "TicketCalendarSync_status_idx" ON "TicketCalendarSync"("status");

-- CreateIndex
CREATE INDEX "TicketCalendarSync_ticketId_idx" ON "TicketCalendarSync"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketCalendarSync_userId_ticketId_key" ON "TicketCalendarSync"("userId", "ticketId");

-- AddForeignKey
ALTER TABLE "GoogleCalendarConnection" ADD CONSTRAINT "GoogleCalendarConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCalendarSync" ADD CONSTRAINT "TicketCalendarSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCalendarSync" ADD CONSTRAINT "TicketCalendarSync_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCalendarSync" ADD CONSTRAINT "TicketCalendarSync_calendarConnectionId_fkey" FOREIGN KEY ("calendarConnectionId") REFERENCES "GoogleCalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
