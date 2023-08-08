const axios = require("axios");
const cheerio = require("cheerio");
const { papagoTranslate } = require("./translate");
const { AmazonAsin, extractWeight } = require("../lib/userFunc");
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

    const metafieldsTemp = iconv
      .decode(content.data, "UTF-8")
      .split("metafields = ")[1]
      .split(";")[0];
    const metaFields = JSON.parse(metafieldsTemp);

    const token = metaFields.token;

    const graphqlUrl = "https://www.keenfootwear.jp/api/2022-10/graphql.json";
    const payload = {
      operationName: "product",
      variables: {
        handle: ObjItem.good_id,
      },
      query: `query product($handle: String!) @inContext(country: JP, language: JA) {
        product(handle: $handle) {
          id
          tags
          title
          handle
          vendor
          description
          available: availableForSale
          images(first: 2) {
            edges {
              node {
                src
                srcSwatch: url(transform: {maxHeight: 92, maxWidth: 92})
                srcMobile: url(transform: {maxHeight: 230, maxWidth: 230})
                altText
                height
                width
                __typename
              }
              __typename
            }
            __typename
          }
          media(first: 20) {
            edges {
              node {
                alt
                mediaContentType
                ... on MediaImage {
                  alt
                  id
                  image {
                    url
                    id
                    altText
                    __typename
                  }
                  __typename
                }
                ... on Video {
                  previewImage {
                    id
                    url
                    __typename
                  }
                  sources {
                    url
                    format
                    __typename
                  }
                  __typename
                }
                ... on ExternalVideo {
                  id
                  host
                  originUrl
                  __typename
                }
                __typename
              }
              __typename
            }
            __typename
          }
          onlineStoreUrl
          priceRange {
            minVariantPrice {
              amount
              __typename
            }
            maxVariantPrice {
              amount
              __typename
            }
            __typename
          }
          compareAtPriceRange {
            minVariantPrice {
              amount
              __typename
            }
            maxVariantPrice {
              amount
              __typename
            }
            __typename
          }
          breadcrumbs_copy: metafield(namespace: "breadcrumb", key: "copy") {
            value
            __typename
          }
          breadcrumbs_link: metafield(namespace: "breadcrumb", key: "url") {
            value
            __typename
          }
          comingSoon: metafield(namespace: "data", key: "coming_soon") {
            value
            __typename
          }
          product_badges: metafield(namespace: "custom", key: "product_badges") {
            value
            __typename
          }
          product_hover_image: metafield(namespace: "custom", key: "hover_image") {
            reference {
              ... on MediaImage {
                image {
                  originalSrc
                  __typename
                }
                __typename
              }
              __typename
            }
            __typename
          }
          props: metafield(namespace: "custom", key: "value_props") {
            value
            __typename
          }
          bestFor: metafield(namespace: "custom", key: "best_for") {
            value
            __typename
          }
          details: metafields(
            identifiers: [{namespace: "custom", key: "product_material"}, {namespace: "details", key: "features"}, {namespace: "details", key: "duty_type"}, {namespace: "details", key: "weight"}, {namespace: "details", key: "dimensions"}, {namespace: "details", key: "collar_height"}, {namespace: "details", key: "calf_circumference"}, {namespace: "details", key: "materials"}, {namespace: "details", key: "care"}, {namespace: "details", key: "safety_features"}]
          ) {
            key
            value
            __typename
          }
          charityBadge: metafield(namespace: "data", key: "charity_badges") {
            value
            __typename
          }
          technologies: metafield(namespace: "data", key: "technology_block") {
            value
            __typename
          }
          fitData: metafield(namespace: "data", key: "fit") {
            value
            __typename
          }
          comparisonAuxiliary: metafield(namespace: "comparison", key: "auxiliary") {
            value
            __typename
          }
          comparisonText: metafield(namespace: "comparison", key: "text") {
            value
            __typename
          }
          comparisonBestFor: metafield(namespace: "comparison", key: "best_for") {
            value
            __typename
          }
          options {
            name
            values
            __typename
          }
          variants(first: 50) {
            edges {
              node {
                id
                title
                sku
                availableForSale
                barcode
                priceV2 {
                  amount
                  __typename
                }
                compareAtPriceV2 {
                  amount
                  __typename
                }
                image {
                  src
                  altText
                  height
                  width
                  __typename
                }
                __typename
              }
              __typename
            }
            __typename
          }
          __typename
        }
      }`,
    };

    const headers = {
      "Content-Type": "application/json", // Example of setting the content type
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36", // Example of setting an authorization header
      Host: "www.keenfootwear.jp",
      Referer: url,
      "X-Shopify-Storefront-Access-Token": token,
    };

    const response = await axios.post(graphqlUrl, payload, { headers });

    let split1 = `
  <script
    data-section-data
    type="application/json"
  >`;

    const temp1 = iconv
      .decode(content.data, "UTF-8")
      .split(split1)[1]
      .split("</script>")[0];

    let jsonOb = JSON.parse(temp1);
    jsonOb = jsonOb.product;

    let itemsTemp = iconv
      .decode(content.data, "UTF-8")
      .split("},items: ")[1]
      .split(",]")[0]
      .replace(/id/g, '"id"')
      .replace(/name/g, '"name"')
      .replace(/brand/g, '"brand"')
      .replace(/category/g, '"category"')
      .replace(/variantId/g, '"varIantId"')
      .replace(/variant/g, '"variant"')
      .replace(/price/g, '"price"')
      .replace(/productId/g, '"productId"')

      .replace(/compareAtPrice/g, '"compareAtPrice"')
      .replace(/image/g, '"image"')
      .replace(/inventory/g, '"inventory"')
      .trim();
    itemsTemp = itemsTemp + "]";

    const itemsOjb = JSON.parse(itemsTemp);

    const product = response.data.data.product;

    ObjItem.title = product.title.replace("|", "").replace("\\", "").trim();

    ObjItem.brand = product.vendor;

    ObjItem.korTitle = await papagoTranslate(ObjItem.title, "auto", "ko");
    ObjItem.korTitle = `${ObjItem.brand} ${ObjItem.korTitle}`;

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

    ObjItem.salePrice = jsonOb.price / 100;

    ObjItem.content = product.media.edges
      .map((item) => {
        if (item.node.mediaContentType === "IMAGE") {
          return item.node.image.url;
        }
        if (item.node.mediaContentType === "VIDEO") {
          if (
            item.node.sources &&
            Array.isArray(item.node.sources) &&
            item.node.sources.length > 0
          ) {
            ObjItem.html += `<br>
              <video width="400" controls muted style="max-width: 800px; display: block; margin: 0 auto;">
                  <source src="${item.node.sources[0].url}" type="video/mp4">
              </video>
              <br>
              `;
          }
        }
        return null;
      })
      .filter((item) => item !== null);
    ObjItem.mainImages = [ObjItem.content[0]];

    ObjItem.html += jsonOb.content;

    for (const item of product.details.filter(
      (item) => item !== null && item.key
    )) {
      if (item.key === "product_material" && item.value.length > 0) {
        ObjItem.html += `<p>제품 번호 : ${item.value}</p>`;

        ObjItem.korTitle = `${ObjItem.korTitle} ${item.value}`;
        ObjItem.modelName = item.value;
      }
      if (item.key === "weight") {
        const weight = extractWeight(item.value);

        ObjItem.weight = weight * 2;
        ObjItem.html += `<p>무게 : ${item.value}</p>`;
      }
      if (item.key === "features" && JSON.parse(item.value).length > 0) {
        ObjItem.html += `<p>특징</p>`;
        ObjItem.html += `<ul>`;
        for (const feat of JSON.parse(item.value)) {
          if (!feat.includes("寄付") && !feat.includes("www.us4iriomote.org")) {
            ObjItem.html += `<li>${feat}</li>`;
          }
        }
        ObjItem.html += `</ul>`;
      }
      if (item.key === "materials" && JSON.parse(item.value).length > 0) {
        ObjItem.html += `<p>소재</p>`;
        ObjItem.html += `<ul>`;
        for (const material of JSON.parse(item.value)) {
          ObjItem.html += `<li>${material}</li>`;
        }
        ObjItem.html += `</ul>`;
      }
      if (item.key === "care" && JSON.parse(item.value).length > 0) {
        ObjItem.html += `<p>청소 방법</p>`;
        ObjItem.html += `<ul>`;
        for (const careItem of JSON.parse(item.value)) {
          ObjItem.html += `<li>${careItem}</li>`;
        }
        ObjItem.html += `</ui>`;
      }
    }

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

    let tempProp = [];

    let tempOption = [];

    let propValues1 = [];
    let propValues2 = [];
    let propV = 1;
    for (const item of jsonOb.variants) {
      const korValue1 = await papagoTranslate(item.option1, "auto", "ko");
      const korValue2 = await papagoTranslate(item.option2, "auto", "ko");

      let stock = 0;
      let findItemObj = _.find(itemsOjb, { id: item.barcode });
      if (findItemObj) {
        stock = Number(findItemObj.inventory);
      }

      tempOption.push({
        key: item.id,
        value: `${item.option1} ${
          item.option2 === "Regular" ? "" : item.option2
        }`.trim(),
        korValue: `${korValue1} ${
          item.option2 === "Regular" ? "" : korValue2 ? korValue2 : ""
        }`.trim(),
        price:
          item.price / 100 >= 7000 ? item.price / 100 : item.price / 100 + 300,
        stock: item.available && stock > 0 ? stock : 0,
        disabled: false,
        active: true,
        weight: item.weight > 0 ? item.weight / 1000 : ObjItem.weight,
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
    for (const item of jsonOb.options.filter((item) => item !== "Width")) {
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
