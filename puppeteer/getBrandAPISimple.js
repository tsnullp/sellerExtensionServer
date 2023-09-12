const axios = require("axios");
const https = require("https");
const cheerio = require("cheerio");
const url = require("url");
const { papagoTranslate } = require("./translate");
const { regExp_test, AmazonAsin } = require("../lib/userFunc");
const _ = require("lodash");
const iconv = require("iconv-lite");
const startBrowser = require("./startBrowser");

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
      "ko"
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

      tempOptions.push({
        key: detailItem.supplierBarCode,
        propPath: `1:1;2:${detailItem.skuCode}`,
        value: `${stockInfo.data.commodityStock.colorName} ${detailItem.sizeLabel}`,
        korValue: `${colorName} ${detailItem.sizeLabel}`,
        price: stockInfo.data.commodityStock.unitPrice + 500,
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
    console.log("getCharleskeith", e);
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
    console.log("getBarns ", e);
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
    console.log("getAsics", e);
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
    console.log("getStussy -- ", e);
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
    console.log("getNorthFace -- ", e);
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
    console.log("getVans ", e);
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
    console.log("getConverse-- ", e);
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
