const axios = require("axios");
const https = require("https");
const cheerio = require("cheerio");
const url = require("url");
const { papagoTranslate } = require("./translate");
const { regExp_test, AmazonAsin } = require("../lib/userFunc");
const _ = require("lodash");
const iconv = require("iconv-lite");
const startBrowser = require("./startBrowser");
const FormData = require("form-data");
const Cookie = require("../models/Cookie");

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
      case url.includes("charleskeith.jp"):
        await getCharleskeith({ ObjItem, url });
        break;
      case url.includes("crocs.co.jp"):
        await getCrocs({ ObjItem, url });
        break;
      case url.includes("barns.jp"):
        await getBarns({ ObjItem, url });
        break;
      case url.includes("asics.com/jp"):
        await getAsics({ ObjItem, url });
        break;
      case url.includes("jp.stussy.com"):
        await getStussy({ ObjItem, url });
        break;
      case url.includes("goldwin.co.jp"):
        await getNorthFace({ ObjItem, url });
        break;
      case url.includes("vans.co.jp"):
        await getVans({ ObjItem, url });
        break;
      case url.includes("converse.co.jp"):
        await getConverse({ ObjItem, url });
        break;
      case url.includes("abc-mart.net/shop"):
        await getABCMart({ ObjItem, url });
        break;
      case url.includes("viviennewestwood-tokyo.com"):
        await getViviennewestwood({ ObjItem, url });
        break;
      case url.includes("miharayasuhiro.jp"):
        await getMiharayasuhiro({ ObjItem, url });
        break;
      case url.includes("onlinestore.nepenthes.co.jp"):
        await getNepenthes({ ObjItem, url });
        break;
      case url.includes("doverstreetmarket.com"):
        await getDoverstreetmarkets({ ObjItem, url });
        break;
      case url.includes("titleist.co.jp"):
        await getTitleist({ ObjItem, url });
        break;
      case url.includes("amiacalva.shop-pro.jp"):
        await getAmiacalva({ ObjItem, url });
        break;
      case url.includes("shop.ordinary-fits.online"):
        await getOrdinaryfits({ ObjItem, url });
        break;
      case url.includes("fullcount-online.com"):
        await getFullcount({ ObjItem, url });
        break;
      case url.includes("ware-house.co.jp"):
        await getWareHouse({ ObjItem, url });
        break;
      case url.includes("onitsukatiger.com"):
        await getOnitsukatiger({ ObjItem, url });
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
    // console.log("getUniqlo", e);
  }
};

const getCharleskeith = async ({ ObjItem, url }) => {
  try {
    let content = await axios({
      url,
      method: "GET",
      headers: {
        "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
      },
      responseEncoding: "binary",
    });

    const temp1 = content.data
      .split('<script type="application/ld+json">')[2]
      .split("</script>")[0];

    const jsonObj = JSON.parse(iconv.decode(temp1, "UTF-8"));

    let stockInfo = await axios({
      url: `https://charleskeith.jp/commodity/${jsonObj.sku}/stockInfo`,
      method: "GET",
      headers: {
        "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
      },
      responseEncoding: "binary",
    });

    const colorName = await papagoTranslate(
      stockInfo.data.commodityStock.colorName,
      "auto",
      "kovalue: `${stockInfo.data.commodityStock.colorName} ${detailItem.sizeLabel}`,"
    );

    const tempProp = [];
    const tempOptions = [];

    const sizeValues = [];
    for (const detailItem of stockInfo.data.commodityStock.detailList) {
      sizeValues.push({
        vid: detailItem.skuCode,
        name: detailItem.sizeLabel,
        korValueName: detailItem.sizeLabel,
      });

      let price = stockInfo.data.commodityStock.unitPrice;
      if (stockInfo.data.commodityStock.discountPrice) {
        price = stockInfo.data.commodityStock.discountPrice;
      }

      tempOptions.push({
        key: detailItem.supplierBarCode,
        propPath: `1:1;2:${detailItem.skuCode}`,
        value: `${stockInfo.data.commodityStock.colorName} ${detailItem.sizeLabel}`,
        korValue: `${colorName} ${detailItem.sizeLabel}`,
        price: price + 500,
        stock: detailItem.availableStockQuantity,
        disabled: false,
        active: true,
        weight: ObjItem.weight,
        attributes: [
          {
            attributeTypeName: "컬러",
            attributeValueName: colorName,
          },
          {
            attributeTypeName: "사이즈",
            attributeValueName: detailItem.sizeLabel,
          },
        ],
      });
    }
    tempProp.push({
      pid: "1",
      name: "color",
      korTypeName: "컬러",
      values: [
        {
          vid: "1",
          name: stockInfo.data.commodityStock.colorName,
          korValueName: colorName,
        },
      ],
    });

    tempProp.push({
      pid: "2",
      name: "size",
      korTypeName: "사이즈",
      values: sizeValues,
    });

    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;
  } catch (e) {
    // console.log("getCharleskeith", e);
  }
};

