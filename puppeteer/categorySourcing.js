const axios = require("axios")

const searchKeywordCategory = async ({ keyword }) => {
  let productList = []
  try {
    const content = await axios.get(
      `https://msearch.shopping.naver.com/api/search/all?query=${encodeURI(
        keyword
      )}&cat_id=&frm=NVSHATC&productSet=total&`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 8.0.0; SM-G955U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Mobile Safari/537.36",
          "sec-fetch-site": "same-origin",
          "sec-fetch-mode": "cors",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Expires: "0",
          referer: `https://msearch.shopping.naver.com/search/all`,
        },
      }
    )

    const jsObj = content.data
    const { intersectionTerms, terms, products, cmpOrg, nluTerms } = jsObj.shoppingResult
    if (products && Array.isArray(products)) {
      // let dummyData = list.filter(({ item }) => item.openDate >= agoMonth).map(({ item }) => {
      let dummyData = products.map((item) => {
        // let manuTag = item.manuTag ? item.manuTag.replace(/,/gi, " ") : ""

        return {
          productName: `${item.productName}`,
          id: item.id,
        }
      })

      if (dummyData.length > 0) {
        dummyData.forEach((item) => {
          const duplication = productList.filter((pItem) => pItem.id === item.id)
          if (duplication.length === 0) {
            productList.push(item)
          } else {
            return
          }
        })
      }
    }

    return {
      list: productList,
      cmpOrg,
      nluTerms,
      intersectionTerms,
      terms,
    }
  } catch (e) {
    console.log("keyword", keyword)
    // console.log("searchKeywordTitle ->", e)
    return {
      list: productList,
      cmpOrg: null,
      nluTerms: null,
      intersectionTerms: null,
      terms: null,
    }
  }
}

module.exports = {
  searchKeywordCategory,
}
