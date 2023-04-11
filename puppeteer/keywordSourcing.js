const { CategoryPredict } = require("../api/Market")
const { NaverKeywordRel } = require("../api/Naver")
const { sleep, regExp_test, ranking, DimensionArray } = require("../lib/userFunc")
const { searchKeywordCategory } = require("./categorySourcing")
const axios = require("axios")
const qs = require("querystring")
const _ = require("lodash")
const startBrowser = require("./startBrowser")

const getPermutations = function (arr, selectNumber) {
  const results = []
  try {
    if (selectNumber === 1) return arr.map((el) => [el])
    // n개중에서 1개 선택할 때(nP1), 바로 모든 배열의 원소 return. 1개선택이므로 순서가 의미없음.

    arr.forEach((fixed, index, origin) => {
      const rest = [...origin.slice(0, index), ...origin.slice(index + 1)]
      // 해당하는 fixed를 제외한 나머지 배열
      const permutations = getPermutations(rest, selectNumber - 1)
      // 나머지에 대해서 순열을 구한다.
      const attached = permutations.map((el) => [fixed, ...el])
      //  돌아온 순열에 떼 놓은(fixed) 값 붙이기
      results.push(...attached)
      // 배열 spread syntax 로 모두다 push
    })
  } catch (e) {
    console.log("00000", e)
  }

  return results // 결과 담긴 results return
}

