const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerfactory');
const AppError = require('../utils/appError');
// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );

// Here the img will be stored as buffer.
const multerStorage = multer.memoryStorage();

//This fxn checks the uploaded file is img or not
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true); // No error, image file
  } else {
    // Error , not an image file
    cb(new AppError('Not an image! Please upload only images', 400), false);
  }
};
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
exports.uploadTourImages = upload.fields([
  // CoverImage + Images
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);
// upload.single('image') //req.file
// upload.array('images', 5) //req.files (No cover Image)

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  // console.log(req.files);
  if (!req.files.imageCover || !req.files.images) return next();
  // CoverImage
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

  // CoverImage Processing
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333) // Fixed Size
    .toFormat('jpeg') // Convert to .jpeg
    .jpeg({ quality: 90 }) // Saving path
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // Images
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      // Image Processing
      await sharp(file.buffer)
        .resize(2000, 1333) // Fixed Size
        .toFormat('jpeg') // Convert to .jpeg
        .jpeg({ quality: 90 }) // Saving path
        .toFile(`public/img/tours/${filename}`);
      // Array of three images
      req.body.images.push(filename);
    }),
  );
  // console.log(req.body);
  next();
});

// Route Handler's(For sending responses)
// Middleware for top-5-cheap
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};
// Getting All tour with populateOptions
exports.getAllTours = factory.getAll(Tour);
// Getting tour with populateOptions
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
// Creating a new tour.
exports.createTour = factory.createOne(Tour);
// Updating the tour using id.
exports.updateTour = factory.updateOne(Tour);
// deletating the tour using id.
exports.deleteTour = factory.deleteOne(Tour);

// Aggregation Pipeline
exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        // _id: '$ratingsAverage',
        numTours: { $sum: 1 }, // Adding 1 for each document
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 }, // 1 == Ascending
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } },
    // },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

// Aggregration Pipeline: un-winding and Projecting
// Real Business Problem vid:-5 Time:- 3:44:25 to 4:03:40
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; //2021
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`), // First day of year
          $lte: new Date(`${year}-12-31`), // Last day of year
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        // Num of tours in a particular month
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      // The _id will not be displayed using this stage
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { numTourStarts: -1 }, // -1 for Descending
    },
    {
      $limit: 12, // 12 Tour Per page
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

/*--------------GEOSPATIAL DATA-------------------*/
// /tours-within/:distance/center/:latlon/:unit
// /tours-within/233/center/34.111745, -118.113491/unit/m1
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlon, unit } = req.params;
  const [lat, lon] = latlon.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  if (!lat || !lon) {
    next(
      new AppError(
        'Please Provide latitude and longitude in the format lat,lon',
        400,
      ),
    );
  }
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lon, lat], radius] } },
  });
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

// Calculation all the distances of the tour from the users location
exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlon, unit } = req.params;
  const [lat, lon] = latlon.split(',');
  const multiplier = unit === 'mi' ? 0.000621671 : 0.001;
  if (!lat || !lon) {
    next(
      new AppError(
        'Please Provide latitude and longitude in the format lat,lon',
        400,
      ),
    );
  }
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          Type: 'Point',
          coordinates: [lon * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
