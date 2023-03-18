const express = require("express")
const http = require("https")
const database = require("./database")
const { AmazonAsin, sleep, regExp_test } = require("./lib/userFunc")
const bodyParser = require("body-parser")
const cors = require("cors")
const moment = require("moment")
const User = require("./models/User")
const Market = require("./models/Market")
const MarketOrder = require("./models/MarketOrder")
const DeliveryInfo = require("./models/DeliveryInfo")
const AmazonCollection = require("./models/AmazonCollection")
const TempProduct = require("./models/TempProduct")
const ShippingPrice = require("./models/ShippingPrice")
const Product = require("./models/Product")
const Cookie = require("./models/Cookie")
const { iHerbCode } = require("./api/iHerb")
const findAmazonDetailAPIsimple = require("./puppeteer/getAmazonItemAPIsimple")
const { findIherbDetailAPI, findIherbDetailSimple } = require("./puppeteer/getIherbItemAPIsimple")
const {getFirstBdgOrder} = require("./puppeteer/getFirstBdgOrder")
const findTaobaoDetailAPIsimple = require("./puppeteer/getTaobaoItemAPIsimple")
const findAliExpressDetailAPIsimple = require("./puppeteer/getAliExpressItemAPisimple")
const getVVIC = require("./puppeteer/getVVICAPI")
const updateCafe24 = require("./puppeteer/updateCafe24")
const {Cafe24ListOrders, Cafe24RegisterShipments} = require("./api/Market")
const mongoose = require("mongoose")
const ObjectId = mongoose.Types.ObjectId
const {
  CoupnagGET_PRODUCT_BY_PRODUCT_ID,
  CoupnagUPDATE_PRODUCT_QUANTITY_BY_ITEM,
  CoupnagUPDATE_PRODUCT_PRICE_BY_ITEM,
  CoupnagUPDATE_PARTIAL_PRODUCT,
} = require("./api/Market")
const cron = require("node-cron")

// jtsjna@gmail.com

// cron.schedule("0 0,15 * * *", () => {
//   try {
//     console.log("schedule")
//     // IherbPriceSync()
//   } catch (e) {
//     console.log("schedule", e.message)
//   }

//   // CoupangStatusSearch()
// })

// setInterval(function () {
//   console.log("setInterval")
//   http.get("https://sellerextension.herokuapp.com/")
// }, 600000)

database()

const PORT = process.env.PORT || 3300
const app = express()
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ limit: "50mb", extended: false }))

app.use(cors())
app.use(bodyParser.json())

app.use(bodyParser.urlencoded({ extended: true }))
app.get("/", (req, res) => res.send("Hello World!!"))

app.listen(PORT, () => console.log(`Example app listening at http://localhost:${PORT}`))

app.post("/taobao/cookie", async (req, res) => {
  try {
    const { nick, cookie } = req.body
    console.log("nick", nick)
    if (!nick || nick.length === 0) {
      res.json({
        message: "fail",
      })
      return
    }
    await Cookie.findOneAndUpdate(
      {
        name: nick,
      },
      {
        $set: {
          name: nick,
          cookie,
          lastUpdate: moment().toDate(),
        },
      },
      {
        upsert: true,
      }
    )
    res.json({
      message: "success",
    })
  } catch (e) {
    console.log("/taobao/cookie", e)
    res.json({
      message: "fail",
    })
  }
})

// 로그인
app.post("/seller/login", async (req, res) => {
  console.log("req.body", req.body)
  try {
    if (!req.body.email || req.body.email.length === 0) {
      res.json({
        code: "ERROR",
        message: "이메일주소를 입력해주세요.",
      })
      return
    }

    if (!req.body.password || req.body.password.length === 0) {
      res.json({
        code: "ERROR",
        message: "패스워드를 입력해주세요.",
      })
      return
    }

    const response = await User.findOne({
      email: req.body.email,
    })
    if (response) {
      if (response.password === req.body.password) {
        res.json({
          code: "SUCCESS",
          data: {
            email: response.email,
            nickname: response.nickname,
            admin: response.grade === "1",
            avatar: response.avatar,
          },
        })
      } else {
        res.json({
          code: "ERROR",
          message: "패스워드가 일치하지 않습니다.",
        })
      }
    } else {
      res.json({
        code: "ERROR",
        message: "등록된 사용자가 없습니다.",
      })
    }
  } catch (e) {
    res.json({ code: "ERROR" })
  }
})

