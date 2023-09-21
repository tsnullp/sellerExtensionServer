const axios = require("axios");
const CryptoJS = require("crypto-js");
const Market = require("../../models/Market");
const bcrypt = require("bcrypt");
const download = require("image-downloader");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

exports.NaverTitleQualityCheck = async ({
  title,
  category1,
  category2,
  category3,
  category4,
}) => {
  try {
    const response = await axios({
      url: `https://sell.smartstore.naver.com/api/product/shared/product-search-quality-check?_action=productSearchQualityCheck&category1Id=${category1}&category2Id=${category2}&category3Id=${category3}&category4Id=${category4}&prodNm=${encodeURIComponent(
        title
      )}`,
      method: "GET",
      headers: {
        // 'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        // 'Accept': '*/*',
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.128 Safari/537.36",
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "cors",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Expires: "0",
        referer: `https://sell.smartstore.naver.com/`,
        Cookie: `NNB=TBVBMDWO2HDF6; NV_WETR_LOCATION_RGN_M="MDIxMzUxMDU="; NRTK=ag#all_gr#4_ma#-2_si#-1_en#-2_sp#0; lastDeliveryMethod=DELIVERY; lastDeliveryCompanyCode=CJGLS; ASID=79a99f27000001763e3d75b30000004d; NDARK=N; NV_WETR_LAST_ACCESS_RGN_M="MDIxMzUxMDU="; MM_NEW=1; NFS=2; _ga_N90K8EJMQ3=GS1.1.1638332250.2.0.1638332250.0; nx_ssl=2; BMR=s=1638928771366&r=https%3A%2F%2Fm.blog.naver.com%2FPostView.naver%3FisHttpsRedirect%3Dtrue%26blogId%3Dspson0153%26logNo%3D221590065734&r2=https%3A%2F%2Fwww.google.com%2F; site_preference=NORMAL; _ga=GA1.2.574648830.1606969859; page_uid=hkD/zwprvhGssC6ncr4ssssstEZ-494554; nid_inf=107955612; NID_AUT=F07hB+JNTvsXIYsZxxrMXWrhfX1v29b4w1MKCr0qTTAOLMj0d7fZcEW0GjBbVgCy; NID_JKL=HcJi+Ojd1fHJ0oU5mMhSpRWMO7DjtW3eyn66JsWhBas=; NSI=TS004LoJX9OiZmUgOEcxbBVoJ7KRQ3btaShITwE5; NID_SES=AAABnX+sjcOHOEL7tVjCk6QKtvhrFUajfpf3zWN485GQ1+WFwsVkADXBKQ032zZxJ+978Xp18qidQ4ld/tMFrXJNaSt3nnVcJabuPSCboIHVDVrmKxGEphtps47Eeh3xt8ToVVVA4no4ghNaeP8fMwL16jYFqH6ymX+90AHF/5gMMVJGVkbH+JlzckjqMGlK88fZMCATOwy6Lv+D+330U9hUD/LGDU6NsW2a1yKSR1/AHAm963ahsHOwbotlWmiGzi1qfZadGNX2rOXXRz36xzDMmsrUhOqaZI/TGOrUqz2YxkKkrd/g1a0WKvyd+jJtvJkW+gYgblEtMuUbai7PSAhp19vY1Iym11VX2EpU99/pegWX2nkdcxxUUXa9Nefevo44w6EGkTrZo75HG7f9v31/9/Fp0CFega2S1jVdmhTVzQk3FmpRPi2DSIwI2imR7ePF80s8AE2NVr06D4uPYK8ETy/n+8DqHSVsrBhYNp0df4xJG4k2ai+1IjEpPqMZHe39nK8rMg2Chs8Yr3X9ppXu2ExvZF8SlJ8H65GDybPIr72Z; _ga_7VKFYR6RV1=GS1.1.1639557109.983.1.1639557114.55`,
      },
      responseType: "arraybuffer",
    });
    return JSON.parse(response.data.toString());
  } catch (e) {
    console.log("CoupangStoreProductList", e);
    return null;
  }
};

