const express = require('express');

// Importing the controller function
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { route } = require('./viewRoutes');
// const reviewController = require('../controllers/reviewController');

// Defining a router
const router = express.Router();
// Creating new User(2)
//Video:-7 Time:-0:11:14 to 0:22:30
router.post('/signup', authController.signUp);
// logging Users(6)
// video:- 7 Time:- 1:05:47
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// This will protect all the routes below this line.
// Becoz middleware runs in sequence.
router.use(authController.protect);
// This router is specifically for updating password.
router.patch('/updateMyPassword', authController.updatePassword);
// About me of a logged in user
router.get('/me', userController.getMe, userController.getUser);
// This route for updating name and email not the password of user.
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);
router.delete('/deleteMe', authController.protect, userController.deleteMe);

/*----------------Admin Area-------------------*/
router.use(authController.restrictTo('admin'));
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
