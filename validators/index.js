const { validationResult } = require("express-validator");

// next is a callback
exports.runValidation = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // unprocessable entity
    return res.status(422).json({
      error: errors.array()[0].msg // grab first error message in array of errors
    });
  }

  // Callback function
  next();
};
