const request = require("request-promise-native")
const axios = require("axios")
const Cookie = require("../../models/Cookie")

exports.GetAliProduct = async ({url}) => {
  try {
    const cookie = await Cookie.findOne({
      name: "xman_t"
    })
    
    const content = await request({
      hostname: 'aliexpress.com',
      url,
      method: 'GET',
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36",
          "host": "aliexpress.com",
          "origin": "https://ko.aliexpress.com/",
          "referer": "https://ko.aliexpress.com/",
          // "Cookie": "aep_usuc_f=site=kor&c_tp=KRW&x_alimid=3585738017&isb=y&region=KR&b_locale=ko_KR;"
          "Cookie": `aep_usuc_f=site=kor&c_tp=KRW&x_alimid=3585738017&isb=y&region=KR&b_locale=ko_KR; xman_t=${cookie.cookie}`
        },
      })

    
    const temp = content.split("window.runParams = {")[1].trim()
    .replace("data", `"data"`)
    // .replace("csrfToken", `"csrfToken"`)
    // .replace("abVersion", `"abVersion"`)
    // .replace("abtestMap", `"abtestMap"`)
    // .replace(/'/gi, `"`)
    const temp2 = temp.split("csrfToken")[0].trim()
    const temp3 = `{${temp2.slice(0, temp2.length -1)}}`
    return JSON.parse(temp3)
  } catch(e){
    console.log("GetAliProduct", e)
    return null
  }
}

exports.GetDetailHtml = async ({url}) => {
  try {

    console.log("url", url)

    const content = await axios({
      url,
      method: "GET",
      responseType: "arraybuffer",
      headers: {
        "Cookie": "aep_usuc_f=site=kor&c_tp=KRW&x_alimid=3585738017&isb=y&region=KR&b_locale=ko_KR;"
      },
    })
    // const content = await request({
    //   hostname: 'aliexpress.com',
    //   url,
    //   method: 'GET',
    //     headers: {
    //       "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36",
    //       "host": "aliexpress.com",
    //       "origin": "https://ko.aliexpress.com/",
    //     },
    //   })
    
    // console.log("content--->", content)
    return content.data.toString()
  } catch(e){
    console.log("GetDetailHtml", e)
    return null
  }
}