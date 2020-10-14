const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

// Invoke Express
const app = express();

// Connect to DB
mongoose
  .connect(process.env.DATABASE_CLOUD, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
  })
  .then(() => console.log("DB connected"))
  .catch(error => console.log(error));

// import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const categoryRoutes = require("./routes/category");
const linkRoutes = require("./routes/link");

// apply app middlewares
app.use(morgan("dev")); // shows requests made in the console
app.use(bodyParser.json({ limit: "5mb", type: "application/json" })); // parsing json
// app.use(cors());
app.use(cors({ origin: process.env.CLIENT_URL }));

// apply middleware
app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use("/api", categoryRoutes);
app.use("/api", linkRoutes);

// Dynamic port, or default to 8000
const port = process.env.PORT || 8000;

app.listen(port, () => console.log(`API is running on port ${port}`));
