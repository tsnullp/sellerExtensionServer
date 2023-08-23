const axios = require("axios");
const { regExp_test, AmazonAsin } = require("../lib/userFunc");
const _ = require("lodash");
const iconv = require("iconv-lite");

const start = async ({ url, userID }) => {
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

    ObjItem.salePrice =
      purchaseInfo.purchaseBySellType.normalPurchase.preTaxPrice;

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
      const shipping = JSON.parse(temp2).api.data.itemInfoSku.shipping;

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
                        postageSegment1: shipping.postageSegment.local || 0,
                        postageSegment2: shipping.singleItemShipping || 1,
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
          shippResponse.data.shippingUnits.unit01.shopShippingUnits.shopUnit1
            .results;
        if (results && Array.isArray(results) && results.length > 0) {
          ObjItem.deliveryFee = results[0].fees.finalFee || 0;

          // console.log("ObjItem.deliveryFee", ObjItem.deliveryFee);
        }
      }
    } catch (e) {}
  } catch (e) {
    // console.log("findRakutenAPISimple - ", e);
    return null;
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
