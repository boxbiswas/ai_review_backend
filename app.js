import "dotenv/config";
import express from 'express';

import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import path from 'path';


import authRoutes from './routes/authRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import staticRoutes from './routes/staticRoutes.js';
import complexityRoutes from './routes/complexityRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';


import { prisma } from './lib/prisma.js';

const app = express();


// Cors configuration
app.use(cors({
    origin: [
        "http://localhost:5173"
        
    ],
    credentials: true, // This allows the cookies to be sent back and forth
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cookie']
}))



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


// Import routes
app.use("/auth", authRoutes);
app.use("/reviews", reviewRoutes);
app.use("/submissions", submissionRoutes);
app.use("/static", staticRoutes);
app.use("/complexity", complexityRoutes);
app.use("/history", historyRoutes);
app.use("/ai", aiRoutes);
app.use("/dashboard", dashboardRoutes);


const PORT = process.env.PORT;

// Explicitly bind to 0.0.0.0 so Railway's proxy can route traffic to it
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});