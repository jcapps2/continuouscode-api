const { check } = require("express-validator");

// Validator based on the link schema in models/link.js
exports.linkCreateValidator = [
  check("title")
    .not()
    .isEmpty()
    .withMessage("Title is required"),
  check("url")
    .not()
    .isEmpty()
    .withMessage("URL is required"),
  check("categories")
    .not()
    .isEmpty()
    .withMessage("Pick a category"),
  check("type")
    .not()
    .isEmpty()
    .withMessage("Pick a type: free or paid"),
  check("medium")
    .not()
    .isEmpty()
    .withMessage("Pick a medium: video or book")
];

// same as above for updating a link, but doesn't
// hurt to leave this here and use it to avoid
// potential confusion
exports.linkUpdateValidator = [
  check("title")
    .not()
    .isEmpty()
    .withMessage("Title is required"),
  check("url")
    .not()
    .isEmpty()
    .withMessage("URL is required"),
  check("categories")
    .not()
    .isEmpty()
    .withMessage("Pick a category"),
  check("type")
    .not()
    .isEmpty()
    .withMessage("Pick a type: free or paid"),
  check("medium")
    .not()
    .isEmpty()
    .withMessage("Pick a medium: video or book")
];
