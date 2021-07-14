// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/account/apikeys
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerfactory');
// const AppError = require('../utils/appError');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  //1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);
  console.log(tour);

  //2) Create checkout sessions
  const session = await stripe.checkout.sessions.create({
    // Information about the session
    payment_method_types: ['card'],
    // This is not safe
    success_url: `${req.protocol}://${req.get('host')}/?tour=${
      req.params.tourId
    }&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourID,
    // Information about the product that the user is about to purchase
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
        amount: tour.price * 75,
        currency: 'inr',
        quantity: 1,
      },
    ],
  });

  //3) Create session as response(Send It to client)
  res.status(200).json({
    status: 'success',
    session,
  });
});

/*
=> Don’t rely on the redirect to the success_url alone for fulfilling purchases, as:
--> Malicious users could directly access the success_url without paying and gain access to your goods or services.
--> Customers may not always reach the success_url after a successful payment. It is possible they close their browser tab before the redirect occurs.
*/
// When the checkout was successful
// Time: 3:23:05 TO 3:25:52
exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  // This is only temporary, becoz it's UNSECURED: Everyone can make bookings without saving
  const { tour, user, price } = req.query;
  if (!tour && !user && !price) return next();
  await Booking.create({ tour, user, price });
  res.redirect(req.originalUrl.split('?')[0]); //${req.protocol}://${req.get('host')}/
});

exports.createBooking = factory.createOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBooking = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
