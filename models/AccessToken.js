const mongoose = require("mongoose")
const moment = require("moment")

const AccessTokenSchema = mongoose.Schema({
  tokenType: Number,
  access_token: String,
  expires_at: String,
  refresh_token: String,
  refresh_token_expires_at: String,
  client_id: String,
  mall_id: String,
  user_id: String,
  issued_at: String,
  lastUpdate: {
    type: Date,
    default: () => moment().toDate()
  }
})

module.exports = mongoose.model("AccessToken", AccessTokenSchema)