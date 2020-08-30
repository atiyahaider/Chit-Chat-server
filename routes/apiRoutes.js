const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const roomController = require('../controllers/roomController');
const chatController = require('../controllers/chatController');

router.route('/register')
    .post(userController.registerUser)

router.route('/login')
    .get(userController.loginUser)

router.route('/forgotPassword')
    .post(userController.forgotPassword)

router.route('/user')
    .get(authController.isAuthenticated, userController.getUser)

router.route('/reset')
    .post(authController.isAuthenticated, userController.resetPassword)

router.route('/changePassword')
    .put(authController.isAuthenticated, userController.changePassword)

router.route('/rooms')
    .get(authController.isAuthenticated, roomController.getRooms)

router.route('/rooms/join')
    .put(authController.isAuthenticated, roomController.joinRoom)

router.route('/userRooms')
    .get(authController.isAuthenticated, roomController.getUserRooms)

router.route('/chat/:roomId')
    .get(authController.isAuthenticated, chatController.getChats)
    .delete(authController.isAuthenticated, chatController.clearChat)

module.exports = router;    