app.post("/amazon/isRegister", async (req, res) => {
  try {
    const { detailUrl, user } = req.body
    console.log("detailUrl, use", detailUrl, user)
    const asin = AmazonAsin(detailUrl)
    // 0: 실패, 1: 등록됨, 2: 수집요청전, 3: 수집요청후, 4: 수집완료, 5t 수집실패
    if (!asin || !user) {
      res.json({
        registerType: 0,
        detailUrl,
      })
      return
    }

    const userInfo = await User.findOne({
      email: user,
    })

    if (!userInfo) {
      res.json({
        registerType: 0,
        detailUrl,
      })
      return
    }

    let product = null
    if (
      detailUrl.includes("taobao.com") ||
      detailUrl.includes("tmall.com") ||
      detailUrl.includes("aliexpress.com")
    ) {
      product = await Product.findOne({
        userID: ObjectId(userInfo._id),
        "basic.good_id": asin,
        isDelete: false,
      })
    } else {
      product = await Product.findOne({
        userID: ObjectId(userInfo._id),
        "options.key": asin,
        isDelete: false,
      })
    }

    if (product) {
      res.json({
        registerType: 1,
        detailUrl,
      })
      return
    }
    const tempProduct = await TempProduct.findOne({
      userID: ObjectId(userInfo._id),
      good_id: asin,
    })

    // 수집완료
    if (tempProduct && tempProduct.options.length > 0) {
      res.json({
        registerType: 4,
        detailUrl,
      })
      return
    } else if (tempProduct && tempProduct.options.length === 0) {
      // 수집실패
      res.json({
        registerType: 5,
        detailUrl,
      })
      return
    }

    const tempCollection = await AmazonCollection.findOne({
      userID: ObjectId(userInfo._id),
      asin,
    })
    if (tempCollection) {
      if (tempCollection.isDelete) {
        // 삭제
        res.json({
          registerType: 6,
          detailUrl,
        })
        return
      } else {
        // 수집대기
        res.json({
          registerType: 3,
          detailUrl,
        })
        return
      }
    } else {
      // 아무것도 아님
      res.json({
        registerType: 2,
        detailUrl,
      })
      return
    }
  } catch (e) {
    console.log("/amazon/isRegister", e)
  }
})

app.post("/amazon/isRegisters", async (req, res) => {
  try {
    const { user, items } = req.body

    const userInfo = await User.findOne({
      email: user,
    })
    if (!userInfo) {
      res.json([])
      return
    }

    let response = []
    
    if (items && Array.isArray(items) && items.length > 0) {
      const asinArr = items.map((item) => AmazonAsin(item))

      let product = null
      if (
        items[0].includes("taobao.com") ||
        items[0].includes("tmall.com") ||
        items[0].includes("aliexpress.com") ||
        items[0].includes("vvic.com")
      ) {
        product = await Product.aggregate([
          {
            $match: {
              userID: ObjectId(userInfo._id),
              "basic.good_id": { $in: asinArr },
              isDelete: false,
            },
          },
          {
            $project: {
              "basic.good_id": 1,
            },
          },
        ])
      } else {
        product = await Product.aggregate([
          {
            $match: {
              userID: ObjectId(userInfo._id),
              "options.key": { $in: asinArr },
              isDelete: false,
              $or: [
                {
                  "basic.url": { $regex: `.*amazon.com.*` },
                },
                {
                  "basic.url": { $regex: `.*iherb.com.*` },
                },
                {
                  "basic.url": { $regex: `.*aliexpress.com.*` },
                },
              ],
            },
          },
          {
            $project: {
              "options.key": 1,
            },
          },
          { $unwind: "$options" },
        ])
      }

      const tempProducts = await TempProduct.aggregate([
        {
          $match: {
            userID: ObjectId(userInfo._id),
            good_id: { $in: asinArr },
          },
        },
        {
          $project: {
            good_id: 1,
            options: 1,
          },
        },
      ])

      const tempCollections = await AmazonCollection.aggregate([
        {
          $match: {
            userID: ObjectId(userInfo._id),
            asin: { $in: asinArr },
          },
        },
        {
          $project: {
            asin: 1,
            isDelete: 1,
          },
        },
      ])

      // 0: 실패, 1: 등록됨, 2: 수집요청, 3: 수집대기, 4: 수집완려, 5: 수집실패, 6: 삭제
      for (const detailUrl of items) {
        const asin = AmazonAsin(detailUrl)

        if (!asin) {
          continue
        }

        if (
          product.filter((pItem) => {
            if (
              items[0].includes("taobao.com") ||
              items[0].includes("tmall.com") ||
              items[0].includes("aliexpress.com") ||
              items[0].includes("vvic.com")
            ) {
              console.log("pItem.basic.good_id", pItem.basic.good_id)
              return pItem.basic.good_id === asin
            } else {
              return pItem.options.key === asin
            }
            return false
          }).length > 0
        ) {
          // 등록됨
          response.push({
            registerType: 1,
            detailUrl,
          })
        } else {
          const temp = tempProducts.filter((tItem) => tItem.good_id === asin)
          if (temp.length > 0) {
            const tempProduct = temp[0]
            if (tempProduct.options.length > 0) {
              // 수집완료
              response.push({
                registerType: 4,
                detailUrl,
              })
            } else {
              // 수집실패
              response.push({
                registerType: 5,
                detailUrl,
              })
            }
          } else {
            const tempColl = tempCollections.filter((tItem) => tItem.asin === asin)
            if (tempColl.length > 0) {
              if (tempColl[0].isDelete) {
                // 삭제
                response.push({
                  registerType: 6,
                  detailUrl,
                })
              } else {
                // 수집대기
                response.push({
                  registerType: 3,
                  detailUrl,
                })
              }
            } else {
              // 아무것도 아님
              response.push({
                registerType: 2,
                detailUrl,
              })
            }
          }
        }
      }

      res.json(response)
      return
    } else {
      res.json([])
      return
    }
  } catch (e) {
    console.log("/amazon/isRegisters", e)
    res.json([])
  }
})

