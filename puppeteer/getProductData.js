const {
  CategoryPredict,
  Outbound,
  ReturnShippingCenter,
  CategoryMeta,
} = require("../api/Market");
const Basic = require("../models/Basic");
const Market = require("../models/Market");
const { checkStr } = require("../lib/userFunc");

const getData = async ({
  userID,
  url,
  brand,
  title,
  korTitle,
  mainImages,
  content,
  prop,
  options,
  isClothes,
  isShoes,
}) => {
  const ObjItem = {
    brand: "기타",
    good_id: "",
    title: "",
    mainImages: [],
    price: 0,
    salePrice: 0,
    content: [],
    prop,
    options: [],
    attribute: [],
    shipping: {},
    returnCenter: {},
    vendorId: "",
    vendorUserId: "",
    invoiceDocument: "",
    maximumBuyForPerson: "",
    maximumBuyForPersonPeriod: "",
    cafe24_mallID: "",
    cafe24_shop_no: "",
  };
  try {
    // await page.setJavaScriptEnabled(true)

    let duplication = false;
    let optionValueArray = [];

    let tempOptions = options;
    for (const item of tempOptions) {
      if (optionValueArray.includes(item.korValue)) {
        duplication = true;
      }
      optionValueArray.push(item.korValue);

      if (item.korValue.length > 25) {
        duplication = true;
      }

      if (
        item.attributes.filter(
          (attrItem) => attrItem.attributeValueName.length > 30
        ).length > 0
      ) {
        duplication = true;
      }
    }

    if (duplication) {
      tempOptions = tempOptions.map((item, index) => {
        delete item.attributes;
        return {
          ...item,
          korKey: `${getAlphabet(index)}옵션`,
        };
      });
    }

    const promiseArr = [
      new Promise(async (resolve, reject) => {
        try {
          ObjItem.good_id = getGoodid(url);
          if (brand) {
            ObjItem.brand = brand;
          }
          ObjItem.title = title;
          ObjItem.price =
            Array.isArray(tempOptions) && options.length > 0
              ? tempOptions[0].price
              : 0;
          ObjItem.mainImages = mainImages;
          ObjItem.content = content;
          ObjItem.options = tempOptions;
          ObjItem.salePrice = tempOptions[0] ? tempOptions[0].price : 0;
          ObjItem.brand = brand;
          ObjItem.manufacture = ObjItem.brand;
          ObjItem.title = title;
          ObjItem.korTitle = korTitle;

          const {
            categoryCode,
            attributes,
            noticeCategories,
            requiredDocumentNames,
            certifications,
          } = await getCategoryInfo({ userID, korTitle: ObjItem.korTitle });

          ObjItem.categoryCode = categoryCode;
          ObjItem.attributes = attributes;
          ObjItem.noticeCategories = noticeCategories;
          ObjItem.requiredDocumentNames = requiredDocumentNames;
          ObjItem.certifications = certifications;

          resolve();
        } catch (e) {
          reject(e);
        }
      }),

      new Promise(async (resolve, reject) => {
        try {
          const {
            shipping,
            returnCenter,
            vendorId,
            vendorUserId,
            invoiceDocument,
            maximumBuyForPerson,
            maximumBuyForPersonPeriod,
            cafe24_mallID,
            cafe24_shop_no,
          } = await getShippingInfo({ userID });
          ObjItem.shipping = shipping;
          ObjItem.returnCenter = returnCenter;
          ObjItem.vendorId = vendorId;
          ObjItem.vendorUserId = vendorUserId;
          ObjItem.invoiceDocument = invoiceDocument;
          ObjItem.maximumBuyForPerson = maximumBuyForPerson;
          ObjItem.maximumBuyForPersonPeriod = maximumBuyForPersonPeriod;
          ObjItem.cafe24_mallID = cafe24_mallID;
          ObjItem.cafe24_shop_no = cafe24_shop_no;
          resolve();
        } catch (e) {
          reject(e);
        }
      }),
      new Promise(async (resolve, reject) => {
        try {
          const {
            afterServiceInformation,
            afterServiceContactNumber,
            topImage,
            bottomImage,
            clothImage,
            shoesImage,
            optionHtml,
            detailHtml,
          } = await getBasicItem({
            userID,
            options: tempOptions,
            prop,
            content,
            duplication,
          });
          ObjItem.afterServiceInformation = afterServiceInformation;
          ObjItem.afterServiceContactNumber = afterServiceContactNumber;
          ObjItem.topImage = topImage;
          ObjItem.bottomImage = bottomImage;
          ObjItem.clothesHtml = isClothes ? clothImage : null;
          ObjItem.shoesHtml = isShoes ? shoesImage : null;
          ObjItem.optionHtml = optionHtml;
          ObjItem.detailHtml = detailHtml;
          resolve();
        } catch (e) {
          reject();
        }
      }),
    ];

    await Promise.all(promiseArr);
    // console.log("ObjItem", ObjItem.options)
  } catch (e) {
    console.log("taobaoDetailNew", e);
    return null;
  } finally {
    return ObjItem;
  }
};

