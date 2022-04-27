const mongoose = require("mongoose")

const BasicSchema = mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId
  },
  afterServiceInformation: String, // A/S안내
  afterServiceContactNumber: String, // A/S전화번호
  topImage: String,
  bottomImage: String,
  clothImage: String,
  shoesImage: String,
  subPrice: Number,
  kiprisInter: Boolean
})

module.exports = mongoose.model("Basic", BasicSchema)
