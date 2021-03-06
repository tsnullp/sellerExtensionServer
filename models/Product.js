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
    exchange: Number, // ??????
    shippingFee: Number, //  ???????????????
    profit: Number, // ?????????
    discount: Number, // ?????????
    fees: Number, // ?????????
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
        sellerProductItemId: String, // ???????????? ID
        //?????? ?????? ?????? ??? ???????????? ID??? ???????????? ?????? ID ?????????.
        //????????? ????????? ??????????????? ???????????????.
        vendorItemId: {
          type: String, // ?????? ID
          index: true
        },
        //????????? ?????? ?????? ?????? ????????? ???????????? ?????? ?????? ?????? ???????????? ????????? ?????? key??? ???????????????.
        itemId: String
      }
    }
  ],
  coupang: {
    displayCategoryCode: Number,
    displayCategoryName: String,
    vendorId: String, //?????????ID,
    deliveryCompanyCode: String, // ????????? ??????
    returnCenterCode: String, // ?????????????????????
    returnChargeName: String, // ????????????
    companyContactNumber: String, // ????????? ?????????
    returnZipCode: String, // ?????????????????????
    returnAddress: String, // ???????????????
    returnAddressDetail: String, // ?????????????????????
    returnCharge: Number, // ???????????????
    afterServiceInformation: String, // A/S??????
    afterServiceContactNumber: String, // A/S????????????
    outboundShippingPlaceCode: Number, // ?????????????????????
    vendorUserId: String, // ?????????????????????(?????? Wing ID)
    invoiceDocument: String, // ???????????? ??????
    maximumBuyForPerson: Number, // ?????? ?????? ????????????
    maximumBuyForPersonPeriod: Number, // ?????? ?????? ?????? ??????
    notices: [
      {
        noticeCategoryName: String, // ?????????????????????????????????
        noticeCategoryDetailName: String, // ???????????????????????????????????????
        content: String // ??????
      }
    ],
    attributes: [
      {
        attributeTypeName: String, // ???????????????
        attributeValueName: String //?????????
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
