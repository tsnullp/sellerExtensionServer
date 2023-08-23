const axios = require("axios");
const cheerio = require("cheerio");
const url = require("url");
const { papagoTranslate } = require("./translate");
const { AmazonAsin, extractWeight } = require("../lib/userFunc");
const _ = require("lodash");
const iconv = require("iconv-lite");
const searchNaverKeyword = require("./searchNaverKeyword");

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
        await getUniqlo({ ObjItem, url, userID });
        break;
      default:
        console.log("DEFAULT", url);
        break;
    }
  } catch (e) {
    console.log("findKeenAPI - ", e);
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

const getUniqlo = async ({ ObjItem, url, userID }) => {
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

    let category = await searchNaverKeyword({
      title: ObjItem.korTitle,
    });
    if (category) {
      if (category.category4Code) {
        ObjItem.categoryID = category.category4Code;
      } else {
        ObjItem.categoryID = category.category3Code;
      }
    }

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

      if (item.colorCode.length > 0) {
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
    console.log("getUniqlo", e);
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
