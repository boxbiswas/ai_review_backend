import express from 'express';
import { performStaticAnalysis } from '../controllers/staticController.js';
import { isLoggedIn } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Trigger static analysis for a specific review
router.post('/:reviewId/analyze-static', isLoggedIn, performStaticAnalysis);

export default router;