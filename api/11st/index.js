const axios = require("axios");
const { convertXML } = require("simple-xml-to-json");
const js2xmlparser = require("js2xmlparser");
const Market = require("../../models/Market");
const Product = require("../../models/Product");
const Basic = require("../../models/Basic");
const search11stKewyrod = require("../../puppeteer/search11stKeyword");
const _ = require("lodash");
const moment = require("moment");
const iconv = require("iconv-lite");

const sk11stoutboundarea = async ({ userID }) => {
  try {
    const market = await Market.findOne({
      userID,
    }).lean();

    if (!market || !market.sk11st || !market.sk11st.openapikey) {
      return;
    }

    const response = await axios({
      url: `http://api.11st.co.kr/rest/areaservice/outboundarea`,
      method: "GET",
      headers: {
        openapikey: market.sk11st.openapikey,
      },
    });
    const convertData = convertXML(response.data);
    if (convertData["ns2:inOutAddresss"].children.length > 0) {
      const addr =
        convertData["ns2:inOutAddresss"].children[0]["ns2:inOutAddress"]
          .children;

      for (const item of addr) {
        if (item.addrSeq) {
          return item.addrSeq.content;
        }
      }
    }

    return null;
    // console.log("respoinse", convertData["ns2:inOutAddresss"].children);
  } catch (e) {
    console.log("11stoutboundarea", e);
  }
};
const sk11stinboundarea = async ({ userID }) => {
  try {
    const market = await Market.findOne({
      userID,
    }).lean();

    if (!market || !market.sk11st || !market.sk11st.openapikey) {
      return;
    }

    const response = await axios({
      url: `http://api.11st.co.kr/rest/areaservice/inboundarea`,
      method: "GET",
      headers: {
        openapikey: market.sk11st.openapikey,
      },
    });
    const convertData = convertXML(response.data);
    if (convertData["ns2:inOutAddresss"].children.length > 0) {
      const addr =
        convertData["ns2:inOutAddresss"].children[0]["ns2:inOutAddress"]
          .children;

      for (const item of addr) {
        if (item.addrSeq) {
          return item.addrSeq.content;
        }
      }
    }

    return null;
    // console.log("respoinse", convertData["ns2:inOutAddresss"].children);
  } catch (e) {
    console.log("11stoutboundarea", e);
  }
};

exports.skCreateProduct = async ({ userID, productBody }) => {
  try {
    const market = await Market.findOne({
      userID,
    }).lean();

    if (!market || !market.sk11st || !market.sk11st.openapikey) {
      return {
        message: "openapiKey 없음",
      };
    }

    let buffer = js2xmlparser.parse("Product", productBody);
    buffer = buffer.replace(
      "<?xml version='1.0'?>",
      "<?xml version='1.0' encoding='utf-8' standalone='yes'?>"
    );
    // console.log("buffer ---> ", buffer.toString());
    const response = await axios.post(
      `http://api.11st.co.kr/rest/prodservices/product`,
      buffer,
      {
        headers: {
          openapikey: market.sk11st.openapikey,
          "Content-Type": "text/xml",
        },
        responseEncoding: "binary",
      }
    );

    const convertData = convertXML(iconv.decode(response.data, "euc-kr"));

    let productNo = null;
    let message = null;
    for (const item of convertData.ClientMessage.children) {
      if (item.productNo) {
        productNo = item.productNo.content;
      }
      if (item.message) {
        message = item.message.content;
      }
    }

    return {
      productNo,
      message,
    };
  } catch (e) {
    console.log("skCreateProduct", e);

    // console.log("skCreateProduct", e.response.data);
    return {
      productNo: null,
      message: e.response.data ? e.response.data : e.message,
    };
  }
};

exports.skDeleteProduct = async ({ userID, productNo }) => {
  try {
    const market = await Market.findOne({
      userID,
    }).lean();

    if (!market || !market.sk11st || !market.sk11st.openapikey) {
      return {
        message: "openapiKey 없음",
      };
    }
    const response = await axios({
      url: `http://api.11st.co.kr/rest/prodstatservice/stat/stopdisplay/${productNo}`,
      method: "PUT",
      headers: {
        openapikey: market.sk11st.openapikey,
        "Content-Type": "text/xml",
      },
    });

    const convertData = convertXML(response.data.toString());

    console.log("response.data.toString()", response.data.toString());
    let resultCode = null;
    let message = null;
    for (const item of convertData.ClientMessage.children) {
      if (item.resultCode) {
        resultCode = item.resultCode.content;
      }
      if (item.message) {
        message = item.message.content;
      }
    }
    console.log("resultCode", resultCode, message);
    return {
      resultCode,
      message,
    };
  } catch (e) {
    console.log("skDeleteProduct", e);
  }
};