exports.ShippingData = async ({ category, startDate, endDate, page = 1 }) => {
  try {
    const response = await axios({
      url: `https://datalab.naver.com/shoppingInsight/getCategoryKeywordRank.naver`,
      method: "POST",
      headers: {
        "Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        // 'Accept': '*/*',
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.128 Safari/537.36",
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "cors",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Expires: "0",
        referer: `https://datalab.naver.com/shoppingInsight/sCategory.naver`,
      },
      responseType: "arraybuffer",
      params: {
        cid: category,
        startDate,
        endDate,
        page,
      },
    });
    return JSON.parse(response.data.toString());
  } catch (e) {
    console.log("ShippingData", e);
    return null;
  }
};

exports.NaverKeywordInfo = async ({ keyword }) => {
  try {
    const response = await axios({
      url: `https://search.shopping.naver.com/_next/data/l89Tmk2pgXIDsjDeSpkjP/search/all.json?query=${encodeURI(
        keyword
      )}`,
      method: "GET",
      headers: {
        "Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        // 'Accept': '*/*',
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.128 Safari/537.36",
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "cors",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Expires: "0",
        referer: `https://search.shopping.naver.com/`,
      },
      responseType: "arraybuffer",
    });
    return JSON.parse(response.data.toString());
  } catch (e) {
    console.log("NaverKeywordInfo", e);
    return null;
  }
};

exports.NaverKeywordRel = async ({ keyword }) => {
  try {
    const method = "GET";
    const api_url = "/keywordstool";
    const timestamp = Date.now() + "";
    const accessKey =
      "01000000006efb6afaca2d8a26090491141ea2a9bf8f580af6f998aa7db6599fb747def271";
    const secretKey = "AQAAAABu+2r6yi2KJgkEkRQeoqm/qjYU5KwW9QuEz2Cgh/jDvQ==";
    const hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secretKey);
    hmac.update(timestamp + "." + method + "." + api_url);
    const hash = hmac.finalize();
    hash.toString(CryptoJS.enc.Base64);

    const response = await axios({
      url: `https://api.naver.com/keywordstool?hintKeywords=${encodeURI(
        keyword.replace(/ /gi, "")
      )}&showDetail=1`,
      method,
      headers: {
        "X-Timestamp": timestamp,
        "X-API-KEY": accessKey,
        "X-API-SECRET": secretKey,
        "X-CUSTOMER": "2537298",
        "X-Signature": hash.toString(CryptoJS.enc.Base64),
        // "Content-Type": "text/json;charset=UTF-8",
        // "Content-Length": Buffer.byteLength(strjson, "utf8"),
        // Authorization: authorization,
        // "X-EXTENDED-TIMEOUT": 90000
      },
    });

    return response.data;
  } catch (e) {
    console.log("NaverKeywordRel", e);
    return null;
  }
};

exports.NaverImageUpload = async ({ userID, imageUrls }) => {
  try {
    const token = await getToken({ userID });
    if (!token) {
      return null;
    }
    // const appDataDirPath = getAppDataPath();
    // if (!fs.existsSync(appDataDirPath)) {
    //   fs.mkdirSync(appDataDirPath);
    // }

    if (!fs.existsSync(path.join("temp"))) {
      fs.mkdirSync(path.join("temp"));
    }

    const form = new FormData();

    for (const imageUrl of imageUrls) {
      const options = {
        url: imageUrl.split("?")[0],
        dest: path.join("../", "../", "temp"),
      };

      const { filename } = await download.image(options);
      form.append("imageFiles", fs.createReadStream(filename), {
        filename,
        knownLength: fs.statSync(filename).size,
      });
    }

    const response = await axios({
      url: `https://api.commerce.naver.com/external/v1/product-images/upload`,
      method: "POST",
      enctype: "multipart/form-data",
      headers: {
        Authorization: `${token.token_type} ${token.access_token}`,
        ...form.getHeaders(),
        // "content-type": "multipart/form-data",
      },
      data: form,
    });
    fs.rmdir(path.join("temp"), { recursive: true }, (err) => {
      // if (err) {
      //   console.log(err);
      // } else {
      //   console.log("Dir is deleted.");
      // }
    });

    return response.data.images.map((item) => item.url);
  } catch (e) {
    console.log("NaverImageUpload", e);
  }
};