app.post("/amazon/registerItem", async (req, res) => {
  try {
    const { detailUrl, user, image, title } = req.body
    const asin = AmazonAsin(detailUrl)
    console.log("detailUrl", detailUrl)
    console.log("image", image)
    console.log("title", title)
    // 0: 실패, 1: 등록됨, 2: 수집요청, 3: 수집대기
    if (!asin || !user || !image || !title || !detailUrl) {
      res.json({
        registerType: 0,
        detailUrl,
      })
      return
    }

    const userInfo = await User.findOne({
      email: user,
    })
    if (!userInfo) {
      res.json({
        registerType: 1,
        detailUrl,
      })
      return
    }

    const product = await Product.findOne({
      userID: ObjectId(userInfo._id),
      "options.key": asin,
      isDelete: false,
    })
    if (product) {
      res.json({
        registerType: 1,
        detailUrl,
      })
      return
    } else {
      const tempProduct = await TempProduct.findOne({
        userID: ObjectId(userInfo._id),
        good_id: asin,
      })
      if (tempProduct && tempProduct.options.length === 0) {
        // 실패 했던 거 다시 수집 대기로 변경
        await TempProduct.remove({
          userID: ObjectId(userInfo._id),
          good_id: asin,
        })
        await AmazonCollection.findOneAndUpdate(
          {
            userID: ObjectId(userInfo._id),
            asin,
          },
          {
            $set: {
              userID: ObjectId(userInfo._id),
              asin,
              detailUrl,
              title,
              image,
              isDelete: false,
              lastUpdate: moment().toDate(),
            },
          },
          {
            upsert: true,
            new: true,
          }
        )
        res.json({
          registerType: 3,
          detailUrl,
        })
        return
      }

      const tempCollection = await AmazonCollection.findOne({
        userID: ObjectId(userInfo._id),
        asin,
        isDelete: { $ne: true },
      })

      if (tempCollection) {
        // 수집완료 -> 다시 수집
        await AmazonCollection.remove({
          userID: ObjectId(userInfo._id),
          asin,
        })

        res.json({
          registerType: 2,
          detailUrl,
        })
        return
      } else {
        // 수집요청
        await AmazonCollection.findOneAndUpdate(
          {
            userID: ObjectId(userInfo._id),
            asin,
          },
          {
            $set: {
              userID: ObjectId(userInfo._id),
              asin,
              detailUrl,
              title,
              image,
              isDelete: false,
              lastUpdate: moment().toDate(),
            },
          },
          {
            upsert: true,
            new: true,
          }
        )

        res.json({
          registerType: 3,
          detailUrl,
        })
        return
      }
    }
  } catch (e) {
    console.log("/amazon/registerItem", e)
    res.json({
      registerType: 0,
      detailUrl,
    })
  }
})

app.post("/amazon/getCollectionItem", async (req, res) => {
  try {
    
    const { user } = req.body
    
    const userInfo = await User.findOne({
      email: user,
    })
    
    if (!userInfo) {
      res.json([])
      return
    }
    const products = await AmazonCollection.find({
      userID: ObjectId(userInfo._id),
      isDelete: { $ne: true },
    })
    let asinArr = products.map((item) => item.asin)
    
    const registerProducts = await Product.find({
      userID: ObjectId(userInfo._id),
      isDelete: false,
      "basic.good_id": { $in: asinArr },
    })
    
    const tempArr = await TempProduct.find({
      userID: ObjectId(userInfo._id),
      good_id: { $in: asinArr },
    })
    const productArr = []
    for (const item of products) {
      let isRegister = false
      for (const rItem of registerProducts) {
        if (rItem.options.filter((fItem) => fItem.key === item.asin).length > 0) {
          isRegister = true
        }
        if (rItem.basic.good_id === item.asin) {
          isRegister = true
        }
      }
      if (!isRegister) {
        const temp = tempArr.filter((fItem) => fItem.good_id === item.asin)
        if (temp.length > 0) {
          item.isDone = true
          if (temp[0].options.length === 0) {
            console.log("실패")
            item.isFail = true
          }
        }
        // const temp = await TempProduct.findOne(
        //   {
        //     userID: ObjectId(userInfo._id),
        //     good_id: item.asin
        //   }
        // )
        // if(temp) {

        //   item.isDone = true
        //   if(temp.options.length === 0) {
        //     console.log("실패")
        //     item.isFail = true
        //   }
        // }

        productArr.push(item)
      }
    }
    
    res.json(
      productArr.map((item) => {
        return {
          asin: item.asin,
          detailUrl: item.detailUrl,
          title: item.title,
          image: item.image,
          isDone: item.isDone ? true : false,
          isFail: item.isFail ? true : false,
        }
      })
    )
  } catch (e) {
    console.log("/amazon/getCollectionItem", e)
    res.json([])
  }
})

