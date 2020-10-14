const { check } = require("express-validator");

// Array of the fields we want to check
exports.userRegisterValidator = [
  check("name")
    .not()
    .isEmpty()
    .withMessage("Name is required"),
  check("email")
    .isEmail()
    .withMessage("Must be a valid email address"),
  check("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  check("categories")
    .isLength({ min: 6 })
    .withMessage("Pick at least one category")
];

// Validate user login
exports.userLoginValidator = [
  check("email")
    .isEmail()
    .withMessage("Must be a valid email address"),
  check("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
];

// Validate that email exists in DB so we can reset user password
exports.forgotPasswordValidator = [
  check("email")
    .isEmail()
    .withMessage("Must be a valid email address")
];

// Validate that we have a token so user can reset password
exports.resetPasswordValidator = [
  check("newPassword")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  check("resetPasswordLink")
    .not()
    .isEmpty()
    .withMessage("Token is required")
];

//
exports.userUpdateValidator = [
  check("name")
    .not()
    .isEmpty()
    .withMessage("Name is required")
];