const getCrocs = async ({ ObjItem, url }) => {
  try {
    const cookie = await Cookie.findOne({
      name: "crocs",
    });

    const userAgent = await Cookie.findOne({
      name: "userAgent",
    });
    if (!cookie || cookie.cookie.length === 0) {
      return;
    }

    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url,
      headers: {
        "User-Agent": userAgent.cookie,
        Host: "www.crocs.co.jp",
        Cookie: cookie.cookie,
      },
    };

    // axios
    //   .request(config)
    //   .then((response) => {
    //     console.log(JSON.stringify(response.data));
    //   })
    //   .catch((error) => {
    //     console.log("--------------", error);
    //   });

    let content = await axios.request(config);
    const updateAppLen = content.data.split("app.updateApp(").length;

    const temp1 = content.data
      .split("app.updateApp(")
      [updateAppLen - 1].split("</script>")[0]
      .trim();
    const temp2 = temp1.substring(0, temp1.length - 2);

    const jsonObj = JSON.parse(temp2);

    const productID = jsonObj.pdp.data.productID;
    const product = jsonObj.product.data.cache[productID].pidData;

    const variationTemp1 = content.data.split('{"variations"')[1].split(";")[0];

    const variantion = JSON.parse(`{"variations"${variationTemp1}`);

    let colorImages = {};
    if (product.variationData) {
      for (const item of product.variationData.cvrcArray) {
        const response = await axios({
          url: `https://media.crocs.com/image/list/${productID}_${item.colorNum}.json`,
          method: "GET",
        });

        let i = 0;

        let resources = response.data.resources
          .map((item) => {
            let tempSplit = item.public_id.split("_");
            let id = tempSplit[tempSplit.length - 1];

            return {
              ...item,
              id: Number(id.replace("ALT", "")),
            };
          })
          .sort((a, b) => a.id - b.id);

        for (const resource of resources) {
          ObjItem.content.push(
            `https://media.crocs.com/images/t_pdphero/${resource.public_id}/crocs.${resource.format}`
          );
          if (i === 0) {
            colorImages[
              item.colorNum
            ] = `https://media.crocs.com/images/t_pdphero/${resource.public_id}/crocs.${resource.format}`;
            ObjItem.mainImages.push(
              `https://media.crocs.com/images/t_pdphero/${resource.public_id}/crocs.${resource.format}`
            );
          }
          i++;
        }
      }
    } else {
      const response = await axios({
        url: `https://media.crocs.com/image/list/${productID}_${product.defaultColor}.json`,
        method: "GET",
      });
      let i = 0;

      let resources = response.data.resources
        .map((item) => {
          let tempSplit = item.public_id.split("_");
          let id = tempSplit[tempSplit.length - 1];

          return {
            ...item,
            id: Number(id.replace("ALT", "")),
          };
        })
        .sort((a, b) => a.id - b.id);

      for (const resource of resources) {
        ObjItem.content.push(
          `https://media.crocs.com/images/t_pdphero/${resource.public_id}/crocs.${resource.format}`
        );
        if (i === 0) {
          // colorImages[
          //   product.defaultColor
          // ] = `https://media.crocs.com/images/t_pdphero/${resource.public_id}/crocs.${resource.format}`;
          ObjItem.mainImages.push(
            `https://media.crocs.com/images/t_pdphero/${resource.public_id}/crocs.${resource.format}`
          );
        }
        i++;
      }
    }

    let tempProp = [];
    let tempOptions = [];

    let colorValues = [];
    let sizeValues = [];
    if (product.variationData) {
      for (const colors of product.variationData.cvrcArray) {
        colorValues.push({
          vid: colors.colorNum,
          name: colors.colorName,
          korValueName: await papagoTranslate(colors.colorName, "en", "ko"),
          image: colorImages[colors.colorNum]
            ? colorImages[colors.colorNum]
            : null,
        });
      }
    } else {
      colorValues.push({
        vid: "1",
        name: "단일상품",
        korValueName: "단일상품",
      });
    }

    tempProp.push({
      pid: "1",
      name: "colors",
      korTypeName: "컬러",
      values: colorValues,
    });

    if (
      product.variationData &&
      product.variationData.genderSizesArray.length > 0
    ) {
      for (const sizes of product.variationData.genderSizesArray[0]
        .sizesArray) {
        sizeValues.push({
          vid: sizes.value,
          name: sizes.displayValue,
          korValueName: sizes.displayValue,
        });
      }
      tempProp.push({
        pid: "2",
        name: "sizes",
        korTypeName: "사이즈",
        values: sizeValues,
      });
    }

    // console.log("tempProp", tempProp);
    // console.log("variantion", variantion.variations);

    for (const key of Object.keys(variantion.variations)) {
      const item = variantion.variations[key];
      const keyArray = key.split("-");
      let productID = null;
      let colorID = null;
      let sizeID = null;
      let propPath = "";
      let value = "";
      let attributes = [];
      let price = 0;

      for (const key of Object.keys(variantion.colors)) {
        const colorItem = variantion.colors[key];
        // if (colorItem.colors.includes(item.color)) {
        //   price = colorItem.price;
        // }
        price = colorItem.price;
      }
      if (keyArray.length > 0) {
        productID = keyArray[0];
      }
      if (keyArray.length > 1) {
        colorID = keyArray[1];
        propPath += `1:${colorID}`;
        const colorObj = _.find(tempProp[0].values, { vid: colorID });
        if (colorObj) {
          value += `${colorObj.korValueName}`;
          attributes.push({
            attributeTypeName: "컬러",
            attributeValueName: colorObj.korValueName,
          });
        }
      }
      if (keyArray.length > 2) {
        sizeID = keyArray[2];
        propPath += `;2:${sizeID}`;
        const sizeObj = _.find(tempProp[1].values, { vid: sizeID });
        if (sizeObj) {
          value += ` ${sizeObj.korValueName}`;
          attributes.push({
            attributeTypeName: "사이즈",
            attributeValueName: sizeObj.korValueName,
          });
        }
      }

      tempOptions.push({
        key: item.id,
        propPath,
        value,
        korValue: value,
        price: price >= 4950 ? price : price + 550,
        stock: item.ATS,
        active: true,
        weight: ObjItem.weight,
        disabled: false,
        attributes,
      });
    }

    if (tempOptions.length === 0) {
      tempOptions.push({
        key: productID,
        value: "단일상품",
        korValue: "단일상품",
        price: variantion.single.price.price,
        stock: variantion.single.ATS,
        disabled: false,
        active: true,
        weight: ObjItem.weight,
        attributes: [
          {
            attributeTypeName: "컬러",
            attributeValueName: "단일상품",
          },
        ],
      });
    }
    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;
  } catch (e) {
    // console.log("getCrocs", e);
    if (e.response && e.response.status) {
      return e.response.status;
    }
  }
};

const getBarns = async ({ ObjItem, url }) => {
  try {
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });

    let config = {
      httpsAgent: agent,
      method: "get",
      maxBodyLength: Infinity,
      url,
      headers: {
        Host: "barns.jp",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
      },
    };

    let content = await axios.request(config);

    let temp1 = content.data
      .split("window.hulkappsWishlist.productJSON = ")[1]
      .split("</script>")[0];

    let temp2 = temp1.trim().slice(0, temp1.trim().length - 1);
    temp2 = decodeUnicode(temp2);

    const jsonObj = JSON.parse(temp2);

    let inventoryTemp1 = content.data
      .split("var SimplePreorderBootstrap = ")[1]
      .split(";")[0]
      .replace(/'([^'"]+)'/g, (_, match) => {
        // 큰따옴표 안에 작은따옴표가 없는 경우에만 변경하지 않고 그대로 반환
        if (!match.includes('"')) {
          return `"${match}"`;
        } else {
          return _;
        }
      })
      .replace(/,\s*]/g, "]");

    let inventoryObj = JSON.parse(inventoryTemp1);

    const variants = inventoryObj.product.variants;
    let tempProp = [];
    let tempOptions = [];

    let sizeValues = [];
    let colorValues = [];

    for (const item of jsonObj.variants) {
      let attributes = [];
      let value = "";
      let korValue = "";
      let propPath = "";
      let stock = 0;

      let findStock = _.find(variants, { id: item.id });
      if (findStock) {
        stock = Number(findStock.inventory_quantity);
      }
      if (item.option1) {
        let korOption1 = await papagoTranslate(item.option1, "en", "ko");
        value += item.option1;
        korValue += korOption1;
        propPath += `1:${item.option1}`;
        attributes.push({
          attributeTypeName: "사이즈",
          attributeValueName: korOption1,
        });

        let sizeFindObj = _.find(sizeValues, { vid: item.option1 });
        if (!sizeFindObj) {
          sizeValues.push({
            vid: item.option1,
            name: value,
            korValueName: korOption1,
          });
        }
      }
      if (item.option2) {
        let korOption2 = await papagoTranslate(item.option2, "en", "ko");
        if (value.length > 0) {
          value += ` ${item.option2}`;
          korValue += ` ${korOption2}`;
          propPath += `;2:${item.option2}`;
        } else {
          value += item.option2;
          korValue += korOption2;
          propPath += `2:${item.sku}`;
        }
        attributes.push({
          attributeTypeName: "컬러",
          attributeValueName: korOption2,
        });

        let image = null;

        if (item.featured_media && item.featured_media.preview_image) {
          image = `https:${item.featured_media.preview_image.src}`.split(
            "?"
          )[0];
          if (!ObjItem.mainImages.includes(image)) {
            ObjItem.mainImages.push(image);
          }
        }

        let colorFindObj = _.find(colorValues, { vid: item.option2 });
        if (!colorFindObj) {
          colorValues.push({
            vid: item.option2,
            name: value,
            korValueName: korOption2,
            image,
          });
        }
      }
      tempOptions.push({
        key: item.sku,
        propPath,
        value,
        korValue,
        stock: stock >= 0 ? stock : 0,
        price:
          item.price / 100 >= 15000 ? item.price / 100 : item.price / 100 + 660,
        weight: item.weight,
        active: true,
        disabled: false,
        attributes,
      });
    }
    for (const item of jsonObj.options) {
      if (item === "サイズ" && sizeValues.length > 0) {
        tempProp.push({
          pid: "1",
          name: "sizes",
          korTypeName: "사이즈",
          values: sizeValues,
        });
      } else if (item === "色" && colorValues.length > 0) {
        tempProp.push({
          pid: "2",
          name: "colors",
          korTypeName: "컬러",
          values: colorValues,
        });
      }
    }

    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;
  } catch (e) {
    // console.log("getBarns ", e);
  }
};

