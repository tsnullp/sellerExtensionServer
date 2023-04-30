const mongoose = require("mongoose")

const TaobaoOrder = mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId
  },
  orderNumber: {
    type: String,
    index: true,
  }, // 주문번호
  orderDate: String, // 주문일,
  orderTime: String, // 주문일,
  orders: [
    {
      id: Number,
      productName: {
        type: String,
        index: true,
      }, //상품명
      thumbnail: String, // 썸네일이미지
      detail: String, // 상세페이지
      skuId: Number,
      option: [
        // 옵션
        {
          name: String,
          value: String,
          visible: String
        }
      ],
      originalPrice: String, // 판매금액
      realPrice: String, // 할인금액
      quantity: String // 구매수량
    }
  ],

  purchaseAmount: String, // 결제금액
  shippingFee: String, // 중국배송비

  shippingStatus: String, // 배송상태
  express: {
    expressName: String, // 배송사,
    expressId: String, // 트랙킹번호
    address: [
      {
        place: String,
        time: String
      }
    ]
  }
})

module.exports = mongoose.model("TaobaoOrder", TaobaoOrder)
