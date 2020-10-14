const User = require("../models/user");
const Link = require("../models/link");

exports.read = (req, res) => {
  // find user based on id
  User.findOne({ _id: req.user._id }).exec((error, user) => {
    if (error) {
      return res.status(400).json({
        error: "User not found"
      });
    }

    // find all links posted by the user
    Link.find({ postedBy: user })
      .populate("categories", "name slug")
      .populate("postedBy", "name")
      .sort({ createdAt: -1 })
      .exec((error, links) => {
        if (error) {
          return res.status(400).json({
            error: "There are no links associated with this user"
          });
        }

        // we don't need these values in the user's profile
        // that we have within the browser
        user.hashed_password = undefined;
        user.salt = undefined;

        // return user and links that are associated
        res.json({ user, links });
      });
  });
};

//
exports.update = (req, res) => {
  const { name, password, categories } = req.body;

  // check password length
  switch (true) {
    case password && password.length < 6:
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
      break;
  }

  //
  User.findOneAndUpdate(
    { _id: req.user._id },
    { name, password, categories },
    { new: true }
  ).exec((error, updated) => {
    if (error) {
      return res.status(400).json({
        error: "Could not find user to update"
      });
    }

    // we don't want to send the hashed password or the salt
    updated.hashed_password = undefined;
    updated.salt = undefined;

    // return updated user
    res.json(updated);
  });
};
