const { createUserSchema, loginUserSchema } = require('../support/validation');
const User = require('../model/usermodel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const passport = require("passport");

// Define the generateToken function outside of the route handlers
const generateToken = (id) => {
    return jwt.sign({ id }, "my-token-secret", { expiresIn: '30d' });
};

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

module.exports = { signup, login };
