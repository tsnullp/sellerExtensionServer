const axios = require("axios");
const https = require("https");
const cheerio = require("cheerio");
const url = require("url");
const Cookie = require("../models/Cookie");
const { papagoTranslate } = require("./translate");
const { AmazonAsin, extractWeight, sleep } = require("../lib/userFunc");
const he = require("he");
const _ = require("lodash");
const iconv = require("iconv-lite");
const searchNaverKeyword = require("./searchNaverKeyword");
const startBrowser = require("./startBrowser");
const FormData = require("form-data");

const start = async ({ url, keyword }) => {
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
        await getABCMart({ ObjItem, url, keyword });
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
    console.log("findBrand - ", e);
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

    let sizeResponse = await axios({
      url: `https://www.uniqlo.com/jp/api/commerce/v5/ja/products/size-charts?productIdsWithColorCode=${ObjItem.good_id}&httpFailure=true`,
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

    ObjItem.title = product.name;
    ObjItem.korTitle = await papagoTranslate(product.name, "auto", "ko");

    ObjItem.brand = "유니클로";
    ObjItem.modelName = "";
    if (
      product.l1Ids &&
      Array.isArray(product.l1Ids) &&
      product.l1Ids.length > 0
    ) {
      ObjItem.modelName = product.l1Ids[0];
    }
    ObjItem.korTitle =
      `${ObjItem.brand} ${ObjItem.korTitle} ${ObjItem.modelName}`.trim();

    ObjItem.categoryID = await getCategory(ObjItem.korTitle);

    let videos = [];

    product.images.sub
      .filter((item) => item.showProductsInImageLink === false)
      .map((item) => {
        if (item.image) {
          ObjItem.content.push(item.image);
        }
        if (item.video) {
          videos.push(item.video);
        }
      });

    ObjItem.html += "<br>";
    ObjItem.html += `<h1>${product.shortDescription}</h1>`;
    ObjItem.html += "<br>";
    ObjItem.html += "<h2>개요</h2>";
    ObjItem.html += product.longDescription;
    ObjItem.html += "<br>";
    ObjItem.html += "<h2>상품 상세</h2>";
    ObjItem.html += `<p>상품번호: ${product.l1Ids.join(", ")}</p>`;
    ObjItem.html += `<p>${jsonObj.i18n.translations.text_l1_split_description}</p>`;
    if (product.composition && product.composition.length > 0) {
      ObjItem.html += "<h3>소재</h3>";
      ObjItem.html += `<p>${product.composition}</p>`;
    }
    if (product.designDetail && product.designDetail.length > 0) {
      ObjItem.html += "<h3>사양</h3>";
      ObjItem.html += `<p>${product.designDetail}</p>`;
    }
    ObjItem.html += "<h3>취급</h3>";
    ObjItem.html += `<p>${product.washingInformation}</p>`;
    ObjItem.html += `<p>${product.careInstruction}</p>`;
    ObjItem.html += "<br>";
    for (const item of videos) {
      ObjItem.html += `<br>
        <video width="400" controls muted style="max-width: 800px; display: block; margin: 0 auto;">
            <source src="${item}" type="video/mp4">
        </video>
        <br>
        `;
    }

    ObjItem.mainImages = ObjItem.content.filter((item, index) => index < 10);

    for (const item of sizeResponse.data.result) {
      if (!ObjItem.content.includes(item.imageUrl)) {
        ObjItem.content.push(item.imageUrl);
      }

      if (item.sizeChart && item.sizeChart.length > 0) {
        let tempHtml = `<br><table align="center">`;
        tempHtml += `<tr>`;
        tempHtml += `<th>`;
        tempHtml += `사이즈`;
        tempHtml += `</th>`;
        for (const sizePart of item.sizeChart[0].sizeParts) {
          tempHtml += `<th>`;
          tempHtml += `${iconv.decode(sizePart.name, "UTF-8")}`;
          tempHtml += `</th>`;
        }
        tempHtml += `</tr>`;
        for (const size of item.sizeChart) {
          tempHtml += `<tr>`;
          tempHtml += `<td>`;
          tempHtml += `${size.name}`;
          tempHtml += `</td>`;
          for (const sizePart of size.sizeParts) {
            tempHtml += `<td>`;
            tempHtml += `${sizePart.value}`;
            tempHtml += `</td>`;
          }
          tempHtml += `</tr>`;
        }
        tempHtml += `</table><br><br>`;
        ObjItem.html += tempHtml;
      }
    }

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

    await translateHtml(ObjItem);
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

    ObjItem.salePrice = jsonObj.Offers.price;
    ObjItem.title = he.decode(jsonObj.name);
    ObjItem.brand = he.decode(jsonObj.brand.name);
    ObjItem.korTitle = he.decode(jsonObj.name);

    const $ = cheerio.load(iconv.decode(content.data, "UTF-8"));

    for (const item of $(".more-views").children("li")) {
      ObjItem.content.push(
        `${$(item)
          .find("img")
          .attr("src")
          .split("?")[0]
          .replace("m.jpg", "l.jpg")}`
      );
    }

    ObjItem.mainImages = ObjItem.content.filter((_, i) => i < 10);

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

    const modelName = $(
      ".product_table > table > tbody > tr:nth-child(2) > td"
    ).html();

    ObjItem.modelName = modelName.split(" ")[0];
    ObjItem.brand = "찰스앤키스";

    ObjItem.korTitle = `${ObjItem.brand} ${await papagoTranslate(
      ObjItem.title,
      "auto",
      "ko"
    )} ${ObjItem.modelName}`;

    ObjItem.categoryID = await getCategory(ObjItem.korTitle);

    let detailHtml = $(".product_text.locondo > div").html();
    if (!detailHtml || detailHtml === null) {
      detailHtml = $(".product_text.locolet > div").html();
    }
    if (detailHtml && detailHtml.length > 0) {
      detailHtml = `
        <br>
        <h2>상품 설명</h2>
        <p>${detailHtml}</p>
        <br>
      `;
    }
    let detailTable = "";
    for (const item of $(".product_table > table > tbody").children("tr")) {
      const th = $(item).find("th").text();
      const td = $(item).find("td").text();
      if (th.length > 0 && td.length > 0) {
        detailTable += "<tr>";
        detailTable += "<td>";
        detailTable += th.replace("※店舗お問い合わせ用", "").trim();
        detailTable += "</td>";
        detailTable += "<td>";
        detailTable += td.trim();
        detailTable += "</td>";
        detailTable += "</tr>";
      }
    }

    if (detailTable.length > 0) {
      detailTable = `
      <br>
      <h2>상품 상세</h2>
      <table align="center">
      ${detailTable}
      </table>
      <br><br>
      `;
    }

    const weight = extractWeight(detailTable);

    if (weight) {
      ObjItem.weight = weight * 2;
    }

    ObjItem.html += `
    <br>
    <h1>${ObjItem.korTitle}</h1>
    `;
    ObjItem.html += detailHtml;
    ObjItem.html += detailTable;

    await translateHtml(ObjItem);

    if (ObjItem.mainImages.length === 0 && ObjItem.content.length > 0) {
      ObjItem.mainImages = [ObjItem.content[0]];
    }

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

    ObjItem.title = product.name;

    ObjItem.korTitle = await papagoTranslate(ObjItem.title, "ja", "ko");

    ObjItem.brand = "크록스";
    ObjItem.modelName = productID;
    ObjItem.korTitle = `${ObjItem.brand} ${ObjItem.korTitle} ${ObjItem.modelName}`;

    ObjItem.categoryID = await getCategory(ObjItem.korTitle);

    ObjItem.html += `<h1>${ObjItem.korTitle}</h1>`;
    ObjItem.html += `<h2>${product.localizedName}</h2>`;

    const $ = cheerio.load(content.data);

    const productDetail = $(".product-details-long").html();
    ObjItem.html += productDetail
      .replace(/<button\b[^>]*>.*?<\/button>/g, "")
      .replace(/<img\b[^>]*>.*?>/g, "")
      .replace(/<a\b[^>]*>.*?<\/a>/g, "");

    await translateHtml(ObjItem);

    const weight = extractWeight(ObjItem.html);

    if (weight) {
      ObjItem.weight = weight * 2;
    }

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

    // console.log("jsonObj", jsonObj);

    ObjItem.brand = "반스아웃피터스";
    ObjItem.salePrice = jsonObj.price;
    ObjItem.modelName = jsonObj.handle.toUpperCase();
    ObjItem.title = jsonObj.title;
    ObjItem.korTitle = await papagoTranslate(jsonObj.title, "auto", "ko");
    ObjItem.korTitle = `${ObjItem.brand} ${ObjItem.korTitle} ${ObjItem.modelName}`;

    ObjItem.categoryID = await getCategory(ObjItem.korTitle);

    ObjItem.html += `<h1>${ObjItem.korTitle}</h1>`;
    ObjItem.html += `<br>`;
    ObjItem.html += jsonObj.content;

    await translateHtml(ObjItem);

    ObjItem.content = jsonObj.images.map((item) => {
      return `https:${item.split("?")[0]}`;
    });

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

    if (ObjItem.mainImages.length === 0) {
      ObjItem.mainImages = ObjItem.content.filter((_, i) => i < 10);
    }
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

    ObjItem.brand = "아식스";
    ObjItem.title = jsonObj.page_name;

    // ObjItem.korTitle = await papagoTranslate(ObjItem.title, "auto", "ko");
    ObjItem.korTitle = ObjItem.title;

    let color = await papagoTranslate(jsonObj.product_variant[0], "auto", "ko");
    color = `${color} ${jsonObj.product_color[0]}`;

    ObjItem.salePrice = Number(jsonObj.product_unit_price[0]);

    ObjItem.modelName = jsonObj.product_style.join(" ");

    ObjItem.korTitle = `${ObjItem.brand} ${ObjItem.korTitle} ${color} ${ObjItem.modelName}`;
    ObjItem.categoryID = await getCategory(ObjItem.korTitle);

    const imageElements = await page.$$("li.thumb > a");

    for (const elem of imageElements) {
      let src = await page.evaluate((el) => el.getAttribute("href"), elem);
      ObjItem.content.push(src);
    }

    ObjItem.mainImages = ObjItem.content.filter((_, index) => index < 10);

    ObjItem.html += `<h1>${ObjItem.korTitle}</h1>`;
    ObjItem.html += `<br>`;

    try {
      const classification = await page.$eval(
        ".product-classification",
        (element) => element.textContent
      );

      if (classification) {
        ObjItem.html += `<h2>${classification.trim()}</h2>`;
        ObjItem.html += `<br>`;
      }
    } catch (e) {}

    try {
      const hookContent = await page.$eval(
        ".product-hook-content-small",
        (element) => element.textContent
      );

      if (hookContent) {
        ObjItem.html += `<h3>${hookContent.trim()}</h3>`;
        ObjItem.html += `<br>`;
      }
    } catch (e) {}

    const description = await page.$eval(
      ".product-info-section-inner",
      (element) => element.innerHTML
    );
    ObjItem.html += description;
    ObjItem.html += `<br>`;

    try {
      const sizeTable = await page.$eval(
        "._sizePickerContainer_6010e",
        (element) => element.innerHTML
      );

      if (sizeTable) {
        const $ = cheerio.load(sizeTable);
        // 모든 버튼 요소 선택
        const buttons = $("button");

        // 각 버튼의 span 태그 안에 있는 텍스트를 추출하여 버튼 대신에 넣음
        buttons.each(function () {
          const spanText = $(this).find("span").text();
          $(this).replaceWith(spanText);
        });

        const allTags = $("*");

        // 모든 태그의 style 속성 삭제
        allTags.each(function () {
          $(this).removeAttr("style");
        });

        ObjItem.html += $.html();
        ObjItem.html += `<br><br>`;
      }
    } catch (e) {}

    await translateHtml(ObjItem);

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

    ObjItem.brand = "스투시";
    ObjItem.modelName = jsonObj.product;
    ObjItem.title = jsonObj.title;
    ObjItem.korTitle = await papagoTranslate(jsonObj.title, "auto", "ko");

    ObjItem.content = jsonObj.images.map((item) => {
      return `https:${item.split("?")[0]}`;
    });

    ObjItem.mainImages = ObjItem.content.filter((_, i) => i < 10);

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

    const sizeResponse = await axios.request({
      method: "GET",
      url: "https://app.kiwisizing.com/api/getSizingChart?shop=stussy-japan.myshopify.com",
      params: {
        product: jsonObj.product,
        title: jsonObj.title,
        tags: jsonObj.tags,
        type: jsonObj.type,
        vendor: jsonObj.vendor,
        collections: jsonObj.collections,
      },
    });

    ObjItem.korTitle = `${ObjItem.brand} ${ObjItem.korTitle} ${color}`;

    ObjItem.categoryID = await getCategory(ObjItem.korTitle);

    ObjItem.html += `<h1>${ObjItem.korTitle}</h1>`;
    ObjItem.html += `<br>`;
    ObjItem.html += productJSON.description;

    let tableHtml = "";
    if (sizeResponse && sizeResponse.data && sizeResponse.data.sizings) {
      for (const item of sizeResponse.data.sizings) {
        tableHtml += `<br>`;
        tableHtml += `<h2>사이즈 안내</h2>`;
        tableHtml += `<table border="1">`;

        for (const key of Object.keys(item.tables)) {
          for (const sizeItem of item.tables[key].data) {
            tableHtml += `<tr>`;
            for (const tableItem of sizeItem) {
              let value = tableItem.value;
              if (Number(value) && tableItem.unitType === "in") {
                value = (Number(value) * 2.54).toFixed(1);
              }
              tableHtml += `<td>${value}</td>`;
            }
            tableHtml += `</tr>`;
          }
          tableHtml += `</table>`;
        }
      }

      ObjItem.html += tableHtml;

      await translateHtml(ObjItem);
    }
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

    const $ = cheerio.load(content);

    let colorImages = [];
    for (const item of $(".cart_color_list").children("li")) {
      const name = $(item).find("img").attr("alt");
      const image = `https:${
        $(item).find("img").attr("src").split("-")[0]
      }.jpg`;
      ObjItem.mainImages.push(image);
      colorImages.push({
        name,
        image,
      });
    }
    for (const item of $(".item_detail_gallery > ul").children("li")) {
      let image = `https:${$(item).find("img").attr("src").split("-")[0]}.jpg`;
      if (!ObjItem.mainImages.includes(image)) {
        ObjItem.content.push(image);
      }
    }

    let detailTable = null;
    try {
      detailTable = $(".item_detail_table").html();
      const weight = extractWeight(detailTable);

      if (weight) {
        ObjItem.weight = weight;
      }
    } catch (e) {}

    ObjItem.brand = "노스페이스";
    const temp1 = content.split("var _product_structured = ");

    const tempProp = [];
    const tempOptions = [];

    const colorValues = [];
    const sizeValues = [];

    let description = "";
    for (const productStr of temp1.filter((_, i) => i > 0)) {
      const temp2 = productStr
        .split("if ( docs.length == 0 ) {")[0]
        .trim()
        .replace(
          /"aggregateRating":\s*{[^}]*}/g,
          '"aggregateRating": {"@type": "AggregateRating", "ratingValue": "0.0", "bestRating": "0.0", "worstRating": "0.0", "ratingCount": 0}'
        );

      const productStructured = JSON.parse(temp2);

      description = productStructured.description
        .replace("ジップインジップ（メンズ）対応品番はこちら≫≫", "")
        .replace("取扱説明書はこちら ≫≫", "")
        .replace("●GOLDWIN WEB STORE 限定販売品番", "")
        .replace("●店頭取り寄せ注文についてはご利用いただけません。", "")
        .replace("●GOLDWIN WEB STORE・一部直営店 限定販売品番カラー", "")
        .replace(
          "※ZI Magne Systemは、既存のZip in Zip Systemには対応しておりません。",
          ""
        )
        .replace(
          "ジップインマグネシステム（ユニセックス）対応品番はこちら≫≫",
          ""
        )
        .replace("製品を安全にご使用頂くための注意事項", "")
        .replace("※ご購入前に必ずご一読ください。 ≫≫", "")
        .replace("WEB STORE・一部直営店 限定販売品番", "")
        .replace("▼収納方法", "")
        .replace(
          "THE NORTH FACEの長きにわたり愛され続けるバッグのカラーカスタマイズが可能に。詳細はこちら≫≫",
          ""
        )
        .replace("はこちら ≫≫", "")
        .replace(
          "フットプリント/ジオドーム 4（寸法：210×220cm）はこちら ≫≫",
          ""
        );

      ObjItem.title = productStructured.name;
      ObjItem.modelName = productStructured.item_group_id;
      ObjItem.salePrice = productStructured.offers.price;

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
        const findColorImage = _.find(colorImages, {
          name: productStructured.color,
        });
        if (findColorImage) {
          image = findColorImage.image;
        }
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
        weight: ObjItem.weight,
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

    ObjItem.korTitle = await papagoTranslate(ObjItem.title, "auto", "ko");
    ObjItem.korTitle = `${ObjItem.brand} ${ObjItem.korTitle} ${ObjItem.modelName}`;

    ObjItem.categoryID = await getCategory(ObjItem.korTitle);

    ObjItem.html += `<h1>${ObjItem.korTitle}</h1>`;
    ObjItem.html += `<br>`;
    if (description.length > 0) {
      ObjItem.html += `<h2>아이템 정보</h2>`;
      ObjItem.html += `<br>`;
      ObjItem.html += `<p>${description}</p>`;
      ObjItem.html += `<br>`;
      if (detailTable) {
        ObjItem.html += detailTable;
        ObjItem.html += `<br>`;
      }
    }

    try {
      const sizeTable = content
        .split(`$("#measureText").append('`)[1]
        .split("');")[0];
      if (sizeTable && sizeTable.length > 0) {
        ObjItem.html += `<h2>사이즈 정보</h2>`;
        ObjItem.html += `<br>`;
        ObjItem.html += sizeTable
          .replace("width='400'", "")
          .replace("border='0'", "border='1'");
        ObjItem.html += `<br>`;
      }
    } catch (e) {}

    await translateHtml(ObjItem);
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

    const $ = cheerio.load(content);

    ObjItem.brand = "반스";
    ObjItem.title = productJson.name;
    ObjItem.korTitle = ObjItem.title;
    ObjItem.modelName = productJson.mpn;

    ObjItem.salePrice = productJson.offers.price;

    ObjItem.content = productJson.image;
    ObjItem.mainImages = ObjItem.content.filter((item, index) => index < 1);

    let tempProp = [];
    let tempOptions = [];

    let color = $("span.color > span.attr-display-value").text();
    color = await papagoTranslate(color, "auto", "ko");

    let sizeValues = [];

    let bullets = null;
    let material = null;
    let origin = null;
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

          if (variationResponse.product.bullets) {
            bullets = variationResponse.product.bullets;
          }
          if (variationResponse.product.material) {
            material = variationResponse.product.material;
          }
          if (variationResponse.product.origin) {
            origin = variationResponse.product.origin;
          }
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

    ObjItem.korTitle = await papagoTranslate(ObjItem.title, "auto", "ko");
    ObjItem.korTitle = `${ObjItem.brand} ${ObjItem.korTitle} ${color} ${ObjItem.modelName}`;

    ObjItem.categoryID = await getCategory(ObjItem.korTitle);

    ObjItem.html += `<h1>${ObjItem.korTitle}</h1>`;
    ObjItem.html += `<br>`;

    if (productJson.description && productJson.description.length > 0) {
      ObjItem.html += `<h2>상품에 대해</h2>`;
      ObjItem.html += `${productJson.description}`;
      ObjItem.html += `<br>`;
    }

    if (bullets && bullets !== "-") {
      ObjItem.html += `<h2>특징</h2>`;
      ObjItem.html += `${bullets}`;
      ObjItem.html += `<br>`;
    }

    if (material && material !== "-") {
      ObjItem.html += `<h2>소재</h2>`;
      ObjItem.html += `${material}`;
      ObjItem.html += `<br>`;
    }

    if (origin && origin !== "-") {
      ObjItem.html += `<h2>원산지</h2>`;
      ObjItem.html += `${origin}`;
      ObjItem.html += `<br>`;
    }

    await translateHtml(ObjItem);
  } catch (e) {
    // console.log("getVans ", e);
  }
};

const getConverse = async ({ ObjItem, url }) => {
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
      // responseEncoding: "binary",
    });

    // console.log("---content-- ", content.data);
    const $ = cheerio.load(content.data);

    let color = $(".current__color > .color-name").text();

    color = await papagoTranslate(color, "auto", "ko");

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
    ObjItem.brand = "캔버스";
    ObjItem.title = productJson.title;
    ObjItem.korTitle = await papagoTranslate(productJson.title, "auto", "ko");
    ObjItem.modelName = productJson.handle;
    ObjItem.salePrice = productJson.price / 100;

    ObjItem.korTitle = `${ObjItem.brand} ${ObjItem.korTitle} ${color} ${ObjItem.modelName}`;

    ObjItem.categoryID = await getCategory(ObjItem.korTitle);

    ObjItem.html += `<h1>${ObjItem.korTitle}</h1>`;
    ObjItem.html += `<br>`;

    if (productJson.description && productJson.description.length > 0) {
      ObjItem.html += `<h2>상품에 대해</h2>`;
      ObjItem.html += `${productJson.description
        .replace(/<a\b[^>]*>(.*?)<\/a>/gi, "")
        .replace(
          "※シューレースお取替えの際には下記のサイズ対応表をご参照ください。",
          ""
        )}`;
      ObjItem.html += `<br>`;
    }

    let detailTable = "";
    let td1 = [];
    let td2 = [];
    for (const item of $(".product-single__description--add").children("dt")) {
      td1.push($(item).text());
    }
    for (const item of $(".product-single__description--add").children("dd")) {
      td2.push($(item).text());
    }

    if (td1.length > 0 && td1.length === td1.length) {
      detailTable += `<table border="1">`;
      let i = 0;
      for (const item of td1) {
        detailTable += `<tr>`;
        detailTable += `<td>${item}</td>`;
        detailTable += `<td>${td2[i++]}</td>`;
        detailTable += `</tr>`;
      }
      detailTable += `</table>`;

      ObjItem.html += `<br>`;
      ObjItem.html += `<h2>상품 상세</h2>`;
      ObjItem.html += detailTable;
      ObjItem.html += `<br>`;
    }

    let sizeTable = $("table.item_size_").html();

    if (sizeTable && sizeTable.length > 0) {
      ObjItem.html += `<br>`;
      ObjItem.html += `<h2>사이즈</h2>`;
      ObjItem.html += `<table border="1" >${sizeTable}</table>`;
      ObjItem.html += `<br>`;
    }
    await translateHtml(ObjItem);

    ObjItem.mainImages = [`https:${productJson.featured_image}`];
    ObjItem.content = productJson.images.map((item) => {
      return `https:${item}`;
    });

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

