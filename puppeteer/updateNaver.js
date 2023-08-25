const Basic = require("../models/Basic");
const Product = require("../models/Product");
const _ = require("lodash");
const searchNaverKeyword = require("../puppeteer/searchNaverKeyword");
const { NaverImageUpload, NaverCreateProduct } = require("../api/Naver");
const mongoose = require("mongoose");
const { attr } = require("cheerio/lib/api/attributes");
const ObjectId = mongoose.Types.ObjectId;

const updateNaver = async ({
  id,
  basic,
  product,
  options,
  prop,
  userID,
  deli_pri_naver,
  attribute,
  tag,
}) => {
  const returnMessage = {
    originProductNo: null,
    smartstoreChannelProductNo: null,
    message: null,
  };

  const optionValue = options.filter(
    (item) => item.active && !item.disabled && item.stock > 0
  );

  const minOption = _.minBy(optionValue, "salePrice");
  const maxOption = _.maxBy(optionValue, "salePrice");

  const salePrice = (minOption.salePrice + maxOption.salePrice) * 2; // 판매가
  const discountPrice = salePrice - minOption.salePrice; // 판매가 - 최저가

  let optionCombinationGroupNames = {};
  let optionCombinations = [];
  if (
    (!optionValue[0].korKey ||
      (optionValue[0].korKey && optionValue[0].korKey.length === 0)) &&
    prop &&
    Array.isArray(prop) &&
    prop.length > 0
  ) {
    for (let i = 0; i < prop.length; i++) {
      optionCombinationGroupNames[`optionGroupName${i + 1}`] =
        prop[i].korTypeName;
    }
    for (const item of optionValue) {
      let combinationValue = {};

      const propPathes = item.propPath
        .split(";")
        .filter((fItem) => fItem.trim().length > 0);
      for (let p = 0; p < propPathes.length; p++) {
        const propKeyArr = propPathes[p].split(":");
        if (propKeyArr.length === 2) {
          const propObj = _.find(prop, { pid: propKeyArr[0] });
          if (propObj) {
            const propValue = _.find(propObj.values, { vid: propKeyArr[1] });
            if (propValue) {
              combinationValue[`optionName${p + 1}`] = propValue.korValueName
                .replace(/\*/gi, "x")
                .replace(/\?/gi, " ")
                .replace(/\"/gi, " ")
                .replace(/\</gi, " ")
                .replace(/\>/gi, " ");
            }
          }
        }
      }
      if (Object.keys(combinationValue).length > 0) {
        combinationValue.stockQuantity = item.stock; //재고
        combinationValue.price = item.salePrice - minOption.salePrice;
        combinationValue.usable = true;
        optionCombinations.push(combinationValue);
      }
    }
  } else {
    optionCombinationGroupNames.optionGroupName1 = "종류";
    optionCombinations = optionValue.map((item) => {
      return {
        optionName1:
          item.korKey && item.korKey.length > 0
            ? item.korKey
            : korValue
                .replace(/\*/gi, "x")
                .replace(/\?/gi, " ")
                .replace(/\"/gi, " ")
                .replace(/\</gi, " ")
                .replace(/\>/gi, " "),
        stockQuantity: item.stock,
        price: item.salePrice - minOption.salePrice,
        usable: true,
      };
    });
  }

  const basicInfo = await Basic.findOne({
    userID,
  });

  const htmlContent = `${product.gifHtml ? product.gifHtml : ""}${
    product.topHtml
  }${product.isClothes && product.clothesHtml ? product.clothesHtml : ""}${
    product.isShoes && product.shoesHtml ? product.shoesHtml : ""
  }${product.videoHtml ? product.videoHtml : ""}${product.optionHtml}${
    product.html
  }${product.bottomHtml}`;

  const mainImageUrls = await NaverImageUpload({
    userID,
    imageUrls: product.mainImages,
  });

  if (!mainImageUrls) {
    returnMessage.message = "메인이미지 업로드 에러";
    return returnMessage;
  }
  const representativeImage = mainImageUrls[0];
  let optionalImages = [];
  if (mainImageUrls.length > 1) {
    optionalImages = mainImageUrls
      .filter((_, i) => i > 0)
      .map((item) => {
        return {
          url: item,
        };
      });
  }
  let naverCategoryCode = null;
  if (basic.naverCategoryCode) {
    naverCategoryCode = basic.naverCategoryCode;
  } else {
    const categoryResponse = await searchNaverKeyword({
      title: product.korTitle,
      userID,
    });

    if (categoryResponse && categoryResponse.category4Code) {
      naverCategoryCode = categoryResponse.category4Code;
    } else {
      naverCategoryCode = categoryResponse.category3Code;
    }
  }

  if (!naverCategoryCode) {
    returnMessage.message = "카테고리 없음";
    return returnMessage;
  }

  console.log("naverCategoryCode", naverCategoryCode);
  const productBody = {
    originProduct: {
      statusType: "SALE",
      saleType: "NEW",
      leafCategoryId: naverCategoryCode,
      name: product.korTitle.replace(/[\\*?"<>]/g, ""),
      detailContent: htmlContent,
      images: {
        representativeImage: {
          url: representativeImage,
        },
        optionalImages,
      },
      salePrice,
      stockQuantity: optionValue[0].stock,
      deliveryInfo: {
        deliveryType: "DELIVERY",
        deliveryAttributeType: "NORMAL",
        deliveryCompany: "CJGLS",
        deliveryFee: {
          deliveryFeeType:
            deli_pri_naver && deli_pri_naver > 0 ? "PAID" : "FREE",
          baseFee: deli_pri_naver,
          deliveryFeePayType: "PREPAID",
          deliveryFeeByArea: {
            deliveryAreaType: "AREA_2",
            area2extraFee: 4000,
            area3extraFee: 10000,
          },
        },
        claimDeliveryInfo: {
          returnDeliveryFee: 30000,
          exchangeDeliveryFee: 60000,
        },
        installationFee: false,
      },
      detailAttribute: {
        naverShoppingSearchInfo: {
          modelId: 0,
          // manufacturerName: basic.manufacture,
          // brandName: basic.brand,
          manufacturerName: "메타트론",
          brandName: "메타트론",
          modelName: "",
        },
        afterServiceInfo: {
          afterServiceTelephoneNumber: basicInfo.afterServiceContactNumber,
          afterServiceGuideContent: basicInfo.afterServiceInformation,
        },
        originAreaInfo: {
          originAreaCode: "0200037",
          importer: "구매대행",
        },
        sellerCodeInfo: {
          sellerManagementCode: basic.good_id,
        },
        optionInfo: {
          optionCombinationSortType: "CREATE",
          optionCombinationGroupNames,
          optionCombinations,
        },
        taxType: "TAX",
        productCertificationInfos: [],
        // productCertificationInfos: [
        //   {
        //     certificationInfoId: 0,
        //     certificationKindType: "OVERSEAS",
        //   },
        // ],
        certificationTargetExcludeContent: {
          childCertifiedProductExclusionYn: true,
          kcExemptionType: "OVERSEAS",
          kcCertifiedProductExclusionYn: "KC_EXEMPTION_OBJECT",
        },
        minorPurchasable: true,
        productInfoProvidedNotice: {
          productInfoProvidedNoticeType: "ETC",
          etc: {
            manufacturer: "상품 상세페이지 참조",
            modelName: "상품 상세페이지 참조",
            itemName: "상품 상세페이지 참조",
            afterServiceDirector: "상품 상세페이지 참조",
            // customerServicePhoneNumber: "상품 상세페이지 참조",
          },
        },
        productAttributes: attribute.map((item) => {
          return {
            ...item,
            uniq: `${item.attributeSeq}${item.attributeValueSeq}`,
          };
        }),
        seoInfo: {
          pageTitle: product.pageTitle.replace(/[\\*?"<>]/g, ""),
          metaDescription: product.korTitle.replace(/[\\*?"<>]/g, ""),
          sellerTags: _.uniqBy(tag, "code")
            .filter((item, i) => i < 10 && item.code !== "1")
            .map((item) => {
              if (item.code) {
                return {
                  code: item.code,
                  text: item.text.toUpperCase(),
                };
              } else {
                return {
                  text: item,
                };
              }
            }),
        },
      },
      customerBenefit: {
        immediateDiscountPolicy: {
          discountMethod: {
            value: discountPrice,
            unitType: "WON",
          },
          mobileDiscountMethod: {
            value: discountPrice,
            unitType: "WON",
          },
        },
      },
    },
    smartstoreChannelProduct: {
      naverShoppingRegistration: true,
      channelProductDisplayStatusType: "ON",
    },
  };

  // console.log(
  //   "requestBody",
  //   JSON.stringify(productBody.originProduct, null, 2)
  // );

  const response = await NaverCreateProduct({ userID, productBody });
  // console.log("response", response);
  if (response && response.originProductNo) {
    returnMessage.originProductNo = response.originProductNo.toString();
    returnMessage.smartstoreChannelProductNo =
      response.smartstoreChannelProductNo.toString();
  } else if ((response && response.message) || response.invalidInputs) {
    let message = null;
    if (
      response.invalidInputs &&
      Array.isArray(response.invalidInputs) &&
      response.invalidInputs.length > 0
    ) {
      message = response.invalidInputs[0].message;
    } else {
      message = response.message;
    }
    returnMessage.message = message;
  }

  return returnMessage;
};

module.exports = updateNaver;
