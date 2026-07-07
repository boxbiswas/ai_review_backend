import express from 'express';
import { getDashboardData } from '../controllers/dashboardController.js';
import { isLoggedIn } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Retrieves aggregate stats and recent reviews for the logged-in user
router.get('/', isLoggedIn, getDashboardData);

export default router;