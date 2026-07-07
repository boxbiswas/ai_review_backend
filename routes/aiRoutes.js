import express from 'express';
import { performAIReview } from '../controllers/aiController.js';
import { isLoggedIn } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Route to trigger AI code review for a specific review
router.post('/:reviewId/analyze-ai', isLoggedIn, performAIReview);

export default router;