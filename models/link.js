// schema for links submitted by users

const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const linkSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      required: true,
      max: 256
    },
    url: {
      type: String,
      trim: true,
      required: true,
      max: 256
    },
    slug: {
      type: String,
      lowercase: true,
      required: true,
      index: true
    },
    postedBy: {
      type: ObjectId,
      ref: "User"
    },
    // associate link with a category
    categories: [
      {
        type: ObjectId,
        ref: "Category",
        required: true
      }
    ],
    type: {
      type: String,
      default: "Free"
    },
    medium: {
      type: String,
      default: "Video"
    },
    // count number of clicks a link receives
    clicks: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// exporting 'Category' model based on categorySchema
module.exports = mongoose.model("Link", linkSchema);