const getAsics = async ({ ObjItem, url }) => {
  const browser = await startBrowser(true);
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(true);

  try {
    await page.goto(url, { waituntil: "networkidle0" });
    const content = await page.content();

    // console.log("content--  ", content);
    const temp1 = content.split("var utag_data = ")[1].split(";")[0];

    const jsonObj = JSON.parse(temp1);

    let tempProp = [];
    let tempOptions = [];

    tempProp.push({
      pid: "1",
      name: "sizes",
      korTypeName: "사이즈",
      values: jsonObj.product_sizes.map((item, i) => {
        return {
          vid: i.toString(),
          name: item,
          korValueName: item,
        };
      }),
    });

    tempOptions = jsonObj.product_sizes.map((item, i) => {
      let price = 0;
      let stock = 0;
      if (jsonObj.product_unit_price.length > 0) {
        price = Number(jsonObj.product_unit_price[0]);
      } else {
        price = Number(jsonObj.product_unit_original_price[0]);
      }

      if (jsonObj.product_sizes_stock[i] === "yes") {
        stock = 5;
      }
      return {
        key: i.toString(),
        propPath: `1:${i.toString()}`,
        value: item,
        korValue: item,
        price: price >= 3000 ? price : price + 550,
        stock,
        active: true,
        disabled: false,
        weight: jsonObj.product_division[0] === "Shoes" ? 1 : 0.5,
        attributes: [
          {
            attributeTypeName: "사이즈",
            attributeValueName: item,
          },
        ],
      };
    });

    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;
  } catch (e) {
    // console.log("getAsics", e);
  } finally {
    if (page) {
      await page.goto("about:blank");
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  }
};

const getStussy = async ({ ObjItem, url }) => {
  try {
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });

    let content = await axios({
      httpsAgent: agent,
      url,
      method: "GET",
    });

    let temp1 = content.data;

    temp1 = temp1.split("KiwiSizing.data = ")[1].split(";")[0];

    const jsonObj = JSON.parse(
      temp1
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
        .replace(/\"\"/g, '"')
        .replace(/,\s*([\]}])/g, "$1")
    );

    const temp2 = content.data
      .split('<script type="application/json" id="ProductJSON">')[1]
      .split("</script>")[0];
    const productJSON = JSON.parse(temp2);

    let tempProp = [];
    let tempOptions = [];

    let color = "";

    let colorObj = _.find(jsonObj.options, { name: "Color" });
    let sizeObj = _.find(jsonObj.options, { name: "Size" });

    if (colorObj && colorObj.values.length > 0) {
      color = await papagoTranslate(colorObj.values[0], "en", "ko");
    }
    const sizeValues = [];

    for (const item of sizeObj.values) {
      sizeValues.push({
        vid: item,
        name: item,
        korValueName: await papagoTranslate(item, "en", "ko"),
      });
    }

    tempProp.push({
      pid: "1",
      name: sizeObj.name,
      korTypeName: "사이즈",
      values: sizeValues,
    });

    for (const item of jsonObj.variants) {
      let size = await papagoTranslate(item.option2, "en", "ko");
      tempOptions.push({
        key: item.id,
        propPath: `1:${item.option2}`,
        value: item.option2,
        korValue: size,
        price:
          item.price / 100 >= 20000 ? item.price / 100 : item.price / 100 + 550,
        weight: item.weight && item.weight > 0 ? item.weight / 1000 : 0,
        stock: item.available ? 5 : 0,
        active: true,
        disabled: false,
        attributes: [
          {
            attributeTypeName: "컬러",
            attributeValueName: size,
          },
        ],
      });
    }

    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;
  } catch (e) {
    // console.log("getStussy -- ", e);
  }
};

const getNorthFace = async ({ ObjItem, url }) => {
  try {
    let content = await axios({
      url,
      method: "GET",
      headers: {
        "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
      },
      responseEncoding: "binary",
    });

    content = iconv.decode(content.data, "UTF-8");

    const temp1 = content.split("var _product_structured = ");

    const tempProp = [];
    const tempOptions = [];

    const colorValues = [];
    const sizeValues = [];

    for (const productStr of temp1.filter((_, i) => i > 0)) {
      const temp2 = productStr
        .split("if ( docs.length == 0 ) {")[0]
        .trim()
        .replace(
          /"aggregateRating":\s*{[^}]*}/g,
          '"aggregateRating": {"@type": "AggregateRating", "ratingValue": "0.0", "bestRating": "0.0", "worstRating": "0.0", "ratingCount": 0}'
        );

      const productStructured = JSON.parse(temp2);

      let korColorName = await papagoTranslate(
        productStructured.color,
        "auto",
        "ko"
      );
      let korSizeName = await papagoTranslate(
        productStructured.size,
        "auto",
        "ko"
      );
      const findColorObj = _.find(colorValues, {
        name: productStructured.color,
      });
      if (!findColorObj) {
        let image = null;

        colorValues.push({
          vid: productStructured.color.replace(/:/g, " "),
          name: productStructured.color,
          korValueName: korColorName,
          image,
        });
      }
      const findSizeObj = _.find(sizeValues, { name: productStructured.size });
      if (!findSizeObj) {
        sizeValues.push({
          vid: productStructured.size.replace(/:/g, " "),
          name: productStructured.size,
          korValueName: korSizeName,
        });
      }

      let propPath = ``;
      let value = ``;
      let korValue = ``;
      let attributes = [];
      if (productStructured.color) {
        propPath += `1:${productStructured.color.replace(/:/g, " ")}`;
        value += productStructured.color;
        korValue += korColorName;
        attributes.push({
          attributeTypeName: "컬러",
          attributeValueName: korColorName,
        });
      }
      if (productStructured.size) {
        if (propPath.length > 0) {
          propPath += `;2:${productStructured.size.replace(/:/g, " ")}`;
          value += ` ${productStructured.size}`;
          korValue += ` ${korSizeName}`;
        } else {
          propPath += `2:${productStructured.size.replace(/:/g, " ")}`;
          value += `${productStructured.size}`;
          korValue += `${korSizeName}`;
        }
        attributes.push({
          attributeTypeName: "사이즈",
          attributeValueName: korSizeName,
        });
      }

      tempOptions.push({
        key: productStructured.sku,
        propPath,
        value,
        korValue,
        price:
          Number(productStructured.offers.price) >= 5000
            ? Number(productStructured.offers.price)
            : Number(productStructured.offers.price) + 500,
        stock: productStructured.offers.availability === "InStock" ? 5 : 0,
        active: true,
        // weight: ObjItem.weight,
        disabled: false,
        attributes,
      });
    }

    if (colorValues.length > 0) {
      tempProp.push({
        pid: "1",
        name: "colors",
        korTypeName: "컬러",
        values: colorValues,
      });
    }
    if (sizeValues.length > 0) {
      tempProp.push({
        pid: "2",
        name: "sizes",
        korTypeName: "사이즈",
        values: sizeValues,
      });
    }

    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;
  } catch (e) {
    // console.log("getNorthFace -- ", e);
  }
};