exports.skModifyProduct = async ({ userID, prdNo, productBody }) => {
  try {
    const market = await Market.findOne({
      userID,
    }).lean();

    if (!market || !market.sk11st || !market.sk11st.openapikey) {
      console.log("여기 타냐?");
      return {
        message: "openapiKey 없음",
      };
    }

    let buffer = js2xmlparser.parse("Product", productBody);
    buffer = buffer.replace(
      "<?xml version='1.0'?>",
      "<?xml version='1.0' encoding='utf-8' standalone='yes'?>"
    );
    // console.log("buffer ---> ", buffer.toString());
    const response = await axios.put(
      `http://api.11st.co.kr/rest/prodservices/product/${prdNo}`,
      buffer,
      {
        headers: {
          openapikey: market.sk11st.openapikey,
          "Content-Type": "text/xml",
        },
      }
    );

    const convertData = convertXML(response.data.toString());

    let productNo = null;
    let message = null;
    for (const item of convertData.ClientMessage.children) {
      if (item.productNo) {
        productNo = item.productNo.content;
      }
      if (item.message) {
        message = item.message.content;
      }
    }

    console.log("productNo message", productNo, message);
    return {
      productNo,
      message,
    };
  } catch (e) {
    console.log("skModifyProduct", e);

    // console.log("skCreateProduct", e.response.data);
    return {
      productNo: null,
      message: e.response.data ? e.response.data : e.message,
    };
  }
};

exports.skSearchProduct = async ({ userID, productNo }) => {
  try {
    const market = await Market.findOne({
      userID,
    }).lean();

    if (!market || !market.sk11st || !market.sk11st.openapikey) {
      return {
        message: "openapiKey 없음",
      };
    }

    const response = await axios({
      url: `http://api.11st.co.kr/rest/prodmarketservice/prodmarket/${productNo}`,
      method: "GET",
      headers: {
        openapikey: market.sk11st.openapikey,
      },
    });

    // console.log("response, ", response);
  } catch (e) {
    console.log("skModifyProduct", e);
    return null;
  }
};

