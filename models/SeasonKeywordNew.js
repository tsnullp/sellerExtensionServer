const mongoose = require("mongoose");

const SeasonKeywordNew = mongoose.Schema({
  keywordID: Number,
  name1: String,
  name2: String,
  name3: String,
  category_id: Number,
  category_code: String,
  keyword: String,
  "01": Number,
  "02": Number,
  "03": Number,
  "04": Number,
  "05": Number,
  "06": Number,
  "07": Number,
  "08": Number,
  "09": Number,
  10: Number,
  11: Number,
  12: Number,
  shoppingRate: Number,
  isBrand: Boolean,
  maxCount: Number,
  maxMonth: Number,
  avgCount: Number,
});

module.exports = mongoose.model("SeasonKeywordNew", SeasonKeywordNew);
