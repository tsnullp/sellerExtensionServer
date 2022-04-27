const cheerio = require("cheerio")
const request = require("request-promise-native")
const https = require('https')
const {AmazonAsin, sleep} = require("../../lib/userFunc")

const getContet = async ({url}) => {
  
  try {
    await sleep(500)
    const content = await request({
      hostname: 'iherb.com',
      url,
      method: 'GET',
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36",
          "host": "iherb.com",
          "origin": "https://www.iherb.com",
        },
      })
    return content
  } catch(e) {
    console.log("에러남11")
    return null
  } 
}
exports.iHerbCode = async ({url}) => {
  // const browser = await startBrowser(false)
  // const page = await browser.newPage()
  // await page.setJavaScriptEnabled(true)
  try {
    const asin = AmazonAsin(url)
    const host = url.replace(asin, "")
    const pid = []

    let content = await getContet({url})
    
    if(content){
      const $ = cheerio.load(content)
    
    
      $(".attribute-tile-group > div").each(function(i, elem) {
        const value = $(this).attr("data-pid")
        if(!pid.includes(value)){
          pid.push(value)
        }
        
      })
  
      for(let i = 0 ; i < pid.length; i ++){
        if(pid[i] !== asin){
          const values = await getPid({ url:`${host}${pid[i]}`})
          if(values) {
            values.forEach(item => {
              if(!pid.includes(item)){
                pid.push(item)
              }
            })
          }
          
        }
        
      }
    }
    
    console.log("pid---", pid)
    if(pid.length > 0){
      return pid
    } else {
      return [asin]
    }
  } catch(e){
    console.log("ProductDetail", e)
    return null
  } finally {
    // await browser.close()
  }
}

const getPid = async ({url}) => {
  try {
    const pid = []
    let content = await getContet({url})
    
    if(content){
      const $ = cheerio.load(content)
      $(".attribute-tile-group > div").each(function(i, elem) {
        const value = $(this).attr("data-pid")
        pid.push(value)
      })
      return pid
    }
    
  } catch(e) {
    console.log("getPid", e)
    return null
  }
  
}

exports.iHerbDetail = async ({asin, isUSA = false}) => {
  try{
    const agent = new https.Agent({
      rejectUnauthorized: false
    })

    const options = {
      httpsAgent: agent,
      rejectUnauthorized: false,
      headers: {
        'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36",
        "host": "catalog.app.iherb.com",
        "accept": "aplication/json",
        // "Cookie": "iher-pref1=storeid=0&sccode=US&lan=en-US&scurcode=USD&wp=2&lchg=1&ifv=1&pc=OTI1NzE&accsave=0&whr=2;",
        // origin: "https://www.iherb.com"
      },
      responseType: "arraybuffer"
    }
    if(isUSA){
      options.headers.Cookie = "iher-pref1=accsave=0&bi=1&ifv=1&lan=en-US&lchg=1&sccode=KR&scurcode=KRW&storeid=0&wp=2;",
      options.headers.origin = "https://www.iherb.com"
    } else {
      options.headers.Cookie = "iher-pref1=accsave=0&bi=6&ifv=1&lan=ko-KR&lchg=1&sccode=KR&scurcode=KRW&storeid=0&wp=2;"
      options.headers.origin = "https://www.kr.iherb.com"
    }
    console.log("iHerbDetail --->",  `https://catalog.app.iherb.com/product/${asin}`)
    // const content = await axios.get(`https://catalog.app.iherb.com/product/${asin}`, options)
    const content = await request({
        method: "GET",
        url: `https://catalog.app.iherb.com/product/${asin}`,
        ...options
      })

    return JSON.parse(content)
  } catch (e) {
    console.log("iHerbDetail", e)
    if(e.includes("Product is prohibited in your country")){
      return {
        prohibited: true
      }
    }
    return null
  }
}

