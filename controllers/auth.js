const User = require("../models/user"); // importing User model
const Link = require("../models/link"); // link model
const AWS = require("aws-sdk");
const jwt = require("jsonwebtoken");
const expressJwt = require("express-jwt");
const {
  registerEmailParams,
  forgotPasswordEmailParams
} = require("../helpers/email");
const shortId = require("shortid");
const _ = require("lodash");

// Providing AWS credentials
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// LINK TO SES DOCS FOR NODE
// https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/ses-examples-sending-email.html

// Following the docs here
const ses = new AWS.SES({ apiVersion: "2010-12-01" });

// Email a new user after they register, by using SES
exports.register = (req, res) => {
  // console.log("Register controller", req.body);

  // Destructuring off the request body
  const { name, email, password, categories } = req.body;

  // Check if user exists in DB
  //
  // With findOne, as soon as user is found in collection, the execution stops.
  // And exec() allows us to execute a function once/if it is found.
  User.findOne({ email }).exec((error, user) => {
    // if user is found, show an error
    if (user) {
      return res.status(400).json({
        error: "Email is taken"
      });
    }

    // Generate token with username, email, and password
    //
    // JWT_ACCOUNT_ACTIVATION is just random text I made
    //
    // expiresIn can be any amount of time, but 10 minutes is good
    const token = jwt.sign(
      { name, email, password, categories },
      process.env.JWT_ACCOUNT_ACTIVATION,
      {
        expiresIn: "10m"
      }
    );

    // send email using helper - see email.js in helpers folder
    const params = registerEmailParams(email, token);

    // Send email with SES
    const sendEmailOnRegister = ses.sendEmail(params).promise();

    sendEmailOnRegister
      .then(data => {
        console.log("Email submitted to SES", data);
        res.json({
          message: `Email has been sent to ${email}. Follow the instructions to complete your registration.`
        });
      })
      .catch(error => {
        console.log("SES error", error);
        res.json({
          message: `We could not verify your email. Please try again.`
        });
      });
  });
};

exports.registerActivate = (req, res) => {
  // Grab token
  const { token } = req.body;

  // Verify the token
  //
  // First argument is the token the second argument is the secret
  // activation key that was used to generate the initial token.
  // Third argument is a callback function to handle result.
  jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION, function(
    error,
    decoded
  ) {
    // Check for error
    if (error) {
      console.log(error);
      return res.status(401).json({
        error: "Expired link. Try again."
      });
    }

    // Make sure that user is not duplicated. Ensure that email isn't
    // already in the database.
    //
    // Extract properties from valid token.
    const { name, email, password, categories } = jwt.decode(token);
    const username = shortId.generate();

    // Using user model to look through database and make sure user doesn't exist
    User.findOne({ email }).exec((error, user) => {
      if (user) {
        // 401 = unauthorized
        return res.status(401).json({
          error: "Email is taken"
        });
      }

      // Create new user since email is not taken
      const newUser = new User({ username, name, email, password, categories });

      // Saving user to database
      newUser.save((error, result) => {
        if (error) {
          return res.status(401).json({
            error: "Error saving user in database. Try again later."
          });
        }
        // If no error, then return
        return res.json({
          message: "Registration successful. Please login."
        });
      });
    });
  });
};

// Login user
exports.login = (req, res) => {
  // Pull email and password that user is trying to login
  // with off of request body.
  const { email, password } = req.body;

  // Checking db for email that user entered
  User.findOne({ email }).exec((error, user) => {
    // if there is an error, or the user does not exist within the db
    if (error || !user) {
      return res.status(400).json({
        error: "User with that email does not exist. Please sign up."
      });
    }

    // Using authenticate method from User model. Password that is entered
    // by user attempting to login is hashed, and then compared to the
    // hashed password in the database.
    //
    // If password does not match, can't authenticate user
    if (!user.authenticate(password)) {
      return res.status(400).json({
        error: "Email and password do not match"
      });
    }

    // Generate token and send to client
    //
    // _id is field in db, second argument is secret key, and
    // third argument is how long token will last.
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    // Extract info to send to client and store in front end
    const { _id, name, email, role } = user;

    // Send json response with all info to client
    return res.json({
      token,
      user: { _id, name, email, role }
    });
  });
};

// Middleware for jwt
//
// The goal here is to keep unauthenticated users
// from navigating to /user or /admin without even
// having an account.
//
// First argument is the secret, second argument is the algorithm to use.
// Look here for more info: https://bit.ly/3lQmcvs
exports.requireSignin = expressJwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"]
});

