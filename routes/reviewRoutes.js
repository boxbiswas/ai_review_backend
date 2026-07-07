import express from 'express';
import { createReview, getReviews, getReviewById, deleteReview } from '../controllers/reviewController.js';
import { isLoggedIn } from '../middlewares/authMiddleware.js';
const router = express.Router();


router.post('/', isLoggedIn, createReview);       // Store Review
router.get('/', isLoggedIn, getReviews);          // Get Reviews (List)
router.get('/:id', isLoggedIn, getReviewById);    // Get Single Review (Detailed)
router.delete('/:id', isLoggedIn, deleteReview);  // Delete Review

export default router;