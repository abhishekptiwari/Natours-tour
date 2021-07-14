const mongoose = require('mongoose');
const dotenv = require('dotenv');

/*-------------------------UNCAUCHT EXCEPTION-------------------------*/
//Catching Uncaught Exceptions
//Video:- 6 Time:- 2:00:25 to 2:09:30
process.on('uncaughtException', (err) => {
  console.log(' UNCAUCHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({
  path: './config.env',
});
const app = require('./app');

// Changing the password
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

//Establishing Connection
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => {
    // console.log(conn.connections);
    console.log('DB connection Successful');
  });

// console.log(process.env);
// App starts from here!!!
const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
/*-------------------------UNHANDLED REJECTION-------------------------*/
// Errors Outside Express: UNHandled Rejections
//Video:-6 Time: 1:51:37 to 2:00:16
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log(' UNHANDLED REJECTION! 💥 Shutting down...');
  server.close(() => {
    process.exit(1);
  });
  //process.exit(0):- Success
  //process.exit(1):- Uncalled Exception
});

/*
 =>  Mongoose Model
 In order to create documents using it and also to perform CRUD operation on these documents.
 In order to create model we need a schema
 We use schema to describe our data to set default values, use to validate the data and all the stuff like that.
 */