app.post("/amazon/collectionItems", async (req, res) => {
  try {
    const { user } = req.body

    const userInfo = await User.findOne({
      email: user,
    })
    if (!userInfo) {
      res.json({
        message: "fail",
      })
      return
    }

    const products = await AmazonCollection.find({
      userID: ObjectId(userInfo._id),
      isDelete: { $ne: true },
    })

    setTimeout(async () => {
      try {
        for (const item of products) {
          try {
            let product = null
            if (item.detailUrl.includes("taobao.com") || item.detailUrl.includes("tmall.com") || item.detailUrl.includes("vvic.com")) {
              product = await Product.findOne({
                userID: ObjectId(userInfo._id),
                "basic.good_id": item.asin,
                isDelete: false,
              })
            } else {
              product = await Product.findOne({
                userID: ObjectId(userInfo._id),
                "options.key": item.asin,
                isDelete: false,
              })
            }

            if (!product) {
              const tempProduct = await TempProduct.findOne({
                userID: ObjectId(userInfo._id),
                good_id: item.asin,
              })
              if (!tempProduct) {
                if (item.detailUrl.includes("amazon.com")) {
                  // 아마존
                  let detailItem = await findAmazonDetailAPIsimple({
                    url: item.detailUrl,
                    userID: ObjectId(userInfo._id),
                  })
                  if (detailItem) {
                    await TempProduct.findOneAndUpdate(
                      {
                        userID: ObjectId(userInfo._id),
                        good_id: item.asin,
                      },
                      {
                        $set: {
                          userID: ObjectId(userInfo._id),
                          good_id: item.asin,
                          brand: detailItem.brand,
                          manufacture: detailItem.manufacture,
                          title: detailItem.title,
                          keyword: detailItem.keyword,
                          mainImages: detailItem.mainImages,
                          price: detailItem.price,
                          salePrice: detailItem.salePrice,
                          content: detailItem.content,
                          options: detailItem.options,
                          detailUrl: detailItem.detailUrl,
                          isPrime: detailItem.isPrime,
                          korTitle: detailItem.korTitle,
                          titleArray: detailItem.titleArray,
                          korTitleArray: detailItem.korTitleArray,
                          feature: detailItem.feature,
                          spec: detailItem.spec,
                          prop: detailItem.prop,
                          prohibitWord: detailItem.prohibitWord,
                          engSentence: detailItem.engSentence,
                          lastUpdate: moment().toDate(),
                        },
                      },
                      {
                        upsert: true,
                        new: true,
                      }
                    )
                  }
                } else if (item.detailUrl.includes("iherb.com")) {
                  // 아이허브
                  console.log("item.detailUrl", item.detailUrl)
                  const asin = AmazonAsin(item.detailUrl)
                  if (!asin) {
                    continue
                  }
                  const host = item.detailUrl.replace(`/${asin}`, "/")
                  const response = await iHerbCode({ url: item.detailUrl })
                  for (const pid of response) {
                    let detailItem = await findIherbDetailAPI({
                      url: `${host}${pid}`,
                      userID: ObjectId(userInfo._id),
                    })
                    if (detailItem) {
                      console.log("detailITEm", detailItem)
                      if (detailItem.prohibited === true) {
                        await AmazonCollection.remove({
                          userID: ObjectId(userInfo._id),
                          asin,
                        })
                      } else {
                        await TempProduct.findOneAndUpdate(
                          {
                            userID: ObjectId(userInfo._id),
                            good_id: detailItem.good_id,
                          },
                          {
                            $set: {
                              userID: ObjectId(userInfo._id),
                              good_id: detailItem.good_id,
                              brand: detailItem.brand,
                              manufacture: detailItem.manufacture,
                              title: detailItem.title,
                              keyword: detailItem.keyword,
                              mainImages: detailItem.mainImages,
                              price: detailItem.price,
                              salePrice: detailItem.salePrice,
                              content: detailItem.content,
                              description: detailItem.description, // 제품설명
                              suggestedUse: detailItem.suggestedUse, // 제품 사용법
                              ingredients: detailItem.ingredients, //  포함된 다른 성분들
                              warnings: detailItem.warnings, // 주의사항
                              disclaimer: detailItem.disclaimer, // 면책사항
                              supplementFacts: detailItem.supplementFacts,
                              options: detailItem.options,
                              detailUrl: detailItem.detailUrl,
                              isPrime: detailItem.isPrime,
                              korTitle: detailItem.korTitle,
                              titleArray: detailItem.titleArray,
                              korTitleArray: detailItem.korTitleArray,
                              feature: detailItem.feature,
                              spec: detailItem.spec,
                              prop: detailItem.prop,
                              prohibitWord: detailItem.prohibitWord,
                              engSentence: detailItem.engSentence,
                              lastUpdate: moment().toDate(),
                            },
                          },
                          {
                            upsert: true,
                            new: true,
                          }
                        )
                      }
                    }
                  }
                } else if (item.detailUrl.includes("aliexpress.com")) {
                  // 알리익스프레스
                  console.log("item.detailUrl", item.detailUrl)
                  let detailItem = await findAliExpressDetailAPIsimple({
                    url: item.detailUrl.replace("https:ko", "https://ko"),
                    userID: ObjectId(userInfo._id),
                  })
                  // console.log("detailItem", detailItem)
                  if (detailItem) {
                    await TempProduct.findOneAndUpdate(
                      {
                        userID: ObjectId(userInfo._id),
                        good_id: detailItem.good_id,
                      },
                      {
                        $set: {
                          userID: ObjectId(userInfo._id),
                          good_id: detailItem.good_id,
                          brand: detailItem.brand,
                          manufacture: detailItem.manufacture,
                          title: detailItem.title,
                          keyword: detailItem.keyword,
                          mainKeyword: detailItem.mainKeyword,
                          spec: detailItem.spec,
                          mainImages: detailItem.mainImages,
                          price: detailItem.price,
                          salePrice: detailItem.salePrice,
                          content: detailItem.content,
                          shipPrice: detailItem.shipPrice, // 배송비
                          deliverDate: detailItem.deliverDate, // 배송일
                          purchaseLimitNumMax: detailItem.purchaseLimitNumMax, // 구매수량
                          deliverCompany: detailItem.deliverCompany,
                          options: detailItem.options,
                          detailUrl: detailItem.detailUrl.replace("https:ko", "https://ko"),
                          isPrime: detailItem.isPrime,
                          korTitle: detailItem.korTitle,
                          titleArray: detailItem.titleArray,
                          korTitleArray: detailItem.korTitleArray,
                          prop: detailItem.prop,
                          lastUpdate: moment().toDate(),
                        },
                      },
                      {
                        upsert: true,
                        new: true,
                      }
                    )
                  }
                } else if (
                  item.detailUrl.includes("taobao.com") ||
                  item.detailUrl.includes("tmall.com")
                ) {
                  // 타오바오
                  console.log("item.detailUrl", item.detailUrl)
                  let detailItem = await findTaobaoDetailAPIsimple({
                    url: item.detailUrl,
                    userID: ObjectId(userInfo._id),
                  })

                  if (detailItem && detailItem.options && detailItem.options.length > 0) {
                    await TempProduct.findOneAndUpdate(
                      {
                        userID: ObjectId(userInfo._id),
                        good_id: detailItem.good_id,
                      },
                      {
                        $set: {
                          userID: ObjectId(userInfo._id),
                          good_id: detailItem.good_id,
                          brand: detailItem.brand,
                          manufacture: detailItem.manufacture,
                          title: detailItem.title,
                          keyword: detailItem.keyword,
                          mainKeyword: detailItem.mainKeyword,
                          spec: detailItem.spec,
                          mainImages: detailItem.mainImages,
                          price: detailItem.price,
                          salePrice: detailItem.salePrice,
                          content: detailItem.content,
                          shipPrice: detailItem.shipPrice, // 배송비
                          deliverDate: detailItem.deliverDate, // 배송일
                          purchaseLimitNumMax: detailItem.purchaseLimitNumMax, // 구매수량
                          deliverCompany: detailItem.deliverCompany,
                          options: detailItem.options,
                          detailUrl: item.detailUrl,
                          isPrime: detailItem.isPrime,
                          korTitle: detailItem.korTitle,
                          titleArray: detailItem.titleArray,
                          korTitleArray: detailItem.korTitleArray,
                          prop: detailItem.prop,
                          lastUpdate: moment().toDate(),
                        },
                      },
                      {
                        upsert: true,
                        new: true,
                      }
                    )
                  }
                } else if (item.detailUrl.includes("vvic.com")) {
                  const asin = AmazonAsin(item.detailUrl)
                  if (!asin) {
                    continue
                  }
                  // console.log("detailUrl", item.detailUrl)
                  let detailItem = await getVVIC({url: item.detailUrl, userID: userInfo._id})
                  // console.log("detailItem", detailItem)
                  if (detailItem && detailItem.options && detailItem.options.length > 0) {
                    await TempProduct.findOneAndUpdate(
                      {
                        userID: ObjectId(userInfo._id),
                        good_id: detailItem.good_id,
                      },
                      {
                        $set: {
                          userID: ObjectId(userInfo._id),
                          good_id: detailItem.good_id,
                          brand: detailItem.brand,
                          manufacture: detailItem.manufacture,
                          title: detailItem.title,
                          keyword: detailItem.keyword,
                          mainImages: detailItem.mainImages,
                          price: detailItem.price,
                          salePrice: detailItem.salePrice,
                          content: detailItem.content,
                          options: detailItem.options,
                          detailUrl: item.detailUrl,
                          korTitle: detailItem.korTitle,
                          prop: detailItem.prop,
                          lastUpdate: moment().toDate(),
                        },
                      },
                      {
                        upsert: true,
                        new: true,
                      }
                    )
                  }
                }
              }
            }
          } catch (e) {
            console.log("collectionItems", e)
          }
        }
      } catch (e) {
        console.log("errir00", e)
      }
    }, 1000)
    res.json({
      message: "success",
    })
  } catch (e) {
    console.log("/amazon/collectionItems", e)
    res.json({
      message: "fail",
    })
  }
})

