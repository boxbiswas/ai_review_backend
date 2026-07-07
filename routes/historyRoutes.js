import express from 'express';
import { getReviewHistory, deleteReview } from '../controllers/historyController.js';
import { isLoggedIn } from '../middlewares/authMiddleware.js'; 

const router = express.Router();

// GET /api/history
// Retrieves paginated, searchable review history
router.get('/', isLoggedIn, getReviewHistory);

// DELETE /api/history/:reviewId
// Deletes a review (Cascades to files and findings)
router.delete('/:reviewId', isLoggedIn, deleteReview);

export default router;