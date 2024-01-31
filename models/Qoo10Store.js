const mongoose = require("mongoose");

const Qoo10Storeschema = mongoose.Schema({
  storeName: String,
  storeUrl: String,
  productCount: Number,
  addres: String,
  email: String,
  phone: String,
  workingHour: String,
  official: Boolean,
});

module.exports = mongoose.model("Qoo10Store", Qoo10Storeschema);
