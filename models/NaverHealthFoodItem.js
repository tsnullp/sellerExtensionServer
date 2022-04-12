const mongoose = require("mongoose")
const moment = require("moment")

const NaverHealthFoodItem = mongoose.Schema({
  productNo: {
    type: String,
    unique: true,
    index: true
  },
  displayName: String,
  detailUrl: String,
  name: String,
  title: String,
  categoryId: String,
  category1: String,
  category2: String,
  category3: String,
  category4: String,
  salePrice: Number,
  regDate: String,
  image: String,
  sellerTags: [String],
  reviewCount: Number,
  zzim: Number,
  purchaseCnt: Number,
  recentSaleCount: Number,
  createdAt: {
    type: Date,
    index: true,
    default: () => moment().toDate()
  },
})

module.exports = mongoose.model("NaverHealthFoodItem", NaverHealthFoodItem)
