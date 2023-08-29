const axios = require("axios");
const cheerio = require("cheerio");
const url = require("url");
const Cookie = require("../models/Cookie");
const { papagoTranslate } = require("./translate");
const { AmazonAsin, extractWeight } = require("../lib/userFunc");
const he = require("he");
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
        await getUniqlo({ ObjItem, url });
        break;
      case url.includes("charleskeith.jp"):
        await getCharleskeith({ ObjItem, url });
        break;
      case url.includes("crocs.co.jp"):
        await getCrocs({ ObjItem, url });
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

    let detailHtml = $(".product_text.locondo > div").html();

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
      ObjItem.weight = weight;
    }

    ObjItem.html += `
    <br>
    <h1>${ObjItem.korTitle}</h1>
    `;
    ObjItem.html += detailHtml;
    ObjItem.html += detailTable;

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

      tempOptions.push({
        key: detailItem.supplierBarCode,
        propPath: `1:1;2:${detailItem.skuCode}`,
        value: `${stockInfo.data.commodityStock.colorName} ${detailItem.sizeLabel}`,
        korValue: `${colorName} ${detailItem.sizeLabel}`,
        price: stockInfo.data.commodityStock.unitPrice,
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

const getCrocs = async ({ ObjItem, url }) => {
  try {
    const cookie = await Cookie.findOne({
      name: "crocs",
    });

    if (!cookie || cookie.cookie.length === 0) {
      return;
    }

    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
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

    ObjItem.html += `<h1>${ObjItem.korTitle}</h1>`;
    ObjItem.html += `<h2>${product.localizedName}</h2>`;

    const $ = cheerio.load(content.data);

    const productDetail = $(".product-details-long").html();
    ObjItem.html += productDetail
      .replace(/<button\b[^>]*>.*?<\/button>/g, "")
      .replace(/<img\b[^>]*>.*?>/g, "")
      .replace(/<a\b[^>]*>.*?<\/a>/g, "");

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
        if (colorItem.colors.includes(item.color)) {
          price = colorItem.price;
        }
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
    console.log("getCrocs", e);
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
