const express = require('express');
const authrouter = express.Router();
const authController = require('../controllers/auth');
const User = require('../models/user');
const { check, body } = require('express-validator');

authrouter.get('/login', authController.getLogin);
authrouter.get('/signup', authController.getSignup);
authrouter.post(
    '/login',
    [
        body('email')
            .isEmail()
            .withMessage('Enter A Valid Email')
            .normalizeEmail(),
        body(
            'password',
            'Password is too short'
        )
            .isLength({ min: 6 })
            .trim()
    ],
    authController.postLogin);
authrouter.post(
    '/signup',
    [
        check('email')
            .isEmail()
            .withMessage('Enter a Valid E-mail please')
            .custom((value, { req }) => {
                return User.findOne({ email: value }).then(userdoc => {
                    if (userdoc) {
                        return Promise.reject('This Email Already Exists, Try A Different One.');
                    }
                });
            })
            .normalizeEmail(),
        body(
            'password',
            'Enter a password with 6 charachters at least'
        )
            .isLength({ min: 6 })
            .trim(),
        body('confirmPassword').custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords does not match');
            }
            return true;
        }).trim()
    ],
    authController.postSignup
);
authrouter.post('/logout', authController.postLogout);
authrouter.get('/reset', authController.getResetPassword);
authrouter.post('/reset', authController.postResetPassword);
authrouter.get('/reset/:token', authController.getNewPassword);
authrouter.post('/new-password', authController.postNewPassword);


module.exports = authrouter;