app.post("/amazon/deleteCollectionItem", async (req, res) => {
  try {
    const { user, asin } = req.body

    const userInfo = await User.findOne({
      email: user,
    })
    if (!userInfo && asin) {
      res.json({
        message: "fail",
      })
      return
    }
    await AmazonCollection.remove({
      userID: ObjectId(userInfo._id),
      asin,
    })
    res.json({
      message: "success",
    })
  } catch (e) {
    console.log("/amazon/isRegister", e)
    res.json([])
  }
})

app.post("/amazon/allRegisterItem", async (req, res) => {
  try {
    setTimeout(async () => {
      for (const { detailUrl, user, image, title } of req.body) {
        try {
          const asin = AmazonAsin(detailUrl)
          if (!asin || !user) {
            continue
          }
          const userInfo = await User.findOne({
            email: user,
          })
          if (!userInfo) {
            continue
          }

          const product = await Product.findOne({
            userID: ObjectId(userInfo._id),
            "options.key": asin,
            isDelete: false,
          })
          if (!product) {
            const tempCollection = await AmazonCollection.findOne({
              userID: ObjectId(userInfo._id),
              asin,
            })

            if (!tempCollection) {
              await AmazonCollection.findOneAndUpdate(
                {
                  userID: ObjectId(userInfo._id),
                  asin,
                },
                {
                  $set: {
                    userID: ObjectId(userInfo._id),
                    asin,
                    detailUrl,
                    title,
                    image,
                    isDelete: false,
                    lastUpdate: moment().toDate(),
                  },
                },
                {
                  upsert: true,
                  new: true,
                }
              )
            }
          }
        } catch (e) {
          console.log("eerr", e)
        }
      }
    }, 1000)

    res.json({
      message: "success",
    })
  } catch (e) {
    console.log("/amazon/registerItem", e)
    res.json({
      message: "fail",
    })
  }
})