const getMainKeyword = async (keyword, only = false) => {
  try {
    const title = regExp_test(keyword.replace(/,/gi, " ").replace(/\//gi, " "))
    const titleArr = _.uniq(title.split(" ").filter((item) => item.length > 0))
    const category = await CategoryPredict({
      userID: "5f0d5ff36fc75ec20d54c40b",
      productName: title,
    })
    if (category && category.data && category.data.predictedCategoryName) {
      const myCategory = category.data.predictedCategoryName
      let result = []
      if (only) {
        result = [...titleArr]
      } else {
        result = [
          ...getPermutations(titleArr, 2).map((item) => item.join(" ")),
          regExp_test(myCategory),
        ]
      }

      let myKeyword = []

      const promiseArray = result.map((item) => {
        return new Promise(async (resolve, reject) => {
          try {
            const category = await CategoryPredict({
              userID: "5f0d5ff36fc75ec20d54c40b",
              productName: item,
            })
            // const category = await searchNaverKeyword({title: item, endSearch: false})
            if (category.data.predictedCategoryName === myCategory) {
              // console.log("category", productKeyword, " -- ",  category.data.predictedCategoryName)
              myKeyword.push(item)
            }
            resolve()
          } catch (e) {
            reject(e)
          }
        })
      })
      await Promise.all(promiseArray)

      let mainKeywordArray = []

      for (const items of DimensionArray(myKeyword, 5)) {
        const response = await NaverKeywordRel({ keyword: items.join(",") })

        if (response) {
          for (const item of items) {
            const keywordObj = _.find(response.keywordList, { relKeyword: item.replace(/ /gi, "") })
            if (keywordObj) {
              mainKeywordArray.push({
                ...keywordObj,
                monthlyPcQcCnt: Number(keywordObj.monthlyPcQcCnt.toString().replace("< ", "")),
                monthlyMobileQcCnt: Number(
                  keywordObj.monthlyMobileQcCnt.toString().replace("< ", "")
                ),
              })
            }
          }
        }
        await sleep(200)
      }

      let mainKeyword = ""
      mainKeywordArray = mainKeywordArray.sort(
        (a, b) =>
          b.monthlyPcQcCnt + b.monthlyMobileQcCnt - (a.monthlyPcQcCnt + a.monthlyMobileQcCnt)
      )
      if (mainKeywordArray.length > 0) {
        mainKeyword = mainKeywordArray[0].relKeyword
      }

      // await getNaverTitle({keyword: mainKeyword})
      return mainKeyword
    } else {
      return ""
    }
  } catch (e) {
    console.log("getMainKeyword", e)
  }
}

const getCoupnagRelatedKeyword = async ({ keyword }) => {
  const browser = await startBrowser()
  const page = await browser.newPage()
  try {
    console.log("getCoupnagRelatedKeyword", keyword)
    await page.setJavaScriptEnabled(true)
    await page.goto(
      `https://www.coupang.com/np/search?component=&q=${encodeURI(keyword)}&channel=relate`,
      { waituntil: "networkidle0" }
    )
    // const content = await axios({
    //   url: `https://www.coupang.com/np/search?component=&q=${encodeURI(keyword)}&channel=relate`,
    //   method: "GET",
    //   headers: {
    //     'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    //     // 'Accept': '*/*',
    //     'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.128 Safari/537.36",
    //     // "sec-fetch-site": "same-origin",
    //     // "sec-fetch-mode": "cors",
    //     // "Accept-Encoding": "gzip, deflate, br",
    //     // "Connection": "keep-alive",
    //     // 'Cache-Control': 'no-cache',
    //     // 'Pragma': 'no-cache',
    //     // 'Expires': '0',
    //     // "referer": `https://www.coupang.com`,
    //   }
    // })
    const content = await page.content()
    // console.log("content--->", content)
    const temp1 = content.split("에 대한 검색결과입니다. ")[1]
    const temp2 = temp1.split(`, ">`)[0]
    const keywords = temp2.split(",").map((item) => item.trim())
    console.log("getCoupnagRelatedKeyword keywords", keywords)
    return keywords
  } catch (e) {
    console.log("getCoupnagRelatedKeyword", e)
    return []
  } finally {
    if (page) {
      await page.goto("about:blank")
      await page.close()
    }
    if (browser) {
      await browser.close()
    }
  }
}

const getCoupnagAutoKeyword = async ({ keyword }) => {
  try {
    const content = await axios({
      url: `https://www.coupang.com/np/search/autoComplete?callback=jQuery&keyword=${encodeURI(
        keyword
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
        referer: `https://www.coupang.com`,
      },
    })

    const temp1 = content.data.split("jQuery(")[1]
    const temp2 = temp1.split(`)`)[0]
    const temp3 = JSON.parse(temp2)
    const keywords = temp3.map((item) => item.keyword.trim())
    return keywords
  } catch (e) {
    console.log("getCoupnagAutoKeyword", e)
    return []
  }
}

const getNaverTitle = async ({ keyword }) => {
  const array = []
  try {
    const keywordList = await searchTitle({ keyword })

    const korean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/
    keywordList.forEach((item) => {
      const titleArray = item.productName.trim().split(" ")
      titleArray.forEach((item) => {
        if (item.length > 1 && korean.test(item)) {
          array.push(item)
        }
      })
    })
    const rankingArr = ranking(array)
    console.log("rankingArr", rankingArr)
  } catch (e) {
    console.log("getNaverTitle", e)
    return array
  } finally {
    return array
  }
}

const searchTitle = async ({ keyword }) => {
  let keywordList = []
  const pageArr1 = []
  const pageArr2 = []
  for (let i = 1; i < 11; i++) {
    pageArr1.push(i)
  }
  for (let i = 11; i < 21; i++) {
    pageArr2.push(i)
  }

  const arrayPromises1 = pageArr1.map(async (item) => {
    try {
      const result = await searchKeywordTitle({
        // page,
        keyword,
        index: item,
      })
      keywordList.push(...result)
    } catch (e) {
    } finally {
      // await page.goto("about:blank")
      // await page.close()
      return keywordList
    }

    // await sleep(500 + Math.floor(Math.random() * 1000))
  })

  const arrayPromises2 = pageArr2.map(async (item) => {
    // let page = await browser.newPage()
    try {
      const result = await searchKeywordTitle({
        // page,
        keyword,
        index: item,
      })
      keywordList.push(...result)
    } catch (e) {
    } finally {
      // await page.goto("about:blank")
      // await page.close()
    }

    // await sleep(500 + Math.floor(Math.random() * 1000))
  })

  await Promise.all(arrayPromises1)
  await Promise.all(arrayPromises2)

  return keywordList
}

const searchKeywordTitle = async ({ page, keyword, index = 1 }) => {
  let productList = []
  try {
    const content = await axios.get(
      `https://search.shopping.naver.com/api/search/all?sort=rel&pagingIndex=${index}&pagingSize=40&viewType=list&productSet=total&deliveryFee=&deliveryTypeValue=&frm=NVSHOVS&query=${qs.escape(
        keyword
      )}&origQuery=${qs.escape(keyword)}&iq=&eq=&xq=&window=`,
      {
        headers: {
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
      }
    )

    const jsObj = content.data
    const list = jsObj.shoppingResult.products

    // let dummyData = list.filter(({ item }) => item.openDate >= agoMonth).map(({ item }) => {
    let dummyData = list.map((item) => {
      let manuTag = item.manuTag ? item.manuTag.replace(/,/gi, " ") : ""

      return {
        productName: `${item.productName} ${manuTag}`,
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
  } catch (e) {
    console.log("searchKeywordTitle ->", e)
  } finally {
    return productList
  }
}

const searchLensImage = async ({url}) => {
  let searchKeyword = []
  try {
  
    const content = await axios.get(
      `https://msearch.shopping.naver.com/search/image?iu=${encodeURI(url)}`,
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
          referer: `https://msearch.shopping.naver.com/search/image`,
          // sbth: getSbth()
        },
      }
    )
    
    const data = content.data.split(`<script id="__NEXT_DATA__" type="application/json">`)[1].split(`</script></body></html>`)[0]
    const jsonObj = JSON.parse(data.replace(/\\"/), `"` )
    // console.log("jsonObj", jsonObj)
    const initialState = JSON.parse(jsonObj.props.pageProps.initialState.replace("undefined", `"undefined`))
    
    
    if(!initialState.imageSearch.searchResult || initialState.imageSearch.searchResult.size.h < 400){
      return searchKeyword
    }
    const similarImages = initialState.imageSearch.searchResult.similarImages
    const products = similarImages.filter(item => item.score >= 0.94).map(item => item.productTitle.split("{")[0].replace(/,/, "").trim())

    // let arrayKeyword = []
    // console.log("products", url, products.length)
    // console.log("products uniq", _.uniq(products).length)
    for(const title of _.uniq(products)){
      const {nluTerms} = await searchKeywordCategory({keyword: title})
      await sleep(300)
      if(nluTerms) {
        searchKeyword.push(...nluTerms.filter(item => item.type !== "브랜드").map(item => item.keyword))
      }
    }
   
    // const rankKeyword = ranking(arrayKeyword, 1)
    
    // searchKeyword = rankKeyword.map(item => item.name)
    // console.log("searchKeyword", searchKeyword)
  } catch (e) {
    console.log("쇼핑렌즈 --- @@@ ", url)
    console.log("searchLensKeyword", e)
  } finally {
    return searchKeyword
  }
}


module.exports = {
  getMainKeyword,
  getCoupnagRelatedKeyword,
  getCoupnagAutoKeyword,
  searchLensImage
}
