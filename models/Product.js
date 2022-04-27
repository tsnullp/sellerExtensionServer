const mongoose = require("mongoose")
const moment = require("moment")

const ProductSchema = mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  writerID: mongoose.Schema.Types.ObjectId,
  isDelete: {
    type: Boolean,
    default: false,
    index: true
  },
  basic: {
    dataID: String,
    url: String,
    naverID: String,
    brand: String,
    manufacture: String,
    good_id: String,
    title: String,
    korTitle: {
      type: String,
      index : true,
    },
    price: String,
    salePrice: String,

    mainImages: [String],
    content: [String],
    options: [
      {
        // name: String,
        // key: String,
        // korName: String,
        // image: String,
        // skuId: String,
        // stock: String,
        // price: String
        key: String,
        value: String,
        korValue: String,
        price: String,
        stock: String,
        image: String,
        disabled: Boolean,
        active: Boolean
      }
    ],
    attribute: [
      {
        key: String,
        value: String,
        korKey: String,
        korValue: String
      }
    ],
    categoryCode: Number,
    naverCategoryCode: Number,
    naverCategoryName: String,
    attributes: [
      {
        attributeTypeName: String,
        attributeValueName: String,
        required: String,
        dataType: String,
        basicUnit: String,
        usableUnits: [String],
        groupNumber: String,
        exposed: String
      }
    ],
    noticeCategories: [
      {
        noticeCategoryName: String,
        noticeCategoryDetailNames: [
          {
            noticeCategoryDetailName: String,
            required: String,
            content: String
          }
        ]
      }
    ],
    requiredDocumentNames: [
      {
        templateName: String,
        required: String
      }
    ],
    certifications: [
      {
        certificationType: String,
        name: String,
        dataType: String,
        required: String
      }
    ],
    afterServiceInformation: String,
    afterServiceContactNumber: String,
    topImage: String,
    bottomImage: String,
    vendorId: String,
    vendorUserId: String,
    shipping: {
      outboundShippingPlaceCode: Number,
      shippingPlaceName: String,
      placeAddresses: [
        {
          addressType: String,
          countryCode: String,
          companyContactNumber: String,
          phoneNumber2: String,
          returnZipCode: String,
          returnAddress: String,
          returnAddressDetail: String
        }
      ],
      remoteInfos: [
        {
          remoteInfoId: Number,
          deliveryCode: String,
          jeju: Number,
          notJeju: Number,
          usable: Boolean
        }
      ],
      deliveryCompanyCode: String,
      deliveryChargeType: String,
      deliveryCharge: Number,
      outboundShippingTimeDay: Number
    },
    returnCenter: {
      deliveryChargeOnReturn: Number,
      returnCharge: Number,
      returnCenterCode: String,
      shippingPlaceName: String,
      deliverCode: String,
      deliverName: String,
      placeAddresses: [
        {
          addressType: String,
          countryCode: String,
          companyContactNumber: String,
          phoneNumber2: String,
          returnZipCode: String,
          returnAddress: String,
          returnAddressDetail: String
        }
      ]
    },
    invoiceDocument: String,
    maximumBuyForPerson: Number,
    maximumBuyForPersonPeriod: Number,
    cafe24_mallID: String,
    cafe24_shop_no: Number,
    keywords: [
      {
        keyword: String,
        relatedKeyword: [
          {
            name: String,
            count: Number
          }
        ]
      }
    ]
  },
  product: {
    exchange: Number, // 환율
    shippingFee: Number, //  해외배송비
    profit: Number, // 마진율
    discount: Number, // 할인율
    fees: Number, // 수수료
    addPrice: Number,
    weightPrice: Number,
    good_id: String,

    korTitle: {
      type: String,
      index : true
    },
    mainImages: [String],
    price: String,
    salePrice: String,
    topHtml: String,
    clothesHtml: String,
    isClothes: Boolean,
    shoesHtml: String,
    isShoes: Boolean,
    optionHtml: String,
    html: String,
    bottomHtml: String,
    keyword: [String],
    engSentence: String,
    brand: String,
    manufacture: String,
    outboundShippingTimeDay: Number,
    deliveryChargeType: String,
    deliveryCharge: Number,
    deliveryChargeOnReturn: Number,
    cafe24: {
      mallID: String,
      shop_no: Number,
      product_no: Number,
      product_code: String,
      custom_product_code: String,
      mainImage: String
    },
    coupang: {
      productID: {
        type: String,
        index: true
      },
      message: String,
      status: String,
      statusHistory: [
        {
          createdAt: String,
          status: String,
          createdBy: String,
          comment: String
        }
      ]
    }
  },
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
  options: [
    {
     
      margin: Number,
      weightPrice: Number,
      addPrice: Number,
      key: String,
      propPath: String,
      value: String,
      korKey: String,
      korValue: String,
      image: String,
      price: Number,
      productPrice: Number,
      salePrice: Number,
      stock: Number,
      disabled: Boolean,
      active: Boolean,
      base: {
        type: Boolean,
        default: false
      },
      attributes: [
        {
          attributeTypeName: String,
          attributeValueName: String,
          required: String,
        }
      ],
      cafe24: {
        variant_code: String
      },
      coupang: {
        sellerProductItemId: String, // 등록상품 ID
        //상품 생성 완료 시 출력되는 ID로 변경되지 않는 ID 입니다.
        //상품을 묶어서 관리하는데 사용됩니다.
        vendorItemId: {
          type: String, // 옵션 ID
          index: true
        },
        //쿠팡의 가장 작은 상품 단위로 변경되지 않고 가장 작은 단위이기 때문에 주로 key로 활용됩니다.
        itemId: String
      }
    }
  ],
  coupang: {
    displayCategoryCode: Number,
    displayCategoryName: String,
    vendorId: String, //판매자ID,
    deliveryCompanyCode: String, // 택배사 코드
    returnCenterCode: String, // 반품지센터코드
    returnChargeName: String, // 반품지명
    companyContactNumber: String, // 반품지 연락처
    returnZipCode: String, // 반품지우편번호
    returnAddress: String, // 반품지주소
    returnAddressDetail: String, // 반품지주소상세
    returnCharge: Number, // 반품배송비
    afterServiceInformation: String, // A/S안내
    afterServiceContactNumber: String, // A/S전화번호
    outboundShippingPlaceCode: Number, // 출고지주소코드
    vendorUserId: String, // 실사용자아이디(쿠팡 Wing ID)
    invoiceDocument: String, // 인보이스 서류
    maximumBuyForPerson: Number, // 인당 최대 구매수량
    maximumBuyForPersonPeriod: Number, // 최대 구매 수량 기간
    notices: [
      {
        noticeCategoryName: String, // 상품고시정보카테고리명
        noticeCategoryDetailName: String, // 상품고시정보카테고리상세명
        content: String // 내용
      }
    ],
    attributes: [
      {
        attributeTypeName: String, // 옵션타입명
        attributeValueName: String //옵션값
      }
    ]
  },

  coupangUpdatedAt: Date,
  cafe24UpdatedAt: Date,
  initCreatedAt: Date,
  isWinner: {
    type: Boolean,
    default: false
  },
  isNaver: {
    type: Boolean,
    default: false
  },
  isCoupang: {
    type: Boolean,
    default: false
  },
  isBatch: {
    type: Boolean,
    default: false
  },
  isSoEasy: {
    type: Boolean,
    default: false
  },
  isAutoPrice: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: () => moment().toDate(),
    index: true
  }
})

ProductSchema.index({
  "product.korTitle": "text"
})

module.exports = mongoose.model("Product", ProductSchema)
