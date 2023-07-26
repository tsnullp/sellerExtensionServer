const axios = require("axios");
const cheerio = require("cheerio");
const { papagoTranslate } = require("./translate");
const { regExp_test, extractWeight, AmazonAsin } = require("../lib/userFunc");
const { NaverProductModel } = require("../api/Naver");
const _ = require("lodash");
const iconv = require("iconv-lite");
const searchNaverKeyword = require("./searchNaverKeyword");

const start = async ({ url, userID, keyword }) => {
  const ObjItem = {
    brand: "기타",
    manufacture: "기타",
    good_id: AmazonAsin(url),
    title: "",
    mainImages: [],
    price: 0,
    salePrice: 0,
    deliveryFee: 0,
    html: "",
    content: [],
    prop: [],
    options: [],
    keyword: [],
    exchange: "",
    marginInfo: [],
    shippingWeightInfo: [],
    detailUrl: url,
  };

  try {
    let content = await axios({
      url,
      method: "GET",
      responseEncoding: "binary",
    });

    const promiseArr = [
      new Promise(async (resolve, reject) => {
        try {
          const temp1 = content.data.split(
            '<script type="application/json" id="item-page-app-data">'
          )[1];
          const temp2 = temp1.split("</script>")[0];

          const {
            shopId,
            itemId,
            title,
            media,
            variantSelectors,
            sku,
            purchaseInfo,
            pcFields,
          } = JSON.parse(temp2).api.data.itemInfoSku;
          // console.log("title", iconv.decode(title, "EUC-JP"));

          ObjItem.salePrice =
            purchaseInfo.purchaseBySellType.normalPurchase.preTaxPrice;
          ObjItem.title = iconv.decode(title, "EUC-JP");
          ObjItem.korTitle = await papagoTranslate(ObjItem.title, "auto", "ko");
          console.log("korTItle---", ObjItem.korTitle);
          ObjItem.korTitle = ObjItem.korTitle
            .replace(/국내/gi, "")
            .replace(/무료배송/gi, "");

          // let modelNames = ObjItem.korTitle.match(
          //   /[A-Za-z\d]+(?:-[A-Za-z\d]+)+/g
          // );
          let modelNames = null;
          if (
            modelNames &&
            Array.isArray(modelNames) &&
            modelNames.length > 0 &&
            keyword.length > 0
          ) {
            ObjItem.modelName = modelNames[0];
            const modelResponse = await NaverProductModel({
              userID,
              name: ObjItem.modelName,
            });
            // console.log("modelRespons", modelResponse);
            const findModels = modelResponse.filter(
              (item) =>
                item.manufacturerName &&
                item.manufacturerName.length > 0 &&
                item.brandName &&
                item.brandName.length > 0 &&
                item.name.includes(keyword) &&
                item.name.includes(ObjItem.modelName)
            );
            // console.log("findModels", findModels);
            if (
              findModels &&
              Array.isArray(findModels) &&
              findModels.length > 0
            ) {
              ObjItem.korTitle = findModels[0].name;
              ObjItem.categoryID = findModels[0].categoryId;
              ObjItem.brand = findModels[0].brandName;

              // if (keyword) {
              //   ObjItem.korTitle = ObjItem.korTitle.replace(keyword, "");

              //   let korTitleArrr = [keyword];
              //   for (const item of ObjItem.korTitle.split(" ")) {
              //     if (!korTitleArrr.includes(item)) {
              //       korTitleArrr.push(item);
              //     }
              //   }
              //   ObjItem.korTitle = korTitleArrr
              //     .filter((item) => item.trim().length > 0)
              //     .map((item) => item.trim())
              //     .join(" ");
              // }
            } else {
              // if (keyword) {
              //   ObjItem.korTitle = ObjItem.korTitle.replace(keyword, "");
              //   let korTitleArrr = [keyword];
              //   for (const item of ObjItem.korTitle.split(" ")) {
              //     if (!korTitleArrr.includes(item)) {
              //       korTitleArrr.push(item);
              //     }
              //   }
              //   ObjItem.korTitle = korTitleArrr
              //     .filter((item) => item.trim().length > 0)
              //     .map((item) => item.trim())
              //     .join(" ");
              // }

              if (keyword.length > 0) {
                ObjItem.brand = keyword;
              }

              let category = null;
              const $ = cheerio.load(iconv.decode(content.data, "EUC-JP"));
              let categoryWord = $(".normal_reserve_catch_copy").text();
              if (categoryWord && categoryWord.length > 0) {
                categoryWord = await papagoTranslate(
                  categoryWord,
                  "auto",
                  "ko"
                );

                category = await searchNaverKeyword({
                  title: categoryWord,
                });
              } else {
                category = await searchNaverKeyword({
                  title: ObjItem.korTitle,
                });
              }

              if (category) {
                if (category.category4Code) {
                  ObjItem.categoryID = category.category4Code;
                } else {
                  ObjItem.categoryID = category.category3Code;
                }
              }
            }
          } else {
            // const titleArray = ObjItem.korTitle.split(" ");
            // ObjItem.modelName = titleArray[titleArray.length - 1];
            if (keyword) {
              ObjItem.brand = keyword;
              // let korTitleArrr = [keyword];
              // for (const item of ObjItem.korTitle.split(" ")) {
              //   if (!korTitleArrr.includes(item)) {
              //     korTitleArrr.push(item);
              //   }
              // }
              // ObjItem.korTitle = korTitleArrr
              //   .filter((item) => item.trim().length > 0)
              //   .map((item) => item.trim())
              //   .join(" ");
            }

            let category = null;
            const $ = cheerio.load(iconv.decode(content.data, "EUC-JP"));

            let categoryWord = $(".normal_reserve_catch_copy").text();

            let categoryWord1 = $(
              "#pagebody > table > tbody > tr > td > table:nth-child(2) > tbody > tr > td > table > tbody > tr:nth-child(2) > td:nth-child(3) > table:nth-child(2) > tbody > tr > td > table:nth-child(4) > tbody > tr > td > a:nth-child(5)"
            ).text();

            if (categoryWord && categoryWord.length > 0) {
              categoryWord = await papagoTranslate(categoryWord, "auto", "ko");
              if (categoryWord1 && categoryWord1.length > 0) {
                categoryWord1 = await papagoTranslate(
                  categoryWord1,
                  "auto",
                  "ko"
                );
                categoryWord = `${categoryWord} ${categoryWord1}`;
              }

              category = await searchNaverKeyword({
                title: categoryWord,
              });
            } else {
              category = await searchNaverKeyword({
                title: ObjItem.korTitle,
              });
            }

            if (category) {
              if (category.category4Code) {
                ObjItem.categoryID = category.category4Code;
              } else {
                ObjItem.categoryID = category.category3Code;
              }
            }
          }

          ObjItem.content = media.images.map((item) => item.location);
          ObjItem.mainImages = [ObjItem.content[0]];

          if (pcFields && pcFields.productDescription) {
            const weight = extractWeight(pcFields.productDescription);
            ObjItem.weight = weight;
          }
          let index = 1;
          let j = 1;
          let tempProp = [];

          if (variantSelectors && Array.isArray(variantSelectors)) {
            for (const item of variantSelectors) {
              const pid = (index++).toString();
              const name = iconv.decode(item.label, "EUC-JP");
              const korTypeName = await papagoTranslate(name, "auto", "ko");
              let values = [];
              for (const value of item.values) {
                let korValueName = await papagoTranslate(
                  iconv.decode(value.value, "EUC-JP"),
                  "auto",
                  "ko"
                );
                values.push({
                  vid: (j++).toString(),
                  name: iconv.decode(value.value, "EUC-JP"),
                  korValueName: korValueName
                    ? regExp_test(korValueName)
                    : value.value,
                });
              }
              tempProp.push({
                pid,
                name,
                korTypeName: regExp_test(korTypeName),
                values,
              });
            }
          } else {
            tempProp.push({
              pid: "1",
              name: "종류",
              korTypeName: "종류",
              values: [
                {
                  vid: "1",
                  name: "단일상품",
                  korValueName: "단일상품",
                },
              ],
            });
          }

          ObjItem.prop = tempProp;

          let tempOptions = [];

          for (const item of sku) {
            let propPath = ``;
            let attributes = [];
            let attributeTypeName = ``;
            let attributeValueName = ``;
            let optionName = ``;
            for (const value of item.selectorValues) {
              for (const propItem of ObjItem.prop) {
                const findObj = _.find(propItem.values, {
                  name: iconv.decode(value, "EUC-JP"),
                });
                if (findObj) {
                  attributeTypeName = propItem.korTypeName;
                  attributeValueName = findObj.korValueName;

                  if (propPath.length === 0) {
                    optionName += `${findObj.korValueName}`;
                    propPath += `${propItem.pid}:${findObj.vid}`;
                  } else {
                    optionName += ` ${findObj.korValueName}`;
                    propPath += `;${propItem.pid}:${findObj.vid}`;
                  }
                }
              }

              attributes.push({
                attributeTypeName,
                attributeValueName,
              });
            }
            let key = item.variantId;
            // let propPath =
            let value = iconv.decode(item.selectorValues.join(" "), "EUC-JP");
            // console.log("item.taxIncludedPrice", item.taxIncludedPrice);
            // console.log("ObjItem.salePrice", ObjItem.salePrice);
            let price = item.taxIncludedPrice
              ? item.taxIncludedPrice
              : item.taxIncludedReferencePrice;
            let stock = item.hidden ? 0 : 100;

            const stockObj = _.find(purchaseInfo.variantMappedInventories, {
              inventoryId: item.variantId,
            });

            if (stockObj) {
              stock = stockObj.quantity;
            }

            tempOptions.push({
              key,
              propPath,
              value,
              korValue: regExp_test(optionName)
                .replace(/\*/gi, "x")
                .replace(/\?/gi, " ")
                .replace(/\"/gi, " ")
                .replace(/\</gi, " ")
                .replace(/\>/gi, " "),
              price,
              stock,
              active: true,
              disabled: false,
              attributes,
              weight: ObjItem.weight,
            });
          }

          if (tempOptions.length === 0) {
            tempOptions.push({
              key: "1",
              value: "단일상품",
              korValue: "단일상품",
              price: ObjItem.salePrice,
              stock: purchaseInfo.newPurchaseSku.quantity,
              disabled: false,
              active: true,
              weight: ObjItem.weight,
              attributes: [
                {
                  attributeTypeName: "종류",
                  attributeValueName: "단일상품",
                },
              ],
            });
          }
          ObjItem.options = tempOptions;

          let itemID = itemId;
          if (tempOptions[0].key !== "1") {
            itemID += `:${tempOptions[0].key}`;
          }

          try {
            const payload = {
              marketplaceId: "JP",
              resultType: "DATE_FEE",
              calculationMode: "CHEAPEST",
              shippingUnits: {
                unit01: {
                  shipTo: { level1: "JP", level2: "27", postalCode: "5470033" },
                  shopShippingUnits: {
                    shopUnit1: {
                      shopId,
                      items: {
                        [itemID]: {
                          quantity: 1,
                          data: {
                            price: tempOptions[0].price,
                            individualShipping: false,
                            customShipping: {
                              postageSegment1: 0,
                              postageSegment2: 1,
                              customTariffId: null,
                            },
                            deliverySetId: null,
                            includedPostage: false,
                            inventory: 1,
                            handlingTime: {},
                          },
                        },
                      },
                    },
                  },
                },
              },
              calculationSettings: {
                showAvailableThresholdDiscounts: true,
                showCalculationGroups: true,
              },
            };

            // console.log("payload", JSON.stringify(payload));

            // console.log(
            //   "APIKEY - ",
            //   JSON.parse(temp2).apiConfig.shipping.apiKey
            // );
            const shippResponse = await axios({
              method: "POST",
              url: `https://gateway-api.global.rakuten.com/shippingx/v2/shippingCalculation?apikey=${
                JSON.parse(temp2).apiConfig.shipping.apiKey
              }`,
              data: payload,
            });

            if (shippResponse && shippResponse.data) {
              let results =
                shippResponse.data.shippingUnits.unit01.shopShippingUnits
                  .shopUnit1.results;
              if (results && Array.isArray(results) && results.length > 0) {
                ObjItem.deliveryFee = results[0].fees.finalFee;

                // console.log("ObjItem.deliveryFee", ObjItem.deliveryFee);
              }
            }
          } catch (e) {}

          resolve();
        } catch (e) {
          reject(e);
        }
      }),
      new Promise(async (resolve, reject) => {
        try {
          const $ = cheerio.load(content.data);

          try {
            const $sale_desc = iconv.decode(
              $("span.sale_desc").html(),
              "EUC-JP"
            );
            if (!ObjItem.weight) {
              const weight = extractWeight($sale_desc);
              ObjItem.weight = weight;
            }
            // const saleDesc = removeTagsAndConvertNewlines($sale_desc);
            // ObjItem.html += saleDesc;
          } catch (e) {}

          try {
            const $item_desc = iconv.decode(
              $("span.item_desc").html(),
              "EUC-JP"
            );

            if (!ObjItem.weight) {
              const weight = extractWeight($item_desc);
              ObjItem.weight = weight;
            }

            const itemDesc = removeTagsAndConvertNewlines($item_desc);

            ObjItem.html += itemDesc;
          } catch (e) {}

          let htmlTextArr = extractTextFromHTML(ObjItem.html).filter(
            (item) => item.trim().length > 0
          );

          let htmlKorObj = [];
          const promiseArray = htmlTextArr.map((item) => {
            return new Promise(async (resolve, reject) => {
              try {
                const korText = await papagoTranslate(item, "ja", "ko");

                htmlKorObj.push({
                  key: item,
                  value: korText,
                });

                resolve();
              } catch (e) {
                reject();
              }
            });
          });
          await Promise.all(promiseArray);

          htmlKorObj = htmlKorObj.sort((a, b) => b.key.length - a.key.length);

          for (const item of htmlKorObj) {
            const regex = new RegExp(
              item.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              "g"
            );

            ObjItem.html = ObjItem.html.replace(regex, (match) => {
              if (match.toLowerCase() === item.key.toLowerCase()) {
                return item.value;
              } else {
                return match;
              }
            });
          }

          resolve();
        } catch (e) {
          reject(e);
        }
      }),
    ];

    await Promise.all(promiseArr);
  } catch (e) {
    console.log("findRakutenAPI - ", e);
  } finally {
    return {
      ...ObjItem,
      options: ObjItem.options.map((item) => {
        return {
          ...item,
          price: item.price + ObjItem.deliveryFee,
        };
      }),
    };
  }
};

module.exports = start;

const removeTagsAndConvertNewlines = (html) => {
  // 정규식을 사용하여 주석, <iframe>, <img>, <a> 태그를 제거합니다.
  const commentRegex = /<!--[\s\S]*?-->/g;
  const iframeRegex = /<iframe(?:.|\n)*?>[\s\S]*?<\/iframe>/gi;
  const imgRegex = /<img(?:.|\n)*?>/gi;
  const aRegex = /<a(?:.|\n)*?>[\s\S]*?<\/a>/gi;
  let result = html.replace(commentRegex, "");
  result = result.replace(iframeRegex, "");
  result = result.replace(imgRegex, "");
  result = result.replace(aRegex, "");

  if (isHTMLString(html)) {
    // 문자열이 HTML 형식인 경우 \n을 제거합니다.
    result = result.replace(/\n/g, "");
  } else {
    // 그렇지 않은 경우 \n을 <br>로 변경합니다.
    result = result.replace(/\n/g, "<br>");
  }

  // 줄바꿈을 <br> 태그로 변환하되, 최대 두 번의 <br> 태그만 허용합니다.
  result = result.replace(/\n{3,}/g, "\n\n");
  result = result.replace(/\n{2}/g, "\n");
  result = result.replace(/\n/g, "<br>");
  result = result.replace(/(<br>\s*){3,}/g, "<br><br>");
  result = result.replace(/(<br>\s*){2}/g, "<br>");

  result = result.replace(/<p>&nbsp;<\/p>/g, "");
  // result = result.replace(/<td[^>]*>([\s\S]*?)<\/td>/gi, "");
  // result = result.replace(/<td(?=.*(&nbsp;|<img)).*?<\/td>/gi, "");

  result = result.replace(/<td>&nbsp;<\/td>/g, "");

  // 태그 사이의 공백을 제거합니다.
  result = result.replace(/>\s+</g, "><");
  result = result.replace(/<td><\/td>/g, "");
  result = result.replace(/<tr><\/tr>/g, "");
  result = result.replace(/<td nowrap=""><\/td>/g, "");
  result = result.replace(/<tr valign="top"><\/tr>/g, "");
  result = result.replace(/<table><\/table>/g, "");

  // <table>과 <tbody> 사이의 <br> 태그를 제거합니다.
  result = result.replace(/\/>(?:\s*<br>\s*)*<tbody>/g, "/><tbody>");

  // <tr>과 <td> 사이의 <br> 태그를 제거합니다.
  result = result.replace(/<tr>(?:\s*<br>\s*)*<td/g, "<tr><td");

  // console.log("html", html);
  // result = result.replace(/<span>(?:\s*<a ref=\s*)*<\/span>/g, "");
  // result = result.replace(/<div>(?:\s*予約\s*)*<\/div>/g, "");
  // result = result.replace(/<div(?=.*予約).*?<\/div>/g, "");
  // result = result.replace(/<div>(?:\s*重要\s*)*<\/div>/g, "");
  // result = result.replace(/<div(?:\s*(?:予約|重要|rakuten)\s*)*<\/div>/gi, "");a
  result = result.replace(/<ul class="icon">.*?<\/ul>/gs, "");
  result = result.replace(
    /<br(?=.*(?:予約|重要|rakuten|<a ref|<input|ご注文|お届|商品についてのお問い合わせ|この商品を購入された方のレビュー|クーポン|無料|Copyrights|税抜き|楽天デ)).*?<\/br>/gi,
    ""
  );
  result = result.replace(
    /<font(?=.*(?:予約|重要|rakuten|<a ref|<input|ご注文|お届|商品についてのお問い合わせ|この商品を購入された方のレビュー|クーポン|無料|Copyrights|税抜き|楽天デ)).*?<\/font>/gi,
    ""
  );
  result = result.replace(
    /<div(?=.*(?:予約|重要|rakuten|<a ref|<input|ご注文|お届|商品についてのお問い合わせ|この商品を購入された方のレビュー|クーポン|無料|Copyrights|税抜き|楽天デ)).*?<\/div>/gi,
    ""
  );
  result = result.replace(
    /<p(?=.*(?:予約|重要|rakuten|<a |<input|ご注文|お届|商品についてのお問い合わせ|この商品を購入された方のレビュー|クーポン|無料|Copyrights|税抜き|楽天デ)).*?<\/p>/gi,
    ""
  );
  result = result.replace(
    /<span(?=.*(?:予約|重要|rakuten|<a ref|<input|ご注文|お届|商品についてのお問い合わせ|この商品を購入された方のレビュー|クーポン|無料|Copyrights|税抜き|楽天デ)).*?<\/span>/gi,
    ""
  );
  result = result.replace(
    /<table(?=.*(?:予約|重要|rakuten|<a ref|<input|ご注文|お届|商品についてのお問い合わせ|この商品を購入された方のレビュー|クーポン|無料|Copyrights|税抜き|楽天デ)).*?<\/table>/gi,
    ""
  );

  ///////
  result = result.replace(
    /<table[^>]*>(?:\s|&nbsp;)*<tbody[^>]*>(?:\s|&nbsp;)*<tr[^>]*>(?:\s|&nbsp;)*<td[^>]*>(?:\s|&nbsp;)*<\/td>(?:\s|&nbsp;)*<\/tr>(?:\s|&nbsp;)*<\/tbody>(?:\s|&nbsp;)*<\/table>/gi,
    ""
  );

  return result;
};

// HTML 형식인지 확인하는 함수
const isHTMLString = (str) => {
  const htmlRegex = /<[a-z][\s\S]*>/i;
  return htmlRegex.test(str);
};

const extractTextFromHTML = (htmlString) => {
  const $ = cheerio.load(htmlString);

  const textNodes = [];

  const extractTextFromNode = (node) => {
    const children = $(node).contents();
    if (children.length === 0) {
      const text = $(node).text().trim();
      if (text !== "") {
        textNodes.push(text);
      }
    } else {
      children.each((index, child) => {
        extractTextFromNode(child);
      });
    }
  };

  extractTextFromNode($("body").get(0));

  return textNodes;
};
