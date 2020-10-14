const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;
const crypto = require("crypto"); // native node method

// User schema
//
// Will automatically generate username for the user.
//
// Must hash password, and will save only the hashed version in DB.
//
// salt deals with the strength of the hash for the password.
//
// Will have role-based users - admin and subscriber.
//
// By default, resetPasswordLink will be empty.
//
// Second argument, timestamps set to true will automatically give createdAt and updatedAt fields.
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      trim: true,
      required: true,
      max: 12,
      unique: true,
      index: true,
      lowercase: true
    },
    name: {
      type: String,
      trim: true,
      required: true,
      max: 32
    },
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      lowercase: true
    },
    hashed_password: {
      type: String,
      required: true
    },
    salt: String,
    role: {
      type: String,
      default: "subscriber"
    },
    resetPasswordLink: {
      data: String,
      default: ""
    },
    categories: [
      {
        type: ObjectId,
        ref: "Category",
        required: true
      }
    ]
  },
  { timestamps: true }
);

// Virtual fields - not persisted in the DB, but needs to exist temporarily for
// an operation to be performed (like middleware)
userSchema
  .virtual("password")
  .set(function(password) {
    // create temp variable called _password
    this._password = password;
    // generate salt
    this.salt = this.makeSalt();
    // encrypt password
    this.hashed_password = this.encryptPassword(password);
  })
  .get(function(password) {
    return this._password;
  });

// methods > authenticate, encryptPassword, makeSalt
userSchema.methods = {
  authenticate: function(plainText) {
    // In order to authenticate, we will take in the user's password
    // in plain text, run it through encryptPassword, and compare it
    // with what we have in the DB for the hashed_password.
    //
    // Will return 'true' if they match, and 'false' if they don't
    return this.encryptPassword(plainText) == this.hashed_password;
  },
  encryptPassword: function(password) {
    if (!password) return "";
    try {
      // returns the hashed password
      return crypto
        .createHmac("sha1", this.salt)
        .update(password)
        .digest("hex");
    } catch (error) {
      // if there is an error, return nothing
      return "";
    }
  },

  makeSalt: function() {
    // Using current date, rounding it and multiplying by a random number
    return Math.round(new Date().valueOf() * Math.random()) + "";
  }
};

// export user model
module.exports = mongoose.model("User", userSchema);
