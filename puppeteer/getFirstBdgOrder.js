const axios = require("axios")
const qs = require('qs');

exports.getFirstBdgOrder = async ({userInfo, cookie}) => {
  try {

    const data = qs.stringify({
      'page': '1',
      'limit': '0'
     });
    const content = await axios({
      url: "https://www.firstbdg.co.kr/order/",
      method: "POST",
      responseType: "arraybuffer",
      headers: {
        Cookie: cookie,
        Host: "www.firstbdg.co.kr",
        Origin: "https://www.firstbdg.co.kr",
        Referer: "https://www.firstbdg.co.kr/order/",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36"
      },
      data
    })

    return JSON.parse(content.data.toString())
    
  } catch (e) {
    console.log("getFirstBdgOrder", e)
    return null
  }
}