exports.get11stProduct = async ({
  id,
  basic,
  product,
  options,
  prop,
  userID,
  deli_pri_11st = 0,
}) => {
  try {
    const outboundrea = await sk11stoutboundarea({ userID });
    const inboundarea = await sk11stinboundarea({ userID });

    if (!outboundrea || !inboundarea) {
      return {
        message: "출고지 반품지 없음",
      };
    }
    const category = await search11stKewyrod({ title: product.korTitle });

    if (!category || !category.categoryCode) {
      return {
        message: "카테고리 없음",
      };
    }

    let shipping_price = 0;
    let optionValue = options
      .filter((item) => item.active && !item.disabled)
      .filter((i, index) => index < 100)
      .map((item) => {
        if (item.weightPrice > shipping_price) {
          shipping_price = item.weightPrice;
        }
        return item;
      })
      .sort((a, b) => a.salePrice - b.salePrice);

    let baseIndex = 0;
    let inValidArr = [];

    optionValue.forEach((item) => {
      let salePrice = item.salePrice;

      let minPassablePrice =
        Math.ceil((salePrice - (salePrice * 50) / 100) * 0.1) * 10;
      let maxPassablePrice =
        Math.floor((salePrice + (salePrice * 100) / 100) * 0.1) * 10 - 10;

      const inValid = [];

      optionValue
        .filter((item) => item.active && !item.disabled)
        .forEach((item1) => {
          if (
            item1.price < minPassablePrice ||
            item1.price > maxPassablePrice
          ) {
            inValid.push(item1);
          }
        });
      inValidArr.push(inValid.length);
    });

    const minValue = Math.min.apply(null, inValidArr);
    baseIndex = inValidArr.indexOf(minValue);

    let basePrice = options[0].salePrice;
    let minPrice = basePrice - basePrice * 0.5;
    let maxPrice = basePrice + basePrice * 1;

    optionValue
      .filter((item) => item.active && !item.disabled)
      .map((item, index) => {
        if (index === baseIndex) {
          item.base = true;
          basePrice = item.salePrice;
          minPrice = basePrice - basePrice * 0.5;
          maxPrice = basePrice + basePrice * 1;
        } else {
          item.base = false;
        }
      });

    // console.log("baseIndex", baseIndex);
    // console.log("basePrice", basePrice);
    // console.log("minPrice", minPrice);
    // console.log("maxPrice", maxPrice);
    // console.log(
    //   "수정전",
    //   options.filter((item) => item.active && !item.disabled).length
    // );

    optionValue.map((item) => {
      if (item.salePrice >= minPrice && item.salePrice <= maxPrice) {
        item.active = true;
      } else {
        item.active = false;
      }
    });

    // console.log(
    //   "수정후",
    //   options.filter((item) => item.active && !item.disabled).length
    // );

    ////////////////////////////

    const basicInfo = await Basic.findOne({
      userID,
    });

    let optionHtml = ``;

    for (const item of optionValue.filter(
      (item) => item.active && !item.disabled
    )) {
      optionHtml += `
        <p style="text-align: center;" >
        <div style="text-align: center; font-size: 20px; font-weight: 700; color: white; background: #0090FF !important; padding: 10px; border-radius: 15px;">
        ${item.korKey ? `${item.korKey}: ${item.korValue}` : item.korValue}
        </div>
        <img src="${
          item.image
        }_800x800.jpg" style="width: 100%; max-width: 800px; display: block; margin: 0 auto; " />
        <p style="text-align: center;" >
        <br />
        </p>
        `;
    }

    const htmlContent = `${product.gifHtml ? product.gifHtml : ""}${
      product.topHtml
    }${product.isClothes && product.clothesHtml ? product.clothesHtml : ""}${
      product.isShoes && product.shoesHtml ? product.shoesHtml : ""
    }${product.videoHtml ? product.videoHtml : ""}${optionHtml}${product.html}${
      product.bottomHtml
    }`;

    let salePrice = optionValue.filter(
      (item) => item.active && !item.disabled
    )[0].salePrice;

    const productBody = {
      abrdBuyPlace: "D",
      selMthdCd: "01",
      dispCtgrNo: category.categoryCode,
      prdTypCd: "01",
      hsCode: "",
      prdNm: product.korTitle,
      brand: basic.brand,
      rmaterialTypCd: "05",
      orgnTypCd: "03",
      orgnNmVal: "중국(구매대행)",
      beefTraceStat: "02",
      sellerPrdCd: basic.good_id,
      suplDtyfrPrdClfCd: "01",
      forAbrdBuyClf: "01",
      prdStatCd: "01",
      minorSelCnYn: "Y",
      prdImage01: product.mainImages[0],
      prdImage02: product.mainImages[1] ? product.mainImages[1] : null,
      prdImage03: product.mainImages[2] ? product.mainImages[2] : null,
      prdImage04: product.mainImages[3] ? product.mainImages[3] : null,
      htmlDetail: htmlContent,
      selPrdClfCd: "0:100",
      aplBgnDy: moment().format("YYYY/MM/DD"),
      aplEndDy: "2999/12/31",
      selPrc: salePrice,
      cuponcheck: "N",
      // dscAmtPercnt: 0,
      cupnDscMthdCd: "01",
      optSelectYn: "Y",
      txtColCnt: "1",
      prdExposeClfCd: "00",
      colTitle: "종류",
      ProductOption: optionValue
        .filter((item) => item.active && !item.disabled)
        .map((item) => {
          return {
            useYn: "Y",
            colOptPrice:
              Math.ceil((item.salePrice - minPrice - deli_pri_11st) * 0.1) * 10,
            colValue0:
              item.korKey && item.korKey.length > 0
                ? item.korKey
                : item.korValue,
            colCount: item.stock,
          };
        }),
      prdSelQty: 1000,
      selMinLimitTypCd: "00",
      gblDlvYn: "N",
      dlvCnAreaCd: "01",
      dlvWyCd: "01",
      dlvEtprsCd: "00034",
      dlvCstInstBasiCd: deli_pri_11st && deli_pri_11st > 0 ? "02" : "01",
      dlvCst1: deli_pri_11st.toString(),
      bndlDlvCnYn: "N",
      dlvCstPayTypCd: "03",
      jejuDlvCst: "Y",
      islandDlvCst: "4000",
      addrSeqOut: outboundrea,
      outsideYnOut: "Y",
      addrSeqIn: inboundarea,
      rtngdDlvCst:
        salePrice - minPrice <= 200000
          ? Math.ceil((salePrice - minPrice) * 0.1) * 10
          : 200000,
      exchDlvCst:
        (salePrice - minPrice) * 2 <= 400000
          ? Math.ceil((salePrice - minPrice) * 2 * 0.1) * 10
          : 400000,
      asDetail: basicInfo.afterServiceInformation,
      rtngExchDetail: "상품 상세페이지 참조",
      dlvClf: "02",
      ProductNotification: {
        type: "891045",
        item: [
          {
            code: "23759100",
            name: "상품 상세페이지 참조",
          },
          {
            code: "23756033",
            name: "상품 상세페이지 참조",
          },
          {
            code: "11905",
            name: "상품 상세페이지 참조",
          },
          {
            code: "23760413",
            name: "상품 상세페이지 참조",
          },
          {
            code: "11800",
            name: "상품 상세페이지 참조",
          },
        ],
      },
      prcCmpExpYn: "Y",
    };
    return productBody;
    // console.log("productBody", productBody);
  } catch (e) {
    console.log("update11st", e);
  }
};

