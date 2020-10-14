const express = require("express");
const router = express.Router();

// import validators
const {
  categoryCreateValidator,
  categoryUpdateValidator
} = require("../validators/category");
const { runValidation } = require("../validators"); // index.js is assumed here

// import from controllers
const { requireSignin, adminMiddleware } = require("../controllers/auth");
const {
  create,
  list,
  read,
  update,
  remove
} = require("../controllers/category");

// routes
//
// to create a category, the user must be signed in and an admin
router.post(
  "/category",
  categoryCreateValidator,
  runValidation,
  requireSignin,
  adminMiddleware,
  create
);

// will be a public view that lists each category
router.get("/categories", list);

// will get a specific category and read it
router.post("/category/:slug", read);

// will update a category
router.put(
  "/category/:slug",
  categoryUpdateValidator,
  runValidation,
  requireSignin,
  adminMiddleware,
  update
);

// will delete a category - however, 'delete' is a reserved keyword,
// so our controller is called 'remove' instead
router.delete("/category/:slug", requireSignin, adminMiddleware, remove);

module.exports = router;
