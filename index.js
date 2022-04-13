const express = require("express")
const http = require("https")
const database = require("./database")
const { AmazonAsin } = require("./lib/userFunc")
const bodyParser = require('body-parser'); 
const moment = require("moment")
const User = require("./models/User")
const AmazonCollection = require("./models/AmazonCollection")
const TempProduct = require("./models/TempProduct")
const Product = require("./models/Product")
const {iHerbCode} = require("./api/iHerb")
const findAmazonDetailAPIsimple = require("./puppeteer/getAmazonItemAPIsimple")
const findIherbDetailAPIsimple = require("./puppeteer/getIherbItemAPIsimple")
const mongoose = require("mongoose")
const ObjectId = mongoose.Types.ObjectId


setInterval(function() {
  console.log("setInterval")
  http.get("https://sellerextention.herokuapp.com")
}, 600000)

database()

const PORT = process.env.PORT || 3000
const app = express()

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({extended : true}));
app.get("/", (req, res) => res.send("Hello World!!"))

app.listen(PORT, () => console.log(`Example app listening at http://localhost:${PORT}`))

// 로그인
app.post("/seller/login", async (req, res) => {
  console.log("req.body", req.body)
  try {
    if(!req.body.email || req.body.email.length === 0){
      res.json({
        code: "ERROR",
        message: "이메일주소를 입력해주세요."
      })
      return
    }

    if(!req.body.password || req.body.password.length === 0){
      res.json({
        code: "ERROR",
        message: "패스워드를 입력해주세요."
      })
      return
    }

    const response = await User.findOne(
      {
        email: req.body.email,
      }
    )
    if(response){
      if(response.password === req.body.password) {
        res.json({
          code: "SUCCESS",
          data: {
            email: response.email,
            nickname: response.nickname,
            admin: response.grade === "1",
            avatar: response.avatar,
          }
        })  
      } else {
        res.json({
          code: "ERROR",
          message: "패스워드가 일치하지 않습니다."
        })  
      }
    } else {
      res.json({
        code: "ERROR",
        message: "등록된 사용자가 없습니다."
      })
    }
  } catch (e){
    res.json({code: "ERROR"})
  }
})

app.post("/amazon/isRegister", async(req, res) => {
  
  try {
    const {detailUrl, user} = req.body
    
    const asin = AmazonAsin(detailUrl)  
    // 0: 실패, 1: 등록됨, 2: 수집요청전, 3: 수집요청후, 4: 수집완료, 5t 수집실패
    if(!asin || !user) {
      res.json({
        registerType: 0,
        detailUrl
      })
      return
    }

    const userInfo = await User.findOne(
      {
        email: user
      }
    )

    if(!userInfo){
      res.json({
        registerType: 0,
        detailUrl
      })
      return
    }

    const product = await Product.findOne(
      {
        userID: ObjectId(userInfo._id),
        "options.key": asin,
        isDelete: false
      }
    )
    if(product) {
      res.json({
        registerType: 1,
        detailUrl
      })
      return
      
    } 
    const tempProduct = await TempProduct.findOne(
      {
        userID: ObjectId(userInfo._id),
        good_id: asin,
      }
    )
  
    // 수집완료
    if(tempProduct && tempProduct.options.length > 0){
      res.json({
        registerType: 4,
        detailUrl
      })
      return
    } else if(tempProduct && tempProduct.options.length === 0){
      // 수집실패
      res.json({
        registerType: 5,
        detailUrl
      })
      return
    }

    const tempCollection = await AmazonCollection.findOne(
      {
        userID: ObjectId(userInfo._id),
        asin
      }
    )      
    if(tempCollection) {
      // 수집대기
      res.json({
        registerType: 3,
        detailUrl
      })
      return
    } else {
      // 아무것도 아님
      res.json({
        registerType: 2,
        detailUrl
      })
      return
    }
    
  } catch(e){
    console.log("/amazon/isRegister", e)
  } 
  
  
})

