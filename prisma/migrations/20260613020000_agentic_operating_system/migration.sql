-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('QUEUED', 'PLANNING', 'AWAITING_APPROVAL', 'EXECUTING', 'OBSERVING', 'REFLECTING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStepStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "ApprovalRequest" ADD COLUMN "taskId" TEXT;

-- CreateTable
CREATE TABLE "AgentTask" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT,
    "requesterId" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'QUEUED',
    "mode" TEXT NOT NULL DEFAULT 'admin',
    "planSummary" TEXT,
    "impact" TEXT,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "currentCycle" INTEGER NOT NULL DEFAULT 0,
    "maxCycles" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTaskStep" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "toolName" TEXT,
    "parameters" JSONB,
    "reason" TEXT NOT NULL,
    "status" "TaskStepStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentTaskStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskHistory" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReflectionLog" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "taskId" TEXT,
    "critique" TEXT NOT NULL,
    "missingItems" JSONB NOT NULL,
    "followUpToolCalls" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReflectionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerTemplate" (
    "id" TEXT NOT NULL,
    "guildId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApprovalRequest_taskId_idx" ON "ApprovalRequest"("taskId");

-- CreateIndex
CREATE INDEX "AgentTask_guildId_status_createdAt_idx" ON "AgentTask"("guildId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentTaskStep_taskId_position_key" ON "AgentTaskStep"("taskId", "position");

-- CreateIndex
CREATE INDEX "AgentTaskStep_taskId_status_idx" ON "AgentTaskStep"("taskId", "status");

-- CreateIndex
CREATE INDEX "TaskHistory_taskId_createdAt_idx" ON "TaskHistory"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "ReflectionLog_guildId_createdAt_idx" ON "ReflectionLog"("guildId", "createdAt");

-- CreateIndex
CREATE INDEX "ReflectionLog_taskId_idx" ON "ReflectionLog"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "ServerTemplate_guildId_slug_key" ON "ServerTemplate"("guildId", "slug");

-- CreateIndex
CREATE INDEX "ServerTemplate_category_idx" ON "ServerTemplate"("category");

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AgentTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTaskStep" ADD CONSTRAINT "AgentTaskStep_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AgentTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskHistory" ADD CONSTRAINT "TaskHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AgentTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReflectionLog" ADD CONSTRAINT "ReflectionLog_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReflectionLog" ADD CONSTRAINT "ReflectionLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AgentTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerTemplate" ADD CONSTRAINT "ServerTemplate_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