const getABCMart = async ({ ObjItem, url, keyword }) => {
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

    if (keyword && keyword.length > 0) {
      ObjItem.brand = keyword;
    } else {
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
    }

    ObjItem.salePrice = Number(jsonObj.offers.price);
    let color = null;
    let categoryName = null;
    for (const item of $(".goodsspec").find("tr")) {
      let th = $(item).find("th").text().trim();
      let td = $(item).find("td").text().trim();

      if (th === "商品名") {
        ObjItem.title = td;
      } else if (th === "カテゴリ") {
        categoryName = await papagoTranslate(td, "ja", "ko");
      } else if (th === "メーカー品番") {
        ObjItem.modelName = td;
      } else if (th === "カラー") {
        color = await papagoTranslate(td, "auto", "ko");
      }
    }

    ObjItem.korTitle = await papagoTranslate(ObjItem.title, "auto", "ko");

    ObjItem.korTitle = `${ObjItem.brand} ${categoryName ? categoryName : ""} ${
      ObjItem.korTitle
    } ${color ? color : ""} ${ObjItem.modelName}`;

    ObjItem.categoryID = await getCategory(ObjItem.korTitle);

    for (const item of $(".js-slick-product").children(".img_item")) {
      ObjItem.content.push($(item).find("img").attr("data-zoom-image"));
    }

    ObjItem.mainImages = [ObjItem.content[0]];

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

    ObjItem.html += `<h1>${ObjItem.korTitle}</h1>`;
    ObjItem.html += `<br>`;
    if (jsonObj.description.length > 0) {
      ObjItem.html += `<p>${jsonObj.description.replace(
        "<br><br>※ご注文につきまして、カートに入れた時点で在庫は確保されません。<br>また、ご利用ガイド内でご説明差し上げておりますが、システム仕様上、ご注文完了後に在庫切れが発生する場合がございます。<br>その場合、キャンセル対応とさせていただきますので予めご了承ください。<br>ご購入後のご交換の場合、ご希望サイズ完売時にはご返品でのご案内となります。<br>人気商品の為通常の出荷スケジュールよりお時間頂戴する場合がございます。<br>商品外装箱につきましては商品を保護する梱包材の為、擦過痕や細かい傷、破れ、へこみ等が入荷した時点で生じている場合がございます。上記のような商品につきましては商品本体の破損と判断せず、仕様販売とさせて頂いておりますので、商品外装箱の痛みを理由とした交換・返品につきましては不良品対応の対象外とさせて頂きます。<br>ご購入後の初期不良については代替えの商品のご用意ができない場合、すべて返品での対応とさせていただきます。",
        ""
      )}</p>`;
    }

    let goodsspec = $(".goodsspec").html();
    if (goodsspec) {
      ObjItem.html += `<br>`;
      ObjItem.html += `<h2>상품에 대하여</h2>`;
      ObjItem.html += `<table border="1">${goodsspec.replace(
        /<a\b[^>]*>(.*?)<\/a>/gi,
        "$1"
      )}</table>`;
    }

    let goodscomment1 = $(".goodscomment1").html();
    if (goodscomment1) {
      ObjItem.html += `<br>`;
      ObjItem.html += `<h2>반드시 읽어주세요.</h2>`;
      ObjItem.html += goodscomment1;
    }

    await translateHtml(ObjItem);
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

    ObjItem.brand = "비비안웨스트우드";
    ObjItem.title = $(".c-quick-view__name").text();
    ObjItem.korTitle = await papagoTranslate(ObjItem.title, "ja", "ko");

    let color = $("#selected_color").text();

    color = await papagoTranslate(color, "ja", "ko");

    for (const item of $(".js-item-detail-slide").children(
      ".c-item-detail-pictures__item"
    )) {
      let image = null;
      if ($(item).find("img").attr("src")) {
        image = $(item).find("img").attr("src");
      } else {
        image = $(item).find("img").attr("data-src");
      }
      if (image) {
        ObjItem.content.push(image);
      }
    }
    if (ObjItem.content.length > 0) {
      ObjItem.mainImages = [ObjItem.content[0]];
    }

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
        price:
          ObjItem.salePrice >= 27500
            ? ObjItem.salePrice
            : ObjItem.salePrice + 815,
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

    let description = $(".-is-description > p.c-item-info__text").html();

    ObjItem.html += `<h1>${ObjItem.korTitle}</h1>`;
    ObjItem.html += `<br>`;
    if (description && description.length > 0) {
      ObjItem.html += `<h2>상품설명</h2>`;
      ObjItem.html += description;
    }

    let detail = "";
    for (const item of $(".-is-detail > ul.c-item-info__list").children("li")) {
      let text = $(item).text();
      if (!text.includes("返品")) {
        detail += `<p>${text}</p>`;
      }

      if (text.includes("商品番号：")) {
        ObjItem.modelName = text.replace("商品番号：", "").trim();
      }
    }

    if (detail && detail.length > 0) {
      ObjItem.html += `<h2>상세</h2>`;
      ObjItem.html += detail;
      ObjItem.html += `<br>`;
    }

    let sizeHtml = "";
    for (const item of $(".-is-size > ul.c-item-info__list").children("li")) {
      let text = $(item).text();
      sizeHtml += `<p>${text}</p>`;
    }

    if (sizeHtml && sizeHtml.length > 0) {
      ObjItem.html += `<h2>사이즈</h2>`;
      ObjItem.html += sizeHtml;
      ObjItem.html += `<br>`;
    }

    ObjItem.korTitle = `${ObjItem.brand} ${ObjItem.korTitle} ${
      color ? color : ""
    } ${ObjItem.modelName ? ObjItem.modelName : ""}`.trim();

    ObjItem.categoryID = await getCategory(ObjItem.korTitle);

    await translateHtml(ObjItem);
  } catch (e) {
    // console.log("getViviennewestwood", e);
  }
};