app.post("/amazon/isRegisters", async(req, res) => {
  
  try {
    const {user, items} = req.body
    
    const userInfo = await User.findOne(
      {
        email: user
      }
    )
    if(!userInfo){
      res.json([])
      return
    }

    let response = []

    if(items && Array.isArray(items)){

      const asinArr = items.map(item => AmazonAsin(item))
      
      const product = await Product.aggregate([
        {
          $match: {
            userID: ObjectId(userInfo._id),
            "options.key": {$in: asinArr},
            isDelete: false,
            $or: [
              {
                "basic.url": { $regex: `.*amazon.com.*`}
              },
              {
                "basic.url": { $regex: `.*iherb.com.*`}
              }
            ]
          }
        },
        {
          $project: {
            "options.key": 1
          }
        },
        { $unwind : "$options" }
      ])
      console.log("product", product.length)
      const tempProducts = await TempProduct.aggregate([
        {
          $match: {
            userID: ObjectId(userInfo._id),
            good_id: {$in: asinArr},
          }
        },
        {
          $project: {
            good_id: 1,
            options: 1
          }
        }
      ])

      const tempCollections = await AmazonCollection.aggregate([
        {
          $match: {
            userID: ObjectId(userInfo._id),
            asin: {$in: asinArr},
          }
        },
        {
          $project: {
            good_id: 1,
            options: 1
          }
        }
      ])

   
       // 0: 실패, 1: 등록됨, 2: 수집요청, 3: 수집대기
      for(const detailUrl of items){
        const asin = AmazonAsin(detailUrl)  
        if(!asin) {
          continue
        }
        if(product.filter(pItem => {
      
          return pItem.options.key === asin
        }).length > 0){
          // 등록됨
          response.push(
            {
              registerType: 1,
              detailUrl
            }
          )
        } else {
          const temp = tempProducts.filter(tItem => tItem.good_id === asin)
          if(temp.length > 0){
            const tempProduct = temp[0]
            if(tempProduct.options.length > 0){
              // 수집완료
              response.push({
                registerType: 4,
                detailUrl
              })
            } else {
              // 수집실패
              response.push({
                registerType: 5,
                detailUrl
              })
            }
          } else {
            const tempColl = tempCollections.filter(tItem => tItem.asin === asin)
            if(tempColl.length > 0){
              // 수집대기
              response.push({
                registerType: 3,
                detailUrl
              })
            } else {
              // 아무것도 아님
              response.push({
                registerType: 2,
                detailUrl
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
    
  } catch(e){
    console.log("/amazon/isRegisters", e)
  } 
  
  
})

app.post("/amazon/registerItem", async(req, res) => {
  
  try {
    const {detailUrl, user, image, title} = req.body
    
    const asin = AmazonAsin(detailUrl)

    // 0: 실패, 1: 등록됨, 2: 수집요청, 3: 수집대기
    if(!asin || !user) {
      res.json({
        registerType: 0,
        detailUrl
      })
      return
    }

    const userInfo = await User.findOne(
      {
        email: user
      }
    )
    if(!userInfo){
      res.json({
        registerType: 1,
        detailUrl
      })
      return
    }

    const product = await Product.findOne(
      {
        userID: ObjectId(userInfo._id),
        "options.key": asin,
        isDelete: false
      }
    )
    if(product) {
      res.json({
        registerType: 1,
        detailUrl
      })
      return
    } else {

      const tempProduct = await TempProduct.findOne(
        {
          userID: ObjectId(userInfo._id),
          good_id: asin,
        }
      )
      if(tempProduct && tempProduct.options.length === 0){
        // 실패 했던 거 다시 수집 대기로 변경
        await TempProduct.remove(
          {
            userID: ObjectId(userInfo._id),
            good_id: asin,
          }
        )
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
              lastUpdate: moment().toDate()
            }
          },
          {
            upsert: true,
            new: true
          }
        ) 
        res.json({
          registerType: 3,
          detailUrl
        })
        return
      }
      const tempCollection = await AmazonCollection.findOne(
        {
          userID: ObjectId(userInfo._id),
          asin,
        }
      )

      if(tempCollection){
        await AmazonCollection.remove({
          userID: ObjectId(userInfo._id),
          asin,
        })
        
        
        res.json({
          registerType: 2,
          detailUrl
        })
        return
        
      } else {
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
              lastUpdate: moment().toDate()
            }
          },
          {
            upsert: true,
            new: true
          }
        ) 

        res.json({
          registerType: 3,
          detailUrl
        })
        return
      }
      
      
    }
  } catch(e){
    console.log("/amazon/registerItem", e)
    res.json({
      registerType: 0,
      detailUrl
    })
  } 
  
  
})

app.post("/amazon/getCollectionItem", async(req, res) => {
  
  try {
    const {user} = req.body

    const userInfo = await User.findOne(
      {
        email: user
      }
    )
    if(!userInfo){
      res.json([])
      return
    }
    const products = await AmazonCollection.find(
      {
        userID: ObjectId(userInfo._id),
      }
    )
    let asinArr=products.map(item => item.asin)
   
    const registerProducts = await Product.find(
      {
        userID: ObjectId(userInfo._id),
        isDelete: false,
        "options.key": {$in:asinArr},
      }
    )
   
    const tempArr = await TempProduct.find(
      {
        userID: ObjectId(userInfo._id),
        good_id: {$in:asinArr},
      }
    )
    const productArr = []
    for(const item of products){
      let isRegister = false
      for(const rItem of registerProducts){
        if(rItem.options.filter(fItem => fItem.key === item.asin).length > 0){
          isRegister = true
        }
      }
      if(!isRegister) {
        const temp = tempArr.filter(fItem => fItem.good_id === item.asin)
        if(temp.length > 0){
          item.isDone = true
          if(temp[0].options.length === 0) {
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
      } else {
        console.log("있어?", product._id)
      }
    }
    res.json(productArr.map(item => {
      return {
        asin: item.asin,
        detailUrl: item.detailUrl,
        title: item.title,
        image: item.image,
        isDone: item.isDone ? true : false,
        isFail: item.isFail ? true : false
      }
    }))
  } catch(e){
    console.log("/amazon/isRegister", e)
    res.json([])
  } 
  
  
})

app.post("/amazon/collectionItems", async(req, res) => {
  
  try {
    const {user} = req.body

    const userInfo = await User.findOne(
      {
        email: user
      }
    )
    if(!userInfo){
      res.json({
        message: "fail"
      })
      return
    }

    const products = await AmazonCollection.find(
      {
        userID: ObjectId(userInfo._id),
      }
    )
  
    setTimeout(async () => {
      for(const item of products){
        const product = await Product.findOne(
          {
            userID: ObjectId(userInfo._id),
            "options.key": item.asin,
            isDelete: false
          }
        )
        if(!product){
  
          const tempProduct = await TempProduct.findOne(
            {
              userID: ObjectId(userInfo._id),
              good_id: item.asin
            }
          )
          if(!tempProduct){

            if(item.detailUrl.includes("amazon.com")) {
              // 아마존
              let detailItem = await findAmazonDetailAPIsimple({
                url: item.detailUrl,
                userID: ObjectId(userInfo._id)
              })
              if(detailItem){
                await TempProduct.findOneAndUpdate(
                  {
                    userID: ObjectId(userInfo._id),
                    good_id: item.asin
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
                      titkorTitleArrayeArray: detailItem.korTitleArray,
                      feature: detailItem.feature,
                      prop: detailItem.prop,
                      prohibitWord: detailItem.prohibitWord,
                      engSentence: detailItem.engSentence,
                      lastUpdate: moment().toDate()
                    }
                  },
                  {
                    upsert: true,
                    new: true
                  }
                )
              }
            } else if(item.detailUrl.includes("iherb.com")) {
              // 아이허브  
              console.log("item.detailUrl", item.detailUrl)
              const asin = AmazonAsin(item.detailUrl)
              if(!asin){
                continue
              }
              const host = item.detailUrl.replace(`/${asin}`, "/")
              const response = await iHerbCode({url: item.detailUrl})
              for(const pid of response){
                let detailItem = await findIherbDetailAPIsimple({
                  url: `${host}${pid}`,
                  userID: ObjectId(userInfo._id)
                })
                if(detailItem){
                  console.log("detailITEm", detailItem)
                  await TempProduct.findOneAndUpdate(
                    {
                      userID: ObjectId(userInfo._id),
                      good_id: detailItem.good_id
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
                        prop: detailItem.prop,
                        prohibitWord: detailItem.prohibitWord,
                        engSentence: detailItem.engSentence,
                        lastUpdate: moment().toDate()
                      }
                    },
                    {
                      upsert: true,
                      new: true
                    }
                  )
                }
              }
            }
            
            
            
          }
          
        }
      }

    }, 1000)
    res.json({
      message: "success"
    })
  } catch(e){
    console.log("/amazon/isRegister", e)
    res.json({
      message: "fail"
    })
  } 
  
  
})

app.post("/amazon/deleteCollectionItem", async(req, res) => {
  
  try {
    const {user, asin} = req.body

    const userInfo = await User.findOne(
      {
        email: user
      }
    )
    if(!userInfo && asin){
      res.json({
        message: "fail"
      })
      return
    }
    await AmazonCollection.remove(
      {
        userID: ObjectId(userInfo._id),
        asin
      }
    )
    res.json({
      message: "success"
    })
    
  } catch(e){
    console.log("/amazon/isRegister", e)
    res.json([])
  } 
  
  
})

app.post("/amazon/allRegisterItem", async(req, res) => {

  try {
    setTimeout(async() => {
      for(const {detailUrl, user, image, title} of req.body){
        try {
          const asin = AmazonAsin(detailUrl)
          if(!asin || !user) {
            continue
          }
          const userInfo = await User.findOne(
            {
              email: user
            }
          )
          if(!userInfo){
            continue
          }
  
          const product = await Product.findOne(
            {
              userID: ObjectId(userInfo._id),
              "options.key": asin,
              isDelete: false
            }
          )
          if(!product) {
            
            const tempCollection = await AmazonCollection.findOne(
              {
                userID: ObjectId(userInfo._id),
                asin,
              }
            )
      
            if(!tempCollection){
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
                    lastUpdate: moment().toDate()
                  }
                },
                {
                  upsert: true,
                  new: true
                }
              ) 
              
            } 
          }
        } catch(e){
          console.log("eerr", e)
        }
      }
    }, 1000)
    
    res.json({
      message: "success"
    })
  } catch(e){
    console.log("/amazon/registerItem", e)
    res.json({
      message: "fail"
    })
  } 
  
  
})