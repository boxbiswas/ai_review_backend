-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('PASTED_CODE', 'FILE_UPLOAD');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'ANALYZING', 'AI_REVIEW', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FindingSource" AS ENUM ('STATIC_ANALYSIS', 'AI_MODEL');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "submissionType" "SubmissionType" NOT NULL,
    "language" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "overallScore" INTEGER,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeFile" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaticAnalysis" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "rawOutput" JSONB NOT NULL,

    CONSTRAINT "StaticAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplexityReport" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "cyclomaticComplexity" INTEGER,
    "linesOfCode" INTEGER,
    "functionCount" INTEGER,
    "classCount" INTEGER,
    "maintainability" DOUBLE PRECISION,
    "breakdown" JSONB NOT NULL,

    CONSTRAINT "ComplexityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIReview" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reviewJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "source" "FindingSource" NOT NULL,
    "severity" "Severity" NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "suggestion" TEXT,
    "fileName" TEXT,
    "lineNumber" INTEGER,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StaticAnalysis_reviewId_key" ON "StaticAnalysis"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplexityReport_reviewId_key" ON "ComplexityReport"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "AIReview_reviewId_key" ON "AIReview"("reviewId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeFile" ADD CONSTRAINT "CodeFile_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaticAnalysis" ADD CONSTRAINT "StaticAnalysis_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplexityReport" ADD CONSTRAINT "ComplexityReport_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIReview" ADD CONSTRAINT "AIReview_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
