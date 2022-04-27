const mongoose = require("mongoose")

const BrandSchema = mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  brand: {
    type: String,
  },
  banWord: {
    type: String,
  },
  kipris: {
    type: String
  },
  prohibit: {
    type: String
  }
})

module.exports = mongoose.model("Brand", BrandSchema)