const getVans = async ({ ObjItem, url }) => {
  try {
    let content = await axios({
      url,
      method: "GET",
      headers: {
        "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
      },
      // responseEncoding: "binary",
    });

    content = content.data;

    const temp = content
      .split('<script type="application/ld+json">')[1]
      .split("</script>")[0];
    const productJson = JSON.parse(temp);

    ObjItem.salePrice = productJson.offers.price;

    const $ = cheerio.load(content);

    let tempProp = [];
    let tempOptions = [];

    let color = $("span.color > span.attr-display-value").text();
    color = await papagoTranslate(color, "auto", "ko");

    let sizeValues = [];

    for (const item of $("ul.select-size").children("li")) {
      let size = $(item).find("span").text();
      const valueUrl = $(item).find("button").attr("value");
      size = await papagoTranslate(size, "auto", "ko");
      let price = Number(ObjItem.salePrice);
      let stock = 0;
      if (valueUrl && valueUrl !== "null") {
        let variationResponse = await axios({
          url: valueUrl,
          method: "GET",
          headers: {
            "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
            Host: "www.vans.co.jp",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
          },
          // responseEncoding: "binary",
        });

        if (variationResponse && variationResponse.data) {
          variationResponse = variationResponse.data;

          price = variationResponse.product.price.sales
            ? variationResponse.product.price.sales.value
            : variationResponse.product.price.list.value;
          stock = variationResponse.product.online
            ? variationResponse.product.maxOrderQuantity
            : 0;
        }
      }

      tempOptions.push({
        key: size,
        propPath: `1:${size.replace(/:/g, "")}`,
        value: size,
        korValue: size,
        price: price >= 11000 ? price : price + 550,
        stock,
        weight: 1,
        active: true,
        disabled: false,
        attributes: [
          {
            attributeTypeName: "사이즈",
            attributeValueName: size,
          },
        ],
      });

      sizeValues.push({
        vid: size.replace(/:/g, ""),
        name: size,
        korValueName: size,
      });
    }

    if (sizeValues.length > 0) {
      tempProp.push({
        pid: "1",
        name: "sizes",
        korTypeName: "사이즈",
        values: sizeValues,
      });
    }

    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;
  } catch (e) {
    // console.log("getVans ", e);
  }
};

const getConverse = async ({ ObjItem, url }) => {
  try {
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });

    let contentJson = await axios({
      httpsAgent: agent,
      url: `${url.split("?")[0]}.js`,
      method: "GET",
      headers: {
        // "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
      },
      // responseEncoding: "binary",
    });

    // console.log("content.data---", content.data);
    const productJson = contentJson.data;

    // console.log("options:", productJson.options);
    // console.log("variants:", productJson.variants);

    let tempProp = [];
    let tempOptions = [];

    let sizeValues = [];
    for (const item of productJson.variants) {
      let korValue = null;
      if (item.option1 === "Default Title") {
        korValue = "프리";
      } else {
        korValue = await papagoTranslate(item.option1, "auto", "ko");
      }
      sizeValues.push({
        vid: item.sku,
        name: item.option1 === "Default Title" ? "FREE" : item.option1,
        korValueName: korValue,
      });

      tempOptions.push({
        key: item.sku,
        propPath: `1:${item.sku}`,
        value: item.option1,
        korValue,
        price:
          item.price / 100 >= 5500 ? item.price / 100 : item.price / 100 + 550,
        stock: item.available ? 10 : 0,
        disabled: false,
        active: true,
        weight: ObjItem.weight > 0 ? ObjItem.weight : 1,
        attributes: [
          {
            attributeTypeName: "사이즈",
            attributeValueName: korValue,
          },
        ],
      });
    }

    if (sizeValues.length > 0) {
      tempProp.push({
        pid: "1",
        name: "sizes",
        korTypeName: "사이즈",
        values: sizeValues,
      });
    }
    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;
  } catch (e) {
    // console.log("getConverse-- ", e);
  }
};

const getABCMart = async ({ ObjItem, url }) => {
  try {
    let content = await axios({
      url,
      method: "GET",
      headers: {
        "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
        // "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7,zh;q=0.6",
      },
      responseType: "arraybuffer",
    });

    const decoder = new TextDecoder("shift-jis");
    content = decoder.decode(new Uint8Array(content.data));

    const $ = cheerio.load(content);

    const temp1 = content
      .split('<script type="application/ld+json">')[2]
      .split("</script>")[0];

    const descriptionPattern = /"description":"(.*?)",/;
    const match = temp1.match(descriptionPattern);
    let jsonObj = null;
    if (match) {
      const descriptionValue = match[1];

      // 큰따옴표를 이스케이프하여 새로운 JSON 문자열 생성
      const escapedDescription = JSON.stringify(descriptionValue);

      // 원래 JSON 문자열에서 description 값을 바꾸어줍니다.
      const escapedJsonString = temp1.replace(
        descriptionPattern,
        `"description":${escapedDescription},`
      );
      jsonObj = JSON.parse(escapedJsonString);
    } else {
      jsonObj = JSON.parse(temp1);
    }

    switch (jsonObj.brand.name) {
      case "crocs":
        ObjItem.brand = "크록스";
        break;
      case "NUOVO":
        ObjItem.brand = "누오보";
        break;
      case "Dr.Martens":
        ObjItem.brand = "닥터마틴";
        break;
      case "STEFANO ROSSI":
        ObjItem.brand = "스테파노로시";
        break;
      default:
        ObjItem.brand = await papagoTranslate(jsonObj.brand.name, "en", "ko");

        break;
    }

    ObjItem.salePrice = Number(jsonObj.offers.price);

    let tempProp = [];
    let tempOptions = [];

    let sizeValues = [];
    for (const item of $(".choosed_size_list").children("dl")) {
      let size = $(item).find("dt").text().split("/")[0].trim();
      let stock =
        $(item).find("dt").find("span").text().trim() === "〇" ? 5 : 0;

      let key = size.replace(/:/g, "");
      let korValueName = size;

      // if (size.includes("cm")) {
      //   if (size.includes("(")) {
      //     let temp = size.split("(")[1];
      //     if (size.includes(")")) {
      //       temp = temp.replace(")", "");
      //     }
      //     korValueName = (Number(temp.replace("cm", "")) * 10).toString();
      //   } else {
      //     korValueName = (Number(size.replace("cm", "")) * 10).toString();
      //   }
      // }

      // if (korValueName === null || korValueName === NaN) {
      //   korValueName = size;
      // }

      sizeValues.push({
        vid: key,
        name: size,
        korValueName,
      });

      tempOptions.push({
        key,
        propPath: `1:${key}`,
        value: size,
        korValue: korValueName,
        price: ObjItem.salePrice,
        stock,
        disabled: false,
        active: true,
        weight: 1,
        attributes: [
          {
            attributeTypeName: "사이즈",
            attributeValueName: korValueName,
          },
        ],
      });
    }

    if (sizeValues.length > 0) {
      tempProp.push({
        pid: "1",
        name: "sizes",
        korTypeName: "사이즈",
        values: sizeValues,
      });
    }

    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;
  } catch (e) {
    // console.log("getABCMart ", e);
  }
};

