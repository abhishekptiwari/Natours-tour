const crypto = require('crypto');
const { promisify } = require('util'); // For promisifying a method.
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError'); // Global Error-Handler
const Email = require('../utils/email'); // Global Error-Handler

// Creating JWT signin token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// video:-7 Times:- 4:00:30 to 4:02:00
// video:-7 Times:- 4:50:05 to 4:56:05 (Upgrading)
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date( // Expiry Date of cookie
      // Converting to milliseconds
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    // Uing this the cookie will be only sent to the encrypted connection
    // i.e on https
    // secure: true, // (Only for Production application)
    // Using this the cookie cannot be accessed or modified by browser in any way.
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);
  // Remove the password from the o/p
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

// Signing Up Users(5)
// video:- 7 Time:- 0:49:43 to 1:05:40
exports.signUp = catchAsync(async (req, res, next) => {
  // const newUser = await User.create(res.body);  // User can become admin
  const newUser = await User.create({
    // Here user cannot become admin becoz only these 4 options are available
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

// logging Users(6)
// video:- 7 Time:- 1:05:47 to 1:32:16
exports.login = catchAsync(async (req, res, next) => {
  // res.set('Access-Control-Allow-Origin', '*');

  const { email, password } = req.body;

  //1. Check if email and password actually exists
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 404));
  }
  //2. Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');
  // console.log(user);
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect Email or Password.', 401));
  }
  //3. Is everything okay, send the token to client
  // Here the user._id is payload. Which is secret.
  createSendToken(user, 200, res); // OR
  // const token = signToken(user._id);
  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });
});

// Protecting Tours Routes Part-1(7)
// video:-7 Time:- 1:32:23 to 1:47:13
// Protecting Tours Routes Part-2(8)
// video:-7 Time:- 1:47:13 to 2:22:27
exports.protect = catchAsync(async (req, res, next) => {
  //1. Getting token and check if it's there.
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  console.log(token);

  if (!token) {
    return next(
      new AppError('You are not logged In! Please login to get acesss.', 401),
    );
  }
  //2. Validate the token (Verification!)
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //This will give the object which contains id of user & the Time-Stamp
  console.log(decoded);
  //3. Check if user still exists.
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exists',
        401,
      ),
    );
  }
  //4. Check if user changed password after the token was issued.
  // iat = Issued At
  if (currentUser.changePasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please login again.', 401),
    );
  }
  // Grant Access to Protected Route:
  // This means the user has passed all the situations and is a loyal user
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// video:- 09 Time: 3:29:42 to 3:34:19
// Only for rendered pages, no errors
exports.isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      //1. Validate the token (Verification!)
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );
      //This will give the object which contains id of user & the Time-Stamp
      console.log(decoded);

      //2. Check if user still exists.
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      //3. Check if user changed password after the token was issued.
      // iat = Issued At
      if (currentUser.changePasswordAfter(decoded.iat)) {
        return next();
      }
      // THERE IS A LOGGED IN USER
      // Every pug template have access to res.locals var
      res.locals.user = currentUser;
      return next();
    }
  } catch (error) {
    return next();
  }
  // This next means there is no logged in user.
  next();
};

// video:- 09 Time: 4:17:24 t0 4:20:10
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httponly: true,
  });
  res.status(200).json({ status: 'success' });
};

// Authorization: USER ROLES AND PERMISSION
// video:-7 Time:- 2:34:11 to 2:49:58
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //1. Roles is an array ~ ['admin', 'lead-guide'] = Allowed To delete Tour.
    //2. Roles = ['user'] Not allowed To delete Tour.
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403),
      );
    }
    next();
  };
};

//Password Reset Funtionality: RESET TOKEN(10A)
// video:-7 Time:- 2:50:02 to 3:07:02
exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1. Get user based on POSTed email.
  const user = await User.findOne({ email: req.body.email });
  if (!user)
    return next(new AppError('There is no user with that email address.', 404));

  //2. Generate the random token.
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // Don't know

  //3. Send it back as a email.
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host',
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500,
      ),
    );
  }
});

// Password Reset Funtionality: SETTING NEW PASSWORD(10C)
// video:-7 Time:- 3:30:07 to 3:51:39
exports.resetPassword = catchAsync(async (req, res, next) => {
  //1. Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    // Checking if the token has not yet Expired
    passwordResetExpires: { $gt: Date.now() },
  });
  //2. If token has not expired , and there is a user, set the new password.
  if (!user) {
    return next(new AppError('Token is invalid or Expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  //3. Update changePasswordAt property for the user
  // Written in the userModel by .pre()
  //4. Log the user in send JWT
  createSendToken(user, 200, res); // OR
  // const token = signToken(user._id);
  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });
});

//Updating the Current User Password
// video:-7 Time:- 3:51:39 to 4:08:15
exports.updatePassword = catchAsync(async (req, res, next) => {
  //1. Get the user from collection.
  const user = await User.findById(req.user.id).select('+password');

  //2.Check if POSTed current password is correct.
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current Password is wrong.', 401));
  }
  //3. If so, update password.
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  /*
  This time we do not turn off the validationn because we want the validation to happen 
  i.e we want to check if the passwordConfirm is same as the password user has entered.
  Thats y we user user.save(), not user.save({ { validateBeforeSave: false }})
  */

  //4. Log user in, send jwt.
  createSendToken(user, 200, res);
});

/*
=> Documents are instances of a model
=> FOr changing the password we always need to ask for the current password
before changing the password, so  no one eles can change your password only you can.
=> A cookie is just a small peice of text that the server can send to the client.
Then when the client recieves the cookie then it automatically gets stored and 
then automatically send back along with all the future request to the same server.
*/