exports.NaverCreateProduct = async ({ userID, productBody }) => {
  try {
    const token = await getToken({ userID });
    if (!token) {
      return {
        message: "네이버 API KEY 없음",
      };
    }

    const response = await axios({
      url: `https://api.commerce.naver.com/external/v2/products`,
      method: "POST",
      headers: {
        Authorization: `${token.token_type} ${token.access_token}`,
        "content-type": "application/json",
      },
      data: JSON.stringify(productBody),
    });

    return response.data;
  } catch (e) {
    console.log("NaverCreateProduct", e.response.data);
    return e.response.data;
  }
};

exports.NaverOriginProducts = async ({ userID, token, originProductNo }) => {
  try {
    let tokenObj = token;
    if (!tokenObj) {
      tokenObj = await getToken({ userID });

      if (!tokenObj) {
        return null;
      }
    }

    const response = await axios({
      url: `https://api.commerce.naver.com/external/v2/products/origin-products/${originProductNo}`,
      method: "GET",
      headers: {
        Authorization: `${tokenObj.token_type} ${tokenObj.access_token}`,
        "content-type": "application/json",
      },
    });

    return response.data;
  } catch (e) {
    // console.log("NaverOriginProducts", e);
    return null;
  }
};

exports.NaverModifyOption = async ({ userID, originProductNo, product }) => {
  const token = await getToken({ userID });
  if (!token) {
    return null;
  }

  try {
    const response = await axios({
      url: `https://api.commerce.naver.com/external/v2/products/origin-products/${originProductNo}`,
      method: "PUT",
      headers: {
        Authorization: `${token.token_type} ${token.access_token}`,
        "content-type": "application/json",
      },
      data: JSON.stringify(product),
    });

    // console.log("response", response);
    return response.data;
  } catch (e) {
    console.log("NaverModifyOption e", e.response.data);
    // console.log("originProductNo", JSON.stringify(product));
    if (e.response.data.message === "입력한 데이터가 유효하지 않습니다.") {
      console.log("originProduct", JSON.stringify(product));
    }
  }
};

const getToken = async ({ userID }) => {
  try {
    if (!userID) {
      return null;
    }

    let clientId = "3xL2y5DqrklF3Gmpnd5z6m";
    let clientSecret = "$2a$04$QtYjezKbjnCVbnGC9lFy5.";
    let timestamp = Number(new Date()) - 60000;

    const market = await Market.findOne({
      userID,
    }).lean();

    if (
      !market ||
      !market.naver ||
      !market.naver.clientID ||
      !market.naver.clientSecret
    ) {
      console.log("네이버 커머스 API 등록 안됨");
      return null;
    }
    clientId = market.naver.clientID;
    clientSecret = market.naver.clientSecret;

    // 밑줄로 연결하여 password 생성
    const password = `${clientId}_${timestamp}`;
    // bcrypt 해싱
    const hashed = bcrypt.hashSync(password, clientSecret);
    // base64 인코딩
    const hashCode = Buffer.from(hashed, "utf-8").toString("base64");
    // console.log("hashCode", hashCode);

    let response = null;
    try {
      response = await axios({
        url: `https://api.commerce.naver.com/external/v1/oauth2/token`,
        method: "POST",
        params: {
          client_id: clientId,
          timestamp,
          client_secret_sign: hashCode,
          grant_type: "client_credentials",
          type: "SELF",
        },
      });

      if (response && response.status === 200) {
        return response.data;
      }
    } catch (e) {
      console.log("getToken", e.response.data);
    }
  } catch (e) {
    console.log("3333,", e);
    return null;
  }
};

exports.NaverProductModel = async ({ userID, name }) => {
  try {
    const token = await getToken({ userID });
    if (!token) {
      return null;
    }
    const response = await axios({
      url: `https://api.commerce.naver.com/external/v1/product-models?name=${encodeURI(
        name
      )}`,
      method: "GET",
      headers: {
        Authorization: `${token.token_type} ${token.access_token}`,
        "content-type": "application/json",
      },
    });

    return response.data.contents;
  } catch (e) {
    console.log("NaverProductModel", e);
  }
};
