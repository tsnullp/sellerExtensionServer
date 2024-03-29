const ExchangeRate = require("../models/ExchangeRate");
const ShippingPrice = require("../models/ShippingPrice");
const Brand = require("../models/Brand");
const cheerio = require("cheerio");
const { GetAliProduct, GetDetailHtml } = require("../api/AliExpress");
const {
  regExp_test,
  ranking,
  sleep,
  getOcrText,
  imageCheck,
  DimensionArray,
} = require("../lib/userFunc");
const { papagoTranslate } = require("./translate");
const { getMainKeyword, searchLensImage } = require("./keywordSourcing");
const _ = require("lodash");
const sharp = require("sharp");
const { searchKeywordCategory } = require("../puppeteer/categorySourcing");

const start = async ({ url, title, userID, keyword }) => {
  const ObjItem = {
    brand: "기타",
    manufacture: "기타",
    good_id: "",
    title: "",
    mainImages: [],
    price: 0,
    salePrice: 0,
    content: [],
    html: null,
    videoUrl: null,
    options: [],
    exchange: "",
    marginInfo: [],
    shippingWeightInfo: [],
    detailUrl: url,
  };

  try {
    const promiseArr = [
      new Promise(async (resolve, reject) => {
        try {
          const response = await GetAliProduct({ url: url.split("?")[0] });
          const {
            commonModule,
            descriptionModule,
            imageModule,
            priceModule,
            quantityModule,
            shippingModule,
            skuModule,
            specsModule,
            titleModule,
            crossLinkModule,
          } = response;

          let shipPrice = 0;
          let deliverDate = null;
          let purchaseLimitNumMax = 0;
          let deliverCompany = null;

          if (
            shippingModule &&
            shippingModule.freightCalculateInfo &&
            shippingModule.freightCalculateInfo.freight &&
            shippingModule.freightCalculateInfo.freight.freightAmount
          ) {
            shipPrice = Number(
              shippingModule.freightCalculateInfo.freight.freightAmount.value
            );
            deliverDate =
              shippingModule.freightCalculateInfo.freight.deliveryDateDisplay;
            deliverCompany =
              shippingModule.freightCalculateInfo.freight.company;
          }

          if (quantityModule && quantityModule.purchaseLimitNumMax) {
            purchaseLimitNumMax = quantityModule.purchaseLimitNumMax;
          }

          if (
            shippingModule &&
            shippingModule.generalFreightInfo &&
            shippingModule.generalFreightInfo.originalLayoutResultList
          ) {
            let shippingObj =
              shippingModule.generalFreightInfo.originalLayoutResultList[0]
                .bizData;
            shipPrice = shippingObj.displayAmount
              ? shippingObj.displayAmount
              : 0;
            deliverDate = shippingObj.deliveryDate
              ? shippingObj.deliveryDate
              : null;
            deliverCompany = shippingObj.company ? shippingObj.company : null;
            // let deliveryDay = 10000
            // for(const item of shippingModule.generalFreightInfo.originalLayoutResultList.filter(fItem => fItem.bizData.shipToCode === "KR")){
            //   if(item.bizData.deliveryDayMax < deliveryDay){
            //     deliveryDay = item.bizData.deliveryDayMax
            //     shippingObj = item.bizData
            //   }
            // }
            // console.log("--> shippingObj --> ", shippingObj)
            // if(shippingObj){
            //   ObjItem.shipPrice = shippingObj.displayAmount ? shippingObj.displayAmount : 0
            //   ObjItem.deliverDate = shippingObj.deliveryDate ? shippingObj.deliveryDate : null
            //   ObjItem.deliverCompany = shippingObj.company ? shippingObj.company : null
            // }
          }

          ObjItem.shipPrice = shipPrice;
          ObjItem.deliverDate = deliverDate;
          ObjItem.purchaseLimitNumMax = purchaseLimitNumMax;
          ObjItem.deliverCompany = deliverCompany;

          if (!title || title.length === 0) {
            ObjItem.korTitle = titleModule.subject.trim();

            let titleArray = [];
            const keywordResponse = await searchKeywordCategory({
              keyword: ObjItem.korTitle,
            });
            if (keywordResponse.intersectionTerms) {
              titleArray.push(
                ...keywordResponse.intersectionTerms.map((mItem) => mItem)
              );
            }
            if (keywordResponse.terms) {
              titleArray.push(...keywordResponse.terms.map((mItem) => mItem));
            }

            ObjItem.korTitle = titleArray.join(" ");

            let tempTitle = ObjItem.korTitle
              .replace("크리에이티브", "")
              .replace("크리 에이 티브", "")
              .replace("어린이", "")
              .replace("유아", "")
              .replace("ins", "")
              .replace("일본식", "")
              .replace("일본", "")
              .replace("한국어", "")
              .replace("한국", "")
              .replace("주최자", "")
              .replace(" pu ", " ")
              .replace("Dropshipping", "")
              .replace("dropshipping", "");
            let tempTitleArray = tempTitle
              .split(" ")
              .filter((item) => item.length > 0);
            ObjItem.korTitle = tempTitleArray.join(" ");
          } else {
            ObjItem.korTitle = title.trim();
          }

          ObjItem.mainKeyword = keyword;

          // ObjItem.mainKeyword = await getMainKeyword(ObjItem.korTitle)

          // if (ObjItem.mainKeyword.length === 0) {
          //   ObjItem.mainKeyword = await getMainKeyword(ObjItem.korTitle, true)
          // }

          let mainImageKeywords = [];
          for (const mainImages of DimensionArray(ObjItem.mainImages, 5)) {
            const promiseMainImages = mainImages.map((image) => {
              return new Promise(async (resolve, reject) => {
                try {
                  const keywords = await searchLensImage({ url: image });
                  mainImageKeywords.push(...keywords);
                  await sleep(500);
                  // console.log("keywrods----->", keywords)
                  resolve();
                } catch (e) {
                  reject(e);
                }
              });
            });
            await Promise.all(promiseMainImages);
            await sleep(1000);
          }

          let mainImages = [];
          for (const item of imageModule.imagePathList) {
            let mainObj = {};
            try {
              mainObj.image = item;
              const text = await getOcrText(item);
              mainObj.textLength = text.length;
            } catch (e) {
            } finally {
              mainImages.push(mainObj);
            }
          }

          mainImages = _.sortBy(
            mainImages.filter((item) => item.image),
            "textLength"
          );

          ObjItem.mainImages = mainImages.map((item) => item.image);

          if (imageModule && imageModule.videoId && imageModule.videoUid) {
            ObjItem.videoUrl = `https://video.aliexpress-media.com/play/u/ae_sg_item/${imageModule.videoUid}/p/1/e/6/t/10301/${imageModule.videoId}.mp4?from=chrome&definition=h265`;
          }

          const detailResponse = await GetDetailHtml({
            url: descriptionModule.descriptionUrl,
          });

          if (detailResponse) {
            const $ = cheerio.load(detailResponse);

            try {
              let html = $.text();
              html = html.split("\n");
              if (html.length === 1) {
                html = html.split("<br>");
              }

              html = html
                .filter((item) => !item.includes("window"))
                .filter((item) => !item.includes("http"))
                .filter((item) => !item.includes("<img"))
                // .filter(item => !item.includes("<p"))
                .filter((item) => !item.includes("<a"))
                .filter((item) => !item.includes("<br>"))
                .filter((item) => !item.includes("<div></div>"))
                .filter((item) => !item.includes("<script"))
                .filter((item) => !item.includes("</body"))
                .filter((item) => !item.includes("</html"))
                .filter((item) => !item.includes("무료"))
                .filter((item) => !item.includes("반품"))
                .filter((item) => !item.includes("도매"))
                .filter((item) => !item.includes("할인"))
                .filter((item) => item.length > 0);
              html = html.join("<br>");
              ObjItem.html = html;
            } catch (e) {
              // try {
              //   ObjItem.html = $("#offer-template-0").html().split("<img")[0]
              // } catch (e) {
              // }
            }

            $("img").each(function (i, elem) {
              const value = $(this).attr("src");
              ObjItem.content.push(value);
            });
          }

          let contentKeywords = [];

          for (const contents of DimensionArray(ObjItem.content, 5)) {
            const promiseContentKeywords = contents
              .filter(
                (image) =>
                  image && image.includes("http") && image.includes(".jpg")
              )
              .map((image) => {
                return new Promise(async (resolve, reject) => {
                  try {
                    const keywords = await searchLensImage({ url: image });
                    contentKeywords.push(...keywords);
                    await sleep(500);
                    resolve();
                  } catch (e) {
                    reject(e);
                  }
                });
              });
            await Promise.all(promiseContentKeywords);
            await sleep(1000);
          }

          // console.log("contentKeywords ---- ", contentKeywords)

          // const {nluTerms} = await searchKeywordCategory({keyword: ObjItem.korTitle})
          const rankKeyword = await ranking(
            [
              ...ObjItem.korTitle.split(" "),
              ...mainImageKeywords,
              ...contentKeywords,
            ],
            1
          );
          // console.log("rankKeyword **** ", rankKeyword)

          let tempTitle = keyword ? `${keyword} ` : "";
          for (const item of rankKeyword) {
            if (tempTitle.length < 40) {
              if (item.count === 1) {
                let isAdded = false;
                for (const tItem of ObjItem.korTitle.split(" ")) {
                  if (!tempTitle.includes(tItem)) {
                    tempTitle += `${tItem} `;
                    isAdded = true;
                    break;
                  }
                }
                if (!isAdded) {
                  tempTitle += `${item.name} `;
                }
              } else {
                if (!tempTitle.includes(item.name)) {
                  tempTitle += `${item.name} `;
                }
              }
            }
          }

          // tempTitle = regExp_test(tempTitle)
          ObjItem.korTitle = tempTitle
            .split(" ")
            .filter((item) => item.length > 0)
            .join(" ");
          // console.log("tempTitle = >", tempTitle.trim())

          // ObjItem.content = [];
          // 상세페이지 삭제

          ObjItem.keyword = [];
          if (crossLinkModule && crossLinkModule.crossLinkGroupList) {
            for (const crossLink of crossLinkModule.crossLinkGroupList) {
              ObjItem.keyword.push(
                ...crossLink.crossLinkList.map((item) => item.displayName)
              );
            }
          }
          // if (pageModule && pageModule.keywords && pageModule.keywords.length > 0) {
          //   if (!pageModule.keywords.includes("Aliexpress")) {
          //     const keywords = await papagoTranslate(pageModule.keywords.trim())
          //     ObjItem.keyword = keywords.split(",").map((item) => {
          //       return regExp_test(item).trim()
          //     })
          //   }
          // }
          let brandList = await Brand.find(
            {
              brand: { $ne: null },
            },
            { brand: 1 }
          );

          let banList = [];
          if (
            userID.toString() === "5f0d5ff36fc75ec20d54c40b" ||
            userID.toString() === "5f1947bd682563be2d22f008" ||
            userID.toString() === "625f9ca226d0840a73e2dbb8"
          ) {
            banList = await Brand.find(
              {
                userID: {
                  $in: [
                    "5f0d5ff36fc75ec20d54c40b",
                    "5f1947bd682563be2d22f008",
                    "625f9ca226d0840a73e2dbb8",
                  ],
                },
              },
              { banWord: 1 }
            );
          } else {
            banList = await Brand.find(
              {
                userID: userID,
              },
              { banWord: 1 }
            );
          }

          let korTitleArr = ObjItem.korTitle.split(" ");

          korTitleArr = korTitleArr.map((tItem) => {
            const brandArr = brandList.filter((item) =>
              tItem.toUpperCase().includes(item.brand.toUpperCase())
            );
            const banArr = banList.filter((item) =>
              tItem.toUpperCase().includes(item.banWord.toUpperCase())
            );

            return {
              word: tItem,
              brand:
                brandArr.length > 0 ? brandArr.map((item) => item.brand) : [],
              ban: banArr.length > 0 ? banArr.map((item) => item.banWord) : [],
            };
          });

          ObjItem.korTitleArray = korTitleArr;
          ObjItem.good_id = commonModule.productId;

          ObjItem.spec = specsModule.props.map((item) => {
            if (item.attrName === "브랜드 이름") {
              ObjItem.brand = item.attrValue;
            }
            return {
              attrName: item.attrName,
              attrValue: item.attrValue,
            };
          });

          const { productSKUPropertyList, skuPriceList } = skuModule;

          // for(const property of productSKUPropertyList){
          //   console.log("skuPropertyName:", property.skuPropertyName)
          //   console.log("skuPropertyValues:", property.skuPropertyValues)
          // }

          if (productSKUPropertyList && Array.isArray(productSKUPropertyList)) {
            ObjItem.prop = productSKUPropertyList
              // .filter(item => item.skuPropertyName !== "배송지")
              .map((item) => {
                // console.log("item-->", item)

                if (item.skuPropertyId === 200007763) {
                  // 배송지
                  return {
                    pid: item.skuPropertyId.toString(),
                    korTypeName: item.skuPropertyName,
                    values: item.skuPropertyValues
                      .filter(
                        (fItem) =>
                          fItem.propertyValueId === 201336100 ||
                          fItem.propertyValueName === "CN"
                      )
                      // 중국
                      .map((kItem) => {
                        // console.log("vid: ", item.skuPropertyId, " - ", kItem.propertyValueId)
                        // console.log("name: ", kItem.propertyValueDisplayName)
                        // console.log("korValueName: ", kItem.propertyValueName)
                        // console.log("image: ", kItem.skuPropertyImagePath)
                        return {
                          vid: kItem.propertyValueId.toString(),
                          name: kItem.propertyValueDisplayName,
                          korValueName: kItem.propertyValueDisplayName,
                          image: kItem.skuPropertyImagePath
                            ? kItem.skuPropertyImagePath.split("_")[0]
                            : null,
                        };
                      }),
                  };
                } else {
                  return {
                    pid: item.skuPropertyId.toString(),
                    korTypeName: item.skuPropertyName,
                    values: item.skuPropertyValues.map((kItem) => {
                      // console.log("vid: ", item.skuPropertyId, " - ", kItem.propertyValueId)
                      // console.log("name: ", kItem.propertyValueDisplayName)
                      // console.log("korValueName: ", kItem.propertyValueName)
                      // console.log("image: ", kItem.skuPropertyImagePath)
                      return {
                        vid: kItem.propertyValueId.toString(),
                        name: kItem.propertyValueDisplayName,
                        korValueName: kItem.propertyValueDisplayName,
                        image: kItem.skuPropertyImagePath
                          ? kItem.skuPropertyImagePath
                          : null,
                      };
                    }),
                  };
                }
              });
          } else {
            ObjItem.prop = [
              {
                korTypeName: "종류",
                values: [
                  {
                    name: "단일상품",
                    korValueName: "단일상품",
                    image: null,
                  },
                ],
              },
            ];
          }

          // 번역
          for (const pItems of ObjItem.prop) {
            for (const vItem of pItems.values) {
              if (vItem.image) {
                const imageCheckValue = await imageCheck(vItem.image);
                if (
                  imageCheckValue &&
                  (imageCheckValue.width < 400 || imageCheckValue.height < 400)
                ) {
                  console.log("imageCheckValue", imageCheckValue);
                  try {
                    const imageRespone = await axios({
                      method: "GET",
                      url: vItem.image,
                      responseType: "arraybuffer",
                    });
                    const image = Buffer.from(imageRespone.data);
                    await sharp(image)
                      .resize(500, 500)
                      .toFile(path.join(appDataDirPath, "temp", "resize.jpg"));
                    const bitmap = fs.readFileSync(
                      path.join(appDataDirPath, "temp", "resize.jpg")
                    );
                    const base64 = new Buffer(bitmap).toString("base64");
                    const imageUrlResponse = await Cafe24UploadLocalImage({
                      base64Image: `base64,${base64}`,
                    });
                    console.log("imageUrlResponse", imageUrlResponse);
                    if (imageUrlResponse) {
                      value.image = imageUrlResponse;
                    }
                  } catch (e) {
                    // value.imageUrl = null
                  }
                }
              }
              vItem.korValueName = await papagoTranslate(
                vItem.name.trim(),
                "en",
                "ko"
              );
            }
          }

          ObjItem.options = skuPriceList
            .filter((item) => item.skuVal.inventory > 0)
            .map((item) => {
              // console.log("skuActivityAmount", item.skuVal.kuActivityAmount)
              // console.log("skuAmount:", item.skuVal.skuAmount)
              // console.log("item", item)
              let image = null;
              let value = "";
              let korValue = "";
              let attributeTypeName = "종류";
              const pid = item.skuAttr.split(":")[0];
              // const propArr = ObjItem.prop.filter(fItem => fItem.pid === pid)

              const propsArr = item.skuPropIds.split(",");

              for (let i = 0; i < propsArr.length; i++) {
                //200004521, 10
                const skuPropId = propsArr[i];
                // console.log("skuPropId", skuPropId)
                let propArr = [];
                // for(const pItem of ObjItem.prop){
                //   propArr.push(...pItem.values)
                // }
                const skuProperty = _.find(ObjItem.prop[i].values, {
                  vid: skuPropId,
                });
                // console.log("skuProperty", skuProperty)

                if (skuProperty) {
                  image = image ? image : skuProperty.image;
                  value += `${skuProperty.name} `;
                  korValue += `${skuProperty.korValueName} `;
                } else {
                  image = null;
                  value += `null `;
                  korValue += `null `;
                }
              }
              // console.log("image", image)
              // console.log("value", value)
              // console.log("korValue", korValue)
              // if(propArr.length > 0){
              //   attributeTypeName = propArr[0].korTypeName
              //   const propValues = propArr[0].values.filter(fItem => fItem.vid === item.skuPropIds)
              //   if(propValues.length > 0){
              //     image = propValues[0].image
              //     value = propValues[0].name
              //     korValue = propValues[0].korValueName
              //   }
              // }

              value = value.replace("CHINA", "").replace("CN", "").trim();
              korValue = korValue
                .replace("CHINA", "")
                .replace("CN", "")
                .replace("중국", "")
                .trim();

              if (value.length === 0) {
                value = "단일상품";
              }
              if (korValue.length === 0) {
                korValue = "단일상품";
              }

              // actSkuMultiCurrencyCalPrice
              // actSkuMultiCurrencyCalPrice

              let price = 0;
              let promotion_price = 0;
              price = Number(item.skuVal.skuAmount.value) + shipPrice;
              promotion_price = Number(item.skuVal.skuAmount.value) + shipPrice;
              if (item.skuVal.skuActivityAmount) {
                price = Number(item.skuVal.skuActivityAmount.value) + shipPrice;
                promotion_price =
                  Number(item.skuVal.skuActivityAmount.value) + shipPrice;
              }
              if (item.skuVal.skuAmount) {
                price = Number(item.skuVal.skuAmount.value) + shipPrice;
                if (item.skuVal.skuActivityAmount) {
                  promotion_price =
                    Number(item.skuVal.skuActivityAmount.value) + shipPrice;
                } else {
                  promotion_price =
                    Number(item.skuVal.skuAmount.value) + shipPrice;
                }
              }
              if (
                purchaseLimitNumMax === 1 ||
                priceModule.regularPriceActivity === true
              ) {
                price = Number(item.skuVal.skuAmount.value) + shipPrice;
                promotion_price =
                  Number(item.skuVal.skuAmount.value) + shipPrice;
              } else {
                price = Number(item.skuVal.skuAmount.value) + shipPrice;
                promotion_price =
                  Number(item.skuVal.skuAmount.value) + shipPrice;
                if (item.skuVal.skuActivityAmount) {
                  price =
                    Number(item.skuVal.skuActivityAmount.value) + shipPrice;
                  promotion_price =
                    Number(item.skuVal.skuActivityAmount.value) + shipPrice;
                }
              }
              return {
                key: item.skuPropIds,
                propPath: item.skuAttr,
                price,
                promotion_price,
                stock: item.skuVal.inventory,
                image: image ? image : null,
                disabled: Number(item.skuVal.inventory) === 0,
                active: Number(item.skuVal.inventory) > 0,
                value,
                korValue,
                attributes: [
                  {
                    attributeTypeName,
                    attributeValueName: korValue
                      .replace("CHINA", "")
                      .replace("CN", "")
                      .replace("중국", "")
                      .trim(),
                  },
                ],
              };
            })
            .filter((fItem) => !fItem.value.includes("null"));

          if (ObjItem.prop.length > 1) {
            ObjItem.prop = ObjItem.prop.filter(
              (item) => item.pid !== "200007763"
            );
          } else {
            if (ObjItem.prop.length === 1) {
              ObjItem.prop = ObjItem.prop.map((item) => {
                if (item.pid === "200007763") {
                  item.korTypeName = "종류";
                  item.values[0].name = "단일상품";
                  item.values[0].korValueName = "단일상품";
                  item.values[0].image = imageModule.imagePathList[0];
                }
                return item;
              });
            }
          }

          // console.log("skuPriceList", skuPriceList)
          resolve();
        } catch (e) {
          console.log("어디==", e);
          reject();
        }
      }),
      new Promise(async (resolve, reject) => {
        try {
          const excahgeRate = await ExchangeRate.aggregate([
            {
              $sort: {
                날짜: -1,
              },
            },
            {
              $limit: 1,
            },
          ]);

          let marginInfo = await ShippingPrice.aggregate([
            {
              $match: {
                userID,
                type: 6,
              },
            },
            {
              $sort: {
                title: 1,
              },
            },
          ]);

          if (!marginInfo || marginInfo.length === 0) {
            marginInfo.push({
              title: 10,
              price: 30,
            });
          }
          let shippingWeightInfo = await ShippingPrice.aggregate([
            {
              $match: {
                userID,
                type: 7,
              },
            },
            {
              $sort: {
                title: 1,
              },
            },
          ]);
          if (!shippingWeightInfo || shippingWeightInfo.length === 0) {
            shippingWeightInfo.push({
              title: 1,
              price: 10000,
            });
          }

          const exchange =
            Number(excahgeRate[0].USD_송금보내실때.replace(/,/gi, "") || 1250) +
            5;

          ObjItem.exchange = exchange;
          ObjItem.marginInfo = marginInfo;
          ObjItem.shippingWeightInfo = shippingWeightInfo;

          resolve();
        } catch (e) {
          reject(e);
        }
      }),
    ];

    await Promise.all(promiseArr);
  } catch (e) {
    console.log("getAliExpressItemAPI", e.message);
  } finally {
    // console.log("ObjItem", ObjItem)
    return ObjItem;
  }
};

module.exports = start;
