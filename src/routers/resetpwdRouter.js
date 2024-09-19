const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../model/usermodel');
const bcrypt = require('bcryptjs');
const express = require('express');
require('dotenv').config(); 

const router = express.Router();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER, 
        pass: process.env.GMAIL_PASS 
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body; 
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ "success": false, message: "User with that email not found" });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = Date.now() + 3600000;
        await user.save();

        // Send reset email
        const resetUrl = `http://localhost:4000/reset-password/${resetToken}`; // URL to frontend reset page
        const mailOptions = {
            to: user.email,
            from: process.env.GMAIL_USER, // Use the environment variable for the sender's email
            subject: 'Password Reset',
            text: `You are receiving this because you (or someone else) have requested a password reset for your account.\n\n
                   Please click on the following link, or paste it into your browser to complete the process:\n\n
                   ${resetUrl}\n\n
                   If you did not request this, please ignore this email and your password will remain unchanged.\n`
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ "success": true, message: "Password reset email sent successfully" });
    } catch (error) {
        res.status(500).json({ "success": false, message: error.message });
    }
});

// Route to reset password using token
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        // Hash the token and compare with DB
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() } // Check if the token is not expired
        });

        if (!user) {
            return res.status(400).json({ "success": false, message: "Invalid or expired token" });
        }

        // Update the password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ "success": true, message: "Password reset successful" });
    } catch (error) {
        res.status(500).json({ "success": false, message: error.message });
    }
});

module.exports = router; // Make sure to export the router at the end
