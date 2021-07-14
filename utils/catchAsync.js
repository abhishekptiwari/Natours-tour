// Catching Errors in Async Functions
//Video:-6 Time:0:52:53 to 01:07:40
module.exports = (fn) => {
  return (req, res, next) => {
    //If an error occured while creating a new Tour then that error will be catched here
    // fn(req, res, next).catch((err) => next(err));
    fn(req, res, next).catch(next);
  };
};
