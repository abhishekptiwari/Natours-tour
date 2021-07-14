const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');
// const { default: validator } = require('validator');

// Describing a Schema
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      // Validator's
      // VIDEO:-5 Time:- 4:46:20 to 4:56:27
      required: [true, 'A tour must have a name'],
      maxlength: [40, 'A tour name must have less or equal then 40 characters'],
      minlength: [10, 'A tour name must have more or equal then 10 characters'],
      // Validation using external library
      // validate: [validator.isAlpha, 'Tour name must only contain characters.'],
      unique: true,
      trim: true,
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'Tour must have a group type'],
    },
    difficulty: {
      type: String,
      // Validator's
      required: [true, 'A tour must have a difficulty1'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either easy,medium or difficult.',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      // Validator's
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10, // 4.66666, 46.6666,47,4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price.'],
    },
    priceDiscount: {
      type: Number,
      // Custom validation
      // VIDEO:-5 Time:- 4:56:30 to 5:10:10
      // This only points to current doc on NEW document creation
      validate: {
        validator: function (val) {
          return val < this.price; //100 < 200
        },
        message: 'Discount price ({VALUE}) should be below the regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a discription'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAtL: {
      type: Date,
      default: Date.now(),
      select: false, // Permanentaly hiding from the output
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.Types.ObjectId,
        // Child Referencing (Guide will know about tour)
        ref: 'User', // Referncing user_model
      },
    ],
    // reviews: [
    //   {
    //     type: mongoose.Schema.ObjectId,
    //     ref: 'Review',
    //   },
    // ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Improves the speed if reading data
// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 }); // 1 Ascending & -1 Descending
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' }); // GeoSpatial Index
/*---------------------------Virtural Properties----------------------*/
// video:-5 Time:4:3:56 to 4:10:19
// Note This property is not the part of database therefore we cannot query it.
tourSchema.virtual('durationWeeks').get(function () {
  // Here we use the regular function because array fxn doesn't have its own this keyword.
  return this.duration / 7;
});

//Virtual Populate
// video:-8 Time:- 1:48:20 to 1:52:00
// This keeps reference of all the parent docs for child
// without actually persisting that information into DB
tourSchema.virtual('reviews', {
  ref: 'Review',
  // Connecting review model to Tour model using ForeignField
  foreignField: 'tour', // reviewModel
  localField: '_id', // tourModel
});

/*---------------------------DOCUMENT MIDDLEWARE----------------------*/
//video:-5 Time:4:10:25 to 4:24:44
// This runs before .save() and .create() but not on .insertMany().
// PRE middleware fxn will be called before an actual document get saved to DB
tourSchema.pre('save', function (next) {
  // console.log(this); // Currently Processed Document
  this.slug = slugify(this.name, { lower: true });
  next();
});

//video:-8 Time:0:52:00 to 0:56:59
/*This embeddes all the tour guides of that tour in it's tour document
But this has a huge drawback becoz if a user changes his name or email
then we have to check if that user is present in any tour and if he is then 
We also need to change his credentials there. (Parent Referencing)
Tours are referencing the tour guides. (tour will know about Guide)
*/
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.pre('save', function (next) {
//   console.log('Will save document...');
//   next();
// });

// POST middlewar function, They are executed after all the pre middleware //fxns are completed.
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

/*---------------------------QUERY MIDDLEWARE----------------------*/
/* video:-5 Time: 4:24:51 to 4:38:40
=> It allows us to run the function before and after a certain query is executed
=> Here this points to current query
=> Note this does not work for findOne to prevent this we need to declare another query middleware for hook findOne,findAndUpdate or findAndDelete*/
tourSchema.pre(/^find/, function (next) {
  // This will work for all the strings that starts with find.
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now(); // Current time in milliseconds
  next();
});

// Populating tour guides
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt', // Excluded in o/p
  });
  next();
});

// This middleware will run after the query has executed
tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query Took: ${Date.now() - this.start} milliseconds.`);
  // console.log(docs);
  next();
});
/*-------------------------AGGREGATION MIDDLEWARE----------------------*/
/*
VIDEO:-5 Time:- 4:38:49 to 4:46:20
=>This allows us to add hook before and after an aggregation happens
=> Here 'this' points to current Aggregation Object
*/
// tourSchema.pre('aggregate', function (next) {
//   // This will not show the docs which contains secretTour: true
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   console.log(this.pipeline());
//   next();
// });
// Creating a model
const Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;

// DATA VALIDATION
// npm install -g puppeteer --unsafe-perm=true --allow-root
