const { check } = require("express-validator");

// Validator based on the category schema in models/category.js
exports.categoryCreateValidator = [
  check("name")
    .not()
    .isEmpty()
    .withMessage("Name is required"),
  check("image")
    .not()
    .isEmpty()
    .withMessage("Image is required"),
  check("content")
    .isLength({ min: 20 })
    .withMessage(
      "Content is required and should be at least 20 characters long"
    )
];

// Validator for updating a category
exports.categoryUpdateValidator = [
  check("name")
    .not()
    .isEmpty()
    .withMessage("Name is required"),
  check("content")
    .isLength({ min: 20 })
    .withMessage("More content is required")
];
