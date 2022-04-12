const mongoose = require("mongoose")

const ShippingPrice = mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  type: Number, // 1. 추가금액, 2. 배송비, 3. 마진율
  title: Number,
  price: Number
})

module.exports = mongoose.model("ShippingPrice", ShippingPrice)