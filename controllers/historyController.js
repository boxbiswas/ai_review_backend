import { prisma } from "../lib/prisma.js";

/**
 * GET /api/history
 * Fetches paginated, searchable, and filterable review history for the logged-in user.
 */
export const getReviewHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 1. Pagination Parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // 2. Filter & Search Parameters
        const { status, search, language, submissionType } = req.query;
        
        const whereClause = {
            userId: userId,
            // Dynamically add status filter if provided
            ...(status && status !== 'All' && { status: status.toUpperCase() }),
            // Dynamically add language filter if provided
            ...(language && language !== 'All' && { language: language.toLowerCase() }),
            // Dynamically add submissionType filter if provided
            ...(submissionType && submissionType !== 'All' && { submissionType: submissionType.toUpperCase() }),
            // Dynamically add search filter for Review ID or related File Names
            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { language: { contains: search, mode: 'insensitive' } }
                ]
            })
        };

        // 3. Execute query and count in parallel using a transaction
        const [reviews, totalCount] = await prisma.$transaction([
            prisma.review.findMany({
                where: whereClause,
                skip: skip,
                take: limit,
                orderBy: { createdAt: 'desc' }, // Show newest reviews first
                select: {
                    id: true,
                    title: true,
                    submissionType: true,
                    language: true,
                    status: true,
                    overallScore: true,
                    createdAt: true,
                    // Pull quick stats without fetching entire associated records
                    _count: {
                        select: { codeFiles: true, findings: true } 
                    }
                }
            }),
            prisma.review.count({ where: whereClause })
        ]);

        // 4. Return formatted response
        res.status(200).json({
            data: reviews,
            meta: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        });

    } catch (error) {
        console.error("HISTORY FETCH ERROR:", error);
        res.status(500).json({ message: "Failed to fetch review history" });
    }
};

/**
 * DELETE /api/history/:reviewId
 * Deletes a specific review. Thanks to onDelete: Cascade in the schema,
 * this single operation cleans up all related files, analysis, and findings.
 */
export const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user.id;

        // 1. Verify the review exists and belongs to the requesting user
        const review = await prisma.review.findUnique({
            where: { id: reviewId },
            select: { userId: true } // Only fetch what we need to check ownership
        });

        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }
        
        if (review.userId !== userId) {
            return res.status(403).json({ message: "Unauthorized to delete this review" });
        }

        // 2. Delete the Review (Cascades to all child records automatically)
        await prisma.review.delete({
            where: { id: reviewId }
        });

        res.status(200).json({ message: "Review and all associated data successfully deleted" });

    } catch (error) {
        console.error("DELETE REVIEW ERROR:", error);
        res.status(500).json({ message: "Failed to delete review" });
    }
};