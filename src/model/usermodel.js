const mongoose = require('mongoose');

const schema = mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please add a username'],
        unique: true
    },
    email: {
        type: String,
        required: [true, 'Please add a email'],
        unique: true
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
    },
    role: {
        type: String,
        required: [true, 'Please add a role'],
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
})
module.exports = mongoose.model('User', schema)