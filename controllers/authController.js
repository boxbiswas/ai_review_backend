import "dotenv/config";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { prisma } from "../lib/prisma.js";


// Authentication routes
export const registerUser = (req, res) => {
    let { name, email, password } = req.body;

    bcrypt.genSalt(10, (err, salt) => {
        if (err) {
            return res.status(500).send('Something went wrong generating salt');
        }
        bcrypt.hash(password, salt, async (err, hash) => {
            if (err) {
                return res.status(500).send('Something went wrong hashing password');
            }
            try {
                // Ensure email is unique before creating 
                const existingUser = await prisma.user.findUnique({ where: { email } });
                if (existingUser) {
                    return res.status(400).send({ message: 'User already exists with this email' });
                }

                let createUser = await prisma.user.create({
                    data: {
                        name,
                        email,
                        password: hash
                    }
                });
                let token = jwt.sign({ id: createUser.id, email: createUser.email }, process.env.JWT_SECRET, { expiresIn: '1d' });
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: true,        // Required for production (HTTPS)
                    sameSite: 'none',    // REQUIRED for cross-site cookies
                    maxAge: 24 * 60 * 60 * 1000 // 1 day
                });
                res.send({ message: 'User registered successfully', token });
            } catch (err) {
                console.error("REGISTER ERROR:", err);
                res.status(400).send({ message: 'Something went wrong' });
            }
        });
    });
};


export const logoutUser = (req, res) => {
    res.clearCookie('token', { sameSite: 'none', secure: true });
    // res.redirect('/login');
    res.status(200).send({ message: 'Logged out successfully' });
};


export const loginUser = async (req, res) => {
    try {
        let user = await prisma.user.findUnique({ where: { email: req.body.email } });

        if (!user) {
            return res.status(400).send({ message: 'Invalid credentials' });
        }

        bcrypt.compare(req.body.password, user.password, (err, result) => {
            if (result) {
                let token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1d' });
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: true,        // Required for production (HTTPS)
                    sameSite: 'none',    // REQUIRED for cross-site cookies
                    maxAge: 24 * 60 * 60 * 1000 // 1 day
                });
                res.send({ message: 'Login successful', token, user: { id: user.id, name: user.name, email: user.email } });
            } else {
                res.status(400).send({ message: 'Invalid credentials' });
            }
        })
    } catch (err) {
        res.status(400).send({ message: 'Something went wrong' });
    }
};
