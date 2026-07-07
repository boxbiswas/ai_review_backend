import { prisma } from "../lib/prisma.js";
import { runStaticAnalysis } from "./eslintService.js";
import { analyzeComplexity } from "./complexityService.js";
import { runAIReview } from "./aiService.js";

export const runFullPipeline = async (reviewId) => {
    try {
        const review = await prisma.review.findUnique({
            where: { id: reviewId },
            include: { codeFiles: true }
        });

        console.log(`\n--- STARTING PIPELINE FOR REVIEW ${reviewId} ---`);
        console.log(`✓ Review retrieved with ${review.codeFiles.length} files`);

        if (!review || review.codeFiles.length === 0) {
            throw new Error("Review not found or no files to analyze");
        }

        // ==========================================
        // 1. STATIC ANALYSIS
        // ==========================================
        await prisma.review.update({
            where: { id: reviewId },
            data: { status: 'ANALYZING' }
        });
        console.log(`✓ Review status updated to ANALYZING`);

        console.log(`✓ Running ESLint on ${review.codeFiles.length} files...`);
        const staticData = await runStaticAnalysis(review.codeFiles);
        console.log(`✓ ESLint completed: ${staticData.summary.errorCount} errors, ${staticData.summary.warningCount} warnings`);

        await prisma.$transaction(async (tx) => {
            await tx.staticAnalysis.create({
                data: {
                    reviewId,
                    summary: staticData.summary,
                    rawOutput: staticData.rawOutput
                }
            });

            if (staticData.findings && staticData.findings.length > 0) {
                const findingsToInsert = staticData.findings.map(finding => ({
                    ...finding,
                    reviewId
                }));
                await tx.finding.createMany({ data: findingsToInsert });
                console.log(`✓ Inserted ${findingsToInsert.length} Static Analysis findings`);
            }
        });
        console.log(`✓ Static Analysis saved to database`);

        // ==========================================
        // 2. COMPLEXITY ANALYSIS
        // ==========================================
        console.log(`✓ Running Complexity Analysis...`);
        const complexityMetrics = analyzeComplexity(review.codeFiles);
        console.log(`✓ Complexity Analysis completed. Total LOC: ${complexityMetrics.linesOfCode}, Max CC: ${complexityMetrics.cyclomaticComplexity}`);

        await prisma.complexityReport.create({
            data: {
                reviewId,
                cyclomaticComplexity: complexityMetrics.cyclomaticComplexity,
                linesOfCode: complexityMetrics.linesOfCode,
                functionCount: complexityMetrics.functionCount,
                classCount: complexityMetrics.classCount,
                maintainability: complexityMetrics.maintainability,
                breakdown: complexityMetrics.breakdown
            }
        });
        console.log(`✓ Complexity Analysis saved to database`);

        // ==========================================
        // 3. AI REVIEW
        // ==========================================
        await prisma.review.update({
            where: { id: reviewId },
            data: { status: 'AI_REVIEW' }
        });
        console.log(`✓ Review status updated to AI_REVIEW`);

        console.log(`✓ Running AI Review...`);
        const aiResponseData = await runAIReview(review.codeFiles);
        console.log(`✓ AI Review completed. AI Summary generated.`);

        await prisma.$transaction(async (tx) => {
            await tx.aIReview.create({
                data: {
                    reviewId,
                    reviewJson: aiResponseData
                }
            });

            if (aiResponseData.findings && aiResponseData.findings.length > 0) {
                const findingsToInsert = aiResponseData.findings.map(finding => ({
                    reviewId,
                    source: 'AI_MODEL',
                    severity: finding.severity.toUpperCase(), 
                    type: finding.type,
                    title: `AI: ${finding.type.charAt(0).toUpperCase() + finding.type.slice(1)} Issue`,
                    description: finding.description,
                    suggestion: finding.recommendation,
                    fileName: finding.file,
                    lineNumber: parseInt(finding.line_estimate) || null
                }));

                await tx.finding.createMany({ data: findingsToInsert });
                console.log(`✓ Inserted ${findingsToInsert.length} AI findings`);
            }

            // Calculate overall score (dummy logic, but dynamic based on findings)
            // Realistically we can subtract points for each finding.
            const totalFindings = (staticData.findings?.length || 0) + (aiResponseData.findings?.length || 0);
            let score = 100 - (totalFindings * 2);
            if (score < 0) score = 0;

            await tx.review.update({
                where: { id: reviewId },
                data: { 
                    status: 'COMPLETED',
                    overallScore: score,
                    summary: typeof aiResponseData.summary === 'string' 
                        ? aiResponseData.summary 
                        : "Analysis complete." // Fallback if schema differs
                }
            });
            console.log(`✓ Overall Score calculated: ${score}`);
        });

        console.log(`✓ AI Review saved to database`);
        console.log(`✓ Pipeline completed successfully for review ${reviewId}`);
        console.log(`----------------------------------------------------\n`);

    } catch (error) {
        console.error(`PIPELINE ERROR for review ${reviewId}:`, error);
        await prisma.review.update({
            where: { id: reviewId },
            data: { status: 'FAILED' }
        });
    }
};
