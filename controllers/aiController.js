import { prisma } from "../lib/prisma.js";
import { runAIReview } from "../services/aiService.js"; 

export const performAIReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user.id;

        const review = await prisma.review.findUnique({
            where: { id: reviewId },
            include: { codeFiles: true }
        });

        if (!review) return res.status(404).json({ message: "Review not found" });
        if (review.userId !== userId) return res.status(403).json({ message: "Unauthorized access" });

        await prisma.review.update({
            where: { id: reviewId },
            data: { status: 'AI_REVIEW' }
        });

        const aiResponseData = await runAIReview(review.codeFiles);

        await prisma.$transaction(async (tx) => {
            await tx.aIReview.create({
                data: {
                    reviewId: review.id,
                    reviewJson: aiResponseData
                }
            });

            if (aiResponseData.findings && aiResponseData.findings.length > 0) {
                const findingsToInsert = aiResponseData.findings.map(finding => ({
                    reviewId: review.id,
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
            }

            await tx.review.update({
                where: { id: review.id },
                data: { 
                    status: 'COMPLETED',
                    summary: aiResponseData.summary
                }
            });
        });

        res.status(200).json({
            message: "AI code review completed successfully",
            summary: aiResponseData.summary,
            findingsFound: aiResponseData.findings?.length || 0
        });

    } catch (error) {
        console.error("AI REVIEW CONTROLLER ERROR:", error);
        
        await prisma.review.update({
            where: { id: req.params.reviewId },
            data: { status: 'FAILED' }
        });

        res.status(500).json({ message: "Failed to perform AI analysis" });
    }
};