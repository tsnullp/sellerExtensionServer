const translate = require("translate")
const startBrowser = require("./startBrowser")
const axios = require("axios")

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

const papagoTranslate = async text => {
  const browser = await startBrowser()
  try {
    const page = await browser.newPage()
    await page.setJavaScriptEnabled(true)

    await page.goto(`https://papago.naver.com/?sk=zh-CN&tk=ko&hn=0&st=${encodeURI(text)}`, {
      waituntil: "networkidle0"
    })
    const selector = "#targetEditArea > #txtTarget > span"
    await page.waitForSelector(selector, { timeout: 5000 })
    const title = await page.$eval(selector, elem => elem.innerText)
    return title
  } catch (e) {
    console.log("papagoTranslate", e.message)
    return null
  } finally {
    await browser.close()
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
