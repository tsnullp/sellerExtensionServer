const mongoose = require("mongoose")
const moment = require("moment")

const CookieSchema = mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId
  },
  name: String,
  cookie: String,
  lastUpdate: {
    type: Date,
    default: () => moment().toDate()
  },
})

module.exports = mongoose.model("Cookie", CookieSchema)
