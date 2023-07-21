const mongoose = require("mongoose");

const TranslateSchema = mongoose.Schema({
  sourceText: String,
  targetText: String,
  source: String,
  target: String,
});

module.exports = mongoose.model("Translate", TranslateSchema);
