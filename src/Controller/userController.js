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

    const mailOptions = {
        from: 'your-email@gmail.com',
        to: email,
        subject: 'Password Reset',
        text: `You requested a password reset. Please go to the following link to reset your password: ${resetUrl}`,
        html: `<p>You requested a password reset. Click <a href="${resetUrl}">here</a> to reset your password.</p>`
    };

    return transporter.sendMail(mailOptions);
};

// Request Password Reset
const requestPasswordReset = async (req, res) => {
    try {
        const { username } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(400).json({ success: false, message: "Email not found" });
        }

        // Generate JWT token for password reset
        const resetToken = jwt.sign({ id: user._id }, resetSecret, { expiresIn: tokenExpiration });

        // Save the token's expiration in the user's record
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
        await user.save();

        // Send the reset token via email
        await sendResetEmail(username, resetToken);

        res.json({ success: true, message: "Reset token sent to your email" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Reset Password
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match" });
        }

        // Verify the reset token
        const decoded = jwt.verify(token, resetSecret);
        const user = await User.findOne({ _id: decoded.id, resetPasswordToken: token });

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired token" });
        }

        // Check if token has expired
        if (Date.now() > user.resetPasswordExpires) {
            return res.status(400).json({ success: false, message: "Token has expired" });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user's password
        user.password = hashedPassword;
        user.resetPasswordToken = undefined; // Clear the reset token
        user.resetPasswordExpires = undefined; // Clear the token expiration
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
