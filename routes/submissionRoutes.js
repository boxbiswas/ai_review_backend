import express from 'express';
import multer from 'multer';
import { submitCode } from '../controllers/submissionController.js';
import { isLoggedIn } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Configure Multer to store files in memory temporarily
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // Optional: limit file size to 5MB to protect your server RAM
});

// Route expects a POST request.
// If uploading files, the frontend must send them in a field named 'files'.
// upload.array('files', 10) allows up to 10 files at once.
router.post('/', isLoggedIn, upload.array('files', 10), submitCode);

export default router;