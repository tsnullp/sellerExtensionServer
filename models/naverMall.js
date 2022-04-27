const mongoose = require("mongoose")
const moment = require("moment")

const NaverMall = mongoose.Schema({
  mallNo: String,
  mallName: String,
  mallPcUrl: String,
  createdAt: {
    type: Date,
    default: () => moment().toDate()
  },
  lastUpdate: {
    type: Date,
    default: () => moment().toDate()
  }
})

module.exports = mongoose.model("NaverMall", NaverMall)