const getViviennewestwood = async ({ ObjItem, url }) => {
  try {
    let content = await axios({
      url,
      method: "GET",
      headers: {
        "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
        // "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7,zh;q=0.6",
      },
      responseType: "arraybuffer",
    });

    const decoder = new TextDecoder("shift-jis");
    content = decoder.decode(new Uint8Array(content.data));

    const $ = cheerio.load(content);

    const temp1 = content
      .split("dataLayer.push(")[2]
      .split(");")[0]
      .replace(/\'/g, '"');

    const jsonObj = JSON.parse(temp1);

    ObjItem.salePrice = Number(jsonObj["rtg.item.price1"]);

    let tempProp = [];
    let tempOptions = [];
    let sizeValues = [];

    for (const item of $(".c-size-select__list").children("li")) {
      const size = $(item).find("span").text();
      let key = size.replace(/:/g, "");
      let korValueName = size;

      let stock = 0;
      const onclick = $(item).find("a").attr("onclick");
      if (!onclick) {
        stock = 5;
      }

      sizeValues.push({
        vid: key,
        name: size,
        korValueName,
      });

      tempOptions.push({
        key,
        propPath: `1:${key}`,
        value: size,
        korValue: korValueName,
        price: ObjItem.salePrice,
        stock,
        disabled: false,
        active: true,
        weight: 1,
        attributes: [
          {
            attributeTypeName: "사이즈",
            attributeValueName: korValueName,
          },
        ],
      });
    }

    if (sizeValues.length > 0) {
      tempProp.push({
        pid: "1",
        name: "sizes",
        korTypeName: "사이즈",
        values: sizeValues,
      });
    }

    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;
  } catch (e) {
    // console.log("getViviennewestwood", e);
  }
};

const getMiharayasuhiro = async ({ ObjItem, url }) => {
  const browser = await startBrowser(true);
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(true);
  try {
    await page.goto(url, { waituntil: "networkidle0" });
    const content = await page.content();

    const $ = cheerio.load(content);

    let price = $("#detail_price > li > span").text();

    ObjItem.salePrice = Number(price.replace(/,/g, "")) || 0;

    let tempProp = [];
    let tempOptions = [];

    let colorValues = [];
    for (const item of $("#color_block > ul").children("li")) {
      let image = $(item).find("img").attr("data-src");
      let colorValue = $(item).find("p").text();
      let korValueName = await papagoTranslate(colorValue, "auto", "ko");
      let vid = $(item).attr("data-class");
      if (image) {
        image = image.split("?")[0];
        ObjItem.mainImages.push(image);
      }

      colorValues.push({
        vid,
        name: colorValue,
        korValueName,
        image,
      });
    }

    if (colorValues.length > 0) {
      tempProp.push({
        pid: "1",
        name: "colors",
        korTypeName: "컬러",
        values: colorValues,
      });
    }

    let sizeValues = [];
    for (const item of $("#size_block > ul").children("li")) {
      let size = $(item).find("span:nth-child(1)").text();
      sizeValues.push({
        vid: size,
        name: size,
        korValueName: size,
      });
    }

    if (sizeValues.length > 0) {
      tempProp.push({
        pid: "2",
        name: "sizes",
        korTypeName: "사이즈",
        values: sizeValues,
      });
    }

    const colorli = await page.$$("#color_block > ul > li");
    let colorKey = 1;

    for (const color of colorli) {
      let propPath = "";
      await color.tap();
      await page.waitForTimeout(400);
      let sizeContent = await page.content();
      const $size = cheerio.load(sizeContent);

      const colorName = await page.evaluate(
        (el) => el.querySelector("p").textContent,
        color
      );

      let image = null;

      let korValue = await papagoTranslate(colorName, "auto", "ko");
      for (const item of $size("#size_block > ul").children("li")) {
        const colorObj = _.find(colorValues, { name: colorName });
        if (colorObj) {
          propPath = `1:${colorObj.vid}`;
          image = colorObj.image;
        }

        let size = $size(item).find("span:nth-child(1)").text();
        let style = $size(item).find("span:nth-child(2)").attr("style");
        let stock = 0;
        if (style.includes("none")) {
          stock = 5;
        }
        const sizeObj = _.find(sizeValues, { name: size });
        if (sizeObj) {
          propPath += `;2:${sizeObj.vid}`;
        }

        tempOptions.push({
          key: (colorKey++).toString(),
          propPath,
          value: `${colorName} ${size}`,
          korValue: `${korValue} ${size}`,
          image,
          price:
            ObjItem.salePrice >= 27500
              ? ObjItem.salePrice
              : ObjItem.salePrice + 815,
          weight: 1,
          stock,
          active: true,
          attributes: [
            {
              attributeTypeName: "컬러",
              attributeValueName: korValue,
            },
            {
              attributeTypeName: "사이즈",
              attributeValueName: size,
            },
          ],
        });
      }
    }

    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;
  } catch (e) {
    // console.log("getMiharayasuhiro ", e);
  } finally {
    await page.waitForTimeout(10000);
    if (page) {
      await page.goto("about:blank");
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  }
};

const getNepenthes = async ({ ObjItem, url }) => {
  try {
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });
    let content = await axios({
      httpsAgent: agent,
      url,
      method: "GET",
      headers: {
        // "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
      },
      responseType: "binary",
    });

    content = content.data;

    const temp1 = content
      .split(
        '<script type="application/json" id="ProductJson-product-template">'
      )[1]
      .split("</script>")[0];
    // .replace(/\'/g, '"');

    const jsonObj = JSON.parse(temp1);
    const $ = cheerio.load(content);

    let tempProp = [];
    let tempOptions = [];

    let colorValues = [];
    let sizeValues = [];
    for (const item of jsonObj.variants) {
      if (!ObjItem.modelName || ObjItem.modelName.length === 0) {
        ObjItem.modelName = item.sku.split(" ")[0].trim();
      }
      let color = item.option1;
      let korColorName = await papagoTranslate(color, "auto", "ko");
      let size = item.option2;
      let findColorValue = _.find(colorValues, { name: color });
      if (!findColorValue) {
        colorValues.push({
          vid: color,
          name: color,
          korValueName: korColorName,
        });
      }

      let findSizeValue = _.find(sizeValues, { name: size });
      if (!findSizeValue) {
        sizeValues.push({
          vid: size,
          name: size,
          korValueName: size,
        });
      }

      tempOptions.push({
        key: item.id,
        proPath: `1:${color.replace(/:/g, "").replace(/;/g, "")};2:${size
          .replace(/:/g, "")
          .replace(/;/g, "")}`,
        value: `${color} ${size}`,
        korValue: `${korColorName} ${size}`,
        price: item.price / 100 + 500,
        stock: item.available ? 5 : 0,
        weight: item.weight > 0 ? item.weight + 0.5 : 1,
        active: true,
        disabled: false,
        attributes: [
          {
            attributeTypeName: "컬러",
            attributeValueName: korColorName,
          },
          {
            attributeTypeName: "사이즈",
            attributeValueName: size,
          },
        ],
      });
    }

    if (colorValues.length > 0) {
      tempProp.push({
        pid: "1",
        name: "colors",
        korTypeName: "컬러",
        values: colorValues,
      });
    }
    if (sizeValues.length > 0) {
      tempProp.push({
        pid: "1",
        name: "sizes",
        korTypeName: "사이즈",
        values: sizeValues,
      });
    }
    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;
  } catch (e) {
    // console.log("getNepenthes ", e);
  }
};

