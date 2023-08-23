const axios = require("axios");
const cheerio = require("cheerio");
const { papagoTranslate } = require("./translate");
const { AmazonAsin } = require("../lib/userFunc");
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
        "Accept-Encoding": "gzip, deflate, br", // 원하는 압축 방식 명시
      },
      responseEncoding: "binary",
    });

    const temp1 = content.data
      .split('<script type="application/ld+json">')[1]
      .split("</script>")[0];

    const jsonOjb = JSON.parse(temp1);

    ObjItem.salePrice = jsonOjb.offers.price;

    const $ = cheerio.load(iconv.decode(content.data, "UTF-8"));

    const brand = $(".block-goods-name > h2:nth-child(1)").text().trim();
    const title = $(".block-goods-name > h2:nth-child(2)").text().trim();
    ObjItem.brand = brand;
    ObjItem.title = title;
    ObjItem.korTitle = await papagoTranslate(title, "auto", "ko");

    for (const item of $(".block-goods-gallery > ul").children("li")) {
      ObjItem.content.push(
        `https://studious.co.jp/${$(item).find("img").attr("src")}`
      );
    }

    if (ObjItem.content.length > 0) {
      ObjItem.mainImages = [ObjItem.content[0]];
    }

    let tempOptions = [];
    let optionName = jsonOjb.color;

    let optionKorName = await papagoTranslate(optionName, "auto", "ko");
    if (optionKorName) {
      optionKorName = optionKorName.replace(/입니다./g, "");
    }

    ObjItem.korTitle = `${ObjItem.brand} ${ObjItem.korTitle} ${optionKorName}`;

    let categoryWord1 = $("#bread-crumb-list > li:nth-child(2) > a > span")
      .first()
      .text();
    let categoryWord2 = $("#bread-crumb-list > li:nth-child(3) > a > span")
      .first()
      .text();
    let categoryWord3 = $("#bread-crumb-list > li:nth-child(4) > a > span")
      .first()
      .text();

    let categoryWord = ``;
    if (categoryWord1) {
      categoryWord += categoryWord1;
    }
    if (categoryWord2) {
      if (categoryWord.length > 0) {
        categoryWord += ` ${categoryWord2}`;
      } else {
        categoryWord += categoryWord2;
      }
    }
    if (categoryWord3) {
      if (categoryWord.length > 0) {
        categoryWord += ` ${categoryWord3}`;
      } else {
        categoryWord += categoryWord3;
      }
    }

    let category = await searchNaverKeyword({
      title:
        categoryWord && categoryWord.length > 0
          ? categoryWord
          : ObjItem.korTitle,
    });

    if (category) {
      if (category.category4Code) {
        ObjItem.categoryID = category.category4Code;
      } else {
        ObjItem.categoryID = category.category3Code;
      }
    }

    for (const item of $("#size_select > option")) {
      const value = $(item).attr("value");

      if (value && value.length > 0) {
        tempOptions.push({
          name: value,
        });
      }
    }
    let tempProp = [];

    // tempProp.push({
    //   pid: "1",
    //   name: "COLOR",
    //   korTypeName: "색상",
    //   values: [
    //     {
    //       vid: "1",
    //       name: jsonOjb.color,
    //       korValueName: optionName,
    //     }
    //   ]
    // })

    let sizeValues = [];

    let j = 1;
    let isMatch = false;
    let tempTitle = null;
    for (const item of $(".block-color-size-with-cart--item-list > div")) {
      let attributes = [];
      let title = $(item)
        .find(".block-color-size-with-cart--color-item-term")
        .attr("title");
      if (title && tempTitle !== title) {
        tempTitle = title;
      }
      if (!title) {
        title = tempTitle;
      }

      // if (title === optionName) {
      //   isMatch = true;
      // } else {
      //   if (isMatch && title && title !== optionName) {
      //     isMatch = false;
      //   }
      // }
      isMatch = true;
      const size = $(item)
        .find(".block-color-size-with-cart--size-item-term")
        .text()
        .trim();

      console.log("size---", size);

      const findObj = _.find(tempOptions, { name: size });

      if (findObj && isMatch) {
        const variantion = $(item).find(".block-add-cart").text().trim();

        attributes.push({
          attributeTypeName: "사이즈",
          attributeValueName: size,
        });
        sizeValues.push({
          vid: size,
          name: size,
          korValueName: size,
        });
        findObj.key = size;
        findObj.propPath = `${1}:${size}`;
        findObj.korValue = size;
        findObj.price = ObjItem.salePrice;
        findObj.stock = variantion === "カートへ入れる" ? 100 : 0;
        findObj.active = true;
        findObj.disabled = false;
        findObj.attributes = attributes;
        // tempOptions.push({
        //   key: size,
        //   propPath: `${1}:${size}`,
        //   value: `${optionName} ${size}`,
        //   price: ObjItem.salePrice,
        //   stock: variantion === "カートへ入れる" ? 100 : 0,
        //   active: true,
        //   disabled: false,
        //   attributes,
        // });
      }
    }

    tempProp.push({
      pid: "1",
      name: "SIZE",
      korTypeName: "사이즈",
      values: sizeValues,
    });

    ObjItem.prop = tempProp;
    ObjItem.options = tempOptions;

    const goodsCommentLeft = $(".block-goods-comment-left").html();

    ObjItem.html += goodsCommentLeft;
    const goodsCommentRight = $(".block-goods-comment-right").html();

    ObjItem.html += goodsCommentRight;

    ObjItem.html = removeTags(ObjItem.html);
    ObjItem.html = removeTagsAndConvertNewlines(ObjItem.html);
    const htmlTextArr = extractTextFromHTML(ObjItem.html).filter(
      (item) => item.trim().length > 0
    );

    // console.log("htmlTextArr", htmlTextArr);

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
    console.log("findStudiousAPI - ", e);
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

const removeTags = (html) => {
  // 정규식 패턴
  const pattern = /<div\s+class="block-topic-path"[^>]*>.*?<\/div>/gis;

  // 삭제된 결과
  const result = html.replace(pattern, "");
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
