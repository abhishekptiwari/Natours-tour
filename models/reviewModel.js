// Review / rating / ref to tour / ref to user
const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'A review cannot be empty!'],
      trim: true,
    },
    rating: { type: Number, min: 1, max: 5 },
    createdAt: { type: Date, default: Date.now },
    tour: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user.'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);
// Removing Duplicate reviews
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  //   this.populate({
  //     path: 'tour',
  //     select: 'name',
  //   }).populate({
  //     path: 'user',
  //     sekect: 'name photo',
  //   });

  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

// Calculating RatingAverage on newReview creation
reviewSchema.statics.calcAvgRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 }, // Total no. of ratings
        avgRating: { $avg: '$rating' }, // Avg Rating of a tour
      },
    },
  ]);
  // console.log(stats);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    // Setting Default rating
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  // This points to current review
  // This will not works becoz Rating is defined after this middlerware
  // Review.calcAvgRatings(this,tour);
  // This will work bcoz this.constructor === Review(Cur Model)
  this.constructor.calcAvgRatings(this.tour);
});

// Calculating RatingsAverage after deleting or updating a tour
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // findByIdAndDelete
  // findByIdAndUpdate
  // Here we are retreving the current document
  this.rev = await this.findOne();
  // console.log(this.rev);
  next();
});
/*
In order to run this on update and delete we need to use the query middleware for these situations 
In this middleware we do not have direct access to the current document so we need to go around that by
using this findOne() above so basically retreving the current document from the database. We then store it on the current
query variable and by doing that we then get access to it in the post middleware.
*/
reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne(); // Does not work here, query has already executed.
  await this.rev.constructor.calcAvgRatings(this.rev.tour);
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
