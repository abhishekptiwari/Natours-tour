const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerfactory');

// The uploaded image will be stored on this path
// With the given protocols
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1]; // For jpeg extension
//     // user-userId-timestamp.jpg // It prevents same file name
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`); // Final file name
//   },
// });

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
exports.uploadUserPhoto = upload.single('photo');
// Resizing the image
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next(); // If no imgae the go to next middleware
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  // Image Processing
  await sharp(req.file.buffer)
    .resize(500, 500) // Fixed Size
    .toFormat('jpeg') // Convert to .jpeg
    .jpeg({ quality: 90 }) // Saving path
    .toFile(`public/img/users/${req.file.filename}`);
  next();
});

// Route Handler's (Factory Functions)
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
// Do not update password with this.
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);

//3. Filtering out unwanted field names that are not allowed to be updated
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// Middleware function for.
// Setting the id in params as id of logged in user
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};
// Updating name and email of user not the password
// video:-7 Time:-4:10:00 to 4:20:20
exports.updateMe = catchAsync(async (req, res, next) => {
  // console.log(req.file);
  // console.log(req.body);
  //1. Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates, Please use /updateMyPassword',
        400,
      ),
    );
  }

  //3. Filtering out unwanted field names that are not allowed to be updated
  // body.role = admin "This should not be allowed while updating"
  const filterBody = filterObj(req.body, 'name', 'email');
  if (req.file) filterBody.photo = req.file.filename;

  //3. Update the document.
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filterBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// Ignore this route
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route has not been defined yet. Please use signup instead.',
  });
};
//Deleting the current User
// video:-7 Time:-4:30:20 to  4:38:56
// This will not remove the user from the database we will the de-activate the user account,
// So he won't be able to access any of the features of our natours app.
// In future if he wants his account back we will activate it's account.
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({
    status: 'success',
    data: null,
  });
});
