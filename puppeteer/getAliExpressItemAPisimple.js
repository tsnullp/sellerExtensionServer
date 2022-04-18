const ExchangeRate = require("../models/ExchangeRate")
const ShippingPrice = require("../models/ShippingPrice")
const Brand = require("../models/Brand")
const cheerio = require("cheerio")
const {GetAliProduct, GetDetailHtml} = require("../api/AliExpress")
const { AmazonAsin, regExp_test } = require("../lib/userFunc")
const { korTranslate } = require("./translate")
const _ = require("lodash")

const start = async ({url, title, userID}) => {
  const ObjItem = {
    brand: "기타",
    manufacture: "기타",
    good_id: "",
    title: "",
    mainImages: [],
    price: 0,
    salePrice: 0,
    content: [],
    options: [],
    exchange: "",
    marginInfo: [],
    shippingWeightInfo: [],
    detailUrl: url
  }

  try {

    const promiseArr = [
      new Promise(async (resolve, reject) => {
        try {
          const response = await GetAliProduct({url})  
          const {pageModule, commonModule, descriptionModule, imageModule, priceModule, quantityModule, shippingModule, skuModule, specsModule, titleModule} = response.data          

          let shipPrice = 0
          let deliverDate = null
          let purchaseLimitNumMax = 0
          let deliverCompany = null
          if(shippingModule && 
            shippingModule.freightCalculateInfo && 
            shippingModule.freightCalculateInfo.freight &&
            shippingModule.freightCalculateInfo.freight.freightAmount) {
              shipPrice = Number(shippingModule.freightCalculateInfo.freight.freightAmount.value)
              deliverDate = shippingModule.freightCalculateInfo.freight.deliveryDateDisplay
              deliverCompany = shippingModule.freightCalculateInfo.freight.company
     
            }

          if(quantityModule && quantityModule.purchaseLimitNumMax){
            purchaseLimitNumMax = quantityModule.purchaseLimitNumMax
          }

          ObjItem.shipPrice = shipPrice
          ObjItem.deliverDate = deliverDate
          ObjItem.deliverCompany = deliverCompany
          
          ObjItem.purchaseLimitNumMax = purchaseLimitNumMax

          if(!title || title.length === 0){
            ObjItem.korTitle = titleModule.subject
          } else {
            ObjItem.korTitle = title
          }
      
          ObjItem.keyword = []
          if(pageModule && pageModule.keywords && pageModule.keywords.length > 0) {
            const keywords = await korTranslate(pageModule.keywords.trim())
            ObjItem.keyword = keywords.split(",").map(item => {
              return regExp_test(item)
            })
          }
          let brandList = await Brand.find(
            {
              brand: { $ne: null }
            },
            { brand: 1 }
          )
      
          let banList = []
          if(userID.toString() === "5f0d5ff36fc75ec20d54c40b" || userID.toString() === "5f1947bd682563be2d22f008"){
            banList = await Brand.find(
              {
                userID: {$in: ["5f0d5ff36fc75ec20d54c40b", "5f1947bd682563be2d22f008"]}
              },
              { banWord: 1 }
            )
          } else {
            banList = await Brand.find(
              {
                userID: userID
              },
              { banWord: 1 }
            )
          }
      
          let korTitleArr = ObjItem.korTitle.split(" ")
          
          korTitleArr = korTitleArr.map(tItem => {
            const brandArr = brandList.filter(item =>
              tItem.toUpperCase().includes(item.brand.toUpperCase())
            )
            const banArr = banList.filter(item =>
              tItem.toUpperCase().includes(item.banWord.toUpperCase())
            )
      
            return {
              word: tItem,
              brand: brandArr.length > 0 ? brandArr.map(item => item.brand) : [],
              ban: banArr.length > 0 ? banArr.map(item => item.banWord) : []
            }
          })
          
          ObjItem.korTitleArray = korTitleArr
          ObjItem.good_id = commonModule.productId
          if(specsModule && specsModule.props){
            const propsArr = specsModule.props.filter(item => item.attrName === "브랜드 이름")
            if(propsArr.length > 0){
              ObjItem.brand = propsArr[0].attrValue
            }
          }
      
          ObjItem.mainImages = imageModule.imagePathList
      
          const detailResponse = await GetDetailHtml({url:descriptionModule.descriptionUrl})
      
          if(detailResponse) {
            const $ = cheerio.load(detailResponse)
            $("img").each(function(i, elem) {
              const value = $(this).attr("src")
              ObjItem.content.push(value)
            })
          }
      
          const {productSKUPropertyList, skuPriceList} = skuModule
      
          // for(const property of productSKUPropertyList){
          //   console.log("skuPropertyName:", property.skuPropertyName)
          //   console.log("skuPropertyValues:", property.skuPropertyValues)
          // }
      
          ObjItem.prop = productSKUPropertyList.map(item => {
            // console.log("item-->", item)
            return {
              pid: item.skuPropertyId.toString(),
              korTypeName: item.skuPropertyName,
              values: item.skuPropertyValues.map(kItem => {
                // console.log("vid: ", item.skuPropertyId, " - ", kItem.propertyValueId)
                // console.log("name: ", kItem.propertyValueDisplayName)
                // console.log("korValueName: ", kItem.propertyValueName)
                // console.log("image: ", kItem.skuPropertyImagePath)
                return {
                  vid: kItem.propertyValueId.toString(),
                  name: kItem.propertyValueDisplayName,
                  korValueName: kItem.propertyValueDisplayName,
                  image: kItem.skuPropertyImagePath
                }
              })
            }
          })
      
          // 번역
          // for(const pItems of ObjItem.prop){
          //   for(const vItem of pItems.values){
          //     vItem.korValueName =  await korTranslate(vItem.name.trim())
          //   }
          // }
      
          ObjItem.options = skuPriceList.map(item => {
            // console.log("skuActivityAmount", item.skuVal.kuActivityAmount)
            // console.log("skuAmount:", item.skuVal.skuAmount)
            // console.log("item", item)
            let image = null
            let value = ''
            let korValue = ''
            let attributeTypeName = "종류"
            const pid = item.skuAttr.split(":")[0]
            const propArr = ObjItem.prop.filter(fItem => fItem.pid === pid)

            const propsArr = item.skuPropIds.split(",")
            // console.log("propsArr", propsArr)
            for(let i = 0; i < propsArr.length; i++){
              //200004521, 10
              const skuPropId = propsArr[i]
              // console.log("skuPropId", skuPropId)
              const skuProperty = _.find(ObjItem.prop[i].values, {vid: skuPropId})
              // console.log("skuProperty", skuProperty)
              image = image ? image : skuProperty.image
              value += `${skuProperty.name} `
              korValue += `${skuProperty.korValueName} `
              

            }
            // console.log("image", image)
            // console.log("value", value)
            // console.log("korValue", korValue)
            // if(propArr.length > 0){
            //   attributeTypeName = propArr[0].korTypeName
            //   const propValues = propArr[0].values.filter(fItem => fItem.vid === item.skuPropIds)
            //   if(propValues.length > 0){
            //     image = propValues[0].image
            //     value = propValues[0].name
            //     korValue = propValues[0].korValueName
            //   }
            // }


            // actSkuMultiCurrencyCalPrice
            // actSkuMultiCurrencyCalPrice

            return {
              key: item.skuPropIds,
              propPath: item.skuAttr.split("#")[0],
              price: purchaseLimitNumMax !== 1 ? Number(item.skuVal.skuActivityAmount.value) + shipPrice :
              Number(item.skuVal.skuAmount.value) + shipPrice,
              promotion_price:  purchaseLimitNumMax !== 1 ? Number(item.skuVal.skuActivityAmount.value) + shipPrice :
              Number(item.skuVal.skuAmount.value) + shipPrice,
              // price: Number(item.skuVal.actSkuMultiCurrencyDisplayPrice.replace(/,/gi, "")) + shipPrice,
              // promotion_price: Number(item.skuVal.skuMultiCurrencyDisplayPrice.replace(/,/gi, "")) + shipPrice,
              stock: item.skuVal.inventory,
              image: image ? image: "https://gi.esmplus.com/jts0509/noimage.jpg",
              disabled: !item.skuVal.isActivity,
              active: item.skuVal.isActivity,
              value: value.trim(),
              korValue: korValue.trim(),
              attributes: [
                {
                  attributeTypeName,
                  attributeValueName: korValue
                }
              ]
            }
          })
      
          // console.log("skuPriceList", skuPriceList)
          resolve()
        }catch(e){
          console.log("어디==", e)
          reject()
        }
      }),
      new Promise(async (resolve, reject) => {
        try {
          const excahgeRate = await ExchangeRate.aggregate([
            {
              $sort: {
                날짜: -1
              }
            },
            {
              $limit: 1
            }
          ])

          
          let marginInfo = await ShippingPrice.aggregate([
            {
              $match: {
                userID,
                type: 6,
              }
            }, {
              $sort: {
                title: 1
              }
            }
          ])
 
          if(!marginInfo || marginInfo.length === 0){
            marginInfo.push(
              {
                title: 10,
                price: 30
              }
            )
          }
          let shippingWeightInfo = await ShippingPrice.aggregate([
            {
              $match: {
                userID,
                type: 7,
              }
            }, {
              $sort: {
                title: 1
              }
            }
          ])
          if(!shippingWeightInfo || shippingWeightInfo.length === 0){
            shippingWeightInfo.push(
              {
                title: 1,
                price: 10000
              }
            )
          }
          
          const exchange = Number(excahgeRate[0].USD_송금보내실때.replace(/,/gi, "") || 1250) + 5

          ObjItem.exchange = exchange
          ObjItem.marginInfo = marginInfo
          ObjItem.shippingWeightInfo = shippingWeightInfo
     
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    ]
    
    await Promise.all(promiseArr)
  } catch(e){
    console.log("getAliExpressItemAPI", e)
  } finally {
    // console.log("ObjItem", ObjItem)
    return ObjItem
  }
}

module.exports = start