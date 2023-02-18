const translate = require("translate")
const startBrowser = require("./startBrowser")
const axios = require("axios")
const {shuffle} = require("../lib/userFunc")

const korTranslate = async text => {


  try {
    const options = {
      method: 'GET',
      url: 'https://nlp-translation.p.rapidapi.com/v1/translate',
      params: {text, to: 'ko', from: 'zh-CN'},
      headers: {
        'x-rapidapi-host': 'nlp-translation.p.rapidapi.com',
        'x-rapidapi-key': '932f64e27amsh78cdad966b2c2c0p129e12jsn92420146f153'
      }
    };
    const response = await axios({
      ...options
    })
  
    if(response.data && response.data.status === 200){
      return response.data.translated_text.ko
    } 
  
    return text
  } catch(e){
    console.log("korTranslate2", e.message)
    return text
  }

  
  try {
    
    translate.engine = "google"
    translate.key = "AIzaSyBRobv1Hj0jvNvnWgDbzVoylKrqifQo_SA"
    translate.from = "zh"
    translate.to = "ko"
    const korText = await translate(text)
    
    return korText
  } catch (e){
    
    try {
      const options = {
        method: 'GET',
        url: 'https://nlp-translation.p.rapidapi.com/v1/translate',
        params: {text, to: 'ko', from: 'zh-CN'},
        headers: {
          'x-rapidapi-host': 'nlp-translation.p.rapidapi.com',
          'x-rapidapi-key': '932f64e27amsh78cdad966b2c2c0p129e12jsn92420146f153'
        }
      };
      const response = await axios({
        ...options
      })
    
      if(response.data && response.data.status === 200){
        return response.data.translated_text.ko
      } 
    
      return text
    } catch(e){
      console.log("korTranslate2", e.message)
      return text
    }
  }
  
}

const engTranslate = async text => {
  try {
    translate.engine = "google"
    translate.key = "AIzaSyBRobv1Hj0jvNvnWgDbzVoylKrqifQo_SA"
    translate.from = "zh"
    translate.to = "en"
    const korText = await translate(text)
    return korText
  } catch (e) {
    try {
      const options = {
        method: 'GET',
        url: 'https://nlp-translation.p.rapidapi.com/v1/translate',
        params: {text, to: 'en', from: 'zh-CN'},
        headers: {
          'x-rapidapi-host': 'nlp-translation.p.rapidapi.com',
          'x-rapidapi-key': '932f64e27amsh78cdad966b2c2c0p129e12jsn92420146f153'
        }
      };
      const response = await axios({
        ...options
      })
      
      if(response.data && response.data.status === 200){
        return response.data.translated_text.en
      } 
      return text
    } catch(e){
      console.log("korTranslate2", e.message)
      return text
    }
  }
  
}

const cnTranslate = async text => {
  // translate.engine = "google"
  // translate.key = "AIzaSyBRobv1Hj0jvNvnWgDbzVoylKrqifQo_SA"
  // translate.from = "ko"
  // translate.to = "zh"
  // const korText = await translate(text)
  // return korText

  try {
    const options = {
      method: 'GET',
      url: 'https://nlp-translation.p.rapidapi.com/v1/translate',
      params: {text, to: 'zh-CN', from: 'ko'},
      headers: {
        'x-rapidapi-host': 'nlp-translation.p.rapidapi.com',
        'x-rapidapi-key': '932f64e27amsh78cdad966b2c2c0p129e12jsn92420146f153'
      }
    };
    const response = await axios({
      ...options
    })
    
    if(response.data && response.data.status === 200){
      return response.data.translated_text["zh-CN"]
    } 
    return null
  } catch(e){
    console.log("cnTranslate", e.message)
    return null
  }
}

const kortoEngTranslate = async text => {
  try {
    translate.engine = "google"
    translate.key = "AIzaSyBRobv1Hj0jvNvnWgDbzVoylKrqifQo_SA"
    translate.from = "ko"
    translate.to = "en"
    const korText = await translate(text)
    
    return korText
  } catch (e){
    try {
      const options = {
        method: 'GET',
        url: 'https://nlp-translation.p.rapidapi.com/v1/translate',
        params: {text, to: 'en', from: 'ko'},
        headers: {
          'x-rapidapi-host': 'nlp-translation.p.rapidapi.com',
          'x-rapidapi-key': '932f64e27amsh78cdad966b2c2c0p129e12jsn92420146f153'
        }
      };
      const response = await axios({
        ...options
      })
      
      if(response.data && response.data.status === 200){
        return response.data.translated_text.en
      } 
      return text
    } catch(e){
      console.log("ItemDetails", e.message)
      return text
    }
  }
  

  
}