const getDoverstreetmarkets = async ({ ObjItem, url }) => {
  try {
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });
    let content = await axios({
      httpsAgent: agent,
      url,
      method: "GET",
      responseType: "binary",
    });
    content = content.data;

    const $ = cheerio.load(content);

    const temp1 = content
      .split('<script type="application/ld+json">')[2]
      .split("</script>")[0];

    const jsonObj = JSON.parse(temp1);

    // const temp2 = content.split("var meta = ")[1].split(";")[0];

    // const productObj = JSON.parse(temp2);

    const temp3 = content.split("initData: ")[1].split(",},function")[0];

    const initData = JSON.parse(temp3);

    let tempProp = [];
    let tempOptions = [];

    let sizeValues = [];

    for (const item of initData.productVariants) {
      let stock = 0;

      let stockObj = _.find(jsonObj.offers, { sku: item.sku });
      if (stockObj) {
        if (stockObj.availability.includes("InStock")) {
          stock = 5;
        }
      }

      let sizeNames = item.title.split(" ");

      let korValueName = item.title;
      if (sizeNames.length > 1) {
        korValueName = await papagoTranslate(sizeNames[0], "auto", "ko");
        korValueName = `${korValueName} ${sizeNames[1]}`;
      }

      sizeValues.push({
        vid: item.sku,
        name: item.title,
        korValueName,
      });

      tempOptions.push({
        key: item.id,
        propPath: `1:${item.sku}`,
        value: item.title,
        korValue: korValueName,
        price: item.price.amount,
        stock,
        active: true,
        disabled: false,
        attributes: [
          {
            attributeTypeName: "사이즈",
            attributeValueName: korValueName,
          },
        ],
      });
    }

    if (sizeValues.length > 0) {
      tempProp.push({
        pid: "1",
        name: "sizes",
        korTypeName: "사이즈",
        values: sizeValues,
      });
    }

    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;
  } catch (e) {
    // console.log("getDoverstreetmarkets ", e);
  }
};

const getTitleist = async ({ ObjItem, url }) => {
  try {
    // const content = await page.content();

    const agent = new https.Agent({
      rejectUnauthorized: false,
    });
    let content = await axios({
      httpsAgent: agent,
      url,
      method: "GET",
      headers: {
        // "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
      },
      responseType: "binary",
    });

    content = content.data;

    const $ = cheerio.load(content);

    let existMenu = true;
    const isMenu = $(".select-menu").html();
    if (isMenu && isMenu.trim().length > 0) {
      existMenu = true;
    } else {
      existMenu = false;
    }

    let tempProp = [];
    let tempOptions = [];

    let propValues = [];
    let optionName = null;
    let optionKorName = null;
    if (existMenu) {
      optionName = $("div.variation-item > .label > label")
        .text()
        .replace("：", "")
        .trim();

      if (optionName.includes("カラー")) {
        optionKorName = "컬러";
      } else if (optionName.includes("サイズ")) {
        optionKorName = "사이즈";
      } else if (optionName.includes("プレーナンバー")) {
        optionKorName = "플레이 넘버";
      } else {
        optionKorName = await papagoTranslate(optionName, "ja", "ko");
      }

      let productID = $("form.variations_form").attr("data-product_id");
      // console.log("productID", productID);

      let temp = $("form.variations_form").attr("data-product_variations");
      let i = 1;
      if (temp && temp !== "false") {
        const optinoJson = JSON.parse(temp);
        for (const item of optinoJson) {
          const keys = Object.keys(item.attributes);
          let name = null;
          // 첫 번째 키에 해당하는 값을 가져옵니다.
          if (keys.length > 0) {
            name = item.attributes[keys[0]];
          }

          // const name = item.attributes[
          //   `attribute_${encodeURI(optionName).toLowerCase()}`
          // ].replace("【新色】", "");
          const korValueName = await papagoTranslate(name, "ja", "ko");

          const image = item.image.url;
          const price = item.display_price;
          const stock = item.is_in_stock ? item.max_qty : 0;

          if (image) {
            ObjItem.mainImages.push(image);
          }
          propValues.push({
            vid: i.toString(),
            name,
            korValueName,
            image,
          });

          tempOptions.push({
            key: i.toString(),
            propPath: `1:${i.toString()}`,
            value: name,
            korValue: korValueName,
            price: price >= 11000 ? price + 500 : price + 660 + 500,
            stock,
            weight: ObjItem.weight ? ObjItem.weight : 1,
            active: true,
            disabled: false,
            attributes: [
              {
                attributeTypeName: optionName,
                attributeValueName: korValueName,
              },
            ],
          });
          i++;
        }
      } else {
        for (const item of $(".select-menu > select").children("option")) {
          let optionValue = $(item).text();

          if (optionValue === "選択してください") {
            continue;
          }

          let data = new FormData();

          data.append(
            `attribute_${encodeURI(optionName).toLowerCase()}`,
            optionValue
          );

          data.append(`product_id`, productID);

          const response = await axios({
            method: "POST",
            url: `https://www.titleist.co.jp/teamtitleist/?wc-ajax=get_variation`,
            headers: {
              ...data.getHeaders(),
            },
            // data: JSON.stringify(data),
            data,
          });

          if (!response.data) {
            console.log("설마 ? ", response);
            continue;
          }

          const name = optionValue.replace("【新色】", "");
          const korValueName = await papagoTranslate(name, "ja", "ko");
          const image = response.data.image.url;
          const price = response.data.display_price;
          const stock = response.data.is_in_stock ? response.data.max_qty : 0;

          if (image) {
            ObjItem.mainImages.push(image);
          }
          propValues.push({
            vid: i.toString(),
            name,
            korValueName,
            image,
          });

          tempOptions.push({
            key: i.toString(),
            propPath: `1:${i.toString()}`,
            value: name,
            korValue: korValueName,
            price: price >= 11000 ? price + 500 : price + 660 + 500,
            stock,
            weight: ObjItem.weight ? ObjItem.weight : 1,
            active: true,
            disabled: false,
            attributes: [
              {
                attributeTypeName: optionName,
                attributeValueName: korValueName,
              },
            ],
          });

          i++;
        }
      }
    } else {
      const stockText = $("p.stock").text();

      // 정규 표현식을 사용하여 숫자만 추출
      const numberPattern = /(\d{1,3}(,\d{3})*(\.\d+)?)|(\.\d+)/;
      let matches = stockText.match(numberPattern);

      // 숫자 값 가져오기
      let stockNumber = null;
      if (matches && matches.length > 0) {
        const matchedText = matches[0].replace(/,/g, "");
        stockNumber = parseFloat(matchedText);
      } else {
        if (stockText === "在庫あり") {
          stockNumber = 5;
        } else {
          stockNumber = 0;
        }
      }

      // const priceElement = await page.$("span.woocommerce-Price-amount");

      // 선택한 요소의 텍스트 내용을 가져오기
      // const priceText = await page.evaluate(
      //   (priceElement) => priceElement.textContent,
      //   priceElement
      // );

      const priceText = $("span.woocommerce-Price-amount").text();

      let priceNumber = 0;
      matches = priceText.match(numberPattern);
      if (matches && matches.length > 0) {
        const matchedText = matches[0].replace(/,/g, "");
        priceNumber = parseFloat(matchedText);
      }

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
      tempOptions.push({
        key: "1",
        propPath: "1:1",
        value: "단일상품",
        korValue: "단일상품",
        price:
          priceNumber >= 11000 ? priceNumber + 500 : priceNumber + 660 + 500,
        stock: stockNumber,
        weight: ObjItem.weight ? ObjItem.weight : 1,
        active: true,
        disabled: false,
        attributes: [
          {
            attributeTypeName: "종류",
            attributeValueName: "단일상품",
          },
        ],
      });
    }

    if (propValues.length > 0) {
      tempProp.push({
        pid: "1",
        name: optionName,
        korTypeName: optionKorName,
        values: propValues,
      });
    }
    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;
  } catch (e) {
    // console.log("getTitleist - ", e);
  }
};

