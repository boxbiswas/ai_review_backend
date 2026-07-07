import { prisma } from "../lib/prisma.js";
import { analyzeComplexity } from "../services/complexityService.js";

export const generateComplexityReport = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user.id;

        // Flow Step 1: Read Files (Fetch review and associated code files)
        const review = await prisma.review.findUnique({
            where: { id: reviewId },
            include: { codeFiles: true }
        });

        // Authorization and existence checks
        if (!review) return res.status(404).json({ message: "Review not found" });
        if (review.userId !== userId) return res.status(403).json({ message: "Unauthorized access" });

        // Flow Step 2: Calculate Metrics
        const metrics = analyzeComplexity(review.codeFiles);

        // Flow Step 3: Save Complexity Report
        // Using upsert in case the user re-runs the analysis on the same review
        const complexityReport = await prisma.complexityReport.upsert({
            where: { reviewId: review.id },
            update: {
                cyclomaticComplexity: metrics.cyclomaticComplexity,
                linesOfCode: metrics.linesOfCode,
                functionCount: metrics.functionCount,
                classCount: metrics.classCount,
                maintainability: metrics.maintainability,
                breakdown: metrics.breakdown
            },
            create: {
                reviewId: review.id,
                cyclomaticComplexity: metrics.cyclomaticComplexity,
                linesOfCode: metrics.linesOfCode,
                functionCount: metrics.functionCount,
                classCount: metrics.classCount,
                maintainability: metrics.maintainability,
                breakdown: metrics.breakdown
            }
        });

        res.status(200).json({
            message: "Complexity analysis completed successfully",
            report: complexityReport
        });

    } catch (error) {
        console.error("COMPLEXITY ANALYSIS ERROR:", error);
        res.status(500).json({ message: "Failed to generate complexity report" });
    }
};