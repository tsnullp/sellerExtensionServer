const mongoose = require("mongoose")

const ExchangeRate = mongoose.Schema({
  날짜: String,
  USD_매매기준율: String,
  USD_현찰사실때: String,
  USD_현찰파실때: String,
  USD_송금보내실때: String,
  USD_송금받으실때: String,
  CNY_매매기준율: String,
  CNY_현찰사실때: String,
  CNY_현찰파실때: String,
  CNY_송금보내실때: String,
  CNY_송금받으실때: String
})

module.exports = mongoose.model("ExchangeRate", ExchangeRate)
