const { createUserSchema, loginUserSchema } = require('../support/validation');
const User = require('../model/usermodel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const passport = require("passport");
const nodemailer = require('nodemailer');


// Define the generateToken function outside of the route handlers
const generateToken = (id) => {
    return jwt.sign({ id }, "my-token-secret", { expiresIn: '30d' });
};
// Define token secret and expiration time
const resetSecret = "your-reset-token-secret";
const tokenExpiration = '1h'; // Token valid for 1 hour

const signup = async (req, res) => {
    try {
        const validationResult = await createUserSchema.validateAsync(req.body);
        const userExist = await User.findOne({ email: validationResult.email });
        if (userExist) {
            return res.status(400).json({ "success": false, message: "User already exists" });
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(validationResult.password, salt);
            const user = new User({
                username: validationResult.username,
                email: validationResult.email,
                password: hashedPassword,
                role: 'visitor' // Fix the typo here from 'vistor' to 'visitor'
            });
            await user.save();
            res.status(201).json({
                "success": true,
                "user": {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    token: generateToken(user._id) // Pass the user ID to generateToken
                }
            });
        }
    } catch (error) {
        res.status(400).json({ "success": false, message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const validationResult = await loginUserSchema.validateAsync(req.body);
        const { email, password } = validationResult;
        const user = await User.findOne({ email });
        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                "success": true,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    token: generateToken(user._id) // Pass the user ID to generateToken
                }
            });
        } else {
            res.json({ "success": false, message: "Invalid credentials, please try again!" });
        }
    } catch (error) {
        res.status(400).json({ "success": false, message: error.message });
    }
};

// Function to send email
const sendResetEmail = async (email, token) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // You can use any email service like Gmail, Outlook, etc.
        auth: {
            user: 'cedrickhakuzimana@gmail.com',
            pass: 'ijns gqnk wqfm vkpu'
        }
    });

    const resetUrl = `http://localhost:3000/reset-password/token?${token}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
            /* Add CSS styles here */
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 50px auto;
                background-color: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                padding-bottom: 20px;
                border-bottom: 1px solid #ddd;
            }
            .header h1 {
                color: #333;
            }
            .content {
                padding: 20px 0;
                text-align: center;
            }
            .content p {
                font-size: 16px;
                color: #555;
            }
            .token-box {
                background-color: #e0e0e0;
                padding: 10px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 14px;
                margin: 20px 0;
                word-break: break-all;
            }
            .button {
                display: inline-block;
                padding: 12px 20px;
                background-color: #007BFF;
                color: #fff;
                text-decoration: none;
                border-radius: 5px;
                font-size: 16px;
                margin-top: 20px;
            }
            .button:hover {
                background-color: #0056b3;
            }
            .footer {
                text-align: center;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                color: #777;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
    
    <div class="container">
        <div class="header">
            <h1>Password Reset</h1>
        </div>
        <div class="content">
            <p>We received a request to reset your password. Click the button below to reset it.</p>
            
            <!-- Display the token in a styled box -->
            <div class="token-box">
                ${token}
            </div>
            
            <!-- Button with the reset link -->
            <a href="${resetUrl}" class="button">Reset Password</a>
        </div>
        <div class="footer">
            <p>If you didn't request this, please ignore this email.</p>
        </div>
    </div>
    
    </body>
    </html>
    `;
    
    // Use htmlContent in nodemailer
    const mailOptions = {
        from: 'your-email@gmail.com',
        to: email,
        subject: 'Password Reset',
        html: htmlContent
    };
    
    return transporter.sendMail(mailOptions);
};

// Request Password Reset
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ success: false, message: "Email not found" });
        }

        const resetToken = jwt.sign({ id: user._id }, resetSecret, { expiresIn: tokenExpiration });

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
        await user.save();

    
        await sendResetEmail(email, resetToken);

        res.json({ success: true, message: "Reset token sent to your email" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match" });
        }

        const decoded = jwt.verify(token, resetSecret);
        const user = await User.findOne({ _id: decoded.id, resetPasswordToken: token });

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired token" });
        }

        if (Date.now() > user.resetPasswordExpires) {
            return res.status(400).json({ success: false, message: "Token has expired" });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        user.resetPasswordToken = undefined; 
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ success: true, message: "Password successfully reset" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all users
const getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclude the password field for security
        res.status(200).json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete a user by ID
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { signup, login,requestPasswordReset,resetPassword,getUsers,deleteUser };