const getAmiacalva = async ({ ObjItem, url }) => {
  try {
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });
    let content = await axios({
      httpsAgent: agent,
      url,
      method: "GET",
      headers: {
        "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7,zh;q=0.6",
      },
      responseType: "arraybuffer",
    });

    content = iconv.decode(content.data, "EUC-JP");
    const $ = cheerio.load(content);

    let temp1 = content.split("var Colorme = ")[1];
    temp1 = temp1.split(";")[0];

    const colorme = JSON.parse(temp1);

    let descriptionHtml = $("#caption").html();

    if (descriptionHtml && descriptionHtml.length > 0) {
      descriptionHtml = descriptionHtml.replace(
        /<span style="font-size:x-small;"><em><span style="color:#0000FF">OVERSEA SHIPPING REQEST<\/span><\/em><br>[\s\S]*<\/span>/,
        ""
      );

      ObjItem.html += `<h2>이 상품에 관하여</h2>`;
      ObjItem.html += `${descriptionHtml
        .replace("/国産", "")
        .replace(/ style="[^"]*"/gi, "")}`;
      ObjItem.html += `<br>`;
      const weight = extractWeight(descriptionHtml);

      if (weight) {
        ObjItem.weight = weight;
      }
    }

    let tempProp = [];
    let tempOptions = [];
    const colorValues = [];
    for (const item of colorme.product.variants) {
      const colorName = await papagoTranslate(item.title, "en", "ko");
      colorValues.push({
        vid: item.id,
        name: item.title,
        korValueName: colorName,
      });
      tempOptions.push({
        key: item.id,
        propPath: `1:${item.id}`,
        value: item.title,
        korValue: colorName,
        price:
          item.option_price_including_tax >= 11000
            ? item.option_price_including_tax
            : item.option_price_including_tax + 550,
        stock: item.stock_num || 0,
        disabled: false,
        active: true,
        weight: ObjItem.weight ? ObjItem.weight : 0.5,
        attributes: [
          {
            attributeTypeName: "컬러",
            attributeValueName: colorName,
          },
        ],
      });
    }

    if (colorValues.length > 0) {
      tempProp.push({
        pid: "1",
        name: "colors",
        korTypeName: "컬러",
        values: colorValues,
      });
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

    if (colorValues.length === 0) {
      tempOptions.push({
        key: colorme.accoumt_id,
        propPath: "1:1",
        value: "단일상품",
        korValue: "단일상품",
        price:
          colorme.product.sales_price_including_tax >= 11000
            ? colorme.product.sales_price_including_tax
            : colorme.product.sales_price_including_tax + 550,
        stock: colorme.product.stock_num || 0,
        disabled: false,
        active: true,
        weight: ObjItem.weight ? ObjItem.weight : 0.5,
        attributes: [
          {
            attributeTypeName: "종류",
            attributeValueName: "단일상품",
          },
        ],
      });
    }

    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;
  } catch (e) {
    // console.log("getAmiacalva - ", e);
  }
};

const getOrdinaryfits = async ({ ObjItem, url }) => {
  try {
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });
    let content = await axios({
      httpsAgent: agent,
      url,
      method: "GET",
      headers: {
        "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7,zh;q=0.6",
      },
      responseType: "arraybuffer",
    });

    content = iconv.decode(content.data, "EUC-JP");
    const $ = cheerio.load(content);

    let temp1 = content.split("var Colorme = ")[1];
    temp1 = temp1.split(";")[0];

    const colorme = JSON.parse(temp1);

    let jsonObj = await axios({
      httpsAgent: agent,
      url: `https://colorme.worldshopping.jp/v1/product?shopKey=shop_ordinary-fits_online&productId=${colorme.product.id}`,
      method: "GET",
      headers: {
        "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7,zh;q=0.6",
      },
      responseType: "binary",
    });

    jsonObj = jsonObj.data;

    let tempProp = [];
    let tempOptions = [];
    for (const item of jsonObj.options) {
      let name = item.name;
      let korTypeName = "";
      if (name === "COLOR") {
        korTypeName = "컬러";
      } else if (name === "SIZE") {
        korTypeName = "사이즈";
      } else {
        korTypeName = await papagoTranslate(name, "en", "ko");
      }

      let values = [];
      for (const vItem of item.values) {
        let korValueName = vItem;
        values.push({
          vid: vItem,
          name: vItem,
          korValueName,
        });
      }
      tempProp.push({
        pid: item.id,
        name,
        korTypeName,
        values,
      });
    }

    for (const item of jsonObj.variants) {
      let propPath = ``;

      const findColorObj = _.find(tempProp[0].values, {
        vid: item.option1_value,
      });
      const findSizeObj = _.find(tempProp[1].values, {
        vid: item.option2_value,
      });

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

      tempOptions.push({
        key: item.model_number,
        propPath,
        value,
        korValue,
        price:
          item.option_price_including_tax >= 20000
            ? item.option_price_including_tax
            : item.option_price_including_tax + 880,
        stock: item.stocks,
        weight: 1,
        active: true,
        disabled: false,
        attributes,
      });
    }

    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;
  } catch (e) {
    // console.log("getOrdinaryfits ", e);
  }
};

