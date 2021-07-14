const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

// Diff parameters can be accessed in diff routes(url)
const router = express.Router({ mergeParams: true });

// video:-8 Time:- 1:26:45 to 1:28:25
// GET /tour/245684/reviews
// Post /reviews

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.protect,
    authController.restrictTo('user', 'admin'),
    reviewController.setTourUserIds,
    reviewController.createReview,
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .delete(
    authController.protect,
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview,
  )
  .patch(reviewController.updateReview);

module.exports = router;
