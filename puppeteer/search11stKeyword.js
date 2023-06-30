const axios = require("axios");

const start = async ({ title }) => {
  if (!title) {
    return title;
  }

  try {
    const titleArr = title.split(" ");
    let isSearch = null;
    while (!isSearch) {
      titleArr.splice(titleArr.length - 1, 1);
      const keyword = titleArr.join(" ");

      isSearch = await search11ST({ keyword });
      if (isSearch) {
        return await searchDetail({ url: isSearch });
      }

      if (keyword.length === 0) {
        isSearch = true;
      }
    }
    return null;
  } catch (e) {
    console.log("searchAuctionKeyword", e.message);
  } finally {
  }
};

const search11ST = async ({ keyword }) => {
  try {
    const content = await axios.get(
      `https://search.11st.co.kr/Search.tmall?kwd=${encodeURI(keyword)}`
    );

    const temp1 = content.data.split(
      "window.searchDataFactory.commonPrdList = "
    )[1];
    const temp2 = temp1.split("window.")[0];
    const temp3 = JSON.parse(temp2.trim().slice(0, temp2.trim().length - 1));

    return temp3 &&
      Array.isArray(temp3.items) &&
      temp3.items.filter((fItem) => fItem.listingPrdTypeText).length > 0
      ? temp3.items.filter((fItem) => fItem.listingPrdTypeText)[0]
          .productDetailUrl
      : null;
  } catch (e) {
    console.log("search11ST", e.message);
    return false;
  } finally {
  }
};

const searchDetail = async ({ url }) => {
  try {
    const content = await axios.request({
      method: "GET",
      url,
      responseType: "arraybuffer",
      responseEncoding: "binary",
    });

    const temp1 = content.data.toString().split(`var categoryInfo = `)[1];
    const temp2 = temp1.split(`;`)[0];
    const temp3 = JSON.parse(temp2);

    const temp4 = content.data.toString().split(`var productPrdInfo = `)[1];
    const temp5 = temp4.split(`;`)[0];
    const temp6 = JSON.parse(temp5);
    return {
      category1Name: temp3 && temp3.cat2 ? temp3.cat2 : null,
      category2Name: temp3 && temp3.cat3 ? temp3.cat3 : null,
      category3Name: temp3 && temp3.cat4 ? temp3.cat4 : null,
      category4Name: null,
      categoryCode: temp6 && temp6.dispCtgrNo ? temp6.dispCtgrNo : null,
    };
  } catch (e) {
    console.log("searchDetail Auction", e);
  }
};
module.exports = start;
