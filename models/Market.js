const mongoose = require("mongoose")

const MarketSchema = mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId
  },
  taobao: {
    loginID: String,
    password: String,
    imageKey: String
  },
  deliverySite: {
    loginID: String,
    password: String
  },
  coupang: {
    vendorUserId: String, // 실사용자아이디(쿠팡 Wing ID)
    vendorId: String,
    accessKey: String,
    secretKey: String,
    deliveryCompanyCode: String,
    deliveryChargeType: String,
    deliveryCharge: Number, // 기본 배송비
    deliveryChargeOnReturn: Number, // 초도반품배송비
    returnCharge: Number, // 반품배송비
    outboundShippingTimeDay: Number, // 기준출고일(일)
    invoiceDocument: String, // 인보이스영수증
    maximumBuyForPerson: {
      type: Number,
      default: 0 // 인당 최대 구매 수량
    },
    maximumBuyForPersonPeriod: {
      type: Number,
      default: 1 //최대 구매 수량 기간
    }
  },
  cafe24: {
    mallID: String,
    shop_no: Number,
    password: String
  },
  interpark: {
    userID: String,
    password: String
  }
})

module.exports = mongoose.model("Market", MarketSchema)
