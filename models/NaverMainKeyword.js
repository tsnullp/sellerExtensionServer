const mongoose = require("mongoose")

const NaverMainKeyword = mongoose.Schema({
  category1: String,
  keyword: String,
  productCount: Number,
  purchaseCnt: Number,
  recentSaleCount: Number,
  isBrand: Boolean,
})

module.exports = mongoose.model("NaverMainKeyword", NaverMainKeyword)
