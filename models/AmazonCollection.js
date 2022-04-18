const mongoose = require("mongoose")
const moment = require("moment")

const AmazonCollectionSchema = mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId
  },
  asin: String,
  detailUrl: String,
  title: String,
  image: String,
  isDelete: {
    type: Boolean,
    default: false
  },
  lastUpdate: {
    type: Date,
    default: () => moment().toDate()
  }
})

module.exports = mongoose.model("AmazonCollection", AmazonCollectionSchema)