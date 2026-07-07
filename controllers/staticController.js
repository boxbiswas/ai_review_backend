import { prisma } from "../lib/prisma.js";
import { runStaticAnalysis } from "../services/eslintService.js";


export const performStaticAnalysis = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user.id; 

        const review = await prisma.review.findUnique({
            where: { id: reviewId },
            include: { codeFiles: true }
        });

        if (!review) return res.status(404).json({ message: "Review not found" });
        if (review.userId !== userId) return res.status(403).json({ message: "Unauthorized access" });
        if (review.status === 'COMPLETED') return res.status(400).json({ message: "Review already completed" });

        await prisma.review.update({
            where: { id: reviewId },
            data: { status: 'ANALYZING' }
        });

        const analysisData = await runStaticAnalysis(review.codeFiles);

        await prisma.$transaction(async (tx) => {
            await tx.staticAnalysis.create({
                data: {
                    reviewId: review.id,
                    summary: analysisData.summary,
                    rawOutput: analysisData.rawOutput
                }
            });

            if (analysisData.findings.length > 0) {
                const findingsToInsert = analysisData.findings.map(finding => ({
                    ...finding,
                    reviewId: review.id
                }));
                await tx.finding.createMany({ data: findingsToInsert });
            }
        });

        res.status(200).json({
            message: "Static analysis completed successfully",
            summary: analysisData.summary,
            findingsFound: analysisData.findings.length
        });

    } catch (error) {
        console.error("STATIC ANALYSIS ERROR:", error);
        await prisma.review.update({
            where: { id: req.params.reviewId },
            data: { status: 'FAILED' }
        });
        res.status(500).json({ message: "Failed to perform static analysis" });
    }
};