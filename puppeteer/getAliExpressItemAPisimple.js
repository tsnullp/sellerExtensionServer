const ExchangeRate = require("../models/ExchangeRate")
const ShippingPrice = require("../models/ShippingPrice")
const Brand = require("../models/Brand")
const cheerio = require("cheerio")
const { GetAliProduct, GetDetailHtml } = require("../api/AliExpress")
const { regExp_test } = require("../lib/userFunc")
const { korTranslate } = require("./translate")
const { getMainKeyword } = require("./keywordSourcing")
const _ = require("lodash")
const { searchKeywordCategory } = require("../puppeteer/categorySourcing")

const start = async ({ url, title, userID }) => {
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
    detailUrl: url,
  }

  try {
    const promiseArr = [
      new Promise(async (resolve, reject) => {
        try {
          const response = await GetAliProduct({ url })
          const {
            pageModule,
            commonModule,
            descriptionModule,
            imageModule,
            priceModule,
            quantityModule,
            shippingModule,
            skuModule,
            specsModule,
            titleModule,
          } = response.data

          let shipPrice = 0
          let deliverDate = null
          let purchaseLimitNumMax = 0
          let deliverCompany = null
          if (
            shippingModule &&
            shippingModule.freightCalculateInfo &&
            shippingModule.freightCalculateInfo.freight &&
            shippingModule.freightCalculateInfo.freight.freightAmount
          ) {
            shipPrice = Number(shippingModule.freightCalculateInfo.freight.freightAmount.value)
            deliverDate = shippingModule.freightCalculateInfo.freight.deliveryDateDisplay
            deliverCompany = shippingModule.freightCalculateInfo.freight.company
          } else if (
            shippingModule &&
            shippingModule.generalFreightInfo &&
            shippingModule.generalFreightInfo.originalLayoutResultList &&
            Array.isArray(shippingModule.generalFreightInfo.originalLayoutResultList) &&
            shippingModule.generalFreightInfo.originalLayoutResultList.length > 0
          ) {
            const utParams = JSON.parse(
              shippingModule.generalFreightInfo.originalLayoutResultList[0].bizData.utParams
            )

            deliverCompany =
              shippingModule.generalFreightInfo.originalLayoutResultList[0].bizData
                .deliveryProviderName
            if (
              shippingModule.generalFreightInfo.originalLayoutResultList[0].bizData.shippingFee ===
              "free"
            ) {
              shipPrice = 0
            } else {
              shipPrice =
                shippingModule.generalFreightInfo.originalLayoutResultList[0].bizData.displayAmount
            }
            deliverDate = utParams.deliveryDate
          }

          if (quantityModule && quantityModule.purchaseLimitNumMax) {
            purchaseLimitNumMax = quantityModule.purchaseLimitNumMax
          }

          ObjItem.shipPrice = shipPrice
          ObjItem.deliverDate = deliverDate
          ObjItem.purchaseLimitNumMax = purchaseLimitNumMax
          ObjItem.deliverCompany = deliverCompany

          if (!title || title.length === 0) {
            ObjItem.korTitle = regExp_test(titleModule.subject.trim())

            let titleArray = []
            const keywordResponse = await searchKeywordCategory({ keyword: ObjItem.korTitle })
            if (keywordResponse.intersectionTerms) {
              titleArray.push(
                ...keywordResponse.intersectionTerms.map((mItem) => regExp_test(mItem))
              )
            }
            if (keywordResponse.terms) {
              titleArray.push(...keywordResponse.terms.map((mItem) => regExp_test(mItem)))
            }

            ObjItem.korTitle = titleArray.join(" ")

            let tempTitle = ObjItem.korTitle
              .replace("크리에이티브", "")
              .replace("크리 에이 티브", "")
              .replace("어린이", "")
              .replace("유아", "")
              .replace("ins", "")
              .replace("일본식", "")
              .replace("일본", "")
              .replace("한국어", "")
              .replace("한국", "")
              .replace("주최자", "")
              .replace(" pu ", " ")
              .replace("Dropshipping", "")
              .replace("dropshipping", "")
            let tempTitleArray = tempTitle.split(" ").filter((item) => item.length > 0)
            ObjItem.korTitle = tempTitleArray.join(" ")
          } else {
            ObjItem.korTitle = regExp_text(title.trim())
          }

          ObjItem.mainKeyword = await getMainKeyword(ObjItem.korTitle)

          if (ObjItem.mainKeyword.length === 0) {
            ObjItem.mainKeyword = await getMainKeyword(ObjItem.korTitle, true)
          }

          ObjItem.keyword = []
          if (pageModule && pageModule.keywords && pageModule.keywords.length > 0) {
            if (!pageModule.keywords.includes("Aliexpress")) {
              const keywords = await korTranslate(pageModule.keywords.trim())
              ObjItem.keyword = keywords.split(",").map((item) => {
                return regExp_test(item).trim()
              })
            }
          }
          let brandList = await Brand.find(
            {
              brand: { $ne: null },
            },
            { brand: 1 }
          )

          let banList = []
          if (
            userID.toString() === "5f0d5ff36fc75ec20d54c40b" ||
            userID.toString() === "5f1947bd682563be2d22f008" ||
            userID.toString() === "625f9ca226d0840a73e2dbb8"
          ) {
            banList = await Brand.find(
              {
                userID: {
                  $in: [
                    "5f0d5ff36fc75ec20d54c40b",
                    "5f1947bd682563be2d22f008",
                    "625f9ca226d0840a73e2dbb8",
                  ],
                },
              },
              { banWord: 1 }
            )
          } else {
            banList = await Brand.find(
              {
                userID: userID,
              },
              { banWord: 1 }
            )
          }

          let korTitleArr = ObjItem.korTitle.split(" ")

          korTitleArr = korTitleArr.map((tItem) => {
            const brandArr = brandList.filter((item) =>
              tItem.toUpperCase().includes(item.brand.toUpperCase())
            )
            const banArr = banList.filter((item) =>
              tItem.toUpperCase().includes(item.banWord.toUpperCase())
            )

            return {
              word: tItem,
              brand: brandArr.length > 0 ? brandArr.map((item) => item.brand) : [],
              ban: banArr.length > 0 ? banArr.map((item) => item.banWord) : [],
            }
          })

          ObjItem.korTitleArray = korTitleArr
          ObjItem.good_id = commonModule.productId

          ObjItem.spec = specsModule.props.map((item) => {
            if (item.attrName === "브랜드 이름") {
              ObjItem.brand = item.attrValue
            }
            return {
              attrName: item.attrName,
              attrValue: item.attrValue,
            }
          })

          ObjItem.mainImages = imageModule.imagePathList

          const detailResponse = await GetDetailHtml({ url: descriptionModule.descriptionUrl })

          if (detailResponse) {
            const $ = cheerio.load(detailResponse)
            $("img").each(function (i, elem) {
              const value = $(this).attr("src")
              ObjItem.content.push(value)
            })
          }

          const { productSKUPropertyList, skuPriceList } = skuModule

          // for(const property of productSKUPropertyList){
          //   console.log("skuPropertyName:", property.skuPropertyName)
          //   console.log("skuPropertyValues:", property.skuPropertyValues)
          // }

          ObjItem.prop = productSKUPropertyList
            // .filter(item => item.skuPropertyName !== "배송지")
            .map((item) => {
              // console.log("item-->", item)

              if (item.skuPropertyId === 200007763) {
                // 배송지
                return {
                  pid: item.skuPropertyId.toString(),
                  korTypeName: item.skuPropertyName,
                  values: item.skuPropertyValues
                    .filter(
                      (fItem) =>
                        fItem.propertyValueId === 201336100 || fItem.propertyValueName === "CN"
                    )
                    // 중국
                    .map((kItem) => {
                      // console.log("vid: ", item.skuPropertyId, " - ", kItem.propertyValueId)
                      // console.log("name: ", kItem.propertyValueDisplayName)
                      // console.log("korValueName: ", kItem.propertyValueName)
                      // console.log("image: ", kItem.skuPropertyImagePath)
                      return {
                        vid: kItem.propertyValueId.toString(),
                        name: kItem.propertyValueDisplayName,
                        korValueName: kItem.propertyValueDisplayName,
                        image: kItem.skuPropertyImagePath
                          ? kItem.skuPropertyImagePath
                          : "https://gi.esmplus.com/jts0509/noimage.jpg",
                      }
                    }),
                }
              } else {
                return {
                  pid: item.skuPropertyId.toString(),
                  korTypeName: item.skuPropertyName,
                  values: item.skuPropertyValues.map((kItem) => {
                    // console.log("vid: ", item.skuPropertyId, " - ", kItem.propertyValueId)
                    // console.log("name: ", kItem.propertyValueDisplayName)
                    // console.log("korValueName: ", kItem.propertyValueName)
                    // console.log("image: ", kItem.skuPropertyImagePath)
                    return {
                      vid: kItem.propertyValueId.toString(),
                      name: kItem.propertyValueDisplayName,
                      korValueName: kItem.propertyValueDisplayName,
                      image: kItem.skuPropertyImagePath
                        ? kItem.skuPropertyImagePath
                        : "https://gi.esmplus.com/jts0509/noimage.jpg",
                    }
                  }),
                }
              }
            })

          // 번역
          // for(const pItems of ObjItem.prop){
          //   for(const vItem of pItems.values){
          //     vItem.korValueName =  await korTranslate(vItem.name.trim())
          //   }
          // }

          ObjItem.options = skuPriceList
            .map((item) => {
              // console.log("skuActivityAmount", item.skuVal.kuActivityAmount)
              // console.log("skuAmount:", item.skuVal.skuAmount)
              console.log("item", item)
              let image = null
              let value = ""
              let korValue = ""
              let attributeTypeName = "종류"
              const pid = item.skuAttr.split(":")[0]
              // const propArr = ObjItem.prop.filter(fItem => fItem.pid === pid)

              const propsArr = item.skuPropIds.split(",")

              for (let i = 0; i < propsArr.length; i++) {
                //200004521, 10
                const skuPropId = propsArr[i]
                // console.log("skuPropId", skuPropId)
                let propArr = []
                // for(const pItem of ObjItem.prop){
                //   propArr.push(...pItem.values)
                // }
                const skuProperty = _.find(ObjItem.prop[i].values, { vid: skuPropId })
                // console.log("skuProperty", skuProperty)

                if (skuProperty) {
                  image = image ? image : skuProperty.image
                  value += `${skuProperty.name} `
                  korValue += `${skuProperty.korValueName} `
                } else {
                  image = null
                  value += `null `
                  korValue += `null `
                }
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

              value = value.replace("CHINA", "").replace("CN", "").trim()
              korValue = korValue.replace("CHINA", "").replace("CN", "").replace("중국", "").trim()

              if (value.length === 0) {
                value = "단일상품"
              }
              if (korValue.length === 0) {
                korValue = "단일상품"
              }

              // actSkuMultiCurrencyCalPrice
              // actSkuMultiCurrencyCalPrice

              let price = 0
              let promotion_price = 0
              price = Number(item.skuVal.skuAmount.value) + shipPrice
              promotion_price = Number(item.skuVal.skuAmount.value) + shipPrice
              if (item.skuVal.skuActivityAmount) {
                price = Number(item.skuVal.skuActivityAmount.value) + shipPrice
                promotion_price = Number(item.skuVal.skuActivityAmount.value) + shipPrice
              }
              // if(purchaseLimitNumMax === 1){
              //   console.log("1", purchaseLimitNumMax)
              //   price = Number(item.skuVal.skuAmount.value) + shipPrice
              //   promotion_price = Number(item.skuVal.skuAmount.value) + shipPrice
              // } else {
              //   console.log("2", item.skuVal.skuActivityAmount)
              //   price = Number(item.skuVal.skuAmount.value) + shipPrice
              //   promotion_price = Number(item.skuVal.skuAmount.value) + shipPrice
              //   if(item.skuVal.skuActivityAmount){
              //     console.log("여기 타냐",shipPrice)
              //     price = Number(item.skuVal.skuActivityAmount.value) + shipPrice
              //     promotion_price = Number(item.skuVal.skuActivityAmount.value) + shipPrice
              //   }
              // }
              return {
                key: item.skuPropIds,
                propPath: item.skuAttr.split("#")[0],
                price,
                promotion_price,
                stock: item.skuVal.inventory,
                image: image ? image : "https://gi.esmplus.com/jts0509/noimage.jpg",
                disabled: Number(item.skuVal.inventory) === 0,
                active: Number(item.skuVal.inventory) > 0,
                value,
                korValue,
                attributes: [
                  {
                    attributeTypeName,
                    attributeValueName: korValue
                      .replace("CHINA", "")
                      .replace("CN", "")
                      .replace("중국", "")
                      .trim(),
                  },
                ],
              }
            })
            .filter((fItem) => !fItem.value.includes("null"))

          if (ObjItem.prop.length > 1) {
            ObjItem.prop = ObjItem.prop.filter((item) => item.pid !== "200007763")
          } else {
            if (ObjItem.prop.length === 1) {
              ObjItem.prop = ObjItem.prop.map((item) => {
                if (item.pid === "200007763") {
                  item.korTypeName = "종류"
                  item.values[0].name = "단일상품"
                  item.values[0].korValueName = "단일상품"
                  item.values[0].image = imageModule.imagePathList[0]
                }
                return item
              })
            }
          }

          // console.log("skuPriceList", skuPriceList)
          resolve()
        } catch (e) {
          console.log("어디==", e)
          reject()
        }
      }),
      new Promise(async (resolve, reject) => {
        try {
          const excahgeRate = await ExchangeRate.aggregate([
            {
              $sort: {
                날짜: -1,
              },
            },
            {
              $limit: 1,
            },
          ])

          let marginInfo = await ShippingPrice.aggregate([
            {
              $match: {
                userID,
                type: 6,
              },
            },
            {
              $sort: {
                title: 1,
              },
            },
          ])

          if (!marginInfo || marginInfo.length === 0) {
            marginInfo.push({
              title: 10,
              price: 30,
            })
          }
          let shippingWeightInfo = await ShippingPrice.aggregate([
            {
              $match: {
                userID,
                type: 7,
              },
            },
            {
              $sort: {
                title: 1,
              },
            },
          ])
          if (!shippingWeightInfo || shippingWeightInfo.length === 0) {
            shippingWeightInfo.push({
              title: 1,
              price: 10000,
            })
          }

          const exchange = Number(excahgeRate[0].USD_송금보내실때.replace(/,/gi, "") || 1250) + 5

          ObjItem.exchange = exchange
          ObjItem.marginInfo = marginInfo
          ObjItem.shippingWeightInfo = shippingWeightInfo

          resolve()
        } catch (e) {
          reject(e)
        }
      }),
    ]

    await Promise.all(promiseArr)
  } catch (e) {
    console.log("getAliExpressItemAPI", e)
  } finally {
    // console.log("ObjItem", ObjItem)
    return ObjItem
  }
}

module.exports = start
