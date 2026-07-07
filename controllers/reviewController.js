import { prisma } from "../lib/prisma.js";

/**
 * CREATE & STORE REVIEW
 * Initializes a new review and stores the associated code files.
 */
export const createReview = async (req, res) => {
    try {
        const userId = req.user.id; 
        const { title, description, submissionType, language, files } = req.body;

        if (!submissionType) {
            return res.status(400).json({ message: "Submission type is required (PASTED_CODE or FILE_UPLOAD)" });
        }

        // Create the review and its nested CodeFiles in one transaction
        const newReview = await prisma.review.create({
            data: {
                userId,
                title,
                description,
                submissionType, // Must match Prisma enum: 'PASTED_CODE' or 'FILE_UPLOAD'
                language,
                status: 'PENDING', // Default starting status

                // Nested write: Creates the child CodeFile records simultaneously
                codeFiles: {
                    create: files?.map(file => ({
                        fileName: file.fileName || 'unnamed_file',
                        extension: file.extension || '.txt',
                        language: file.language || language || 'plaintext',
                        content: file.content,
                        size: Buffer.byteLength(file.content, 'utf8') // Automatically calculate file size in bytes
                    })) || []
                }
            },
            include: {
                codeFiles: true // Return the newly created files in the response
            }
        });

        res.status(201).json({
            message: "Review created successfully. Ready for analysis.",
            review: newReview
        });
    } catch (error) {
        console.error("CREATE REVIEW ERROR:", error);
        res.status(500).json({ message: "Failed to create review" });
    }
};

/**
 * GET ALL REVIEWS
 * Fetches a summary list of reviews for the logged-in user's dashboard.
 */
export const getReviews = async (req, res) => {
    try {
        const userId = req.user.id;

        const reviews = await prisma.review.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }, // Newest first
            select: { // Only fetch the fields needed for a list/dashboard view to save bandwidth
                id: true,
                title: true,
                submissionType: true,
                language: true,
                status: true,
                overallScore: true,
                createdAt: true
            }
        });

        res.status(200).json({ reviews });
    } catch (error) {
        console.error("GET REVIEWS ERROR:", error);
        res.status(500).json({ message: "Failed to fetch review history" });
    }
};

/**
 * GET SINGLE REVIEW (Detailed)
 * Fetches a specific review along with all its analyzed data (findings, code, AI reviews).
 */
export const getReviewById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const review = await prisma.review.findUnique({
            where: { id },
            include: { // Pull in all the related 1-to-1 and 1-to-many records
                codeFiles: true,
                staticAnalysis: true,
                complexityReport: true,
                aireview: true,
                findings: true
            }
        });

        // Ensure the review exists AND belongs to the requesting user
        if (!review || review.userId !== userId) {
            return res.status(404).json({ message: "Review not found or unauthorized access" });
        }

        res.status(200).json({ review });
    } catch (error) {
        console.error("GET SINGLE REVIEW ERROR:", error);
        res.status(500).json({ message: "Failed to fetch review details" });
    }
};

/**
 * DELETE REVIEW
 * Deletes a specific review. Prisma's Cascade delete will wipe out associated files and findings.
 */
export const deleteReview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // 1. First, check if the review exists and belongs to the user
        const review = await prisma.review.findUnique({
            where: { id },
            select: { userId: true }
        });

        if (!review || review.userId !== userId) {
            return res.status(404).json({ message: "Review not found or unauthorized to delete" });
        }

        // 2. Delete it. (Because of onDelete: Cascade in schema.prisma, this also cleans up CodeFile, Finding, AIReview, etc.)
        await prisma.review.delete({
            where: { id }
        });

        res.status(200).json({ message: "Review and all associated data deleted successfully" });
    } catch (error) {
        console.error("DELETE REVIEW ERROR:", error);
        res.status(500).json({ message: "Failed to delete review" });
    }
};