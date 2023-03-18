const mongoose = require("mongoose")

const MarketOrderSchema = mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
  market: {
    type: String,
    index: true,
  }, // 쿠팡, 스마트스토어, 지마켓, 옥션, 인터파크
  shipmentBoxID: String, // 배송번호(묶음배송번호)  쿠팡용
  orderId: {
    type: String,
    index: true
  }, /// 주문번호
  cafe24OrderID: String, // 카페24용
  orderer: {
    name: String, // 주문자명
    email: String, // 주문자 이메일
    tellNumber: String,
    hpNumber: String,
    orderDate: String, // YYYYMMDD
    orderTime: String // HHmmSS
  },
  paidAtDate: {
    type: String,
    index: true
  },
  paidAtTime: String,

  shippingPrice: Number, // 배송비
  // remotePrice: Number, // 도서산간배송비

  receiver: {
    name: {
      type: String,
      index: true,
    }, // 수취인명
    tellNumber: String,
    hpNumber: {
      type: String,
      index: true,
    },
    addr: String, // 수취인 배송지
    postCode: String, // 수취인 우편번호
    parcelPrintMessage: String
  },
  orderItems: [
    {
      image: String, // 썸네일
      title: {
        type: String,
        index: true,
      },
      option: {
        type: String,
        index: true,
      },
      quantity: Number,
      salesPrice: Number, // 상품 가격
      orderPrice: Number, // 결제 가격
      discountPrice: Number, // 할인가격

      sellerProductName: String,
      productId: String, //
      vendorItemId: String,

      deliveryOrderId: String // 배대지 주문번호
    }
  ],
  overseaShippingInfoDto: {
    // 해외배송정보
    personalCustomsClearanceCode: String, // 개인통관번호
    ordererPhoneNumber: String, // 통관번호용 핸드폰번호
    ordererName: String // 통광용 구매자
  },
  saleType: {
    type: Number, // 1: 주문, 2: 취소, 3: 반품
    index: true,
  },
  deliveryCompanyName: String, // 택배사 (CJ 대한통운,경동택배)
  invoiceNumber: {
    type: String,
    index: true,
  },// 송장번호
  deliveryOrderId: String // 배대지 주문번호
})

MarketOrderSchema.index({
  "orderItems.title": "text"
})

module.exports = mongoose.model("MarketOrder", MarketOrderSchema)
