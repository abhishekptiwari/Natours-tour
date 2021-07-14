const crypto = require('crypto');
const mongoose = require('mongoose');
const { default: validator } = require('validator');
const bcrypt = require('bcryptjs');
// Authentication, Authorization and Security
//Modelling Users(1) (Creating User Schema)
// video:- 7 Time: 0:01:16 to 0:11:10
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name.'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide your Email.'],
    lowercase: true,
    unique: true,
    trim: true,
    validate: [validator.isEmail, 'Invalid email'],
  },
  photo: { type: String, default: 'default.jpg' },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password.'],
    minlength: [8, 'A password must have atleast 8 characters.'],
    trim: true,
    select: false, // This will be excluded from o/p
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password.'],
    validate: {
      //This only works on .create() .save()!!
      validator: function (el) {
        return el === this.password; // abc === abc (true)
      },
      message: 'Passwords are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

//Managing Password(3) (Password Encryption)
//Video:- 7 Time:0:22:35 to 0:40:52
userSchema.pre('save', async function (next) {
  // Only run this fxn if pass was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password  with cost of 12(salt)
  this.password = await bcrypt.hash(this.password, 12);

  // Deleting the passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

//3. Update changePasswordAt property for the user
//video:-7 Time:- 3:45:10 to 3:48:10
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Give the Active user's
//video:-7 Time:- 4:35:10 to 4:37:04
userSchema.pre(/^find/, function (next) {
  // this points to the current query
  // This will give us the user in which active:true.
  // Means The user which are not deleted itself.
  this.find({ active: { $ne: false } });
  next();
});

// Instance Method (For checking the valid password entered by user)
userSchema.methods.correctPassword = async function (candidatePass, UserPass) {
  return await bcrypt.compare(candidatePass, UserPass);
};

// Instance Method(For Protecting Route Part 2)
// Video:-7 Time:2:07:20 To 2:22:27
userSchema.methods.changePasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp; // 100 < 200 == True
  }
  // False == Not Changed
  return false;
};

//Instance method (for Password reset Token)
// video:-7 Time:2:54:50 to
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  console.log({ resetToken }, this.passwordResetToken);
  // {
  // The token got by user in his/her email (resetToken)
  //   resetToken: 'c27fbf670ddf69bd19a37b7ec488cc54e5927a18365ddaa8f09c72cd68e6f102'
  // } Token: IN DB (this.passwordResetToken)
  // cd7b281d08a6dcb89522d72cf1921726a613a1b86622b3e83ae95601cd5e2f8d
  // Expiry time for token
  this.passwordResetExpires = Date.now() + 10 * 60 * 100;
  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;

/*
=> Hash === Encryption
=> Authorization:- It's verifying if a certain user has a rights to interact with a certain resource.
i.e Checking if a user is allowed to access a certain resource even if he is logged in.
=> Documents are instances of a model
-------------------------------------------------------------------------
Rate Limiter:- This will count the number of request comming from one IP
and then when they had to many request comming from the same IP it will 
automatically block these requests.
So it make sense to implement this in the global middleware.
-------------------------------------------------------------------------
DATA SANITIZATION: This means cleaning all the data that comes into the aplication form malicious code.
So code that is trying to attack our application.
*/