module.exports = getData;

const getGoodid = (url) => {
  let id = 0;
  url = url.split("&");
  if (url.length) {
    for (let i = 0, len = url.length; i < len; i++) {
      if (checkStr(url[i], "id=", true)) {
        let idt = url[i].split("=");
        id = idt[1];
        return id;
      }
    }
  }
  return id;
};

const getBasicItem = async ({
  userID,
  prop,
  options,
  content,
  duplication,
}) => {
  const objItem = {
    afterServiceInformation: "",
    afterServiceContactNumber: "",
    topImage: "",
    bottomImage: "",
  };
  try {
    const basic = await Basic.findOne({
      userID,
    });

    if (basic) {
      objItem.afterServiceInformation = basic.afterServiceInformation;
      objItem.afterServiceContactNumber = basic.afterServiceContactNumber;
      objItem.topImage = basic.topImage;
      objItem.bottomImage = basic.bottomImage;
      objItem.clothImage = basic.clothImage;
      objItem.shoesImage = basic.shoesImage;

      let optionHtml = ``;

      if (!duplication) {
        if (prop) {
          for (const item of prop) {
            for (const value of item.values) {
              if (value.image) {
                optionHtml += `
                <p style="text-align: center;" >
                <div style="text-align: center; font-size: 20px; font-weight: 700; color: white; background: #0090FF; padding: 10px; border-radius: 15px;">
                ${value.korValueName}
                </div>
                <img src="${value.image}" style="width: 100%; max-width: 800px; display: block; margin: 0 auto; " />
                <p style="text-align: center;" >
                <br />
                </p>
                `;
              }
            }
          }
        } else {
          for (const item of options) {
            if (item.image) {
              optionHtml += `
          <p style="text-align: center;" >
          <div style="text-align: center; font-size: 20px; font-weight: 700; color: white; background: #0090FF !important; padding: 10px; border-radius: 15px;">
          ${item.korKey ? `${item.korKey}: ${item.korValue}` : item.korValue}
          </div>
          <img src="${
            item.image
          }_800x800.jpg" style="width: 100%; max-width: 800px; display: block; margin: 0 auto; " />
          <p style="text-align: center;" >
          <br />
          </p>
          `;
            }
          }
        }
      } else {
        for (const item of options) {
          item.attributes = null;
          optionHtml += `
          <p style="text-align: center;" >
          <div style="text-align: center; font-size: 20px; font-weight: 700; color: white; background: #0090FF !important; padding: 10px; border-radius: 15px;">
          ${item.korKey ? `${item.korKey}: ${item.korValue}` : item.korValue}
          </div>
          <img src="${
            item.image
          }" style="width: 100%; max-width: 800px; display: block; margin: 0 auto; " />
          <p style="text-align: center;" >
          <br />
          </p>
          `;
        }
      }

      let detailHtml = ``;
      if (Array.isArray(content)) {
        for (const item of content) {
          detailHtml += `<img src="${item}" style="width: 100%; max-width: 800px; display: block; margin: 0 auto; "/ />`;
        }
      }

      objItem.optionHtml = optionHtml;
      objItem.detailHtml = detailHtml;
    }
  } catch (e) {
    console.log("ERROR1", e);
  } finally {
    return objItem;
  }
};

const getAlphabet = (index) => {
  const alphabet = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
  ];
  const letter = alphabet[index % 25];
  let number = "";
  if (Math.floor(index / 25) > 0) {
    number = Math.floor(index / 25);
  }
  return `${letter}${number}`;
};

