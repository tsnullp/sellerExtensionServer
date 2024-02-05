const mongoose = require("mongoose");

const Qoo10Productschema = mongoose.Schema({
  storeName: String,
  detailUrl: String,
  thumb: String,
  brand: String,
  title: String,
  sold: Number,
  review: Number,
  deliverFee: Number,
  dcPrice: Number,
  price: Number,
  korBrand: String,
  korTitle: String,
  korPrice: Number,
  korDeliveryFee: Number,
  korSrc: String,
  korLink: String,
  korImgSgnt: String,
  difference: Number,
});

module.exports = mongoose.model("Qoo10Product", Qoo10Productschema);
