const mongoose = require("mongoose")
const moment = require("moment")

const TempProductSchema = mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  brand: String,
  manufacture: String,
  good_id: String,
  title: String,
  keyword: [String],
  mainKeyword: String,
  mainImages: [String],
  price: Number,
  salePrice: Number,
  content: [String],
  description: String, // 제품설명
  suggestedUse: String, // 제품 사용법
  ingredients: String, //  포함된 다른 성분들
  warnings: String, // 주의사항
  disclaimer: String, // 면책사항
  supplementFacts: String, // 영양 성분 정보
  shipPrice: Number,  // 배송비
  deliverDate: String,  // 배송일
  purchaseLimitNumMax: Number,  // 구매수량
  deliverCompany: String,  // 배송회사
  options: [{
    key: String,
    propPath: String,
    price: Number,
    promotion_price:Number,
    stock: Number,
    image: String,
    optionImages: [String],
    productOverview: [String],
    disabled: Boolean,
    active: Boolean,
    value: String,
    korValue: String,
    attributes: [{
      attributeTypeName: String,
      attributeValueName: String
    }]
  }],
  detailUrl: String,
  isPrime: Boolean,
  korTitle: String,
  titleArray: [{
    word: String,
    brand: [String],
    ban: [String],
    prohibit: [String],
  }],
  korTitleArray: [{
    word: String,
    brand: [String],
    ban: [String],
    prohibit: [String],
  }],
  feature: [String],
  spec: [
    {
      attrName: String,
      attrValue: String,
    }
  ],
  prop: [
    {
      pid: String,
      name: String,
      korTypeName: String,
      values: [
        {
          vid: String,
          name: String,
          korValueName: String,
          image: String
        }
      ]
    }
  ],
  prohibitWord: [String],
  engSentence: String,
  lastUpdate: {
    type: Date,
    default: () => moment().toDate()
  }
})

module.exports = mongoose.model("TempProduct", TempProductSchema)