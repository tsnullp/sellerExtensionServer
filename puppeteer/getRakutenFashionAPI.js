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
      headers: {
        // "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7,zh;q=0.6", // 원하는 압축 방식 명시
      },
      responseEncoding: "binary",
    });

    const $ = cheerio.load(iconv.decode(content.data, "UTF-8"));

    const title = $("h1.item-name").text();
    const brand = $(
      ".related-category-list:nth-child(2) > li:last-child"
    ).text();

    const price = $("span.item-selling-price")
      .text()
      .replace(/円/, "")
      .replace(/,/g, "");

    if (keyword && keyword.length > 0) {
      ObjItem.brand = keyword;
    } else {
      ObjItem.brand = brand;
    }

    ObjItem.title = title;
    ObjItem.korTitle = await papagoTranslate(title, "auto", "ko");
    ObjItem.korTitle = `${ObjItem.brand} ${ObjItem.korTitle}`;
    ObjItem.salePrice = Number(price);

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

    for (const item of $(
      ".item-images-thumbnail-container > ul.item-images-thumbnail-list"
    ).children("li")) {
      ObjItem.content.push(
        `https:${$(item).find("img").attr("src").split("?")[0]}`
      );
    }

    let color = $(".item-sku-actions-color-text").text();
    color = color.split("：")[0].trim();

    let colors = [];

    let tempProp = [];
    let tempOptions = [];

    let vid1 = 1;
    for (const item of $("ul.item-sku-actions-color-list").children("li")) {
      let image = $(item).find("img").attr("src").split("?")[0];
      if (image) {
        image = `https:${image}`;
        ObjItem.mainImages.push(image);
      }
      colors.push({
        vid: (vid1++).toString(),
        name: $(item).attr("data-color"),
        korValueName: await papagoTranslate(
          $(item).attr("data-color"),
          "auto",
          "ko"
        ),
        image,
      });
    }

    if (colors.length === 1) {
      let colorName = colors[0].korValueName;
      if (!ObjItem.korTitle.includes(colorName)) {
        ObjItem.korTitle = `${ObjItem.korTitle} ${colorName}`;
      }
    }
    tempProp.push({
      pid: "1",
      name: color,
      korTypeName: await papagoTranslate(color, "auto", "ko"),
      values: colors,
    });

    let key = 1;
    let vid2 = 1;
    let values = [];
    let size = $(".item-sku-actions-info-caption").first().text();
    for (const item of $(".item-sku-actions").children("table")) {
      let optionName = "";
      let optionName1 = $(item).attr("data-color");
      let optionName2 = null;
      for (const td of $(item).find("tr").children("td")) {
        let sizeValue = null;
        let stock = 0;
        let size = $(td).find("p.item-sku-actions-info-size").text();
        if (size && size.trim().length > 0) {
          sizeValue = size.trim();
          optionName2 = size.trim();
        }

        if (sizeValue && sizeValue.trim().length > 0) {
          const findObj = _.find(values, { name: sizeValue });
          if (!findObj) {
            values.push({
              vid: (vid2++).toString(),
              name: sizeValue,
              korValueName: await papagoTranslate(sizeValue, "auto", "ko"),
            });
          }
        }

        let inventory = $(td).find("p.item-sku-actions-info-inventory").text();

        if (inventory && inventory.trim().length > 0) {
          if (inventory.trim().includes("在庫なし")) {
            stock = 0;
          } else if (inventory.trim().includes("在庫あり")) {
            stock = 100;
          }
        }
        optionName = optionName1;
        if (optionName2) {
          optionName += ` ${optionName2}`;
        }

        const findOption = _.find(tempOptions, { value: optionName });

        if (!findOption && inventory.trim().length > 0) {
          tempOptions.push({
            key: (key++).toString(),
            value: optionName,
            korValue: await papagoTranslate(optionName, "auto", "ko"),
            price: ObjItem.salePrice,
            stock,
            disabled: false,
            active: true,
            weight: 0,
            option1: optionName1,
            option2: optionName2,
          });
        }
      }
    }

    tempProp.push({
      pid: "2",
      name: size,
      korTypeName: await papagoTranslate(size, "auto", "ko"),
      values,
    });

    for (const item of tempOptions) {
      let propPath = ``;
      let attributes = [];
      let attributeTypeName = ``;
      let attributeValueName = ``;
      for (const propItem of tempProp) {
        const findObj1 = _.find(propItem.values, {
          name: item.option1,
        });

        if (findObj1) {
          if (findObj1.image) {
            item.image = findObj1.image;
          }
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
    ObjItem.options = tempOptions;

    ObjItem.html = $("div.item-detail").html();
    ObjItem.html = removeTag(ObjItem.html);

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

const removeTag = (html) => {
  const aRegex = /<a(?:.|\n)*?>[\s\S]*?<\/a>/gi;
  let result = html.replace(aRegex, "");
  return result;
};
