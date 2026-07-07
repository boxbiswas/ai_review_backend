import { prisma } from "../lib/prisma.js";


export const getDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;

        // Execute multiple queries in parallel for maximum performance
        const [
            totalReviews, 
            statusCounts, 
            scoreAggregation, 
            totalFilesReviewed,
            totalFindings,
            recentReviews
        ] = await prisma.$transaction([
            
            // 1. Calculate Total Stats
            prisma.review.count({ 
                where: { userId } 
            }),
            
            // 2. Count reviews grouped by their status (PENDING, COMPLETED, etc.)
            prisma.review.groupBy({
                by: ['status'],
                where: { userId },
                _count: { status: true }
            }),
            
            // 3. Calculate Average Score (Only for completed reviews with a score)
            prisma.review.aggregate({
                where: { 
                    userId, 
                    status: 'COMPLETED',
                    overallScore: { not: null }
                },
                _avg: { overallScore: true }
            }),
            
            // 4. Calculate Total Files Reviewed
            prisma.codeFile.count({
                where: { review: { userId } }
            }),
            
            // 5. Calculate Total Findings
            prisma.finding.count({
                where: { review: { userId } }
            }),

            // 6. Fetch the 5 most recent reviews
            prisma.review.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    title: true,
                    submissionType: true,
                    language: true,
                    status: true,
                    overallScore: true,
                    createdAt: true,
                    _count: {
                        select: { codeFiles: true, findings: true }
                    }
                }
            })
        ]);

        // Format the grouped status counts into an easily readable object for the frontend
        const formattedStatusCounts = statusCounts.reduce((acc, curr) => {
            acc[curr.status] = curr._count.status;
            return acc;
        }, {
            PENDING: 0, ANALYZING: 0, AI_REVIEW: 0, COMPLETED: 0, FAILED: 0
        });

        // 5. Return Dashboard Data
        res.status(200).json({
            stats: {
                totalReviews,
                filesReviewed: totalFilesReviewed,
                totalFindings,
                averageScore: scoreAggregation._avg.overallScore ? Math.round(scoreAggregation._avg.overallScore) : 0,
                statusBreakdown: formattedStatusCounts
            },
            recentReviews
        });

    } catch (error) {
        console.error("DASHBOARD FETCH ERROR:", error);
        res.status(500).json({ message: "Failed to load dashboard data" });
    }
};