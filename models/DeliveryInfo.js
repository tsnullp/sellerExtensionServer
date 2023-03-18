const mongoose = require("mongoose")

const DeliveryInfoSchema = mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId
  },
  orderSeq: String,
  orderNo: {
    type: String,
    index: true,
  },
  상태: String,
  수취인주소: String, // 수취인주소
  수취인우편번호: String,
  수취인이름: {
    type: String,
    index: true,
  },
  수취인연락처: {
    type: String,
    index: true,
  },
  개인통관부호: {
    type: String,
    index: true,
  },
  orderItems: [
    {
      taobaoTrackingNo: String,
      taobaoOrderNo: {
        type: String,
        index: true
      },
      오픈마켓주문번호: {
        type: String,
        index: true
      }
    }
  ],
  무게: Number,
  배송비용: Number,
  shippingNumber: {
    type: String,
    index: true,
  },
  customs: [
    {
      processingStage: String,
      numerOfPackaging: String,
      inOutPprocessingDate: String,
      inOutPprocessingTime: String,
      processingDate: String,
      processingTime: String,
      weight: String,
      content: String
    }
  ],
  deliveryTracking: [
    {
      stage: String,
      processingDate: String,
      processingTime: String,
      status: String,
      store: String
    }
  ],
  isDelete: {
    type: Boolean,
    default: false,
  }
})

module.exports = mongoose.model("DeliveryInfo", DeliveryInfoSchema)
