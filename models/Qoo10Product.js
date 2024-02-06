const mongoose = require("mongoose");

const Qoo10Productschema = mongoose.Schema({
  storeName: String,
  detailUrl: String,
  thumb: String,
  brand: String,
  title: String,
  group_code: String,
  gdlc_cd: String,
  gdmc_cd: String,
  gdsc_cd: String,
  // category: String,
  sold: Number,
  review: Number,
  deliverFee: Number,
  amountPrice: Number, // 정산금액
  margin: Number,
  marginRate: Number,

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
  lengID: String,
});

module.exports = mongoose.model("Qoo10Product", Qoo10Productschema);