const getFullcount = async ({ ObjItem, url }) => {
  try {
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });
    let content = await axios({
      httpsAgent: agent,
      url,
      method: "GET",
      headers: {
        "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7,zh;q=0.6",
      },
      responseType: "binary",
    });

    content = content.data;
    const $ = cheerio.load(content);

    let tempProp = [];
    let tempOptions = [];
    let colorValues = [];
    let sizeValues = [];
    for (const item of $(".content").children(".item")) {
      let dataSize = $(item).find(".control > .control_list").attr("data-size");
      dataSize = JSON.parse(dataSize);

      const colorName = await papagoTranslate(
        dataSize.color_display,
        "en",
        "ko"
      );
      const sizeName = dataSize.size_display
        ? dataSize.size_display
        : dataSize.size_code;
      const findColorObj = _.find(colorValues, { vid: dataSize.color_code });
      if (!findColorObj) {
        colorValues.push({
          vid: dataSize.color_code,
          name: dataSize.color_display,
          korValueName: colorName,
        });
      }

      sizeValues.push({
        vid: dataSize.size_code,
        name: dataSize.size_display,
        korValueName: sizeName,
      });

      let price = 0;
      if (dataSize.price_for_sale) {
        price = Number(dataSize.price_for_sale);
      } else {
        price = Number(dataSize.product_detail_saleoff_price);
      }
      if (price === 0) {
        price = Number(dataSize.product_detail_price);
      }
      tempOptions.push({
        key: dataSize.SeqNo,
        propPath: `1:${dataSize.color_code};2:${dataSize.size_code}`,
        value: `${dataSize.color_display} ${sizeName}`,
        korValue: `${colorName} ${sizeName}`,
        price: price >= 11000 ? price : price + 1000,
        stock: dataSize.stock_num ? dataSize.stock_num : 0,
        active: true,
        disabled: false,
        attributes: [
          {
            attributeTypeName: "컬러",
            attributeValueName: colorName,
          },
          {
            attributeTypeName: "사이즈",
            attributeValueName: sizeName,
          },
        ],
      });
    }

    if (colorValues.length > 0) {
      tempProp.push({
        pid: "1",
        name: "colors",
        korTypeName: "컬러",
        values: colorValues,
      });
    }
    if (sizeValues.length > 0) {
      tempProp.push({
        pid: "2",
        name: "sizes",
        korTypeName: "사이즈",
        values: sizeValues,
      });
    }

    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;
  } catch (e) {
    // console.log("getFullcount - ", e);
  }
};

const getWareHouse = async ({ ObjItem, url }) => {
  try {
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });
    let content = await axios({
      httpsAgent: agent,
      url,
      method: "GET",
      headers: {
        "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7,zh;q=0.6",
        Host: "www.ware-house.co.jp",
      },
      responseType: "arraybuffer",
    });

    content = iconv.decode(content.data, "EUC-JP");
    const $ = cheerio.load(content);

    let temp1 = content.split("var Colorme = ")[1];
    temp1 = temp1.split(";")[0];

    const colorme = JSON.parse(temp1);

    let tempProp = [];
    let tempOptions = [];
    let sizeValues = [];
    let colorValues = [];
    for (const item of colorme.product.variants) {
      const colorName = await papagoTranslate(item.option2_value, "ja", "ko");
      const findSizeObj = _.find(sizeValues, { vid: item.option1_value });
      const findColorObj = _.find(colorValues, { vid: item.option2_value });

      if (!findSizeObj && item.option1_value && item.option1_value.length > 0) {
        sizeValues.push({
          vid: item.option1_value,
          name: item.option1_value,
          korValueName: item.option1_value,
        });
      }

      if (
        !findColorObj &&
        item.option2_value &&
        item.option2_value.length > 0
      ) {
        colorValues.push({
          vid: item.option2_value,
          name: item.option2_value,
          korValueName: colorName,
        });
      }

      tempOptions.push({
        key: item.id,
        propPath: `1:${item.option1_value};2:${item.option2_value}`,
        value: `${item.option1_value} ${item.option2_value}`,
        korValue: `${item.option1_value} ${colorName}`,
        price:
          (item.option_price_including_tax >= 5000
            ? item.option_price_including_tax
            : item.option_price_including_tax + 800) + 1100,
        stock: item.stock_num ? item.stock_num : 0,
        active: true,
        disabled: false,
        attributes: [
          {
            attributeTypeName: "사이즈",
            attributeValueName: item.option1_value,
          },
          {
            attributeTypeName: "컬러",
            attributeValueName: colorName,
          },
        ],
      });
    }

    if (sizeValues.length > 0) {
      tempProp.push({
        pid: "1",
        name: "sizes",
        korTypeName: "사이즈",
        values: sizeValues,
      });
    }

    if (colorValues.length > 0) {
      tempProp.push({
        pid: "2",
        name: "colors",
        korTypeName: "컬러",
        values: colorValues,
      });
    }

    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;
  } catch (e) {
    // console.log("getWareHouse - ", e);
  }
};

const getOnitsukatiger = async ({ ObjItem, url }) => {
  try {
    const response = await axios({
      url,
      method: "get",
    });
    let content = response.data;

    const temp2 = content
      .split('"[data-role=swatch-options]": ')[1]
      .split("</script>")[0];
    let dataJson = JSON.parse(`{"dataOptions": ${temp2}`);

    dataJson = dataJson.dataOptions["Magento_Swatches/js/swatch-renderer"];

    let tempProp = [];
    let tempOptions = [];
    for (const key of Object.keys(dataJson.jsonConfig.attributes)) {
      const propObj = dataJson.jsonConfig.attributes[key];
      const korTypeName = await papagoTranslate(propObj.code, "en", "ko");
      tempProp.push({
        pid: key,
        name: propObj.code,
        korTypeName,
        values: propObj.options.map((item) => {
          return {
            vid: item.id,
            name: item.label,
            korValueName: item.label,
          };
        }),
      });
    }

    for (const key of Object.keys(dataJson.jsonConfig.index)) {
      const indexObj = dataJson.jsonConfig.index[key];

      let propPath = "";
      let value = "";
      let korValue = "";
      let attributes = [];
      for (const subKey of Object.keys(indexObj)) {
        if (propPath.length !== 0) {
          propPath += `;`;
        }
        propPath += `${subKey}:${indexObj[subKey]}`;

        const propObj = _.find(tempProp, { pid: subKey });
        const findPropValue = _.find(propObj.values, {
          vid: indexObj[subKey].toString(),
        });
        if (value.length > 0) {
          value = " ";
        }
        if (korValue.length > 0) {
          korValue = " ";
        }
        value += `${findPropValue.name}`;
        korValue += `${findPropValue.korValueName}`;

        attributes.push({
          attributeTypeName: propObj.korTypeName,
          attributeValueName: findPropValue.korValueName,
        });
      }

      let price = Number(
        dataJson.jsonConfig.optionPrices[key].finalPrice.amount.toFixed(0)
      );

      let quantityUrl = `https://www.onitsukatiger.com/jp/ja-jp/inventory_catalog/product/getQty/?sku=${dataJson.jsonConfig.sku[key]}&channel=website&salesChannelCode=base`;
      let stock = 0;
      const response = await axios({
        url: quantityUrl,
        method: "get",
      });

      if (response.data && response.data.qty) {
        stock = response.data.qty;
      }
      await sleep(500);
      tempOptions.push({
        key: dataJson.jsonConfig.sku[key],
        propPath,
        value,
        korValue,
        stock,
        price: price >= 11000 ? price : price + 550,
        weight: 1,
        active: true,
        disabled: false,
        attributes,
      });
    }

    // console.log("tempProp", tempProp);
    // console.log("tempOtpinos", tempOptions);
    // for (const item of dataJson.jsonConfig.images) {
    //   console.log("images == ", item);
    // }

    // for (const item of dataJson.jsonConfig.optionPrices) {
    //   console.log("optionPrices == ", item);
    // }

    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;
  } catch (e) {
    // console.log("getOnitsukatiger - ", e);
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

const decodeUnicode = (unicodeString) => {
  var r = /\\u([\d\w]{4})/gi;
  unicodeString = unicodeString.replace(r, function (match, grp) {
    return String.fromCharCode(parseInt(grp, 16));
  });
  return unescape(unicodeString);
};
