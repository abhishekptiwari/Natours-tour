const Review = require('../models/reviewModel');
const factory = require('./handlerfactory');

// Routes handler functions
exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);

// Middleware fxn for creating new Reviews.
exports.setTourUserIds = (req, res, next) => {
  // Allow nested Routes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};
// Creating new review using handler function.
exports.createReview = factory.createOne(Review);

/*
Factory Funtion: A funtion that returns another function for the given condition.
*/
