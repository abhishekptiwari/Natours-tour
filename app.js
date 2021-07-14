// Global Middleware Controller
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const ratelimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
  );
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, PUT, PATCH, POST, DELETE');
    // return res.status(200).json({});
  }
  next();
});

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
//1.Globsl MIDDLEWARE
//middleware:- It's a function that can modify the incomming request data
// Set Security HTTP Headers.

// Serving Static Files
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));
app.use(helmet());

// Development Logging
// console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// For limiting the request from same API.
// Ratelimit is a function which takes a set of options
const limiter = ratelimit({
  // 100 request from same IP in 1hr
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, Please try again in an hour!',
});
app.use('/api', limiter);

// Body Parser, reading data from body into req.body
app.use(
  express.json({
    limit: '10kb',
  }),
);
// Cookie Parser (Parses the data from cookie)
app.use(cookieParser());
// Parser for updating user from res body(From Account Page)
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// DATA SANITIZATION: 1) against NoSQL query injection
/*
Using mongoSanitize will remove and filterout all the $ sign and dot
It also looks at the req.queryString, req.body, and req.params
{
  // Now this will not work
	"email":{"$gt":""},
	"password":"pass12345"
}
*/
app.use(mongoSanitize());

// DATA SANITIZATION: 2) against  XSS (Cross-Side Scripting Attacks)
// This will clean any user i/p from malicious code;
app.use(xss());

// Prevent's Parameter Pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// It's of no use It's Just for Demonstration
app.use((req, res, next) => {
  console.log('Hello from the middleware🙂😃');
  next();
});

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  // console.log(req.cookies);
  next();
});
//3. ROUTES (Mounting)

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// Handling Unhandled Routes

//4. Start the server
//Video:-6 Time:0:21:10 to 0:29:00
// .all() stands for all the http methods & * star stands for all the url's
// This route will execute only if the above two routes are failed to execute the query.
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handling Mechanism
//Video:-6 Time:0:32:00 to 0:41:33
app.use(globalErrorHandler);

// https://dog.ceo/api/breeds/image/random
/*
Whenever we pass something into next() it will assume that it is an error
and it will then skip all the other middleware in the middleware stact and send the error that we passed in to the global Error Handling Middleware, which will then of course be executed.
*/

module.exports = app;
