const express = require("express");
const router = express.Router();

// import validators
const {
  linkCreateValidator,
  linkUpdateValidator
} = require("../validators/link");
const { runValidation } = require("../validators"); // index.js is assumed here

// import from controllers
const {
  requireSignin,
  authMiddleware,
  adminMiddleware,
  canUpdateDeleteLink
} = require("../controllers/auth");
const {
  create,
  list,
  read,
  update,
  remove,
  clickCount,
  popular,
  popularInCategory
} = require("../controllers/link");

// routes
//
// to create a category, the user must be signed in and an admin
router.post(
  "/link",
  linkCreateValidator,
  runValidation,
  requireSignin,
  authMiddleware,
  create
);

// admin protected route for viewing all links
router.post("/links", requireSignin, adminMiddleware, list);

//
router.put("/click-count", clickCount);

// any time we get a request to this endpoint,
// we use the popular controller to return the data
router.get("/link/popular", popular);

router.get("/link/popular/:slug", popularInCategory);

// will get a specific category and read it
router.get("/link/:id", read);

// will update a category
router.put(
  "/link/:id",
  linkUpdateValidator,
  runValidation,
  requireSignin,
  authMiddleware,
  canUpdateDeleteLink,
  update
);

// for admin to update any link
router.put(
  "/link/admin/:id",
  linkUpdateValidator,
  runValidation,
  requireSignin,
  adminMiddleware,
  update
);

// will delete a category - however, 'delete' is a reserved keyword,
// so our controller is called 'remove' instead
router.delete(
  "/link/:id",
  requireSignin,
  authMiddleware,
  canUpdateDeleteLink,
  remove
);

// for admin to delete any link
router.delete("/link/admin/:id", requireSignin, adminMiddleware, remove);

module.exports = router;