app.post("/amazon/aliText", async (req, res) => {
  try {
    const { url } = req.body
    console.log("url", url)
    let detailItem = await findAliExpressDetailAPIsimple({
      url,
      userID: ObjectId("5f1947bd682563be2d22f008"),
    })
    console.log("detailItem", detailItem)
    res.json({
      message: "success",
    })
  } catch (e) {
    console.log("error", e)
    res.json({
      message: "fail",
    })
  }
})

app.post("/ali/cookie", async (req, res) => {
  try {
    const { xman_t } = req.body
    if (!xman_t || !xman_t.includes("==") || xman_t.length < 100) {
      res.json({
        message: "fail",
      })
      return
    }
    console.log("xman_t", xman_t)
    await Cookie.findOneAndUpdate(
      {
        name: "xman_t",
      },
      {
        $set: {
          name: "xman_t",
          cookie: xman_t,
          lastUpdate: moment().toDate(),
        },
      },
      { upsert: true, new: true }
    )

    res.json({
      message: "success",
    })
  } catch (e) {
    console.log("error", e)
    res.json({
      message: "fail",
    })
  }
})

app.post("/bdg/orderList", async (req, res) => {
  try {
    const { user, cookie } = req.body
    
    // console.log("user", user)
    // console.log("cookie", cookie)
    const userInfo = await User.findOne({
      email: user,
    }).lean()

    if (!userInfo) {
      res.json({
        message: false
      })
      return
    }
    console.log("userInfo.group", userInfo.group)
    console.log("userInfo", userInfo)
    if(userInfo.group){
      const userGroups = await User.find({
        group: userInfo.group
      })

      const startDate = moment().subtract(2, "month").format("YYYY-MM-DD")
      const endDate = moment().format("YYYY-MM-DD")

      
    const response = await getFirstBdgOrder({userInfo, cookie})
    
    if(response && response.result && response.result.list.length > 0){
      
      for(const item of response.result.list){
        console.log("item-->", item)
        const promiseArr = userGroups.map(user => {
          return new Promise(async (resolve, reject) => {
            try {
              const market = await Market.findOne(
                {
                  userID: ObjectId(user._id)
                }
              )
              const cafe24OrderResponse = await Cafe24ListOrders({mallID : market.cafe24.mallID,
                orderState: "상품준비",
                startDate, endDate
              })
  
              const temp = await DeliveryInfo.findOne({
                userID: ObjectId(user._id),
                orderNo: item.od_code  // 주문번호
              })

              let orderItems = item.in_order.map((mItem, i) => {
                
                let taobaoOrderNo = null
                if(item.in_order_fo && item.in_order_fo[i]){
                  taobaoOrderNo = item.in_order_fo[i]
                } else if(Array.isArray(item.in_order_fo) && item.in_order_fo[0]) {
                  taobaoOrderNo = item.in_order_fo[0]
                }
                let taobaoTrackingNo = null
                if(item.in_invoice && item.in_invoice[0] && item.in_invoice[0][i]){
                  taobaoTrackingNo = item.in_invoice[0][i]
                } else if(Array.isArray(item.in_invoice) && item.in_invoice[0]) {
                  taobaoTrackingNo = item.in_invoice[0][0]
                }
                let 오픈마켓주문번호 = null
                if(temp && temp.orderItems[i] && temp.orderItems[i].오픈마켓주문번호.trim().length > 0) {
                  오픈마켓주문번호 = temp.orderItems[i].오픈마켓주문번호.replace("`", "").replace("′", "").trim()
                } else {
                  오픈마켓주문번호 = mItem
                }
                
                return {
                  taobaoOrderNo,
                  taobaoTrackingNo,
                  오픈마켓주문번호
                }
              })
              
              if(temp && temp.orderItems.length <= item.in_order.length){
                // 디비 내용을 따라 가야함
                orderItems = temp.orderItems
              }
              const deliveySave = await DeliveryInfo.findOneAndUpdate(
                {
                  userID: ObjectId(user._id),
                  orderNo: item.od_code  // 주문번호
                },
                {
                  $set: {
                    userID: ObjectId(user._id),
                    orderSeq: item.od_id,
                    orderNo: item.od_code,  // 주문번호
                    상태: item.od_status,
                    수취인주소: `${item.od_addr} ${item.od_addr_detail}`,
                    수취인우편번호: item.od_zip,
                    수취인이름: item.od_name,
                    수취인연락처: item.od_hp,
                    개인통관부호: item.od_customs_code,
                    orderItems,
                    무게: Number(item.od_weight),
                    배송비용: Number(item.order_price),
                    shippingNumber: item.od_invoice,
                    // customs,
                    // deliveryTracking,
                    isDelete: item.od_status === "신청취소"  || item.od_status === "반송완료"  ? true : false
                  }
                },
                { upsert: true, new:true }
              )

              await MarketOrder.findOneAndUpdate(
                {
                  userID: ObjectId(user._id),
                  orderId: item.od_code
                },
                {
                  $set: {
                    invoiceNumber: item.od_courier,
                    deliveryCompanyName: "경동택배"
                  }
                },
                { upsert: true }
              )

              const deliveryTemp = await DeliveryInfo.findOne({
                userID: ObjectId(user._id),
                orderNo: item.od_code
              })

              if(deliveryTemp && deliveryTemp.orderItms){
                try {
                  const tempOrderItmes = _.uniqBy(
                    deliveryTemp.orderItems, "오픈마켓주문번호"
                  )

                  for (const orderItem of tempOrderItmes) {
                   
                   
                    const tempCafe24Order = cafe24OrderResponse.filter(fItem => fItem.market_order_info === orderItem.오픈마켓주문번호)
                    console.log("tempCafe24Order", tempCafe24Order.length)
                    if(tempCafe24Order.length > 0){
                      const marketOrder = await MarketOrder.findOne({
                        userID: ObjectId(user._id),
                        orderId: orderItem.오픈마켓주문번호,
                      })
                      
                      if(!deliveryTemp.isDelete){
                        for(const item of tempCafe24Order){
                          try {
                            const response = await Cafe24RegisterShipments({
                              mallID: market.cafe24.mallID,
                              order_id: item.order_id,
                              tracking_no: tableItem.shippingNumber,
                              shipping_company_code: marketOrder && marketOrder.deliveryCompanyName === "경동택배" ? "0039" : "0006",
                              order_item_code: item.items.map(item => item.order_item_code),
                              shipping_code: item.receivers[0].shipping_code
                            })
                            console.log("resonse-->", response)
                            
                            await sleep(500)
                            const response1 = await Cafe24UpdateShipments({
                              mallID: market.cafe24.mallID,
                              input: [{
                                shipping_code: item.receivers[0].shipping_code,
                                order_id: item.order_id
                              }]
                            })
                            console.log("resonse1-->", response1)
                            await sleep(500)
                          } catch (e) {
                            console.log("에러", e)
                          }
                          
                        }
                      }
                      
                    }
                    
                  }
                } catch (e) {}
              }


              await sleep(500)
              resolve()
            } catch(e){
              console.log("무슨 에러", e)
              reject(e)
            }
          })
        })
        
        await Promise.all(promiseArr)
      }
        

        
        
      }
    }
    res.json({
      message: true,
    })
    
  } catch (e) {
    console.log("/bdg/orderList", e)
    res.json({
      message: false
    })
  }
})

