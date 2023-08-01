const axios = require("axios");
const cheerio = require("cheerio");
const { papagoTranslate } = require("./translate");
const { AmazonAsin } = require("../lib/userFunc");
const _ = require("lodash");
const iconv = require("iconv-lite");
const searchNaverKeyword = require("./searchNaverKeyword");

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
      headers: {
        // "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7,zh;q=0.6", // 원하는 압축 방식 명시
      },
      responseEncoding: "binary",
    });
    // console.log("content.data---", iconv.decode(content.data, "EUC-KR"));
    // content = iconv.decode(content, "EUC-JP");
    const temp1 = content.data.split("_BISConfig.product = ")[1].split(";")[0];

    const jsonObj = JSON.parse(iconv.decode(temp1, "UTF-8"));

    ObjItem.brand = jsonObj.vendor;
    ObjItem.modelName = jsonObj.handle.toUpperCase();
    ObjItem.title = jsonObj.title;
    const korTitle = await papagoTranslate(ObjItem.title, "auto", "ko");
    ObjItem.korTitle = `${ObjItem.brand} ${korTitle} ${ObjItem.modelName}`;

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

    ObjItem.salePrice = jsonObj.price / 100;

    ObjItem.content = jsonObj.images.map((item) =>
      item.replace("//", "https://")
    );
    ObjItem.mainImages = [ObjItem.content[0]];

    // console.log("ObjItem", ObjItem);

    let tempProp = [];

    let tempOption = [];

    let propValues1 = [];
    let propValues2 = [];
    let propV = 1;
    for (const item of jsonObj.variants) {
      const korValue1 = await papagoTranslate(item.option1, "auto", "ko");
      const korValue2 = await papagoTranslate(item.option2, "auto", "ko");

      tempOption.push({
        key: item.id,
        value: `${item.option1} ${item.option2}`,
        korValue: `${korValue1} ${korValue2}`,
        price: item.price / 100,
        stock: item.available ? 100 : 0,
        disabled: false,
        active: true,
        weight: item.weight,
        option1: item.option1,
        option2: item.option2,
        option3: item.option3,
      });

      const findPropValeus1 = _.find(propValues1, { name: item.option1 });
      if (!findPropValeus1) {
        propValues1.push({
          vid: propV.toString(),
          name: item.option1,
          korValueName: korValue1,
        });
      }
      const findPropValeus2 = _.find(propValues2, { name: item.option2 });
      if (!findPropValeus2) {
        propValues2.push({
          vid: propV.toString(),
          name: item.option2,
          korValueName: korValue2,
        });
      }

      propV++;
    }

    let propI = 1;
    for (const item of jsonObj.options) {
      tempProp.push({
        pid: propI.toString(),
        name: item,
        korTypeName: await papagoTranslate(item, "auto", "ko"),
        values: propI === 1 ? propValues1 : propValues2,
      });
      propI++;
    }

    for (const item of tempOption) {
      let propPath = ``;
      let attributes = [];
      let attributeTypeName = ``;
      let attributeValueName = ``;
      for (const propItem of tempProp) {
        const findObj1 = _.find(propItem.values, {
          name: item.option1,
        });

        if (findObj1) {
          attributeTypeName = propItem.korTypeName;
          attributeValueName = findObj1.korValueName;

          if (propPath.length === 0) {
            propPath += `${propItem.pid}:${findObj1.vid}`;
          } else {
            propPath += `;${propItem.pid}:${findObj1.vid}`;
          }
          attributes.push({
            attributeTypeName,
            attributeValueName,
          });
        }
        const findObj2 = _.find(propItem.values, {
          name: item.option2,
        });
        if (findObj2) {
          attributeTypeName = propItem.korTypeName;
          attributeValueName = findObj2.korValueName;

          if (propPath.length === 0) {
            propPath += `${propItem.pid}:${findObj2.vid}`;
          } else {
            propPath += `;${propItem.pid}:${findObj2.vid}`;
          }

          attributes.push({
            attributeTypeName,
            attributeValueName,
          });
        }
      }

      item.propPath = propPath;

      item.attributes = attributes;
    }

    ObjItem.prop = tempProp;
    ObjItem.options = tempOption;

    const $ = cheerio.load(iconv.decode(content.data, "UTF-8"));

    ObjItem.html += jsonObj.content;
    try {
      const $sizeChat = $("._sizeChart").html();
      ObjItem.html += removeButtonTags($sizeChat);
    } catch (e) {}
    try {
      const $productInfo = $("._productInfo").html();
      ObjItem.html += removeButtonTags($productInfo);
    } catch (e) {}
    try {
      const $productHandlingo = $("._productHandling").html();
      ObjItem.html += removeButtonTags($productHandlingo);
    } catch (e) {}
    try {
      const $notes = $("._notes").html();
      ObjItem.html += removeButtonTags($notes);
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

const removeButtonTags = (html) => {
  let result = html.replace(/\n{3,}/g, "\n\n");
  result = result.replace(/\n{2}/g, "\n");
  result = result.replace(/\n/g, "<br>");
  result = result.replace(/(<br>\s*){3,}/g, "");
  result = result.replace(/(<br>\s*){2}/g, "");

  result = result.replace(/<button\b[^>]*>([\s\S]*?)<\/button>/gi, "");
  result = result.replace(/<p>((\s|<br>|\n)+)?<\/p>/gi, "");

  return result;
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
