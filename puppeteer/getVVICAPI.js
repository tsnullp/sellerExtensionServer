const axios = require("axios")
const cheerio = require("cheerio")
const {papagoTranslate} = require("../puppeteer/translate")
const _ = require("lodash")

const start = async ({url}) => {
  const ObjItem = {
    brand: "기타",
    manufacture: "기타",
    good_id: "",
    title: "",
    mainImages: [],
    price: 0,
    salePrice: 0,
    content: [],
    prop: [],
    options: [],
    keyword: [],
    exchange: "",
    marginInfo: [],
    shippingWeightInfo: [],
    detailUrl: url,
  }

  try {    

    let content = await axios({
      url,
      method: "GET"
    })

    content = content.data.toString()
  
    const $ = cheerio.load(content)

    ObjItem.title = await papagoTranslate($(".detail-title").text())
    console.log("title", ObjItem.title)
    
    $("#thumblist > .tb-thumb-item").each( (i, elem) => {
      let image = $(elem).find("img").attr("src")
      image = image.split("_60x60.jpg")[0]
      if(!image.includes("https:")){
        image = `https:${image}`
      }
      
      ObjItem.mainImages.push(image)
    })

    const keyword = []
    $(".keywords-list > a").each((i, elem) => {
      keyword.push($(elem).text().trim())
    })

    const keywordPromise = keyword.map(item => {
      return new Promise(async (resolve, reject) => {
        try {
          const keywordKor = await papagoTranslate(item)
          ObjItem.keyword.push(keywordKor)
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    })
    await Promise.all(keywordPromise)

    const itemVidTemp1 = content.split("var ITEM_VID = '")[1]
    const itemVidTemp2 = itemVidTemp1.split("';")[0]
    
    ObjItem.good_id = itemVidTemp2

    const discountPriceTemp1 = content.split("var _DISCOUNTPRICE = '")[1]
    const discountPriceTemp2 = discountPriceTemp1.split("';")[0]
    ObjItem.price = Number(discountPriceTemp2) ? Number(discountPriceTemp2) : 0
    ObjItem.salePrice = ObjItem.price

    const scriptTemp1 = content.split(`<script type="text/x-handlebars-template" id="descTemplate">`)[1]
    const scriptTemp2 = scriptTemp1.split(`</script>`)[0].trim()
    
    const detail$ = cheerio.load(scriptTemp2)
    detail$("img").each( (i, elem) => {
      let image = detail$(elem).attr("src")
      image = `https:${image}`
      ObjItem.content.push(image)
    })

    // console.log("detailImages", ObjItem.content)

    // console.log("content-", content)
    const temp1 = content.split("var _SKUMAP = '")[1]
    const temp2 = temp1.split("';")[0]
  
    const skumap = JSON.parse(temp2)

    const soldoutTemp1 = content.split("var _SOLDOUT = '")[1]
    const soldoutTemp2 = soldoutTemp1.split("' ==")[0]
    // soldoutTemp2 1 = 판매중, 0 = 판매종료
 
    const soldOut = soldoutTemp2 === "1" ? false : true
    
    const sizeTemp1 = content.split("var _SIZE = '")[1]
    const sizeTemp2 = sizeTemp1.split("';")[0]
    const sizeKorTemp = await papagoTranslate(sizeTemp2)
    const size = sizeTemp2.split(",")
    const sizeKor = sizeKorTemp.split(",")
    const sizeIdTemp1 = content.split("var _SIZEID = '")[1]
    const sizeIdTemp2 = sizeIdTemp1.split("';")[0]
    const sizeID = sizeIdTemp2.split(",")

    const colorTemp1 = content.split("var _COLOR = '")[1]
    const colorTemp2 = colorTemp1.split("';")[0]
    const colorKorTemp = await papagoTranslate(colorTemp2)
    const color = colorTemp2.split(",")
    const colorKor = colorKorTemp.split(",")
    const colorIdTemp1 = content.split("var _COLORID = '")[1]
    const colorIdTemp2 = colorIdTemp1.split("';")[0]
    const colorID = colorIdTemp2.split(",")
    
    ObjItem.prop.push({
      pid: "COLOR",
      name: "COLOR",
      korTypeName: "색상",
      values: color.map((item, i) => {
        let colorSkus = skumap.filter(item => item.color_id === colorID[i])
        let image = null
        if(colorSkus.length > 0){
          if(colorSkus[0].color_pic){
            image = `https:${colorSkus[0].color_pic}`
          } else {
            image = ObjItem.mainImages[0]
          }
        } else {
          image = ObjItem.mainImages[0]
        }
        return {
          vid: colorID[i],
          name: item,
          korValueName: colorKor[i],
          image
        }
      })
    })
    ObjItem.prop.push({
      pid: "SIZE",
      name: "SIZE",
      korTypeName: "사이즈",
      value: size.map((item, i) => {        
        return {
          vid: sizeID[i],
          name: item,
          korValueName: sizeKor[i],

        }
      })
    })
    // console.log("skumap -- ", skumap)
    // for(const item of ObjItem.prop){
    //   console.log("prop--", item)
    // }
    
  
    
    for(const item of skumap) {
      let image = item.color_pic
      if(image && !image.includes("https")) {
        image = `https:${image}`
      }
      if(!image) {
        image = ObjItem.mainImages[0]
      }

      let colorKorName = null
      let sizeKorName = null
      let index = color.indexOf(item.color_name)
      if(index > -1){
        colorKorName = colorKor[index]
      } else {
        colorKorName = await papagoTranslate(item.color_name)
      }
      index = size.indexOf(item.size_name)
      if(index > -1){
        sizeKorName = sizeKor[index]
      } else {
        sizeKorName = await papagoTranslate(item.size_name)
      }
      
      ObjItem.options.push({
        key: item.vid,
        propPath: item.skuid,
        price: item.discount_price,
        promotion_price: item.discount_price,
        stock: soldOut ? 0 : 100,
        image,
        disabled: soldOut ? true : false,
        active: soldOut ? false : true,
        value: `${item.color_name} ${item.size_name}`,
        korValue: `${colorKorName} ${sizeKorName}`,
        attributes: [
          {
            attributeTypeName: "색상",
            attributeValueName: colorKorName,
          },
          {
            attributeTypeName: "사이즈",
            attributeValueName: sizeKorName,
          },
        ]
      })
    }
    

    // console.log("ObjItem.options", ObjItem.options)
    
  } catch (e) {
    console.log("GetVVIC -- ", e)
    return null
  } finally {
    // console.log("ObjItem", ObjItem)
    return ObjItem
  }
}

module.exports = start