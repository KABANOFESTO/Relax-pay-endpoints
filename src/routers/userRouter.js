const express = require("express");
const { signup, login,resetPassword, requestPasswordReset,getUsers, deleteUser} = require('../Controller/userController');
const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);

router.post('/request-reset-password', requestPasswordReset);
router.post('/reset-password', resetPassword);


router.get('/users', getUsers);
router.delete('/users/:id', deleteUser);

module.exports = router