const IherbPriceSync = async () => {
  console.time("IHERBPRICESYNC")
  const products = await Product.aggregate([
    {
      $match: {
        // userID: ObjectId("5f1947bd682563be2d22f008"),
        // "options.key": {$in: asinArr},
        isDelete: false,
        $or: [
          // {
          //   "basic.url": { $regex: `.*amazon.com.*`}
          // },
          {
            "basic.url": { $regex: `.*iherb.com.*` },
          },
        ],
      },
    },
  ])
  console.log("products", products.length)
  for (const product of products) {
    let changePrice = false
    let chagneStock = false
    try {
      const tempProduct = await Product.findOne(
        {
          _id: product._id,
        },
        {
          isAutoPrice: 1,
        }
      )
      if (tempProduct.isAutoPrice) {
        let detailItem = await findIherbDetailSimple({
          url: product.basic.url,
          // userID: ObjectId(item.userID)
        })
        console.log("detailItem", detailItem)
        const market = await Market.findOne({
          userID: ObjectId(product.userID),
        })

        const deliveryChargeOnReturn = market.coupang.deliveryChargeOnReturn
        const returnCharge = market.coupang.returnCharge

        const marginInfo = await ShippingPrice.aggregate([
          {
            $match: {
              userID: ObjectId(product.userID),
              type: 4,
            },
          },
          {
            $sort: {
              title: 1,
            },
          },
        ])

        if (detailItem) {
          if (detailItem.stock === 0) {
            console.log("재고 없음 상품명 : ", product.product.korTitle)
          }
          const salePrice = getIherbSalePrice(detailItem.price, marginInfo)

          for (const pItem of product.options) {
            if (pItem.key === detailItem.asin) {
              if (pItem.salePrice !== salePrice) {
                changePrice = true
              }
              if (pItem.stock !== detailItem.stock) {
                chagneStock = true
              }
              if (changePrice || chagneStock) {
                console.log("=========================")
                console.log("상품명 : ", product.product.korTitle)
                console.log("기존가격 : ", pItem.salePrice)
                console.log("변경가격 : ", salePrice)
                console.log("기존재고 : ", pItem.stock)
                console.log("변경재고 : ", detailItem.stock)
                console.log("=========================")
              }

              pItem.salePrice = salePrice
              pItem.productPrice = salePrice
              pItem.stock = detailItem.stock
            }
          }

          const productResponse = await CoupnagGET_PRODUCT_BY_PRODUCT_ID({
            userID: product.userID,
            productID: product.product.coupang.productID,
          })

          if (productResponse && productResponse.code === "SUCCESS") {
            for (const pItem of product.options) {
              const filterArr = productResponse.data.items.filter(
                (fItem) =>
                  fItem.vendorItemId &&
                  (fItem.itemName === pItem.korValue || fItem.itemName === pItem.korKey)
              )

              if (filterArr.length > 0) {
                if (changePrice) {
                  const responsePartial = await CoupnagUPDATE_PARTIAL_PRODUCT({
                    userID: product.userID,
                    sellerProductId: productResponse.data.sellerProductId,
                    parameter: {
                      sellerProductId: productResponse.data.sellerProductId.toString(),
                      deliveryChargeOnReturn:
                        deliveryChargeOnReturn > salePrice / 2
                          ? Math.floor((salePrice / 2) * 0.1) * 10
                          : deliveryChargeOnReturn,
                      returnCharge:
                        returnCharge > salePrice / 2
                          ? Math.floor((salePrice / 2) * 0.1) * 10
                          : returnCharge,
                    },
                  })

                  console.log("responsePartial", responsePartial)

                  const responsePrice = await CoupnagUPDATE_PRODUCT_PRICE_BY_ITEM({
                    userID: product.userID,
                    vendorItemId: filterArr[0].vendorItemId,
                    price: salePrice,
                  })

                  console.log("response", responsePrice)

                  await CoupnagUPDATE_PARTIAL_PRODUCT({
                    userID: product.userID,
                    sellerProductId: productResponse.data.sellerProductId,
                    parameter: {
                      sellerProductId: productResponse.data.sellerProductId.toString(),
                      deliveryChargeOnReturn:
                        deliveryChargeOnReturn > salePrice / 2
                          ? Math.floor((salePrice / 2) * 0.1) * 10
                          : deliveryChargeOnReturn,
                      returnCharge:
                        returnCharge > salePrice / 2
                          ? Math.floor((salePrice / 2) * 0.1) * 10
                          : returnCharge,
                    },
                  })
                }

                if (chagneStock) {
                  const responseQuantity = await CoupnagUPDATE_PRODUCT_QUANTITY_BY_ITEM({
                    userID: product.userID,
                    vendorItemId: filterArr[0].vendorItemId,
                    quantity: detailItem.stock,
                  })
                  pItem.stock = detailItem.stock
                  console.log("responseQuantity", responseQuantity)
                }
              }
            }

            if (changePrice || chagneStock) {
              await Product.findOneAndUpdate(
                {
                  userID: product.userID,
                  _id: ObjectId(product._id),
                },
                {
                  $set: {
                    product: product.product,
                    options: product.options,
                  },
                }
              )
            }
          }

          // if(changePrice || chagneStock) {
          if (
            product.product.cafe24 &&
            product.product.cafe24.mallID &&
            product.product.cafe24.shop_no
          ) {
            product.product.cafe24_product_no = product.product.cafe24.product_no

            const cafe24Response = await updateCafe24({
              isSingle: true,
              id: product._id,
              product: product.product,
              options: product.options,
              cafe24: {
                mallID: product.product.cafe24.mallID,
                shop_no: product.product.cafe24.shop_no,
              },
              userID: product.userID,
              writerID: product.writerID,
            })
            console.log("cafe24Response, ", cafe24Response)
          }
          // }
        }
      }
    } catch (e) {
      console.log("errirooo", e)
    }
    await sleep(1000)
  }

  console.timeEnd("IHERBPRICESYNC")
  console.log("끝----")
}