const EngtoKorTranslate = async text => {
  try {
    const options = {
      method: 'GET',
      url: 'https://nlp-translation.p.rapidapi.com/v1/translate',
      params: {text, to: 'ko', from: 'en'},
      headers: {
        'x-rapidapi-host': 'nlp-translation.p.rapidapi.com',
        'x-rapidapi-key': '932f64e27amsh78cdad966b2c2c0p129e12jsn92420146f153'
      }
    };
    const response = await axios({
      ...options
    })
    
    if(response.data && response.data.status === 200){
      return response.data.translated_text.ko
    } 
    return text
  } catch(e){
    console.log("EngtoKorTranslate", e.message)
    return text
  }
  

  
}


const googleTranslate = async text => {
  const browser = await startBrowser()
  try {
    const page = await browser.newPage()
    await page.setJavaScriptEnabled(true)

    await page.goto(
      `https://translate.google.co.kr/?hl=ko&sl=zh-CN&tl=ko&text=${text}&op=translate`,
      { waituntil: "networkidle0" }
    )
    const selector = ".tlid-translation.translation"
    await page.waitForSelector(selector, { timeout: 2000 })
    const title = await page.$eval(selector, elem => elem.textContent)
    return title
  } catch (e) {
    // console.log("googoeTranslate", e.message)
    return await korTranslate(text)
  } finally {
    await browser.close()
  }
}

const papagoTranslate = async (text, source="zh-CN", target="ko") => {
  let clients = [
    {
      clientID: "HgpYPNhPhbJSuOqeOlQc",
      clientSecret: "Oei1APoKJf"
    },
    {
     clientID: "loau89IOS5kuMyXY1lkq",
     clientSecret: "HUYOMW5Q5Z"
   },
   {
     clientID: "YBx8bP0T7C3xN_6u2S3Y",
     clientSecret: "MjUPMYMGVx"
   },
   {
     clientID: "VCpdZ6RMqCkmJbclnYOy",
     clientSecret: "6tdrxp94bh"
   },
   {
     clientID: "MC5JthhRd_poRD7ApTjs",
     clientSecret: "F0zxL8yunI"
   },
   //영미
   {
     clientID: "hUH0Bku23NDgXb_iZ0n9",
     clientSecret: "kMqyrlQuX8"
   },
   {
     clientID: "hX4kZEA_NTClzeGC58XO",
     clientSecret: "AnZ33WURoD"
   },
   {
     clientID: "e9wVLMuHdOfZAyKN7Ev1",
     clientSecret: "8KL3UaRVUg"
   },
   {
     clientID: "EQjbKEDRORlP1p9i9h56",
     clientSecret: "kjZSqKOcF8"
   },
   {
     clientID: "6wW10rqmzJgtx2F_FwVX",
     clientSecret: "AAUnFvqvzE"
   },
   {
     clientID: "wlEuP824T_bZTGmdELmS",
     clientSecret: "qSd4ngm_Qn"
   },
   {
     clientID: "2GpXnBjlXBurytrs3QPx",
     clientSecret: "MUyckmGgvM"
   },
   {
     clientID: "r2p4hvYWqJWCRWF6d3vV",
     clientSecret: "S8ZTUrl6FT"
   },
   {
     clientID: "OHHQnEqPCeQhXNN7JqEU",
     clientSecret: "dz3MN03h_V"
   },
   {
     clientID: "pfuPqrqjwvVpXqn7o941",
     clientSecret: "cH70bBydwZ"
   },
   //박서방
   {
     clientID: "bol1tRkBtNvQsvgj2DCd",
     clientSecret: "du6n7oiw10"
   },
   {
     clientID: "tifUkunKbMEOxrmBj3Uj",
     clientSecret: "HY7ueikVtp"
   },
   {
     clientID: "7aPBCPfsTTjrfr9haF9M",
     clientSecret: "QAi1BybC3b"
   },
   {
     clientID: "Ge4fOrZTdJxLLROhju43",
     clientSecret: "eHKqg3GNx7"
   },
   {
     clientID: "HfTkYQLyctkFn_P8aTyv",
     clientSecret: "gXzyt2mX7d"
   },
   {
     clientID: "OEnyDLh1XMlFdC8E69bc",
     clientSecret: "wiBZfW0oHM"
   },
   {
     clientID: "q7BBs1NKzl0w9RjNs_3z",
     clientSecret: "BXO4wEuBlk"
   },
   {
     clientID: "QoAGpEq8beZNmNOIhNiS",
     clientSecret: "sFvTexcO9_"
   },
   {
     clientID: "xYC31rURJkXBmNvWgFEE",
     clientSecret: "sonXtYZxD9"
   },
   {
     clientID: "xzpRGHN9eKqUmJYygRxk",
     clientSecret: "2hDyDERC0i"
   },
   //수빈
   {
     clientID: "4tKZsuQh3AD23m437vJ8",
     clientSecret: "gesesU3NnD"
   },
   {
     clientID: "UGdYFZxTTtUlWmzecZYS",
     clientSecret: "i7W46pHR6e"
   },
   {
     clientID: "5jkLl6Ybq6BDDZPQACzq",
     clientSecret: "b1AyOhHJBT"
   },
   {
     clientID: "THkwPFJ_8hCEyEn9VETL",
     clientSecret: "zSJP0Vrhpz"
   },
   {
     clientID: "1Ty0UVr9MxDhTKcDERoe",
     clientSecret: "B1kpYD7bK3"
   },
   {
     clientID: "85t6kYyznHMUd2VAJbt_",
     clientSecret: "3Ts52TpPs1"
   },
   {
     clientID: "yXhiWV2QSFHWATNK6dzf",
     clientSecret: "d61k1_MkD0"
   },
   {
     clientID: "DI0Smx3Y7mQuvAg4sLyb",
     clientSecret: "CSNBlgEdzJ"
   },
   {
     clientID: "jbvpmA34SweJfRTSaPTb",
     clientSecret: "RgSVgLgLTr"
   },
   {
     clientID: "dtNstu5Xa6rRu23vw2cd",
     clientSecret: "vcSUp3yX2b"
   },
 
   // 준환
   {
     clientID: "OgyDA9px7517XjQNkn2D",
     clientSecret: "sUFkUQ83F8"
   },
   {
     clientID: "sB8A5HzoF_UpR0vEYIkv",
     clientSecret: "zi3NCkc5XB"
   },
   {
     clientID: "8G187nnokeJEv7E8yZQl",
     clientSecret: "jIPdg919NY"
   },
   {
     clientID: "yXABM1NRHehO59iLZi1y",
     clientSecret: "MszthLBC57"
   },
   {
     clientID: "sX8SyrXZ6Wg4_ODUhdbT",
     clientSecret: "eqdbuIgjfp"
   },
   {
     clientID: "HPxmzF3MIpaBrAQ7X404",
     clientSecret: "vCEf0KZgl6"
   },
   {
     clientID: "7mSE02NexV9GHXMOA8lS",
     clientSecret: "Y7nz5WJ5Xr"
   },
   {
     clientID: "5Kw8y246dETCddJZC7Jq",
     clientSecret: "jmnsjYI4oq"
   },
   {
     clientID: "r3dc_WOlRxT8MIzT6wjg",
     clientSecret: "GNYgfRxzT9"
   },
   {
     clientID: "lgrKfRLlx5fkAZdp2ZXT",
     clientSecret: "mjvgwuwD4N"
   },
 
  ]
  try {
   clients = shuffle(clients)
 
   for(const client of clients) {
     try {
       const response = await axios({
         url: "https://openapi.naver.com/v1/papago/n2mt",
         method: "POST",
         data: {
           source,
           target,
           text
         },
         headers: {
           "X-Naver-Client-Id": client.clientID,
           "X-Naver-Client-Secret": client.clientSecret
         }
       })
       // console.log("response,", response.data.message.result)
       if(response && response.data.message.result){      
         return response.data.message.result.translatedText
       }
     } catch(e){
       // console.log("papago-->", e.data)
     }
     
   }
 
  } catch(e) {
    console.log("파파고 실패 -->", e)
    return text
  }
 }

