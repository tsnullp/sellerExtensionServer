const mongoose = require("mongoose");

const ScoutCategoryID = mongoose.Schema({
  id: Number,
  name1: String,
  name2: String,
  name3: String,
  name4: String,
  category_id: String,
});

module.exports = mongoose.model("ScoutCategoryID", ScoutCategoryID);
