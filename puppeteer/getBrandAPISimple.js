const axios = require("axios");
const url = require("url");
const { papagoTranslate } = require("./translate");
const { regExp_test, AmazonAsin } = require("../lib/userFunc");
const _ = require("lodash");
const iconv = require("iconv-lite");

const start = async ({ url }) => {
  const ObjItem = {
    brand: "기타",
    manufacture: "기타",
    good_id: AmazonAsin(url),
    productEntityCode: getProductEntity(url),
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
    switch (true) {
      case url.includes("uniqlo.com/jp"):
        await getUniqlo({ ObjItem, url });
        break;
      default:
        console.log("DEFAULT", url);
        break;
    }
  } catch (e) {
    console.log("getBrandAPISimple--", e);
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

const getUniqlo = async ({ ObjItem, url }) => {
  try {
    let stockResponse = await axios({
      url: `https://www.uniqlo.com/jp/api/commerce/v5/ja/products/${ObjItem.good_id}/price-groups/${ObjItem.productEntityCode}/l2s?withPrices=true&withStocks=true&httpFailure=true`,
      method: "GET",
      headers: {
        "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
      },
      responseEncoding: "binary",
    });

    let content = await axios({
      url,
      method: "GET",
      headers: {
        "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
      },
      responseEncoding: "binary",
    });

    const temp1 = content.data
      .split("window.__PRELOADED_STATE__ = ")[1]
      .split("</script>")[0];

    const jsonObj = JSON.parse(iconv.decode(temp1, "UTF-8"));

    const product =
      jsonObj.entity.productEntity[
        `${ObjItem.good_id}-${ObjItem.productEntityCode}`
      ].product;
    // console.log("product", product);

    const tempProp = [];
    const colorValues = [];
    const sizeValues = [];

    for (const color of product.colors) {
      let image = null;
      if (product.images.main[color.displayCode]) {
        image = product.images.main[color.displayCode].image;
      }

      colorValues.push({
        vid: color.displayCode,
        name: color.name,
        korValueName: await papagoTranslate(color.name, "auto", "ko"),
        image,
      });
    }

    for (const size of product.sizes) {
      sizeValues.push({
        vid: size.displayCode,
        name: size.name,
        korValueName: await papagoTranslate(size.name, "auto", "ko"),
      });
    }
    tempProp.push({
      pid: "1",
      name: "colors",
      korTypeName: "컬러",
      values: colorValues,
    });
    tempProp.push({
      pid: "2",
      name: "sizes",
      korTypeName: "사이즈",
      values: sizeValues,
    });

    const { l2s, prices, stocks } = stockResponse.data.result;

    const tempOptions = [];

    for (const item of l2s) {
      const colorCode = item.color.displayCode;
      const sizeCode = item.size.displayCode;

      const findColorObj = _.find(tempProp[0].values, { vid: colorCode });
      const findSizeObj = _.find(tempProp[1].values, { vid: sizeCode });

      let image = null;
      if (product.images.main[colorCode]) {
        image = product.images.main[colorCode].image;
      }
      let propPath = ``;
      let value = ``;
      let korValue = ``;
      let attributes = [];
      if (findColorObj && findSizeObj) {
        propPath += `${tempProp[0].pid}:${findColorObj.vid};${tempProp[1].pid}:${findSizeObj.vid}`;
        value = `${findColorObj.name} ${findSizeObj.name}`;
        korValue = `${findColorObj.korValueName} ${findSizeObj.korValueName}`;
        attributes.push(
          {
            attributeTypeName: "컬러",
            attributeValueName: findColorObj.korValueName,
          },
          {
            attributeTypeName: "사이즈",
            attributeValueName: findSizeObj.korValueName,
          }
        );
      }
      let price =
        prices[item.l2Id].promo && prices[item.l2Id].promo.value
          ? prices[item.l2Id].promo.value
          : prices[item.l2Id].base.value;

      let stock = stocks[item.l2Id].quantity;

      if (price < 4990) {
        price += 550;
      }

      // price = price + (Math.ceil(price * 0.091 * 0.1) * 10)
      tempOptions.push({
        key: item.l2Id,
        propPath,
        value,
        korValue,
        image,
        price,
        stock,
        active: true,
        disabled: false,
        attributes,
      });
    }

    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;
  } catch (e) {
    console.log("getUniqlo", e);
  }
};

const getProductEntity = (addr) => {
  try {
    const tmepUrl = addr.split("?")[0];
    const q1 = url.parse(tmepUrl, true);
    const pathnames = q1.pathname.split("/").filter((item) => item.length > 0);
    // const temp1 = pathnames[pathnames.length - 2];
    const temp2 = pathnames[pathnames.length - 1];
    return temp2;
  } catch (e) {}
};