exports.skModifyDescContent = async ({ userID, prdNo, content }) => {
  try {
    const market = await Market.findOne({
      userID,
    }).lean();

    if (!market || !market.sk11st || !market.sk11st.openapikey) {
      return {
        message: "openapiKey 없음",
      };
    }

    let buffer = js2xmlparser.parse("ProductDetailCont", {
      prdDescContClob: content,
    });
    buffer = buffer.replace(
      "<?xml version='1.0'?>",
      "<?xml version='1.0' encoding='utf-8' standalone='yes'?>"
    );
    // console.log("buffer ---> ", buffer.toString());
    const response = await axios.post(
      `http://api.11st.co.kr/rest/prodservices/updateProductDetailCont/${prdNo}`,
      buffer,
      {
        headers: {
          openapikey: market.sk11st.openapikey,
          "Content-Type": "text/xml",
        },
      }
    );

    const convertData = convertXML(response.data.toString());

    let productNo = null;
    let message = null;
    for (const item of convertData.ClientMessage.children) {
      if (item.productNo) {
        productNo = item.productNo.content;
      }
      if (item.message) {
        message = item.message.content;
      }
    }
    return {
      productNo,
      message,
    };
  } catch (e) {
    console.log("skModifyDescContent", e);
    return null;
  }
};

exports.skModifySalePrice = async ({ userID, prdNo, saleBody }) => {
  try {
    const market = await Market.findOne({
      userID,
    }).lean();

    if (!market || !market.sk11st || !market.sk11st.openapikey) {
      return {
        message: "openapiKey 없음",
      };
    }

    let buffer = js2xmlparser.parse("Product", saleBody);
    buffer = buffer.replace(
      "<?xml version='1.0'?>",
      "<?xml version='1.0' encoding='utf-8' standalone='yes'?>"
    );

    const response = await axios.post(
      `http://api.11st.co.kr/rest/prodservices/product/priceCoupon/${prdNo}`,
      buffer,
      {
        headers: {
          openapikey: market.sk11st.openapikey,
          "Content-Type": "text/xml",
        },
      }
    );

    const convertData = convertXML(response.data.toString());

    let productNo = null;
    let message = null;
    for (const item of convertData.ClientMessage.children) {
      if (item.productNo) {
        productNo = item.productNo.content;
      }
      if (item.message) {
        message = item.message.content;
      }
    }
    return {
      productNo,
      message,
    };
  } catch (e) {
    console.log("skModifySalePrice", e);
    return null;
  }
};

exports.skModifyOption = async ({ userID, prdNo, option }) => {
  try {
    const market = await Market.findOne({
      userID,
    }).lean();

    if (!market || !market.sk11st || !market.sk11st.openapikey) {
      return {
        message: "openapiKey 없음",
      };
    }

    let buffer = js2xmlparser.parse("Product", option);
    buffer = buffer.replace(
      "<?xml version='1.0'?>",
      "<?xml version='1.0' encoding='utf-8' standalone='yes'?>"
    );
    // console.log("buffer ---> ", buffer.toString());
    const response = await axios.post(
      `http://api.11st.co.kr/rest/prodservices/updateProductOption/${prdNo}`,
      buffer,
      {
        headers: {
          openapikey: market.sk11st.openapikey,
          "Content-Type": "text/xml",
        },
      }
    );

    const convertData = convertXML(response.data.toString());

    let productNo = null;
    let message = null;
    for (const item of convertData.Product.children) {
      if (item.productNo) {
        productNo = item.productNo.content;
      }
      if (item.message) {
        message = item.message.content;
      }
    }
    return {
      productNo,
      message,
    };
  } catch (e) {
    console.log("skModifyOption", e);
    return null;
  }
};
