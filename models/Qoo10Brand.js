const mongoose = require("mongoose");

const Qoo10Brandschema = mongoose.Schema({
  brandName: String,
  brandNameKor: String,
  brandUrl: String,
});

module.exports = mongoose.model("Qoo10Brand", Qoo10Brandschema);