const getMiharayasuhiro = async ({ ObjItem, url }) => {
  const browser = await startBrowser(true);
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(true);
  try {
    // const agent = new https.Agent({
    //   rejectUnauthorized: false,
    // });

    // let content = await axios({
    //   httpsAgent: agent,
    //   method: "get",
    //   url,
    //   method: "GET",
    //   headers: {
    //     "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
    //     Host: "miharayasuhiro.jp",
    //     "User-Agent":
    //       "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
    //   },
    //   responseType: "binary",
    // });

    await page.goto(url, { waituntil: "networkidle0" });
    const content = await page.content();

    const $ = cheerio.load(content);

    ObjItem.brand = "미하라야스히로";
    let title = $("#item_spec_tit").text();
    ObjItem.title = title;

    ObjItem.korTitle = await papagoTranslate(title, "auto", "ko");

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
          price: ObjItem.price,
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

    for (const item of $(".item_photo_thumb > ul").children("li")) {
      let image = $(item).find("img").attr("data-src");
      if (image) {
        image = image.split("?")[0];
      }
      if (!ObjItem.mainImages.includes(image)) {
        ObjItem.content.push(image);
      }
    }

    const itemDetail = $("#item_detail_txt")
      .html()
      .replace(/<p class="mg_t10">.*?<\/p>/g, "");

    if (itemDetail) {
      ObjItem.html += `<h2>이 상품에 대해</h2>`;
      ObjItem.html += itemDetail;
      ObjItem.html += `<br>`;
    }

    let itemDetailSub = "";
    for (const item of $("#item_detail_sub > ul").children("li")) {
      let text1 = $(item).find("p:nth-child(1)").text();
      let text2 = $(item).find("p:nth-child(2)").text();
      if (!text1.includes("カテゴリ")) {
        itemDetailSub += `<li>${text1} ${text2}</li>`;
      }
      if (text1.includes("品番")) {
        ObjItem.modelName = text2;
      }
    }

    if (itemDetailSub) {
      ObjItem.html += `<ul>`;
      ObjItem.html += itemDetailSub;
      ObjItem.html += `</ul>`;
      ObjItem.html += `<br>`;
    }

    let sizeTable = "";
    let i = 0;
    let sizeTableArr = [];
    for (const ul of $("#size_table").children("ul")) {
      if (!sizeTableArr[i] || !Array.isArray(sizeTableArr[i])) {
        sizeTableArr[i] = [];
      }
      let j = 0;
      for (const li of $(ul).children("li")) {
        if (!sizeTableArr[j]) {
          sizeTableArr[j] = [];
        }
        if (!sizeTableArr[j][i] || !Array.isArray(sizeTableArr[j][i])) {
          sizeTableArr[j][i] = [];
        }

        sizeTableArr[j][i] = $(li).text();
        j++;
      }
      i++;
    }

    for (const tr of sizeTableArr) {
      sizeTable += `<tr>`;
      for (const td of tr) {
        sizeTable += `<td>${td}</td>`;
      }
      sizeTable += `</tr>`;
    }

    if (sizeTable) {
      ObjItem.html += `<h2>사이즈</h2>`;
      ObjItem.html += `<table border="1">`;
      ObjItem.html += sizeTable;
      ObjItem.html += `</table>`;
      ObjItem.html += `<br>`;
    }

    ObjItem.korTitle =
      `${ObjItem.brand} ${ObjItem.korTitle} ${ObjItem.modelName}`.trim();

    ObjItem.categoryID = await getCategory(ObjItem.korTitle);

    await translateHtml(ObjItem);
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

const getNepenthes = async ({ ObjItem, url, keyword }) => {
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

    let brand = jsonObj.type;
    if (keyword && keyword.length > 0) {
      brand = keyword;
    }

    switch (true) {
      case brand.includes("Needles"):
        brand = "니들스";
        break;
      case brand.includes("Engineered Garments"):
        brand = "엔지니어드가먼츠";
        break;
      case brand.includes("Suicoke"):
        brand = "수이코크";
        break;
      case brand.includes("Troentorp"):
        brand = "트로앤토프";
        break;
      default:
        break;
    }

    ObjItem.brand = brand;
    ObjItem.title = jsonObj.title;
    ObjItem.korTitle = await papagoTranslate(jsonObj.title, "auto", "ko");

    ObjItem.salePrice = jsonObj.price / 100;
    ObjItem.content = jsonObj.images.map((item) => {
      return `https:${item}`;
    });

    ObjItem.mainImages = [ObjItem.content[0]];

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

    ObjItem.korTitle =
      `${ObjItem.brand} ${ObjItem.korTitle} ${ObjItem.modelName}`.trim();

    ObjItem.categoryID = await getCategory(ObjItem.korTitle);

    let description = jsonObj.description
      .replace(/<meta[^>]*>/g, "")
      .replace(/<p[^>]*>(<span[^>]*>.*?<\/span>)<\/p>/g, "");

    if (description) {
      ObjItem.html += `<h2>이 상품에 대해</h2>`;
      ObjItem.html += description;
      ObjItem.html += `<br>`;
    }

    let sizeTable = $(".metafield-multi_line_text_field:nth-child(1)").html();

    if (sizeTable) {
      ObjItem.html += `<h2>사이즈</h2>`;
      ObjItem.html += sizeTable;
      ObjItem.html += `<br>`;
    }

    let infoTable = $(
      "#tab-box > div:nth-child(3) > .metafield-multi_line_text_field"
    ).html();
    if (infoTable) {
      ObjItem.html += `<h2>제품 정보</h2>`;
      ObjItem.html += infoTable;
      ObjItem.html += `<br>`;
    }

    await translateHtml(ObjItem);
  } catch (e) {
    // console.log("getNepenthes ", e);
  }
};

const getDoverstreetmarkets = async ({ ObjItem, url }) => {
  let i = 0;
  let browser = null;
  let page = null;

  while (i < 10 && !page) {
    console.log("i < 10 && page", i < 10 && !page);
    try {
      browser = await startBrowser(false);
      page = await browser.newPage();
      await page.setJavaScriptEnabled(true);
    } catch (e) {
      try {
        if (page) {
          await page.goto("about:blank");
          await page.close();
        }
        if (browser) {
          await browser.close();
        }
        await sleep(1000);
      } catch (e) {}
    } finally {
      i++;
    }
  }

  try {
    // const agent = new https.Agent({
    //   rejectUnauthorized: false,
    // });
    // let content = await axios({
    //   httpsAgent: agent,
    //   url,
    //   method: "GET",
    //   responseType: "binary",
    // });
    // content = content.data;

    await page.goto(url, { waituntil: "networkidle0" });
    await page.waitForSelector("h2.typesquare_option:nth-child(1) > button");
    await page.click("h2.typesquare_option:nth-child(1) > button");
    await page.waitForSelector("table.esc-size-guide--table");

    const content = await page.content();

    const $ = cheerio.load(content);

    const temp1 = content
      .split('<script type="application/ld+json">')[2]
      .split("</script>")[0];

    const jsonObj = JSON.parse(temp1);

    // const temp2 = content.split("var meta = ")[1].split(";")[0];

    // const productObj = JSON.parse(temp2);

    const temp3 = content.split("initData: ")[1].split(",},function")[0];

    const initData = JSON.parse(temp3);

    ObjItem.brand = "꼼데가르송";
    ObjItem.title = jsonObj.name;
    ObjItem.korTitle = await papagoTranslate(jsonObj.name, "auto", "ko");

    for (const item of $("ul.w-full").children("li.w-full")) {
      let image = $(item).find("img").attr("src");

      if (image && image.includes("//shop-jp.doverstreetmarket.com")) {
        image = `https:${image}`;
        ObjItem.content.push(image);
      }
    }

    ObjItem.mainImages = [ObjItem.content[0]];

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

    let styleHtml = $("div.max-md\\:order-last")
      .html()
      .replace(/<a\b[^>]*>(.*?)<\/a>/g, "");

    let styleCodes = [];

    if (styleHtml) {
      let styleCodePattern = /\b[A-Z]{2}-[A-Z0-9-]+\b/gi;

      styleCodes = styleHtml.match(styleCodePattern) || [];

      if (styleCodes && styleCodes.length > 0) {
        ObjItem.modelName = styleCodes[0];
      }
    }

    ObjItem.korTitle = `${ObjItem.brand} ${ObjItem.korTitle
      .replace(/ - /g, " ")
      .replace(/\(/g, "")
      .replace(/\)/g, "")} ${styleCodes.join(" ")}`;

    ObjItem.categoryID = await getCategory(ObjItem.korTitle);

    let descriptionHtml = $(
      "#shopify-section-template--15104433094918__product-main > section > div.col-span-full.md\\:col-span-3.xl\\:col-span-4.xl\\:ml-12.space-y-6.md\\:self-start.md\\:sticky.md\\:top-4.\\[\\.is-active-fullscreen_\\&\\]\\:hidden > div > div.max-md\\:order-last.text-sm.leading-xs.md\\:mb-6.last\\:mb-0.\\[\\&_\\>_\\*\\]\\:mb-4.\\[\\&_\\>_\\:last-child\\]\\:mb-0"
    ).html();

    if (descriptionHtml && descriptionHtml.length > 0) {
      ObjItem.html += `<br>`;
      ObjItem.html += `<h2>이 상품에 대하여</h2>`;
      ObjItem.html += `${descriptionHtml.replace(
        /<a\b[^>]*>(.*?)<\/a>/gi,
        ""
      )}`;
      ObjItem.html += `<br>`;
    } else if (jsonObj.description && jsonObj.description.length > 0) {
      let descriptionArr = jsonObj.description.split("/");
      ObjItem.html += `<br>`;
      ObjItem.html += `<h2>이 상품에 대하여</h2>`;
      for (const item of descriptionArr) {
        let descriptionArr2 = item.split(".");
        for (const item2 of descriptionArr2) {
          let descriptionArr3 = item2.split("。");
          for (const item3 of descriptionArr3) {
            if (item3.includes("Style") || item3.includes("style")) {
              let styleArr = item3.split("Style");
              if (styleArr.length === 2) {
                ObjItem.html += `<p>${styleArr[0]}</p>`;
                ObjItem.html += `<p>Style${styleArr[1]}</p>`;
              } else if (styleArr.length === 3) {
                ObjItem.html += `<p>${styleArr[0]}</p>`;
                ObjItem.html += `<p>Style${styleArr[1]}</p>`;
                ObjItem.html += `<p>Style${styleArr[2]}</p>`;
              } else {
                styleArr = item3.split("style");
                if (styleArr.length === 2) {
                  ObjItem.html += `<p>${styleArr[0]}</p>`;
                  ObjItem.html += `<p>Style${styleArr[1]}</p>`;
                } else if (styleArr.length === 3) {
                  ObjItem.html += `<p>${styleArr[0]}</p>`;
                  ObjItem.html += `<p>Style${styleArr[1]}</p>`;
                  ObjItem.html += `<p>Style${styleArr[2]}</p>`;
                }
              }
            } else {
              ObjItem.html += `<p>${item3}</p>`;
            }
          }
        }
      }
      ObjItem.html += `<br>`;
    }

    let sizeTable = $("table.esc-size-guide--table").html();

    if (sizeTable && sizeTable.length > 0) {
      sizeTable = `<table border="1" >${sizeTable}</table>`;
      const size$ = cheerio.load(sizeTable);
      const table = size$("table"); // 테이블 요소 선택
      // 데이터 배열 초기화
      const data = [];

      // 테이블의 각 행을 반복하면서 데이터 추출
      table.find("tr").each((rowIndex, row) => {
        const rowData = [];

        $(row)
          .find("td, th")
          .each((cellIndex, cell) => {
            const cellText = $(cell).text().trim();
            rowData.push(cellText);
          });

        // 행의 모든 셀이 비어 있지 않으면 데이터에 추가
        if (rowData.some((cellText) => cellText !== "")) {
          data.push(rowData);
        }
      });

      // HTML 표 생성
      const createHTMLTable = (data) => {
        const table = $("<table></table>");
        data.forEach((row) => {
          const tr = $("<tr></tr>");
          row.forEach((cell) => {
            const td = $("<td></td>").text(cell);
            tr.append(td);
          });
          table.append(tr);
        });
        return table;
      };

      // 데이터를 HTML 표로 변환
      sizeTable = createHTMLTable(data);

      ObjItem.html += `<br>`;
      ObjItem.html += `<h2>사이즈</h2>`;
      ObjItem.html += `<table border="1">${sizeTable.html()}</table>`;
      ObjItem.html += `<br>`;
    }

    await translateHtml(ObjItem);
  } catch (e) {
    // console.log("getDoverstreetmarkets ", e);
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

    ObjItem.brand = "타이틀리스트";
    ObjItem.title = $(".product_title.entry-title").text();
    ObjItem.korTitle = await papagoTranslate(ObjItem.title, "ja", "ko");

    const mainContentHtml = $("div.main_content > p")
      .not(":last-child")
      .not(":nth-last-child(2)");
    let mainContentDescription = "";
    for (const element of mainContentHtml) {
      mainContentDescription += `<p>${$(element).text()}</p>`;
    }

    if (mainContentDescription.length > 0) {
      ObjItem.html += `<h2>이 상품에 대해</h2>`;
      ObjItem.html += mainContentDescription;
      ObjItem.html += `<br>`;
    }

    const spceHtml = $("ul.product_spec > li");
    let specDescription = "";
    for (const element of spceHtml) {
      let spec = $(element).text();
      if (spec.includes("品番")) {
        ObjItem.modelName = spec.split("：")[1];
      }
      if (spec.includes("重量")) {
        const weight = extractWeight(spec);
        if (weight) {
          ObjItem.weight = weight;
        }
      }
      if (spec.includes("サイズ")) {
        spec = spec.replace("サイズ：サイズガイドはこちらサイズ", "");
      }

      specDescription += `<p>${spec}</p>`;
    }

    if (specDescription.length > 0) {
      ObjItem.html += `<h2>사양</h2>`;
      ObjItem.html += specDescription;
      ObjItem.html += `<br>`;
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

          if (image && !ObjItem.mainImages.includes(image)) {
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

      // const selectElement = await page.$(".select-menu > select");
      // const optionElement = await page.$$(".select-menu > select > option");

      // // for (const option of optionElement) {
      // //   const optionText = await option.evaluate((node) => node.textContent);

      // //   if (optionText === "選択してください") {
      // //     continue;
      // //   }
      // //   await page.select(".select-menu > select", optionText);

      // //   await page.waitFor(1000);
      // //   // 다음 옵션을 선택하기 위해 다시 select 요소를 클릭
      // //   await page.waitForSelector("p.stock");
      // //   const stockElement = await page.$("p.stock");

      // //   // 선택한 요소의 텍스트 내용을 가져오기
      // //   const stockText = await page.evaluate(
      // //     (stockElement) => stockElement.textContent,
      // //     stockElement
      // //   );

      // //   const name = optionText;
      // //   const korValueName = await papagoTranslate(name, "ja", "ko");

      // //   // 정규 표현식을 사용하여 숫자만 추출
      // //   const numberPattern = /(\d{1,3}(,\d{3})*(\.\d+)?)|(\.\d+)/;
      // //   let matches = stockText.match(numberPattern);

      // //   // 숫자 값 가져오기
      // //   let stockNumber = null;
      // //   if (matches && matches.length > 0) {
      // //     const matchedText = matches[0].replace(/,/g, "");
      // //     stockNumber = parseFloat(matchedText);
      // //   } else {
      // //     if (stockText === "在庫あり") {
      // //       stockNumber = 5;
      // //     } else {
      // //       stockNumber = 0;
      // //     }
      // //   }

      // //   const priceElement = await page.$("span.woocommerce-Price-amount");

      // //   // 선택한 요소의 텍스트 내용을 가져오기
      // //   const priceText = await page.evaluate(
      // //     (priceElement) => priceElement.textContent,
      // //     priceElement
      // //   );

      // //   let priceNumber = 0;
      // //   matches = priceText.match(numberPattern);
      // //   if (matches && matches.length > 0) {
      // //     const matchedText = matches[0].replace(/,/g, "");
      // //     priceNumber = parseFloat(matchedText);
      // //   }

      // //   let image = null;
      // //   try {
      // //     const imageElement = await page.$("div.flex-active-slide");
      // //     const imgElementHandle = await imageElement.$("img");
      // //     // 선택한 요소의 텍스트 내용을 가져오기
      // //     const imageSrc = await page.evaluate(
      // //       (img) => img.getAttribute("src"),
      // //       imgElementHandle
      // //     );

      // //     if (imageSrc) {
      // //       image = imageSrc.replace("-600x600", "");
      // //       ObjItem.mainImages.push(image);
      // //     }
      // //   } catch (e) {}

      // //   await selectElement.click();

      // //   propValues.push({
      // //     vid: i.toString(),
      // //     name,
      // //     korValueName,
      // //     image,
      // //   });

      // //   tempOptions.push({
      // //     key: i.toString(),
      // //     propPath: `1:${i.toString()}`,
      // //     value: name,
      // //     korValue: korValueName,
      // //     price: priceNumber >= 11000 ? priceNumber : priceNumber + 660,
      // //     stock: stockNumber,
      // //     weight: ObjItem.weight ? ObjItem.weight : 1,
      // //     active: true,
      // //     disabled: false,
      // //     attributes: [
      // //       {
      // //         attributeTypeName: optionName,
      // //         attributeValueName: korValueName,
      // //       },
      // //     ],
      // //   });

      // //   i++;
      // // }
    } else {
      // const stockElement = await page.$("p.stock");

      // // 선택한 요소의 텍스트 내용을 가져오기
      // const stockText = await page.evaluate(
      //   (stockElement) => stockElement.textContent,
      //   stockElement
      // );

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

    for (const item of $("ol.flex-control-thumbs").children("li")) {
      let image = $(item).find("img").attr("src").replace("-100x100", "");

      if (image && image.includes("jpg")) {
        ObjItem.content.push(image);
      }
    }

    if (ObjItem.content.length === 0) {
      for (const item of $(".woocommerce-product-gallery__wrapper").children(
        ".woocommerce-product-gallery__image"
      )) {
        let image = $(item)
          .find("img")
          .attr("src")
          .replace("-100x100", "")
          .replace("-600x600", "");

        if (image && image.includes("jpg")) {
          ObjItem.content.push(image);
        }
      }
    }

    if (ObjItem.content.length === 0) {
      let image = $("img.zoomImg").attr("src");

      ObjItem.content.push(image);
    }

    if (ObjItem.mainImages.length === 0) {
      ObjItem.mainImages = [ObjItem.content[0]];
    }

    await translateHtml(ObjItem);

    ObjItem.korTitle = `${ObjItem.brand} ${ObjItem.korTitle} ${
      ObjItem.modelName ? ObjItem.modelName : ""
    }`.trim();
    ObjItem.categoryID = await getCategory(ObjItem.korTitle);
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

    ObjItem.brand = "아미아칼바";

    ObjItem.title = $("#item_txt > h2").text();
    ObjItem.korTitle = await papagoTranslate(ObjItem.title, "en", "ko");
    ObjItem.modelName = colorme.product.model_number;

    ObjItem.korTitle =
      `${ObjItem.brand} ${ObjItem.korTitle} ${ObjItem.modelName}`.trim();
    ObjItem.categoryID = await getCategory(ObjItem.korTitle);

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

    for (const item of $("#ss_sub").children("a")) {
      let image = $(item).find("img").attr("src").split("?")[0];
      if (image) {
        ObjItem.content.push(image);
      }
    }

    ObjItem.mainImages = [ObjItem.content[0]];

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

    await translateHtml(ObjItem);
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

    ObjItem.brand = "오디너리핏츠";
    ObjItem.title = jsonObj.name;
    ObjItem.modelName = jsonObj.model_number;
    ObjItem.korTitle = await papagoTranslate(ObjItem.title, "en", "ko");
    ObjItem.korTitle = `${ObjItem.brand} ${ObjItem.korTitle} ${
      ObjItem.modelName ? ObjItem.modelName : ""
    }`.trim();
    ObjItem.categoryID = await getCategory(ObjItem.korTitle);

    ObjItem.mainImages = [jsonObj.image_url.split("?")[0]];
    ObjItem.content = jsonObj.images.map((item) => item.src.split("?")[0]);

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

    // ObjItem.html += jsonObj.expl;

    let descriptionHtml = $(".tan-l").html();

    descriptionHtml = descriptionHtml.replace(
      /<div class="mg-wrap">[\s\S]*$/,
      ""
    );

    if (descriptionHtml) {
      ObjItem.html += `<h2>이 상품에 대해</h2>`;
      ObjItem.html += descriptionHtml;
      ObjItem.html += `<br>`;
    }

    let sizeTable = "";
    for (const item of $("div.mg-wrap").children(".mg-all")) {
      sizeTable += `<tr>`;
      for (const tdItem of $(item).children(".mg")) {
        const text = $(tdItem).text().trim();
        if (text.length > 0 && text !== "&nbsp;") {
          sizeTable += `<td>${text}</td>`;
        }
      }
      sizeTable += `<tr>`;
    }

    if (sizeTable && sizeTable.length > 0) {
      ObjItem.html += `<br>`;
      ObjItem.html += `<h2>사이즈 안내</h2>`;
      ObjItem.html += `<table border="1">`;
      ObjItem.html += sizeTable;
      ObjItem.html += `</table>`;
      ObjItem.html += `<br>`;
    }

    await translateHtml(ObjItem);
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

    ObjItem.brand = "풀카운트";

    ObjItem.title = $(".product-name").text().replace("【入荷】", "").trim();
    ObjItem.modelName = $(".product-code").text();

    ObjItem.korTitle = await papagoTranslate(ObjItem.title, "en", "ko");
    ObjItem.korTitle = `${ObjItem.brand} ${ObjItem.korTitle} ${
      ObjItem.modelName ? ObjItem.modelName : ""
    }`.trim();
    ObjItem.categoryID = await getCategory(ObjItem.korTitle);

    for (const item of $(".product-slider").children(".item")) {
      let image = $(item).find("a").find("img").attr("src");

      if (image) {
        ObjItem.content.push(
          image.replace(/\/\//g, "/").replace("https:/", "https://")
        );
      }
    }

    if (ObjItem.content.length > 0) {
      ObjItem.mainImages = [ObjItem.content[0]];
    }

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

    let descriptionHtml = "";
    let materialTable = "";
    for (const item of $(".text-content.description").children("p")) {
      let html = $(item).html();

      const textOnly = html.replace(/<[^>]*>/g, "").replace(/\s+/g, "");

      if (html.includes("混率") || html.includes("生地")) {
        materialTable += `<tr>${html}</tr>`;
      }
      if (
        html.includes("予約商品は") ||
        html.includes("予約") ||
        html.includes("何卒宜しくお願い申し上げます") ||
        html.includes("#ff0000;") ||
        html.includes("fullcount-online.com")
      ) {
        continue;
      }
      if (/[a-zA-Z]/.test(textOnly)) {
        html = await papagoTranslate(html, "en", "ko");
      }
      descriptionHtml += `<p>${html}</p>`;
    }

    if (descriptionHtml && descriptionHtml.length > 0) {
      ObjItem.html += `<br>`;
      ObjItem.html += `<h2>이 상품에 대하여</h2>`;
      ObjItem.html += `${descriptionHtml.replace(
        /<a\b[^>]*>(.*?)<\/a>/gi,
        ""
      )}`;
      ObjItem.html += `<br>`;
    }

    let sizeTable = null;
    for (const item of $(".text-content.description").children("table")) {
      if ($(item).html()) {
        sizeTable = $(item).html();
      }
    }
    if (!sizeTable) {
      sizeTable = $(".tab-content.size > table").html();
    }

    if (sizeTable && sizeTable.length > 0) {
      ObjItem.html += `<h2>사이즈</h2>`;
      ObjItem.html += `<table border="1">`;
      ObjItem.html += sizeTable;
      ObjItem.html += `</table>`;
      ObjItem.html += `<br>`;
    }

    if (!materialTable || materialTable.trim().length === 0) {
      materialTable = $(".tab-content.material > table").html();
      if (materialTable && materialTable.length > 0) {
        ObjItem.html += `<h2>소재</h2>`;
        ObjItem.html += `<table border="1">`;
        ObjItem.html += materialTable;
        ObjItem.html += `</table>`;
        ObjItem.html += `<br>`;
      }
    }

    await translateHtml(ObjItem);
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

    ObjItem.salePrice = colorme.product.sales_price_including_tax;
    ObjItem.brand = "웨어하우스";
    ObjItem.title = $(".productName").text();
    ObjItem.korTitle = await papagoTranslate(ObjItem.title, "en", "ko");
    ObjItem.modelName = colorme.product.model_number;
    ObjItem.korTitle = `${ObjItem.brand} ${ObjItem.korTitle} ${
      ObjItem.modelName ? ObjItem.modelName : ""
    }`.trim();
    ObjItem.categoryID = await getCategory(ObjItem.korTitle);

    for (const item of $("ul.productThumb").children("li")) {
      let image = $(item).find("a").find("img").attr("src");
      if (image) {
        ObjItem.content.push(image.split("?")[0]);
      }
    }

    if (ObjItem.content.length > 0) {
      ObjItem.mainImages = [ObjItem.content[0]];
    }

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

    let descriptionHtml = $(".explain.infoPanel > .text")
      .html()
      .replace(/<font style="vertical-align: inherit;"><\/font>/g, "");

    descriptionHtml = descriptionHtml.split(
      '<a href="#sizeguide" class="sizeGuideBtn">商品サイズの計測方法について</a>'
    )[0];
    ObjItem.html += `<h2>상품설명</h2>`;
    ObjItem.html += descriptionHtml;
    ObjItem.html += `<br>`;

    await translateHtml(ObjItem);
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

    const $ = cheerio.load(content);

    const temp2 = content
      .split('"[data-role=swatch-options]": ')[1]
      .split("</script>")[0];
    let dataJson = JSON.parse(`{"dataOptions": ${temp2}`);

    dataJson = dataJson.dataOptions["Magento_Swatches/js/swatch-renderer"];

    ObjItem.brand = "오니츠카타이거";
    ObjItem.title = $(".page-title").text();
    ObjItem.modelName = dataJson.partNo;

    ObjItem.korTitle = await papagoTranslate(ObjItem.title, "en", "ko");
    ObjItem.korTitle = `${ObjItem.brand} ${ObjItem.korTitle} ${ObjItem.modelName}`;
    ObjItem.categoryID = await getCategory(ObjItem.korTitle);

    for (const key of Object.keys(dataJson.jsonConfig.images)) {
      const imgObjArr = dataJson.jsonConfig.images[key];
      for (const imgObj of imgObjArr) {
        if (!ObjItem.content.includes(imgObj.img) && imgObj.type === "image") {
          ObjItem.content.push(imgObj.img);
        }
      }
    }

    ObjItem.mainImages = [ObjItem.content[0]];

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

    const descriptionHtml = $(".product.attribute.description").html();

    if (descriptionHtml && descriptionHtml.length > 0) {
      ObjItem.html += `<br>`;
      ObjItem.html += `<h2>상품 설명</h2>`;
      ObjItem.html += `${descriptionHtml.replace(
        /<a\b[^>]*>(.*?)<\/a>/gi,
        ""
      )}`;
      ObjItem.html += `<br>`;
    }

    const specTable = $("#product-attribute-specs-table").html();
    if (specTable && specTable.length > 0) {
      ObjItem.html += `<h2>자세한 정보</h2>`;
      ObjItem.html += `<table border="1">`;
      ObjItem.html += specTable;
      ObjItem.html += `</table>`;
      ObjItem.html += `<br>`;
    }

    await translateHtml(ObjItem);
  } catch (e) {
    // console.log("getOnitsukatiger - ", e);
  }
};

const getProductEntity = (addr) => {
  const tmepUrl = addr.split("?")[0];
  const q1 = url.parse(tmepUrl, true);
  const pathnames = q1.pathname.split("/").filter((item) => item.length > 0);
  // const temp1 = pathnames[pathnames.length - 2];
  const temp2 = pathnames[pathnames.length - 1];
  return temp2;
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

const decodeUnicode = (unicodeString) => {
  var r = /\\u([\d\w]{4})/gi;
  unicodeString = unicodeString.replace(r, function (match, grp) {
    return String.fromCharCode(parseInt(grp, 16));
  });
  return unescape(unicodeString);
};

const getCategory = async (korTitle) => {
  let category = await searchNaverKeyword({
    title: korTitle,
  });
  if (category) {
    if (category.category4Code) {
      return category.category4Code;
    } else {
      return category.category3Code;
    }
  }
};

const translateHtml = async (ObjItem) => {
  try {
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
  } catch (e) {
    console.log("333", e);
  }
};
