const AppError = require('../utils/appError');
/*
Error's in development v/s production
video:-6 Time: to 1:27:16
*/

// Error For Development Mode(For Developer)
const sendErrorDev = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  //B) RENDERED WEBSITE
  console.error('Error 💥 ', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something  went wrong!',
    msg: err.message,
  });
};
// Error For Production Mode(For end User)
const sendErrorProd = (err, req, res) => {
  //A) API
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      //A) Operational, Trusted error: Send message to client
      return res.status(err.statusCode).json({
        // stack: err.stack,
        status: err.status,
        message: err.message,
      });
    }
    //B) Programming/other unknown error: don't leak error details to client
    // 1) Log error(for developer)
    console.error('Error 💥 ', err);
    // 2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: "Oop's something went wrong!",
    });
  }
  // B) RENDERED WEBSITE
  // A) Operational, Trusted error: Send message to client
  if (err.isOperational) {
    console.error('Error 💥 ', err);
    return res.status(err.statusCode).render('error', {
      title: 'Something  went wrong!',
      msg: err.message,
    });
  }
  //B) Programming/other unknown error: don't leak error details to client
  // 1) Log error(for developer)
  console.error('Error 💥 ', err);
  // 2) Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something  went wrong!',
    msg: 'Please try again later.',
  });
};

// Handling Invalid Database ID's
//Video:- 6 Time:- 1:27:22 to 1:36:26
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

// Handling Duplicate DB fields
// Video:-6 Time: 1:37:07 to 1:43:03
const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  console.log(value);
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

// Handling Mongoose  validation Error
// Video:- 6 Time:-1:43:05 to 1:51:27
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid Input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Protecting Tours Routes Part-2(8)
// video:-7 Time:- 1:47:17 to 2:22:27
const handleJWTError = () =>
  new AppError('Invalid Token. Please Log in again', 401);
const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please login again.', 401);

module.exports = (err, req, res, next) => {
  //   console.log(err.stack);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    // console.log(err.message);  // There is no tour with that name
    // console.log(error.message);  // There is no tour with that name
    sendErrorProd(error, req, res);
  }
};
