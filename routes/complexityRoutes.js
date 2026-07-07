import express from 'express';
import { generateComplexityReport } from '../controllers/complexityController.js';
import { isLoggedIn } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Route to trigger complexity calculation for a specific review
router.post('/:reviewId/analyze-complexity', isLoggedIn, generateComplexityReport);

export default router;