const getShippingInfo = async ({ userID }) => {
  const objItem = {
    shipping: {},
    returnCenter: {},
    vendorId: "",
    vendorUserId: "",
    invoiceDocument: "",
    maximumBuyForPerson: "",
    maximumBuyForPersonPeriod: "",
    cafe24_mallID: "",
    cafe24_shop_no: "",
  };
  if (!userID) {
    return objItem;
  }
  try {
    const outbound = await Outbound({ userID });

    if (outbound && outbound.content.length > 0) {
      const temp = outbound.content.filter((item) => item.usable === true);
      if (temp.length > 0) {
        objItem.shipping.outboundShippingPlaceCode =
          temp[0].outboundShippingPlaceCode;
        objItem.shipping.shippingPlaceName = temp[0].shippingPlaceName;
        objItem.shipping.placeAddresses = temp[0].placeAddresses;
        objItem.shipping.remoteInfos = temp[0].remoteInfos;
      }
    }
    const returnShippingCenter = await ReturnShippingCenter({ userID });

    if (returnShippingCenter && returnShippingCenter.data.content.length > 0) {
      const temp = returnShippingCenter.data.content.filter(
        (item) => item.usable === true
      );

      if (temp.length > 0) {
        objItem.returnCenter.returnCenterCode = temp[0].returnCenterCode;
        objItem.returnCenter.shippingPlaceName = temp[0].shippingPlaceName;
        objItem.returnCenter.deliverCode = temp[0].deliverCode;
        objItem.returnCenter.deliverName = temp[0].deliverName;
        objItem.returnCenter.placeAddresses = temp[0].placeAddresses;
      }
    }

    const market = await Market.findOne({
      userID,
    });

    if (market) {
      objItem.vendorId = market.coupang.vendorId;
      objItem.vendorUserId = market.coupang.vendorUserId;
      objItem.shipping.deliveryCompanyCode = market.coupang.deliveryCompanyCode;
      objItem.shipping.deliveryChargeType = market.coupang.deliveryChargeType;
      objItem.shipping.deliveryCharge = market.coupang.deliveryCharge || 0;
      objItem.returnCenter.deliveryChargeOnReturn =
        market.coupang.deliveryChargeOnReturn || 0;
      objItem.returnCenter.returnCharge = market.coupang.returnCharge || 0;
      objItem.shipping.outboundShippingTimeDay =
        market.coupang.outboundShippingTimeDay || 0;
      objItem.invoiceDocument = market.coupang.invoiceDocument;
      objItem.maximumBuyForPerson = market.coupang.maximumBuyForPerson;
      objItem.maximumBuyForPersonPeriod =
        market.coupang.maximumBuyForPersonPeriod;
      objItem.cafe24_mallID = market.cafe24.mallID;
      objItem.cafe24_shop_no = market.cafe24.shop_no;
    }
  } catch (e) {
    console.log("getShippingInfo", e);
  } finally {
    return objItem;
  }
};

const getCategoryInfo = async ({ userID, korTitle }) => {
  const objItem = {
    categoryCode: "",
    attributes: [],
    noticeCategories: [],
    requiredDocumentNames: "",
    certifications: "",
  };

  try {
    const recommendedResponse = await CategoryPredict({
      userID,
      productName: korTitle,
    });

    objItem.categoryCode = recommendedResponse.data.predictedCategoryId;

    const metaResponse = await CategoryMeta({
      userID,
      categoryCode: recommendedResponse.data.predictedCategoryId,
    });

    if (metaResponse && metaResponse.data && metaResponse.data.attributes) {
      objItem.attributes = metaResponse.data.attributes.map((item) => {
        return {
          ...item,
          attributeValueName: `상세페이지 참조`,
        };
      });

      objItem.noticeCategories = metaResponse.data.noticeCategories.map(
        (item) => {
          const noticeCategoryDetailNames = item.noticeCategoryDetailNames
            .filter((item) => item.required === "MANDATORY")
            .map((item) => {
              return {
                ...item,
                content: "상세페이지 참조",
              };
            });
          return {
            ...item,
            noticeCategoryDetailNames,
          };
        }
      );
      objItem.requiredDocumentNames = metaResponse.data.requiredDocumentNames;
      objItem.certifications = metaResponse.data.certifications;
    } else {
      objItem.attributes = [];
      objItem.noticeCategories = [];
      objItem.requiredDocumentNames = [];
      objItem.certifications = [];
    }

    // console.log("------", metaResponse.data.noticeCategories[0].noticeCategoryDetailNames)
  } catch (e) {
    console.log("getCategoryInfo", e);
  } finally {
    return objItem;
  }
};