const papagoTranslateNew = async (text) => {
  const browser = await startBrowser()
  try {
    const page = await browser.newPage()
    await page.setJavaScriptEnabled(true)
    
    await page.goto(`http://www.multranslator.com/`, {
      waituntil: "networkidle0"
    })

    await page.select("#rootSourceLanguage", "zh-CN")
    await page.type("#sourceTextarea", text)
    await page.click(".Mtl-Translate-Button")
    await page.waitFor(2000)
    
    const selector = ".Mtl-Target-Box-Papago > div > textarea"
    await page.waitForSelector(selector, { timeout: 5000 })
    
    const title = await page.$eval(selector, elem => elem.value)
    // console.log("title", title.split("♣").length)
    return title

  } catch (e) {
    console.log("papagoTranslate", e.message)
    return null
  } finally {
    await browser.close()
  }
}

const kakaoTranslate = async text => {
  const browser = await startBrowser()
  try {
    const page = await browser.newPage()
    await page.setJavaScriptEnabled(true)

    await page.goto(`https://translate.kakao.com/`, {
      waituntil: "networkidle0"
    })
    await page.type("#query", text)
    await page.waitFor(1000)
    const selector = "#result"
    await page.waitForSelector(selector, { timeout: 5000 })
    const title = await page.$eval(selector, elem => elem.innerText)
    return title
  } catch (e) {
    console.log("kakaoTranslate", e.message)
    return null
  } finally {
    await browser.close()
  }
}

module.exports = {
  korTranslate,
  engTranslate,
  cnTranslate,
  kortoEngTranslate,
  googleTranslate,
  papagoTranslate,
  kakaoTranslate,
  papagoTranslateNew,
  EngtoKorTranslate
}
