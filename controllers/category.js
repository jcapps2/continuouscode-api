const Category = require("../models/category");
const Link = require("../models/link");
const slugify = require("slugify");
const formidable = require("formidable");
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

// s3 config
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// create a new category, now converting
// to base64 and using json to upload
// as opposed to form-data
exports.create = (req, res) => {
  const { name, image, content } = req.body;

  // image data
  //
  // Buffer gives us base64 data, and we're
  // also removing the first part of the base64
  // string using a regex
  const base64Data = new Buffer.from(
    image.replace(/^data:image\/\w+;base64,/, ""),
    "base64"
  );

  // get image type (not necessary, but good practice)
  const type = image.split(";")[0].split("/")[1];

  // generate slug
  const slug = slugify(name);

  // creating new category with info
  let category = new Category({
    name,
    content,
    slug
  });

  // define params for uploading the image
  const params = {
    Bucket: "learnr-project",
    Key: `category/${uuidv4()}.${type}`,
    Body: base64Data,
    ACL: "public-read",
    ContentEncoding: "base64",
    ContentType: `image/${type}`
  };

  // upload to s3
  s3.upload(params, (error, data) => {
    // check for errors
    if (error) {
      return res.status(400).json({ error: "Upload to s3 failed" });
    }

    // requirements for an image in our category schema
    category.image.url = data.Location;
    category.image.key = data.Key;

    // posted by
    category.postedBy = req.user._id;

    // save to db
    category.save((error, success) => {
      if (error) {
        return res.status(400).json({ error: "Error saving category to db" });
      }

      // if successful
      return res.json(success);
    });
  });
};

// list all categories
exports.list = (req, res) => {
  Category.find({}).exec((error, data) => {
    //check for error
    if (error) {
      return res.status(400).json({
        error: "Category could not load"
      });
    }

    // otherwise, show data
    res.json(data);
  });
};

exports.read = (req, res) => {
  const { slug } = req.params;

  // if we pass in a limit (say, display 20 results initially)
  // then use that. else, use a default limit of 10
  let limit = req.body.limit ? parseInt(req.body.limit) : 10;

  // same as above kinda
  let skip = req.body.skip ? parseInt(req.body.skip) : 0;

  // populate is a mongoose method
  Category.findOne({ slug })
    .populate("postedBy", "_id name username")
    .exec((error, category) => {
      if (error) {
        return res.status(400).json({
          error: "Could not load category"
        });
      }
      // res.json(category)

      // find all links associated with the category
      //
      // sort(createdAt: -1) will give the latest links
      //
      // limit() and skip() will introduce a form of
      // pagination using an infinite scroll.
      // as the user scrolls, more items will be fetched
      // as opposed to potentially fetching thousands at a time.
      Link.find({ categories: category })
        .populate("postedBy", "_id name username")
        .populate("categories", "name")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .exec((error, links) => {
          if (error) {
            return res.status(400).json({
              error: "Could not load links for the category"
            });
          }
          res.json({ category, links });
        });
    });
};

// update category
exports.update = (req, res) => {
  const { slug } = req.params;

  // destructuring the content to update
  const { name, image, content } = req.body;

  // image handling
  const base64Data = new Buffer.from(
    image.replace(/^data:image\/\w+;base64,/, ""),
    "base64"
  );
  // get image type (not necessary, but good practice)
  const type = image.split(";")[0].split("/")[1];

  // find based on slug,
  // then pass what we want to update
  Category.findOneAndUpdate({ slug }, { name, content }, { new: true }).exec(
    (error, updated) => {
      // handle error
      if (error) {
        return res.status(400).json({
          error: "Could not find category to update"
        });
      }
      // the end of updating the basics of the category
      console.log("UPDATED", updated);

      // updating the image is the hard part...
      //
      // if there is an image, we need to remove it from S3
      // before uploading a new one
      if (image) {
        const deleteParams = {
          Bucket: "learnr-project",
          Key: `${updated.image.key}`
        };

        // delete the original image that was supplied when category was created/last updated
        s3.deleteObject(deleteParams, (error, data) => {
          if (error) console.log("S3 DELETE ERROR DURING UPDATE", error);
          else console.log("S3 DELETE SUCCESSFUL", data);
        });

        // define params for uploading the image
        const params = {
          Bucket: "learnr-project",
          Key: `category/${uuidv4()}.${type}`,
          Body: base64Data,
          ACL: "public-read",
          ContentEncoding: "base64",
          ContentType: `image/${type}`
        };

        // now we can upload the new/updated image
        s3.upload(params, (error, data) => {
          // check for errors
          if (error) {
            return res.status(400).json({ error: "Upload to s3 failed" });
          }

          // requirements for an image in our category schema
          updated.image.url = data.Location;
          updated.image.key = data.Key;

          // save to db
          updated.save((error, success) => {
            if (error) {
              res
                .status(400)
                .json({ error: "Error saving updated image to db" });
            }

            // if successful
            res.json(success);
          });
        });
      } else {
        res.json(updated);
      }
    }
  );
};

// remove a category
exports.remove = (req, res) => {
  const { slug } = req.params;

  Category.findOneAndRemove({ slug }).exec((error, data) => {
    if (error) {
      return res.status(400).json({ error: "Could not delete category" });
    }

    // removing the associated image from the S3 bucket
    const deleteParams = {
      Bucket: "learnr-project",
      Key: `${data.image.key}`
    };

    // delete the original image that was supplied when category was created/last updated
    s3.deleteObject(deleteParams, (error, data) => {
      if (error) console.log("S3 DELETE ERROR", error);
      else console.log("S3 DELETE SUCCESSFUL", data);
    });

    // send success message
    res.json({
      message: "Category deleted successfully"
    });
  });
};
