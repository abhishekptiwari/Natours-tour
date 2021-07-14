const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// Factory Function for deleting.
exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      // If there is no tour found then run this error
      return next(new AppError('No tour found with that ID', 404));
    }
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

// Factory function for Updating.
exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true, // Checking or validators
    });

    if (!doc) {
      // If there is no tour then run this error
      return next(new AppError('No tour found with that ID', 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        // tour: tour, //or both are same
        data: doc,
      },
    });
  });

// Factory function for Creating
exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    // If there is populate then populate it if not then just directly await it
    if (populateOptions) query = query.populate(populateOptions);
    const doc = await query;
    // console.log(req.params);
    if (!doc) {
      // If there is no tour then run this error
      return next(new AppError(`No ${doc} found with that ID`, 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    console.log(req.query); //Entered url
    // TO allow for nested GET reviews on tour(hack)
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    // Execute QUERY
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    // const doc = await features.query.explain()
    const doc = await features.query;
    // Send the response
    res.status(200).json({
      status: 'success',
      // requestedAt: req.requestTime,
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });
