const Link = require("../models/link");
const User = require("../models/user");
const Category = require("../models/category");
const AWS = require("aws-sdk");
const { linkPublishedParams } = require("../helpers/email");

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

// create, list, read, update, remove

// create a new link
exports.create = (req, res) => {
  const { title, url, categories, type, medium } = req.body;
  //   console.table({ title, url, categories, type, medium });

  // using user submitted url as the slug
  const slug = url;

  // instantiate new Link model, and add in the user that posted the link
  let link = new Link({ title, url, categories, type, medium, slug });
  link.postedBy = req.user._id;

  // save link to the db
  link.save((error, data) => {
    // check for error
    if (error) {
      return res.status(400).json({
        error: "Link already exists"
      });
    }

    // otherwise, return data
    res.json(data);

    // find all users in the category
    //
    // $in covers the case where the link could
    // be in one, or many, categories
    User.find({ categories: { $in: categories } }).exec((error, users) => {
      // check for error
      if (error) {
        throw new Error(error);
        console.log("Error finding users associated with link category");
      }

      //
      Category.find({ _id: { $in: categories } }).exec((error, result) => {
        // data is the newly created link
        data.categories = result;

        // send an email to each user
        for (let i = 0; i < users.length; i++) {
          // grab users email and newly created link
          // and send them as arguments
          const params = linkPublishedParams(users[i].email, data);

          // send email
          const sendEmail = ses.sendEmail(params).promise();

          // handle promise
          sendEmail
            .then(success => {
              console.log("email submitted to SES", success);
              return;
            })
            .catch(failure => {
              console.log("error on email submission to SES", failure);
              return;
            });
        }
      });
    });
  });
};

// list links for associated categories
exports.list = (req, res) => {
  let limit = req.body.limit ? parseInt(req.body.limit) : 10;
  let skip = req.body.skip ? parseInt(req.body.skip) : 0;

  Link.find({})
    .populate("postedBy", "name")
    .populate("categories", "name slug")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec((error, data) => {
      // check for error
      if (error) {
        return res.status(400).json({
          error: "Could not list links"
        });
      }

      // otherwise, we have data
      res.json(data);
    });
};

// read a specific link
exports.read = (req, res) => {
  const { id } = req.params;
  Link.findOne({ _id: id }).exec((error, data) => {
    if (error) {
      return res.status(400).json({
        error: "Error finding the link"
      });
    }

    // return link info
    res.json(data);
  });
};

// update a link
exports.update = (req, res) => {
  const { id } = req.params;
  const { title, url, categories, type, medium } = req.body;
  const updatedLink = { title, url, categories, type, medium };

  // first argument - id
  // second argument - updated info
  // third argument - allows to return json with updated info
  Link.findOneAndUpdate({ _id: id }, updatedLink, { new: true }).exec(
    (error, updated) => {
      if (error) {
        return res.status(400).json({
          error: "Error updating link"
        });
      }

      // return updated link
      res.json(updated);
    }
  );
};

// remove link
exports.remove = (req, res) => {
  const { id } = req.params;
  Link.findOneAndRemove({ _id: id }).exec((error, data) => {
    if (error) {
      return res.status(400).json({
        error: "Error removing link"
      });
    }

    //
    res.json({
      message: "Link removed successfully"
    });
  });
};

// for updating click count on user-provided links
exports.clickCount = (req, res) => {
  const { linkId } = req.body;

  // find by linkId, and update clicks by 1
  Link.findByIdAndUpdate(linkId, { $inc: { clicks: 1 } }, { new: true }).exec(
    (error, result) => {
      if (error) {
        return res.status(400).json({
          error: "Could not update the view count"
        });
      }

      // return the result
      res.json(result);
    }
  );
};

// for returning the links with the highest number of clicks
exports.popular = (req, res) => {
  Link.find()
    .populate("postedBy", "name")
    .sort({ clicks: -1 })
    .limit(3)
    .exec((error, links) => {
      // check for error
      if (error) {
        return res.status(400).json({
          error: "Links not found"
        });
      }

      // return links
      res.json(links);
    });
};

// for returning the links with the highest number of clicks
// specific to a category
exports.popularInCategory = (req, res) => {
  const { slug } = req.params;
  Category.findOne({ slug }).exec((error, category) => {
    // check for error
    if (error) {
      return res.status(400).json({
        error: "Could not load categories"
      });
    }

    Link.find({ categories: category })
      .sort({ clicks: -1 })
      .limit(3)
      .exec((error, links) => {
        // check for error
        if (error) {
          return res.status(400).json({
            error: "Links not found"
          });
        }

        // send response
        res.json(links);
      });
  });
};