const getIherbSalePrice = (price, marginInfo) => {
  let weightPrice = 0

  if (price < 20000) {
    weightPrice = 5000
  } else {
    weightPrice = 0
  }
 
  let margin = 30
  let marginArr = marginInfo.filter((fItem) => fItem.title >= Number(price))

  if (marginArr.length > 0) {
    margin = Number(marginArr[0].price)
  } else {
    margin = Number(marginInfo[marginInfo.length - 1].price)
  }
  let addPrice = addIherbPriceCalc(price, weightPrice, margin)
  let salePrice = Math.ceil((Number(price) + Number(addPrice) + Number(weightPrice)) * 0.1) * 10

  return salePrice
}

const addIherbPriceCalc = (price, weightPrice, margin) => {
  const addPrice = -(
    ((margin + 11) * Number(price) + weightPrice * margin + 11 * weightPrice) /
    (margin - 89)
  )
  return addPrice
}

const getPermutations = function (arr, selectNumber) {
  const results = []
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

  return results // 결과 담긴 results return
}

// IherbPriceSync()

const getVVICItems = async () => {
  try {
    await getVVIC({url: "https://www.vvic.com/item/634952642f99950008b96b27"})
  } catch (e) {
    console.log("getVVICItems.",e)
  }
}

// getVVICItems()