// Authentication middleware
//
// next is a callback function
exports.authMiddleware = (req, res, next) => {
  // Grab user id
  const authUserId = req.user._id;

  // Attempt to find user in the database
  User.findOne({ _id: authUserId }).exec((error, user) => {
    if (error || !user) {
      // console.log(error)
      return res.status(400).json({
        error: "User not found"
      });
    }

    // If we're here, we must have a user. Assign that data to
    // a profile. Now anywhere that we use this middleware in
    // our code, we'll have access to the user's data.
    req.profile = user;

    // Execute callback
    next();
  });
};

// Admin middleware
exports.adminMiddleware = (req, res, next) => {
  // Grab user id
  const adminUserId = req.user._id;

  // Attempt to find user in the database
  User.findOne({ _id: adminUserId }).exec((error, user) => {
    if (error || !user) {
      // console.log(error)
      return res.status(400).json({
        error: "User not found"
      });
    }

    // Check if user has the 'admin' role.
    // If they don't deny access
    if (user.role !== "admin") {
      return res.status(400).json({
        error: "Admin resource. Access denied."
      });
    }

    // If we're here, we must have a user. Assign that data to
    // a profile. Now, anywhere that we use this middleware in
    // our code, we'll have access to the user's data.
    req.profile = user;

    // Execute callback
    next();
  });
};

// Will check to see if user exists in the DB via
// a provided email. If so, then we will use AWS SES
// to email that user a reset password link. If not,
// then we do nothing and inform them that the email
// does not exist in our DB.
exports.forgotPassword = (req, res) => {
  const { email } = req.body;

  // Query DB and see if user exists (via their email)
  User.findOne({ email }).exec((error, user) => {
    if (error || !user) {
      return res.status(400).json({
        error: "User with that email does not exist"
      });
    }

    // generate token and email it to the user
    //
    // generating unique token based off of the user's name
    // associated with their provided email (found in the DB),
    // and the jwt password secret; also setting the token (and
    // therefore the link) to expire in 10 minutes.
    const token = jwt.sign(
      { name: user.name },
      process.env.JWT_RESET_PASSWORD,
      { expiresIn: "10m" }
    );

    // send email using helper - see email.js in helpers folder
    const params = forgotPasswordEmailParams(email, token);

    // populate the DB > user > resetPasswordLink
    //
    // then return either a success, or error message
    return user.updateOne({ resetPasswordLink: token }, (error, success) => {
      if (error) {
        return res.status(400).json({
          error: "Password reset failed. Try again later."
        });
      }

      // since no error, send email to user using AWS SES
      const sendEmail = ses.sendEmail(params).promise();
      sendEmail
        .then(data => {
          console.log("ses reset pw success", data);
          return res.json({
            message: `Email has been sent to ${email}. Click on the link to reset your password.`
          });
        })
        .catch(error => {
          console.log("ses reset pw failed", error);
          return res.json({
            message: `We could not verify your email. Try again later.`
          });
        });
    });
  });
};

exports.resetPassword = (req, res) => {
  const { resetPasswordLink, newPassword } = req.body;

  // if we have the resetPasswordLink, find the associated
  // user in the DB
  if (resetPasswordLink) {
    // check for token expiration (10 minutes after creation)
    //
    // passing token (resetPasswordLink) and the secret used
    // in its creation, in order to verify
    jwt.verify(
      resetPasswordLink,
      process.env.JWT_RESET_PASSWORD,
      (error, success) => {
        // check for error
        if (error) {
          return res.status(400).json({
            error: "Expired link. Try again."
          });
        }

        // if no error, then find resetPasswordLink in the DB, and
        // immediately execute function to check for an error, and
        // if no error is found then update the password in the DB
        User.findOne({ resetPasswordLink }).exec((error, user) => {
          // if we encounter an error, or their is no
          // associated user in the DB, throw the following error
          if (error || !user) {
            return res.status(400).json({
              error: "Invalid token. Try again."
            });
          }

          // update fields with the new password
          // and empty out the token used for the reset link
          const updatedFields = {
            password: newPassword,
            resetPasswordLink: ""
          };

          // using lodash to merger existing user with its updated fields
          user = _.extend(user, updatedFields);

          // save user back to DB
          user.save((error, result) => {
            // check for error
            if (error) {
              return res.status(400).json({
                error: "Password reset failed. Try again."
              });
            }

            // send success message
            res.json({
              message: "Great! Now you can login with your new password."
            });
          });
        });
      }
    );
  }
};

// middleware for user update/delete route
exports.canUpdateDeleteLink = (req, res, next) => {
  const { id } = req.params;
  Link.findOne({ _id: id }).exec((error, data) => {
    if (error) {
      return res.status(400).json({
        error: "Could not find link"
      });
    }

    let authorizedUser =
      data.postedBy._id.toString() === req.user._id.toString();

    // check if user is authorized for the action
    if (!authorizedUser) {
      return res.status(400).json({
        error: "You are not authorized"
      });
    }

    // perform next function (on the route) if the user is authorized
    next();
  });
};
