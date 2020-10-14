const express = require("express");

// Invoking Express Router so we can use
// get, post etc.
const router = express.Router();

// import validators
const {
  userRegisterValidator,
  userLoginValidator,
  forgotPasswordValidator,
  resetPasswordValidator
} = require("../validators/auth");
const { runValidation } = require("../validators"); // index.js is assumed here

// import from controllers
const {
  register,
  registerActivate,
  login,
  requireSignin,
  forgotPassword,
  resetPassword
} = require("../controllers/auth");

// Apply the array of checks from userRegisterValidator, and then
// runValidation handles those checks. If the validation passes, then
// the code in register will execute. Otherwise, if it doesn't, the code
// will not even reach register because an error will be returned
router.post("/register", userRegisterValidator, runValidation, register);

// For activating a new user's account
router.post("/register/activate", registerActivate);

// Run validator for user login
router.post("/login", userLoginValidator, runValidation, login);

// Run validator for forgot password
router.put(
  "/forgot-password",
  forgotPasswordValidator,
  runValidation,
  forgotPassword
);

// Run validator for reset password
router.put(
  "/reset-password",
  resetPasswordValidator,
  runValidation,
  resetPassword
);

// Secret endpoint demonstrating requireSignin middleware
// router.get("/secret", requireSignin, (req, res) => {
//   res.json({
//     data: "This is a secret page for logged in users only"
//   });
// });

module.exports = router;
