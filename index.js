const express = require("express");
const database = require("./database");
const { AmazonAsin, sleep, regExp_test } = require("./lib/userFunc");
const bodyParser = require("body-parser");
const cors = require("cors");
const moment = require("moment");
const User = require("./models/User");
const ExchangeRate = require("./models/ExchangeRate");
const Market = require("./models/Market");
const MarketOrder = require("./models/MarketOrder");
const DeliveryInfo = require("./models/DeliveryInfo");
const AmazonCollection = require("./models/AmazonCollection");
const TempProduct = require("./models/TempProduct");
const ShippingPrice = require("./models/ShippingPrice");
const Product = require("./models/Product");
const Cookie = require("./models/Cookie");
const TaobaoOrder = require("./models/TaobaoOrder");
const { iHerbCode } = require("./api/iHerb");
const axios = require("axios");
const findAmazonDetailAPIsimple = require("./puppeteer/getAmazonItemAPIsimple");
const {
  findIherbDetailAPI,
  findIherbDetailSimple,
} = require("./puppeteer/getIherbItemAPIsimple");
const { getFirstBdgOrder } = require("./puppeteer/getFirstBdgOrder");
const findTaobaoDetailAPIsimple = require("./puppeteer/getTaobaoItemAPIsimple");
const findAliExpressDetailAPIsimple = require("./puppeteer/getAliExpressItemAPisimple");
const getVVIC = require("./puppeteer/getVVICAPI");
const getRakuten = require("./puppeteer/getRakutenAPI");
const getRakutenFashion = require("./puppeteer/getRakutenFashionAPI");
const getRakutenSimple = require("./puppeteer/getRakutenAPISimple");
const getBrandSimple = require("./puppeteer/getBrandAPISimple");
const getStudious = require("./puppeteer/getStudiousAPI");
const getIssymiyake = require("./puppeteer/getIssymiyakeAPI");
const getKeen = require("./puppeteer/getKeenAPI");
const getBrandAPI = require("./puppeteer/getBrandAPI");
const {
  Cafe24ListOrders,
  Cafe24RegisterShipments,
  Cafe24UpdateShipments,
} = require("./api/Market");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const {
  CoupnagGET_PRODUCT_BY_PRODUCT_ID,
  CoupnagUPDATE_PRODUCT_QUANTITY_BY_ITEM,
  CoupnagUPDATE_PRODUCT_PRICE_BY_ITEM,
  CoupnagUPDATE_PARTIAL_PRODUCT,
} = require("./api/Market");

const getProductData = require("./puppeteer/getProductData");
const updateCoupang = require("./puppeteer/updateCoupang");
const updateCafe24 = require("./puppeteer/updateCafe24");
const updateNaver = require("./puppeteer/updateNaver");
const update11st = require("./puppeteer/update11st");
const {
  get11stProduct,
  skCreateProduct,
  skModifyProduct,
  skModifySalePrice,
  skModifyOption,
} = require("./api/11st");

const { NaverOriginProducts, NaverModifyOption } = require("./api/Naver");

const cron = require("node-cron");
const _ = require("lodash");

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

database();

const PORT = process.env.PORT || 3300;
const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: false }));

app.use(cors());
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));
app.get("/", (req, res) => res.send("Hello World!!"));

app.listen(PORT, () =>
  console.log(`Example app listening at http://localhost:${PORT}`)
);

app.post("/taobao/cookie", async (req, res) => {
  try {
    const { nick, cookie } = req.body;

    if (!nick || nick.length === 0) {
      res.json({
        message: "fail",
      });
      return;
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
    );
    res.json({
      message: "success",
    });
  } catch (e) {
    console.log("/taobao/cookie", e);
    res.json({
      message: "fail",
    });
  }
});

app.post("/seller/userGroup", async (req, res) => {
  try {
    const { user } = req.body;

    const userInfo = await User.findOne({
      email: user,
    }).lean();

    if (!userInfo) {
      res.json({
        message: false,
      });
      return;
    }

    if (userInfo.group) {
      const userGroups = await User.find({
        group: userInfo.group,
      });

      res.json({
        message: "success",
        list: userGroups,
      });
    } else {
      res.json({ code: "ERROR" });
    }
  } catch (e) {
    res.json({ code: "ERROR" });
  }
});

app.post("/amazon/isRegister", async (req, res) => {
  try {
    const { detailUrl, user } = req.body;

    const asin = AmazonAsin(detailUrl);
    // 0: 실패, 1: 등록됨, 2: 수집요청전, 3: 수집요청후, 4: 수집완료, 5t 수집실패
    if (!asin || !user) {
      res.json({
        registerType: 0,
        detailUrl,
      });
      return;
    }

    const userInfo = await User.findOne({
      email: user,
    });

    if (!userInfo) {
      res.json({
        registerType: 0,
        detailUrl,
      });
      return;
    }

    let product = null;
    if (
      detailUrl.includes("taobao.com") ||
      detailUrl.includes("tmall.com") ||
      detailUrl.includes("aliexpress.com") ||
      detailUrl.includes("item.rakuten.co.jp") ||
      detailUrl.includes("brandavenue.rakuten.co.jp") ||
      detailUrl.includes("studious.co.jp") ||
      detailUrl.includes("isseymiyake.com") ||
      detailUrl.includes("keenfootwear.jp")
    ) {
      product = await Product.findOne({
        userID: ObjectId(userInfo._id),
        "basic.good_id": asin,
        isDelete: false,
      });
    } else {
      product = await Product.findOne({
        userID: ObjectId(userInfo._id),
        "options.key": asin,
        isDelete: false,
      });
    }

    if (product) {
      res.json({
        registerType: 1,
        detailUrl,
      });
      return;
    }
    const tempProduct = await TempProduct.findOne({
      userID: ObjectId(userInfo._id),
      good_id: asin,
    });

    // 수집완료
    if (tempProduct && tempProduct.options.length > 0) {
      res.json({
        registerType: 4,
        detailUrl,
      });
      return;
    } else if (tempProduct && tempProduct.options.length === 0) {
      // 수집실패
      res.json({
        registerType: 5,
        detailUrl,
      });
      return;
    }

    const tempCollection = await AmazonCollection.findOne({
      userID: ObjectId(userInfo._id),
      asin,
    });
    if (tempCollection) {
      if (tempCollection.isDelete) {
        // 삭제
        res.json({
          registerType: 6,
          detailUrl,
        });
        return;
      } else {
        // 수집대기
        res.json({
          registerType: 3,
          detailUrl,
        });
        return;
      }
    } else {
      // 아무것도 아님
      res.json({
        registerType: 2,
        detailUrl,
      });
      return;
    }
  } catch (e) {
    console.log("/amazon/isRegister", e);
  }
});

app.post("/amazon/isRegisters", async (req, res) => {
  try {
    const { user, items } = req.body;

    const userInfo = await User.findOne({
      email: user,
    });

    if (!userInfo) {
      res.json([]);
      return;
    }

    let response = [];

    if (items && Array.isArray(items) && items.length > 0) {
      const asinArr = items.map((item) => AmazonAsin(item));

      let product = null;
      if (
        items[0].includes("taobao.com") ||
        items[0].includes("tmall.com") ||
        items[0].includes("aliexpress.com") ||
        items[0].includes("vvic.com") ||
        items[0].includes("item.rakuten.co.jp") ||
        items[0].includes("brandavenue.rakuten.co.jp") ||
        items[0].includes("studious.co.jp") ||
        items[0].includes("isseymiyake.com") ||
        items[0].includes("keenfootwear.jp") ||
        items[0].includes("uniqlo.com/jp")
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
        ]);
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
                {
                  "basic.url": { $regex: `.*rakuten.co.jp.*` },
                },
                {
                  "basic.url": { $regex: `.*studious.co.jp.*` },
                },
                {
                  "basic.url": { $regex: `.*isseymiyake.com.*` },
                },
                {
                  "basic.url": { $regex: `.*keenfootwear.jp.*` },
                },
                {
                  "basic.url": { $regex: `.*uniqlo.com/jp.*` },
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
        ]);
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
      ]);

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
      ]);

      // 0: 실패, 1: 등록됨, 2: 수집요청, 3: 수집대기, 4: 수집완려, 5: 수집실패, 6: 삭제
      for (const detailUrl of items) {
        const asin = AmazonAsin(detailUrl);

        if (!asin) {
          continue;
        }

        if (
          product.filter((pItem) => {
            if (
              items[0].includes("taobao.com") ||
              items[0].includes("tmall.com") ||
              items[0].includes("aliexpress.com") ||
              items[0].includes("vvic.com") ||
              items[0].includes("item.rakuten.co.jp") ||
              items[0].includes("brandavenue.rakuten.co.jp") ||
              items[0].includes("studious.co.jp") ||
              items[0].includes("isseymiyake.com") ||
              items[0].includes("keenfootwear.jp") ||
              items[0].includes("uniqlo.com/jp")
            ) {
              return pItem.basic.good_id === asin;
            } else {
              return pItem.options.key === asin;
            }
            return false;
          }).length > 0
        ) {
          // 등록됨
          response.push({
            registerType: 1,
            detailUrl,
          });
        } else {
          const temp = tempProducts.filter((tItem) => tItem.good_id === asin);
          if (temp.length > 0) {
            const tempProduct = temp[0];
            if (tempProduct.options.length > 0) {
              // 수집완료
              response.push({
                registerType: 4,
                detailUrl,
              });
            } else {
              // 수집실패
              response.push({
                registerType: 5,
                detailUrl,
              });
            }
          } else {
            const tempColl = tempCollections.filter(
              (tItem) => tItem.asin === asin
            );
            if (tempColl.length > 0) {
              if (tempColl[0].isDelete) {
                // 삭제
                response.push({
                  registerType: 6,
                  detailUrl,
                });
              } else {
                // 수집대기
                response.push({
                  registerType: 3,
                  detailUrl,
                });
              }
            } else {
              // 아무것도 아님
              response.push({
                registerType: 2,
                detailUrl,
              });
            }
          }
        }
      }

      res.json(response);
      return;
    } else {
      res.json([]);
      return;
    }
  } catch (e) {
    console.log("/amazon/isRegisters", e);
    res.json([]);
  }
});

app.post("/amazon/registerItem", async (req, res) => {
  try {
    const { detailUrl, user, image, title, keyword } = req.body;
    const asin = AmazonAsin(detailUrl);
    console.log("detailUrl", detailUrl);
    console.log("image", image);
    console.log("title", title);
    // 0: 실패, 1: 등록됨, 2: 수집요청, 3: 수집대기
    if (!asin || !user || !detailUrl) {
      res.json({
        registerType: 0,
        detailUrl,
      });
      return;
    }

    const userInfo = await User.findOne({
      email: user,
    });
    if (!userInfo) {
      res.json({
        registerType: 1,
        detailUrl,
      });
      return;
    }

    const product = await Product.findOne({
      userID: ObjectId(userInfo._id),
      "options.key": asin,
      isDelete: false,
    });
    if (product) {
      res.json({
        registerType: 1,
        detailUrl,
      });
      return;
    } else {
      const tempProduct = await TempProduct.findOne({
        userID: ObjectId(userInfo._id),
        good_id: asin,
      });
      if (tempProduct && tempProduct.options.length === 0) {
        // 실패 했던 거 다시 수집 대기로 변경
        await TempProduct.remove({
          userID: ObjectId(userInfo._id),
          good_id: asin,
        });
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
              keyword,
              isDelete: false,
              lastUpdate: moment().toDate(),
            },
          },
          {
            upsert: true,
            new: true,
          }
        );
        res.json({
          registerType: 3,
          detailUrl,
        });
        return;
      }

      const tempCollection = await AmazonCollection.findOne({
        userID: ObjectId(userInfo._id),
        asin,
        isDelete: { $ne: true },
      });

      if (tempCollection) {
        // 수집완료 -> 다시 수집
        await AmazonCollection.remove({
          userID: ObjectId(userInfo._id),
          asin,
        });

        res.json({
          registerType: 2,
          detailUrl,
        });
        return;
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
              keyword,
              isDelete: false,
              lastUpdate: moment().toDate(),
            },
          },
          {
            upsert: true,
            new: true,
          }
        );

        res.json({
          registerType: 3,
          detailUrl,
        });
        return;
      }
    }
  } catch (e) {
    console.log("/amazon/registerItem", e);
    res.json({
      registerType: 0,
      detailUrl,
    });
  }
});

app.post("/amazon/getCollectionItem", async (req, res) => {
  try {
    const { user } = req.body;

    const userInfo = await User.findOne({
      email: user,
    });

    if (!userInfo) {
      res.json([]);
      return;
    }

    const products = await AmazonCollection.find({
      userID: ObjectId(userInfo._id),
      isDelete: { $ne: true },
    });

    let asinArr = products.map((item) => item.asin);

    // const registerProducts = await Product.find({
    //   userID: ObjectId(userInfo._id),
    //   isDelete: false,
    //   "basic.good_id": { $in: asinArr },
    // })
    const registerProducts = await Product.aggregate([
      {
        $match: {
          userID: ObjectId(userInfo._id),
          isDelete: false,
          "basic.good_id": { $in: asinArr },
        },
      },
      {
        $project: {
          "options.key": 1,
          "basic.good_id": 1,
        },
      },
    ]);

    console.time("1111");
    const tempArr = await TempProduct.aggregate([
      {
        $match: {
          userID: ObjectId(userInfo._id),
          good_id: { $in: asinArr },
        },
      },
    ]);

    console.timeEnd("1111");
    console.time("2222");
    const productArr = [];

    const promiseArr = products.map((item) => {
      return new Promise(async (resolve, reject) => {
        try {
          let isRegister = false;
          for (const rItem of registerProducts) {
            if (
              rItem.options.filter((fItem) => fItem.key === item.asin).length >
              0
            ) {
              isRegister = true;
              break;
            }
            if (rItem.basic.good_id === item.asin) {
              isRegister = true;
              break;
            }
          }

          if (!isRegister) {
            const temp = tempArr.filter((fItem) => fItem.good_id === item.asin);
            if (temp.length > 0) {
              item.isDone = true;
              if (temp[0].options.length === 0) {
                item.isFail = true;
              }
            }

            productArr.push(item);
          }
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    await Promise.all(promiseArr);
    // for (const item of products) {
    //   let isRegister = false;
    //   for (const rItem of registerProducts) {
    //     if (
    //       rItem.options.filter((fItem) => fItem.key === item.asin).length > 0
    //     ) {
    //       isRegister = true;
    //       break;
    //     }
    //     if (rItem.basic.good_id === item.asin) {
    //       isRegister = true;
    //       break;
    //     }
    //   }
    //   if (!isRegister) {
    //     const temp = tempArr.filter((fItem) => fItem.good_id === item.asin);
    //     if (temp.length > 0) {
    //       item.isDone = true;
    //       if (temp[0].options.length === 0) {
    //         item.isFail = true;
    //       }
    //     }

    //     productArr.push(item);
    //   }
    // }
    console.timeEnd("2222");

    res.json(
      productArr.map((item) => {
        return {
          asin: item.asin,
          detailUrl: item.detailUrl,
          title: item.title,
          image: item.image,
          keyword: item.keyword,
          isDone: item.isDone ? true : false,
          isFail: item.isFail ? true : false,
        };
      })
    );
  } catch (e) {
    console.log("/amazon/getCollectionItem", e);
    res.json([]);
  }
});

app.post("/amazon/collectionItems", async (req, res) => {
  try {
    const { user } = req.body;

    const userInfo = await User.findOne({
      email: user,
    });
    if (!userInfo) {
      res.json({
        message: "fail",
      });
      return;
    }
    const registerProducts = await TempProduct.aggregate([
      {
        $match: {
          userID: ObjectId(userInfo._id),
        },
      },
      {
        $project: {
          good_id: 1,
        },
      },
    ]);
    let goodIDs = registerProducts.map((item) => item.good_id);
    const products = await AmazonCollection.find({
      userID: ObjectId(userInfo._id),
      isDelete: { $ne: true },
      asin: { $nin: goodIDs },
    });
    console.log("prodcuts", products.length);
    setTimeout(async () => {
      try {
        let i = 1;
        for (const item of products) {
          try {
            let product = null;
            if (
              item.detailUrl.includes("taobao.com") ||
              item.detailUrl.includes("tmall.com") ||
              item.detailUrl.includes("vvic.com") ||
              item.detailUrl.includes("item.rakuten.co.jp") ||
              item.detailUrl.includes("brandavenue.rakuten.co.jp")
            ) {
              product = await Product.findOne({
                userID: ObjectId(userInfo._id),
                "basic.good_id": item.asin,
                isDelete: false,
              });
            } else {
              product = await Product.findOne({
                userID: ObjectId(userInfo._id),
                "options.key": item.asin,
                isDelete: false,
              });
            }
            // console.log("product==", product);
            if (!product) {
              const tempProduct = await TempProduct.findOne({
                userID: ObjectId(userInfo._id),
                good_id: item.asin,
              });
              if (!tempProduct) {
                if (item.detailUrl.includes("amazon.com")) {
                  // 아마존
                  let detailItem = await findAmazonDetailAPIsimple({
                    url: item.detailUrl,
                    userID: ObjectId(userInfo._id),
                  });
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
                    );
                  }
                } else if (item.detailUrl.includes("iherb.com")) {
                  // 아이허브

                  const asin = AmazonAsin(item.detailUrl);
                  if (!asin) {
                    continue;
                  }
                  const host = item.detailUrl.replace(`/${asin}`, "/");
                  const response = await iHerbCode({ url: item.detailUrl });
                  for (const pid of response) {
                    let detailItem = await findIherbDetailAPI({
                      url: `${host}${pid}`,
                      userID: ObjectId(userInfo._id),
                    });
                    if (detailItem) {
                      console.log("detailITEm", detailItem);
                      if (detailItem.prohibited === true) {
                        await AmazonCollection.remove({
                          userID: ObjectId(userInfo._id),
                          asin,
                        });
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
                        );
                      }
                    }
                  }
                } else if (item.detailUrl.includes("aliexpress.com")) {
                  // 알리익스프레스
                  // console.log("item.detailUrl", item.detailUrl)
                  let detailItem = await findAliExpressDetailAPIsimple({
                    url: item.detailUrl.replace("https:ko", "https://ko"),
                    userID: ObjectId(userInfo._id),
                    keyword: item.keyword,
                  });
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
                          html: detailItem.html,
                          videoUrl: detailItem.videoUrl,
                          shipPrice: detailItem.shipPrice, // 배송비
                          deliverDate: detailItem.deliverDate, // 배송일
                          purchaseLimitNumMax: detailItem.purchaseLimitNumMax, // 구매수량
                          deliverCompany: detailItem.deliverCompany,
                          options: detailItem.options,
                          detailUrl: detailItem.detailUrl.replace(
                            "https:ko",
                            "https://ko"
                          ),
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
                    );
                  }
                } else if (
                  item.detailUrl.includes("taobao.com") ||
                  item.detailUrl.includes("tmall.com")
                ) {
                  console.log("타오바오");
                  // 타오바오
                  // console.log("item.detailUrl", item.detailUrl)
                  let detailItem = await findTaobaoDetailAPIsimple({
                    url: item.detailUrl,
                    userID: ObjectId(userInfo._id),
                    group: userInfo.grade,
                    keyword: item.keyword,
                  });

                  if (
                    detailItem &&
                    detailItem.options &&
                    detailItem.options.length > 0
                  ) {
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
                    );
                  } else {
                    console.log(
                      "타오바오 실패",
                      " -  ",
                      products.length,
                      " - ",
                      item.detailUrl
                    );
                  }
                } else if (item.detailUrl.includes("vvic.com")) {
                  const asin = AmazonAsin(item.detailUrl);
                  if (!asin) {
                    console.log("asin 없음");
                    continue;
                  }
                  // console.log("detailUrl", item.detailUrl)
                  let detailItem = await getVVIC({
                    url: item.detailUrl,
                    userID: userInfo._id,
                    keyword: item.keyword,
                  });
                  // console.log("detailItem", detailItem)
                  if (!detailItem) {
                    console.log("없음 --><", asin);
                    await AmazonCollection.findOneAndUpdate(
                      {
                        userID: ObjectId(userInfo._id),
                        asin,
                      },
                      {
                        $set: {
                          isDelete: true,
                          lastUpdate: moment().toDate(),
                        },
                      },
                      {
                        upsert: true,
                      }
                    );
                  } else if (
                    detailItem &&
                    detailItem.options &&
                    detailItem.options.length > 0
                  ) {
                    console.log("detailItem.korTitle", detailItem.korTitle);
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
                    );
                  } else {
                    console.log("옵션 없음", item.detailUrl);
                    await AmazonCollection.deleteOne({
                      userID: ObjectId(userInfo._id),
                      asin,
                    });
                  }
                } else if (item.detailUrl.includes("item.rakuten.co.jp")) {
                  const asin = AmazonAsin(item.detailUrl);
                  if (!asin) {
                    console.log("asin 없음");
                    continue;
                  }

                  let detailItem = await getRakuten({
                    url: item.detailUrl,
                    userID: userInfo._id,
                    keyword: item.keyword,
                  });
                  // console.log("detailItem -- ", detailItem);
                  if (!detailItem) {
                    await AmazonCollection.findOneAndUpdate(
                      {
                        userID: ObjectId(userInfo._id),
                        asin,
                      },
                      {
                        $set: {
                          isDelete: true,
                          lastUpdate: moment().toDate(),
                        },
                      },
                      {
                        upsert: true,
                      }
                    );
                  } else if (
                    detailItem &&
                    detailItem.options &&
                    detailItem.options.length > 0 &&
                    detailItem.options.length !==
                      detailItem.options.filter((item) => item.stock === 0)
                        .length
                  ) {
                    await TempProduct.findOneAndUpdate(
                      {
                        userID: ObjectId(userInfo._id),
                        good_id: detailItem.good_id,
                      },
                      {
                        $set: {
                          userID: ObjectId(userInfo._id),
                          categoryID: detailItem.categoryID,
                          good_id: detailItem.good_id,
                          brand: detailItem.brand,
                          manufacture: detailItem.manufacture,
                          modelName: detailItem.modelName,
                          title: detailItem.title,
                          keyword: detailItem.keyword,
                          mainImages: detailItem.mainImages,
                          price: detailItem.price,
                          salePrice: detailItem.salePrice,
                          html: detailItem.html,
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
                    );
                  } else {
                    console.log("옵션 없음", item.detailUrl);
                    await AmazonCollection.deleteOne({
                      userID: ObjectId(userInfo._id),
                      asin,
                    });
                  }
                } else if (
                  item.detailUrl.includes("brandavenue.rakuten.co.jp")
                ) {
                  const asin = AmazonAsin(item.detailUrl);
                  if (!asin) {
                    console.log("asin 없음");
                    continue;
                  }

                  let detailItem = await getRakutenFashion({
                    url: item.detailUrl,
                    userID: userInfo._id,
                    keyword: item.keyword,
                  });
                  // console.log("detailItem -- ", detailItem);
                  if (!detailItem) {
                    await AmazonCollection.findOneAndUpdate(
                      {
                        userID: ObjectId(userInfo._id),
                        asin,
                      },
                      {
                        $set: {
                          isDelete: true,
                          lastUpdate: moment().toDate(),
                        },
                      },
                      {
                        upsert: true,
                      }
                    );
                  } else if (
                    detailItem &&
                    detailItem.options &&
                    detailItem.options.length > 0 &&
                    detailItem.options.length !==
                      detailItem.options.filter((item) => item.stock === 0)
                        .length
                  ) {
                    await TempProduct.findOneAndUpdate(
                      {
                        userID: ObjectId(userInfo._id),
                        good_id: detailItem.good_id,
                      },
                      {
                        $set: {
                          userID: ObjectId(userInfo._id),
                          categoryID: detailItem.categoryID,
                          good_id: detailItem.good_id,
                          brand: detailItem.brand,
                          manufacture: detailItem.manufacture,
                          modelName: detailItem.modelName,
                          title: detailItem.title,
                          keyword: detailItem.keyword,
                          mainImages: detailItem.mainImages,
                          price: detailItem.price,
                          salePrice: detailItem.salePrice,
                          html: detailItem.html,
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
                    );
                  } else {
                    console.log("옵션 없음", item.detailUrl);
                    await AmazonCollection.deleteOne({
                      userID: ObjectId(userInfo._id),
                      asin,
                    });
                  }
                } else if (item.detailUrl.includes("studious.co.jp/shop")) {
                  const asin = AmazonAsin(item.detailUrl);
                  if (!asin) {
                    console.log("asin 없음");
                    continue;
                  }

                  let detailItem = await getStudious({
                    url: item.detailUrl,
                    userID: userInfo._id,
                    keyword: item.keyword,
                  });
                  console.log("detailItem", detailItem);
                  if (!detailItem) {
                    await AmazonCollection.findOneAndUpdate(
                      {
                        userID: ObjectId(userInfo._id),
                        asin,
                      },
                      {
                        $set: {
                          isDelete: true,
                          lastUpdate: moment().toDate(),
                        },
                      },
                      {
                        upsert: true,
                      }
                    );
                  } else if (
                    detailItem &&
                    detailItem.options &&
                    detailItem.options.length > 0 &&
                    detailItem.options.length !==
                      detailItem.options.filter((item) => item.stock === 0)
                        .length
                  ) {
                    await TempProduct.findOneAndUpdate(
                      {
                        userID: ObjectId(userInfo._id),
                        good_id: detailItem.good_id,
                      },
                      {
                        $set: {
                          userID: ObjectId(userInfo._id),
                          categoryID: detailItem.categoryID,
                          good_id: detailItem.good_id,
                          brand: detailItem.brand,
                          manufacture: detailItem.manufacture,
                          // modelName: detailItem.modelName,
                          title: detailItem.title,
                          keyword: detailItem.keyword,
                          mainImages: detailItem.mainImages,
                          price: detailItem.price,
                          salePrice: detailItem.salePrice,
                          html: detailItem.html,
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
                    );
                  } else {
                    console.log("옵션 없음", item.detailUrl);
                    await AmazonCollection.deleteOne({
                      userID: ObjectId(userInfo._id),
                      asin,
                    });
                  }
                } else if (item.detailUrl.includes("isseymiyake.com")) {
                  const asin = AmazonAsin(item.detailUrl);
                  if (!asin) {
                    console.log("asin 없음");
                    continue;
                  }

                  let detailItem = await getIssymiyake({
                    url: item.detailUrl,
                    userID: userInfo._id,
                    keyword: item.keyword,
                  });

                  if (!detailItem) {
                    await AmazonCollection.findOneAndUpdate(
                      {
                        userID: ObjectId(userInfo._id),
                        asin,
                      },
                      {
                        $set: {
                          isDelete: true,
                          lastUpdate: moment().toDate(),
                        },
                      },
                      {
                        upsert: true,
                      }
                    );
                  } else if (
                    detailItem &&
                    detailItem.options &&
                    detailItem.options.length > 0 &&
                    detailItem.options.length !==
                      detailItem.options.filter((item) => item.stock === 0)
                        .length
                  ) {
                    await TempProduct.findOneAndUpdate(
                      {
                        userID: ObjectId(userInfo._id),
                        good_id: detailItem.good_id,
                      },
                      {
                        $set: {
                          userID: ObjectId(userInfo._id),
                          categoryID: detailItem.categoryID,
                          good_id: detailItem.good_id,
                          brand: detailItem.brand,
                          manufacture: detailItem.manufacture,
                          // modelName: detailItem.modelName,
                          title: detailItem.title,
                          keyword: detailItem.keyword,
                          mainImages: detailItem.mainImages,
                          price: detailItem.price,
                          salePrice: detailItem.salePrice,
                          html: detailItem.html,
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
                    );
                  } else {
                    console.log("옵션 없음", item.detailUrl);
                    await AmazonCollection.deleteOne({
                      userID: ObjectId(userInfo._id),
                      asin,
                    });
                  }
                } else if (item.detailUrl.includes("keenfootwear.jp")) {
                  const asin = AmazonAsin(item.detailUrl);
                  if (!asin) {
                    console.log("asin 없음");
                    continue;
                  }

                  let detailItem = await getKeen({
                    url: item.detailUrl,
                    userID: userInfo._id,
                    keyword: item.keyword,
                  });

                  if (!detailItem) {
                    await AmazonCollection.findOneAndUpdate(
                      {
                        userID: ObjectId(userInfo._id),
                        asin,
                      },
                      {
                        $set: {
                          isDelete: true,
                          lastUpdate: moment().toDate(),
                        },
                      },
                      {
                        upsert: true,
                      }
                    );
                  } else if (
                    detailItem &&
                    detailItem.options &&
                    detailItem.options.length > 0 &&
                    detailItem.options.length !==
                      detailItem.options.filter((item) => item.stock === 0)
                        .length
                  ) {
                    await TempProduct.findOneAndUpdate(
                      {
                        userID: ObjectId(userInfo._id),
                        good_id: detailItem.good_id,
                      },
                      {
                        $set: {
                          userID: ObjectId(userInfo._id),
                          categoryID: detailItem.categoryID,
                          good_id: detailItem.good_id,
                          brand: detailItem.brand,
                          manufacture: detailItem.manufacture,
                          modelName: detailItem.modelName,
                          title: detailItem.title,
                          keyword: detailItem.keyword,
                          mainImages: detailItem.mainImages,
                          price: detailItem.price,
                          salePrice: detailItem.salePrice,
                          html: detailItem.html,
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
                    );
                  } else {
                    console.log("옵션 없음", item.detailUrl);
                    await AmazonCollection.deleteOne({
                      userID: ObjectId(userInfo._id),
                      asin,
                    });
                  }
                } else if (item.detailUrl.includes("uniqlo.com/jp")) {
                  const asin = AmazonAsin(item.detailUrl);
                  if (!asin) {
                    console.log("asin 없음");
                    continue;
                  }

                  let detailItem = await getBrandAPI({
                    url: item.detailUrl,
                    userID: userInfo._id,
                    keyword: item.keyword,
                  });

                  if (!detailItem) {
                    await AmazonCollection.findOneAndUpdate(
                      {
                        userID: ObjectId(userInfo._id),
                        asin,
                      },
                      {
                        $set: {
                          isDelete: true,
                          lastUpdate: moment().toDate(),
                        },
                      },
                      {
                        upsert: true,
                      }
                    );
                  } else if (
                    detailItem &&
                    detailItem.options &&
                    detailItem.options.length > 0 &&
                    detailItem.options.length !==
                      detailItem.options.filter((item) => item.stock === 0)
                        .length
                  ) {
                    await TempProduct.findOneAndUpdate(
                      {
                        userID: ObjectId(userInfo._id),
                        good_id: detailItem.good_id,
                      },
                      {
                        $set: {
                          userID: ObjectId(userInfo._id),
                          categoryID: detailItem.categoryID,
                          good_id: detailItem.good_id,
                          brand: detailItem.brand,
                          manufacture: detailItem.manufacture,
                          modelName: detailItem.modelName,
                          title: detailItem.title,
                          keyword: detailItem.keyword,
                          mainImages: detailItem.mainImages,
                          price: detailItem.price,
                          salePrice: detailItem.salePrice,
                          html: detailItem.html,
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
                    );
                  } else {
                    console.log("옵션 없음", item.detailUrl);
                    await AmazonCollection.deleteOne({
                      userID: ObjectId(userInfo._id),
                      asin,
                    });
                  }
                }
              }
            }
          } catch (e) {
            console.log("collectionItems", e);
          }
          console.log(
            "item.detailUrl",
            i++,
            " -  ",
            products.length,
            " - ",
            item.detailUrl
          );
        }
      } catch (e) {
        console.log("errir00", e);
      }
      console.log("---끝 ----");
    }, 1000);
    res.json({
      message: "success",
    });
  } catch (e) {
    console.log("/amazon/collectionItems", e);
    res.json({
      message: "fail",
    });
  }
});

app.post("/amazon/deleteCollectionItems", async (req, res) => {
  try {
    const { user, asin } = req.body;

    const userInfo = await User.findOne({
      email: user,
    });
    if (!userInfo || !Array.isArray(asin)) {
      res.json({
        message: "fail",
      });
      return;
    }

    const products = await AmazonCollection.find({
      userID: ObjectId(userInfo._id),
      isDelete: { $ne: true },
      asin: {
        $in: asin,
      },
    });

    const promiseArr = products.map((item) => {
      return new Promise(async (resolve, reject) => {
        try {
          await AmazonCollection.deleteOne({
            userID: ObjectId(userInfo._id),
            asin: item.asin,
          });
          await TempProduct.deleteOne({
            userID: ObjectId(userInfo._id),
            good_id: item.asin,
          });
          resolve();
        } catch (e) {
          console.log("무슨 에러", e);
          reject(e);
        }
      });
    });
    await Promise.all(promiseArr);

    res.json({
      message: "success",
    });
  } catch (e) {
    console.log("/amazon/isRegister", e);
    res.json([]);
  }
});

app.post("/amazon/deleteCollectionItem", async (req, res) => {
  try {
    const { user, asin } = req.body;

    const userInfo = await User.findOne({
      email: user,
    });
    if (!userInfo && asin) {
      res.json({
        message: "fail",
      });
      return;
    }
    await AmazonCollection.remove({
      userID: ObjectId(userInfo._id),
      asin,
    });
    res.json({
      message: "success",
    });
  } catch (e) {
    console.log("/amazon/isRegister", e);
    res.json([]);
  }
});

app.post("/amazon/modifyKeyword", async (req, res) => {
  try {
    const { user, keyword, asin } = req.body;
    console.log("user, keyword, asin", user, keyword, asin);
    const userInfo = await User.findOne({
      email: user,
    });
    if (!userInfo && asin) {
      res.json({
        message: "fail",
      });
      return;
    }
    const promiseArr = asin.map((item) => {
      return new Promise(async (resolve, reject) => {
        try {
          await AmazonCollection.findOneAndUpdate(
            {
              userID: ObjectId(userInfo._id),
              asin: item,
            },
            {
              $set: {
                keyword,
              },
            }
          );
          resolve();
        } catch (e) {
          console.log("무슨 에러", e);
          reject(e);
        }
      });
    });
    await Promise.all(promiseArr);

    res.json({
      message: "success",
    });
  } catch (e) {
    console.log("/amazon/isRegister", e);
    res.json([]);
  }
});
app.post("/amazon/allRegisterItem", async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      res.json({
        message: "fail",
      });
    }
    setTimeout(async () => {
      for (const { detailUrl, user, image, title, keyword } of req.body) {
        try {
          const asin = AmazonAsin(detailUrl);
          if (!asin || !user) {
            continue;
          }
          const userInfo = await User.findOne({
            email: user,
          });
          if (!userInfo) {
            continue;
          }

          const product = await Product.findOne({
            userID: ObjectId(userInfo._id),
            "options.key": asin,
            isDelete: false,
          });
          if (!product) {
            const tempCollection = await AmazonCollection.findOne({
              userID: ObjectId(userInfo._id),
              asin,
            });

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
                    keyword,
                    isDelete: false,
                    lastUpdate: moment().toDate(),
                  },
                },
                {
                  upsert: true,
                  new: true,
                }
              );
            }
          }
        } catch (e) {
          console.log("eerr", e);
        }
      }
    }, 1000);

    res.json({
      message: "success",
    });
  } catch (e) {
    console.log("/amazon/registerItem", e);
    res.json({
      message: "fail",
    });
  }
});

app.post("/amazon/aliText", async (req, res) => {
  try {
    const { url } = req.body;
    console.log("url", url);
    let detailItem = await findAliExpressDetailAPIsimple({
      url,
      userID: ObjectId("5f1947bd682563be2d22f008"),
    });
    console.log("detailItem", detailItem);
    res.json({
      message: "success",
    });
  } catch (e) {
    console.log("error", e);
    res.json({
      message: "fail",
    });
  }
});

app.post("/ali/cookie", async (req, res) => {
  try {
    const { xman_t } = req.body;

    if (!xman_t || xman_t.length < 100) {
      res.json({
        message: "fail",
      });
      return;
    }
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
    );

    res.json({
      message: "success",
    });
  } catch (e) {
    console.log("error", e);
    res.json({
      message: "fail",
    });
  }
});

app.post("/bdg/orderList", async (req, res) => {
  try {
    const { user, cookie } = req.body;

    const userInfo = await User.findOne({
      email: user,
    }).lean();

    if (!userInfo) {
      res.json({
        message: false,
      });
      return;
    }

    if (userInfo.group) {
      const userGroups = await User.find({
        group: userInfo.group,
      });

      const startDate = moment().subtract(2, "month").format("YYYY-MM-DD");
      const endDate = moment().format("YYYY-MM-DD");

      const response = await getFirstBdgOrder({ userInfo, cookie });

      if (response && response.result && response.result.list.length > 0) {
        for (const item of response.result.list) {
          // console.log("item-->", item)
          const promiseArr = userGroups.map((user) => {
            return new Promise(async (resolve, reject) => {
              try {
                const market = await Market.findOne({
                  userID: ObjectId(user._id),
                });
                const cafe24OrderResponse = await Cafe24ListOrders({
                  mallID: market.cafe24.mallID,
                  orderState: "상품준비",
                  startDate,
                  endDate,
                });

                const temp = await DeliveryInfo.findOne({
                  userID: ObjectId(user._id),
                  orderNo: item.od_code, // 주문번호
                });

                let orderItems = item.in_order.map((mItem, i) => {
                  let taobaoOrderNo = null;
                  if (item.in_order_fo && item.in_order_fo[i]) {
                    taobaoOrderNo = item.in_order_fo[i];
                  } else if (
                    Array.isArray(item.in_order_fo) &&
                    item.in_order_fo[0]
                  ) {
                    taobaoOrderNo = item.in_order_fo[0];
                  }
                  let taobaoTrackingNo = null;
                  if (
                    item.in_invoice &&
                    item.in_invoice[0] &&
                    item.in_invoice[0][i]
                  ) {
                    taobaoTrackingNo = item.in_invoice[0][i];
                  } else if (
                    Array.isArray(item.in_invoice) &&
                    item.in_invoice[0]
                  ) {
                    taobaoTrackingNo = item.in_invoice[0][0];
                  }
                  let 오픈마켓주문번호 = null;
                  if (
                    temp &&
                    temp.orderItems[i] &&
                    temp.orderItems[i].오픈마켓주문번호.trim().length > 0
                  ) {
                    오픈마켓주문번호 = temp.orderItems[i].오픈마켓주문번호
                      .replace("`", "")
                      .replace("′", "")
                      .trim();
                  } else {
                    오픈마켓주문번호 = mItem;
                  }

                  return {
                    taobaoOrderNo,
                    taobaoTrackingNo,
                    오픈마켓주문번호,
                  };
                });

                if (temp && temp.orderItems.length <= item.in_order.length) {
                  // 디비 내용을 따라 가야함
                  orderItems = temp.orderItems;
                }
                const deliveySave = await DeliveryInfo.findOneAndUpdate(
                  {
                    userID: ObjectId(user._id),
                    orderNo: item.od_code, // 주문번호
                  },
                  {
                    $set: {
                      userID: ObjectId(user._id),
                      orderSeq: item.od_id,
                      orderNo: item.od_code, // 주문번호
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
                      isDelete:
                        item.od_status === "신청취소" ||
                        item.od_status === "반송완료"
                          ? true
                          : false,
                    },
                  },
                  { upsert: true, new: true }
                );

                await MarketOrder.findOneAndUpdate(
                  {
                    userID: ObjectId(user._id),
                    orderId: item.od_code,
                  },
                  {
                    $set: {
                      invoiceNumber: item.od_courier,
                      deliveryCompanyName: "경동택배",
                    },
                  },
                  { upsert: true }
                );

                const deliveryTemp = await DeliveryInfo.findOne({
                  userID: ObjectId(user._id),
                  orderNo: item.od_code,
                });

                if (deliveryTemp && deliveryTemp.orderItems) {
                  try {
                    const tempOrderItmes = _.uniqBy(
                      deliveryTemp.orderItems,
                      "오픈마켓주문번호"
                    );

                    for (const orderItem of tempOrderItmes) {
                      const tempCafe24Order = cafe24OrderResponse.filter(
                        (fItem) =>
                          fItem.market_order_info.toString() ===
                          orderItem.오픈마켓주문번호.toString()
                      );

                      if (tempCafe24Order.length > 0) {
                        const marketOrder = await MarketOrder.findOne({
                          userID: ObjectId(user._id),
                          orderId: orderItem.오픈마켓주문번호,
                        });

                        if (!deliveryTemp.isDelete) {
                          for (const item of tempCafe24Order) {
                            try {
                              const response = await Cafe24RegisterShipments({
                                mallID: market.cafe24.mallID,
                                order_id: item.order_id,
                                tracking_no: deliveySave.shippingNumber,
                                shipping_company_code:
                                  marketOrder &&
                                  marketOrder.deliveryCompanyName === "경동택배"
                                    ? "0039"
                                    : "0006",
                                order_item_code: item.items.map(
                                  (item) => item.order_item_code
                                ),
                                shipping_code: item.receivers[0].shipping_code,
                              });
                              console.log("resonse-->", response);

                              await sleep(500);
                              const response1 = await Cafe24UpdateShipments({
                                mallID: market.cafe24.mallID,
                                input: [
                                  {
                                    shipping_code:
                                      item.receivers[0].shipping_code,
                                    order_id: item.order_id,
                                  },
                                ],
                              });
                              console.log("resonse1-->", response1);
                              await sleep(500);
                            } catch (e) {
                              console.log("에러", e);
                            }
                          }
                        }
                      }
                    }
                  } catch (e) {
                    console.log("무슨 에러", e);
                  }
                }

                await sleep(500);
                resolve();
              } catch (e) {
                console.log("무슨 에러", e);
                reject(e);
              }
            });
          });

          await Promise.all(promiseArr);
        }
      }
    }
    res.json({
      message: true,
    });
  } catch (e) {
    console.log("/bdg/orderList", e);
    res.json({
      message: false,
    });
  }
});

app.post("/taobao/orders", async (req, res) => {
  try {
    const { user, orders } = req.body;

    const userInfo = await User.findOne({
      email: user,
    }).lean();

    if (!userInfo) {
      res.json({
        message: false,
      });
      return;
    }

    if (userInfo.group) {
      const userGroups = await User.find({
        group: userInfo.group,
      });

      for (const user of userGroups) {
        for (const item of orders) {
          await TaobaoOrder.findOneAndUpdate(
            {
              orderNumber: item.orderNumber,
              userID: ObjectId(user._id),
            },
            {
              $set: {
                orderNumber: item.orderNumber,
                userID: ObjectId(user._id),
                orderDate: item.orderDate,
                orderTime: item.orderTime,
                orders: item.orders,
                purchaseAmount: item.purchaseAmount,
                shippingFee: item.shippingFee,
                quantity: item.quantity,
                shippingStatus: item.shippingStatus,
              },
            },
            { upsert: true }
          );
        }
      }
    }
    res.json({
      message: true,
    });
  } catch (e) {
    console.log("/bdg/orderList", e);
    res.json({
      message: false,
    });
  }
});
app.post("/taobao/getSimbaUrl", async (req, res) => {
  try {
    const { url } = req.body;
    // console.log("uir", url);
    const response = await axios({
      method: "GET",
      url,
    });
    let temp = response.data.toString().split('localStorage.x5referer = "')[1];
    let temp1 = temp.split(`"`)[0];
    // console.log("response", temp1);
    res.json({
      message: temp1,
    });
  } catch (e) {
    console.log("---", e);
    return null;
  }
});

const RakutenPriceSync = async () => {
  const SyncFun = async () => {
    let isFirst = true;
    while (isFirst) {
      isFirst = false;
      const excahgeRate = await ExchangeRate.aggregate([
        {
          $match: {
            JPY_송금보내실때: { $ne: null },
          },
        },
        {
          $sort: {
            날짜: -1,
          },
        },
        {
          $limit: 1,
        },
      ]);

      let exchange =
        Number(excahgeRate[0].JPY_송금보내실때.replace(/,/gi, "") || 1000) + 10;

      exchange = exchange / 100;

      const products = await Product.aggregate([
        {
          $match: {
            // userID: ObjectId("5f1947bd682563be2d22f008"),
            // "options.key": {$in: asinArr},
            isDelete: false,
            "product.naver.smartstoreChannelProductNo": { $ne: null },
            $or: [
              {
                "basic.url": { $regex: `.*item.rakuten.co.jp.*` },
                // "basic.url": {
                //   $regex: `.*item.rakuten.co.jp/naturum/3422832.*`,
                // },
              },
            ],
          },
        },
        {
          $sort: {
            _id: -1,
          },
        },
      ]);

      for (const product of products) {
        try {
          //
          const response = await getRakutenSimple({
            url: product.basic.url,
            userID: product.userID,
          });
          // console.log("response", response);
          if (
            response &&
            response.options &&
            Array.isArray(response.options) &&
            response.options.length > 0
          ) {
            let changePrice = false;
            let changeStock = false;
            for (const option of response.options) {
              try {
                const findOption = _.find(product.options, { key: option.key });
                // console.log("findOption --> ", findOption);
                // console.log("가격", findOption.price, option.price);
                // console.log("재고", findOption.stock, option.stock);

                // console.log("111", exchange);

                findOption.margin = 20;

                let salePrice =
                  Math.ceil(
                    ((option.price * exchange +
                      Number(findOption.weightPrice)) /
                      ((100 - findOption.margin) / 100)) *
                      0.1
                  ) *
                    10 -
                  product.product.deliveryFee;

                // console.log("salePrice", salePrice);

                if (findOption.price !== option.price) {
                  changePrice = true;

                  findOption.price = option.price;
                  findOption.salePrice = salePrice;
                }
                if (findOption.stock !== option.stock) {
                  changeStock = true;
                  findOption.stock = option.stock;
                }
                // await sleep(1000);
              } catch (e) {}
            }

            if (changePrice || changeStock) {
              const minOption = _.minBy(product.options, "salePrice");
              const maxOption = _.maxBy(product.options, "salePrice");

              const salePrice =
                Math.ceil(
                  (minOption.salePrice + maxOption.salePrice) * 0.7 * 0.1
                ) * 10; // 판매가
              const discountPrice = salePrice - minOption.salePrice; // 판매가 - 최저가

              const optionValue = product.options.filter(
                (item) => item.active && !item.disabled
              );

              let optionCombinationGroupNames = {};
              let optionCombinations = [];

              if (
                (!optionValue[0].korKey ||
                  (optionValue[0].korKey &&
                    optionValue[0].korKey.length === 0)) &&
                product.prop &&
                Array.isArray(product.prop) &&
                product.prop.length > 0 &&
                optionValue.length > 0 &&
                optionValue[0].propPath !== null
              ) {
                for (let i = 0; i < product.prop.length; i++) {
                  optionCombinationGroupNames[`optionGroupName${i + 1}`] =
                    product.prop[i].korTypeName;
                }
                for (const item of optionValue) {
                  let combinationValue = {};

                  const propPathes = item.propPath
                    .split(";")
                    .filter((fItem) => fItem.trim().length > 0);
                  for (let p = 0; p < propPathes.length; p++) {
                    const propKeyArr = propPathes[p].split(":");
                    if (propKeyArr.length === 2) {
                      const propObj = _.find(product.prop, {
                        pid: propKeyArr[0],
                      });
                      if (propObj) {
                        const propValue = _.find(propObj.values, {
                          vid: propKeyArr[1],
                        });
                        if (propValue) {
                          combinationValue[`optionName${p + 1}`] =
                            propValue.korValueName
                              .replace(/\*/gi, "x")
                              .replace(/\?/gi, " ")
                              .replace(/\"/gi, " ")
                              .replace(/\</gi, " ")
                              .replace(/\>/gi, " ");
                        }
                      }
                    }
                  }
                  if (Object.keys(combinationValue).length > 0) {
                    combinationValue.stockQuantity = item.stock; //재고
                    combinationValue.price =
                      item.salePrice - minOption.salePrice;
                    optionCombinations.push(combinationValue);
                  }
                }
              } else {
                optionCombinationGroupNames.optionGroupName1 = "종류";
                optionCombinations = optionValue.map((item) => {
                  return {
                    optionName1:
                      item.korKey && item.korKey.length > 0
                        ? item.korKey
                        : item.korValue
                            .replace(/\*/gi, "x")
                            .replace(/\?/gi, " ")
                            .replace(/\"/gi, " ")
                            .replace(/\</gi, " ")
                            .replace(/\>/gi, " "),
                    stockQuantity: item.stock,
                    price: item.salePrice - minOption.salePrice,
                  };
                });
              }

              // console.log(
              //   "optionCombinationGroupNames",
              //   optionCombinationGroupNames
              // );
              // console.log("optionCombinations", optionCombinations);

              const naverProduct = await NaverOriginProducts({
                userID: product.userID,
                originProductNo: product.product.naver.originProductNo,
              });

              // console.log("naverProduct", naverProduct.originProduct);

              if (naverProduct) {
                if (
                  naverProduct.originProduct.detailAttribute
                    .naverShoppingSearchInfo
                ) {
                  let brand =
                    naverProduct.originProduct.detailAttribute
                      .naverShoppingSearchInfo.brandName;
                  let modelName =
                    naverProduct.originProduct.detailAttribute
                      .naverShoppingSearchInfo.modelName;
                  if (brand && modelName) {
                    naverProduct.originProduct.detailAttribute.seoInfo.pageTitle = `${brand} ${modelName}`;
                  } else if (brand) {
                    naverProduct.originProduct.detailAttribute.seoInfo.pageTitle =
                      brand;
                  }
                }

                delete naverProduct.originProduct.detailContent;
                naverProduct.originProduct.statusType = "SALE";
                naverProduct.originProduct.salePrice = salePrice;
                naverProduct.originProduct.stockQuantity = optionValue[0].stock;
                naverProduct.originProduct.detailAttribute.optionInfo = {
                  optionCombinationSortType: "CREATE",
                  optionCombinationGroupNames,
                  optionCombinations,
                };
                naverProduct.originProduct.customerBenefit = {
                  immediateDiscountPolicy: {
                    discountMethod: {
                      value: discountPrice,
                      unitType: "WON",
                    },
                    mobileDiscountMethod: {
                      value: discountPrice,
                      unitType: "WON",
                    },
                  },
                };

                // console.log("naverProduct", naverProduct.originProduct);

                const updateReponse = await NaverModifyOption({
                  userID: product.userID,
                  originProductNo: product.product.naver.originProductNo,
                  product: naverProduct,
                });

                if (
                  updateReponse &&
                  updateReponse.originProductNo &&
                  updateReponse.originProductNo.toString() ===
                    product.product.naver.originProductNo
                ) {
                  await Product.findOneAndUpdate(
                    {
                      _id: product._id,
                    },
                    {
                      $set: {
                        options: product.options,
                      },
                    }
                  );
                }

                console.log("product 상품명 ", product.product.korTitle);
                if (changePrice) {
                  console.log("가격 변동");
                }
                if (changeStock) {
                  console.log("재고 변동");
                }
                console.log("updateReponse", updateReponse);
                console.log(
                  "======================================================================================"
                );
                await sleep(1000);
              }
            }
          } else {
            const naverProduct = await NaverOriginProducts({
              userID: product.userID,
              originProductNo: product.product.naver.originProductNo,
            });

            if (naverProduct) {
              for (const option of product.options) {
                option.stock = 0;
              }

              naverProduct.originProduct.stockQuantity = 0;
              naverProduct.originProduct.statusType = "SUSPENSION";

              for (const optionItem of naverProduct.originProduct
                .detailAttribute.optionInfo.optionCombinations) {
                optionItem.stockQuantity = 0;
              }
              // console.log("naverProduct", naverProduct);
              const updateReponse = await NaverModifyOption({
                userID: product.userID,
                originProductNo: product.product.naver.originProductNo,
                product: naverProduct,
              });

              if (
                updateReponse &&
                updateReponse.originProductNo &&
                updateReponse.originProductNo.toString() ===
                  product.product.naver.originProductNo
              ) {
                await Product.findOneAndUpdate(
                  {
                    _id: product._id,
                  },
                  {
                    $set: {
                      options: product.options,
                    },
                  }
                );
              }

              console.log("deleteReponse", updateReponse);
            }
          }
          await sleep(2000);
        } catch (e) {
          console.log("eeeee", e);
        }
      }
      console.log("---- 끝 ----");
      await sleep(10000);
    }
  };

  SyncFun();
};

const BrandPriceSync = async () => {
  const SyncFun = async () => {
    let isFirst = true;
    while (isFirst) {
      isFirst = false;
      const excahgeRate = await ExchangeRate.aggregate([
        {
          $match: {
            JPY_송금보내실때: { $ne: null },
          },
        },
        {
          $sort: {
            날짜: -1,
          },
        },
        {
          $limit: 1,
        },
      ]);

      let exchange =
        Number(excahgeRate[0].JPY_송금보내실때.replace(/,/gi, "") || 1000) + 10;

      exchange = exchange / 100;

      const products = await Product.aggregate([
        {
          $match: {
            // userID: ObjectId("5f1947bd682563be2d22f008"),
            // "options.key": {$in: asinArr},
            isDelete: false,
            "product.naver.smartstoreChannelProductNo": { $ne: null },
            $or: [
              {
                "basic.url": { $regex: `.*uniqlo.com/jp.*` },
              },
            ],
          },
        },
        {
          $sort: {
            _id: -1,
          },
        },
      ]);

      for (const product of products) {
        try {
          //
          const response = await getBrandSimple({
            url: product.basic.url,
            userID: product.userID,
          });
          // console.log("response", response);
          if (
            response &&
            response.options &&
            Array.isArray(response.options) &&
            response.options.length > 0
          ) {
            let changePrice = false;
            let changeStock = false;
            for (const option of response.options) {
              try {
                const findOption = _.find(product.options, { key: option.key });
                // console.log("findOption --> ", findOption);
                // console.log("가격", findOption.price, option.price);
                // console.log("재고", findOption.stock, option.stock);

                // console.log("111", exchange);

                findOption.margin = 20;

                let salePrice =
                  Math.ceil(
                    ((option.price * exchange +
                      Number(findOption.weightPrice)) /
                      ((100 - findOption.margin) / 100)) *
                      0.1
                  ) *
                    10 -
                  product.product.deliveryFee;

                // console.log("salePrice", salePrice);

                if (findOption.price !== option.price) {
                  changePrice = true;

                  findOption.price = option.price;
                  findOption.salePrice = salePrice;
                }

                if (findOption.stock !== option.stock) {
                  changeStock = true;
                  findOption.stock = option.stock;
                }
                // await sleep(1000);
              } catch (e) {}
            }

            if (changePrice || changeStock) {
              const minOption = _.minBy(product.options, "salePrice");
              const maxOption = _.maxBy(product.options, "salePrice");

              const salePrice =
                Math.ceil(
                  (minOption.salePrice + maxOption.salePrice) * 0.7 * 0.1
                ) * 10; // 판매가
              const discountPrice = salePrice - minOption.salePrice; // 판매가 - 최저가

              const optionValue = product.options.filter(
                (item) => item.active && !item.disabled
              );

              let optionCombinationGroupNames = {};
              let optionCombinations = [];

              if (
                (!optionValue[0].korKey ||
                  (optionValue[0].korKey &&
                    optionValue[0].korKey.length === 0)) &&
                product.prop &&
                Array.isArray(product.prop) &&
                product.prop.length > 0 &&
                optionValue.length > 0 &&
                optionValue[0].propPath !== null
              ) {
                for (let i = 0; i < product.prop.length; i++) {
                  optionCombinationGroupNames[`optionGroupName${i + 1}`] =
                    product.prop[i].korTypeName;
                }
                for (const item of optionValue) {
                  let combinationValue = {};

                  const propPathes = item.propPath
                    .split(";")
                    .filter((fItem) => fItem.trim().length > 0);
                  for (let p = 0; p < propPathes.length; p++) {
                    const propKeyArr = propPathes[p].split(":");
                    if (propKeyArr.length === 2) {
                      const propObj = _.find(product.prop, {
                        pid: propKeyArr[0],
                      });
                      if (propObj) {
                        const propValue = _.find(propObj.values, {
                          vid: propKeyArr[1],
                        });
                        if (propValue) {
                          combinationValue[`optionName${p + 1}`] =
                            propValue.korValueName
                              .replace(/\*/gi, "x")
                              .replace(/\?/gi, " ")
                              .replace(/\"/gi, " ")
                              .replace(/\</gi, " ")
                              .replace(/\>/gi, " ");
                        }
                      }
                    }
                  }
                  if (Object.keys(combinationValue).length > 0) {
                    combinationValue.stockQuantity = item.stock; //재고
                    combinationValue.price =
                      item.salePrice - minOption.salePrice;
                    optionCombinations.push(combinationValue);
                  }
                }
              } else {
                optionCombinationGroupNames.optionGroupName1 = "종류";
                optionCombinations = optionValue.map((item) => {
                  return {
                    optionName1:
                      item.korKey && item.korKey.length > 0
                        ? item.korKey
                        : item.korValue
                            .replace(/\*/gi, "x")
                            .replace(/\?/gi, " ")
                            .replace(/\"/gi, " ")
                            .replace(/\</gi, " ")
                            .replace(/\>/gi, " "),
                    stockQuantity: item.stock,
                    price: item.salePrice - minOption.salePrice,
                  };
                });
              }

              // console.log(
              //   "optionCombinationGroupNames",
              //   optionCombinationGroupNames
              // );
              // console.log("optionCombinations", optionCombinations);

              const naverProduct = await NaverOriginProducts({
                userID: product.userID,
                originProductNo: product.product.naver.originProductNo,
              });

              // console.log("naverProduct", naverProduct.originProduct);

              if (naverProduct) {
                if (
                  naverProduct.originProduct.detailAttribute
                    .naverShoppingSearchInfo
                ) {
                  let brand =
                    naverProduct.originProduct.detailAttribute
                      .naverShoppingSearchInfo.brandName;
                  let modelName =
                    naverProduct.originProduct.detailAttribute
                      .naverShoppingSearchInfo.modelName;
                  if (brand && modelName) {
                    naverProduct.originProduct.detailAttribute.seoInfo.pageTitle = `${brand} ${modelName}`;
                  } else if (brand) {
                    naverProduct.originProduct.detailAttribute.seoInfo.pageTitle =
                      brand;
                  }
                }

                delete naverProduct.originProduct.detailContent;
                naverProduct.originProduct.statusType = "SALE";
                naverProduct.originProduct.salePrice = salePrice;
                naverProduct.originProduct.stockQuantity = optionValue[0].stock;
                naverProduct.originProduct.detailAttribute.optionInfo = {
                  optionCombinationSortType: "CREATE",
                  optionCombinationGroupNames,
                  optionCombinations,
                };
                naverProduct.originProduct.customerBenefit = {
                  immediateDiscountPolicy: {
                    discountMethod: {
                      value: discountPrice,
                      unitType: "WON",
                    },
                    mobileDiscountMethod: {
                      value: discountPrice,
                      unitType: "WON",
                    },
                  },
                };

                // console.log("naverProduct", naverProduct.originProduct);

                const updateReponse = await NaverModifyOption({
                  userID: product.userID,
                  originProductNo: product.product.naver.originProductNo,
                  product: naverProduct,
                });

                if (
                  updateReponse &&
                  updateReponse.originProductNo &&
                  updateReponse.originProductNo.toString() ===
                    product.product.naver.originProductNo
                ) {
                  await Product.findOneAndUpdate(
                    {
                      _id: product._id,
                    },
                    {
                      $set: {
                        options: product.options,
                      },
                    }
                  );
                }

                console.log("product 상품명 ", product.product.korTitle);
                if (changePrice) {
                  console.log("가격 변동");
                }
                if (changeStock) {
                  console.log("재고 변동");
                }
                console.log("updateReponse", updateReponse);
                console.log(
                  "======================================================================================"
                );
                await sleep(10000);
              }
            }
          } else {
            const naverProduct = await NaverOriginProducts({
              userID: product.userID,
              originProductNo: product.product.naver.originProductNo,
            });

            if (naverProduct) {
              for (const option of product.options) {
                option.stock = 0;
              }

              naverProduct.originProduct.stockQuantity = 0;
              naverProduct.originProduct.statusType = "SUSPENSION";

              for (const optionItem of naverProduct.originProduct
                .detailAttribute.optionInfo.optionCombinations) {
                optionItem.stockQuantity = 0;
              }
              // console.log("naverProduct", naverProduct);
              const updateReponse = await NaverModifyOption({
                userID: product.userID,
                originProductNo: product.product.naver.originProductNo,
                product: naverProduct,
              });

              if (
                updateReponse &&
                updateReponse.originProductNo &&
                updateReponse.originProductNo.toString() ===
                  product.product.naver.originProductNo
              ) {
                await Product.findOneAndUpdate(
                  {
                    _id: product._id,
                  },
                  {
                    $set: {
                      options: product.options,
                    },
                  }
                );
              }

              console.log("deleteReponse", updateReponse);
            }
          }
          await sleep(10000);
        } catch (e) {
          console.log("eeeee", e);
        }
      }
      console.log("---- 끝 ----");
      await sleep(1000 * 60 * 60);
    }
  };

  SyncFun();
};

const IherbPriceSync = async () => {
  console.time("IHERBPRICESYNC");
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
  ]);
  console.log("products", products.length);
  for (const product of products) {
    let changePrice = false;
    let chagneStock = false;
    try {
      const tempProduct = await Product.findOne(
        {
          _id: product._id,
        },
        {
          isAutoPrice: 1,
        }
      );
      if (tempProduct.isAutoPrice) {
        let detailItem = await findIherbDetailSimple({
          url: product.basic.url,
          // userID: ObjectId(item.userID)
        });
        console.log("detailItem", detailItem);
        const market = await Market.findOne({
          userID: ObjectId(product.userID),
        });

        const deliveryChargeOnReturn = market.coupang.deliveryChargeOnReturn;
        const returnCharge = market.coupang.returnCharge;

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
        ]);

        if (detailItem) {
          if (detailItem.stock === 0) {
            console.log("재고 없음 상품명 : ", product.product.korTitle);
          }
          const salePrice = getIherbSalePrice(detailItem.price, marginInfo);

          for (const pItem of product.options) {
            if (pItem.key === detailItem.asin) {
              if (pItem.salePrice !== salePrice) {
                changePrice = true;
              }
              if (pItem.stock !== detailItem.stock) {
                chagneStock = true;
              }
              if (changePrice || chagneStock) {
                console.log("=========================");
                console.log("상품명 : ", product.product.korTitle);
                console.log("기존가격 : ", pItem.salePrice);
                console.log("변경가격 : ", salePrice);
                console.log("기존재고 : ", pItem.stock);
                console.log("변경재고 : ", detailItem.stock);
                console.log("=========================");
              }

              pItem.salePrice = salePrice;
              pItem.productPrice = salePrice;
              pItem.stock = detailItem.stock;
            }
          }

          const productResponse = await CoupnagGET_PRODUCT_BY_PRODUCT_ID({
            userID: product.userID,
            productID: product.product.coupang.productID,
          });

          if (productResponse && productResponse.code === "SUCCESS") {
            for (const pItem of product.options) {
              const filterArr = productResponse.data.items.filter(
                (fItem) =>
                  fItem.vendorItemId &&
                  (fItem.itemName === pItem.korValue ||
                    fItem.itemName === pItem.korKey)
              );

              if (filterArr.length > 0) {
                if (changePrice) {
                  const responsePartial = await CoupnagUPDATE_PARTIAL_PRODUCT({
                    userID: product.userID,
                    sellerProductId: productResponse.data.sellerProductId,
                    parameter: {
                      sellerProductId:
                        productResponse.data.sellerProductId.toString(),
                      deliveryChargeOnReturn:
                        deliveryChargeOnReturn > salePrice / 2
                          ? Math.floor((salePrice / 2) * 0.1) * 10
                          : deliveryChargeOnReturn,
                      returnCharge:
                        returnCharge > salePrice / 2
                          ? Math.floor((salePrice / 2) * 0.1) * 10
                          : returnCharge,
                    },
                  });

                  // console.log("responsePartial", responsePartial)

                  const responsePrice =
                    await CoupnagUPDATE_PRODUCT_PRICE_BY_ITEM({
                      userID: product.userID,
                      vendorItemId: filterArr[0].vendorItemId,
                      price: salePrice,
                    });

                  // console.log("response", responsePrice)

                  await CoupnagUPDATE_PARTIAL_PRODUCT({
                    userID: product.userID,
                    sellerProductId: productResponse.data.sellerProductId,
                    parameter: {
                      sellerProductId:
                        productResponse.data.sellerProductId.toString(),
                      deliveryChargeOnReturn:
                        deliveryChargeOnReturn > salePrice / 2
                          ? Math.floor((salePrice / 2) * 0.1) * 10
                          : deliveryChargeOnReturn,
                      returnCharge:
                        returnCharge > salePrice / 2
                          ? Math.floor((salePrice / 2) * 0.1) * 10
                          : returnCharge,
                    },
                  });
                }

                if (chagneStock) {
                  const responseQuantity =
                    await CoupnagUPDATE_PRODUCT_QUANTITY_BY_ITEM({
                      userID: product.userID,
                      vendorItemId: filterArr[0].vendorItemId,
                      quantity: detailItem.stock,
                    });
                  pItem.stock = detailItem.stock;
                  console.log("responseQuantity", responseQuantity);
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
              );
            }
          }

          // if(changePrice || chagneStock) {
          if (
            product.product.cafe24 &&
            product.product.cafe24.mallID &&
            product.product.cafe24.shop_no
          ) {
            product.product.cafe24_product_no =
              product.product.cafe24.product_no;

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
            });
            console.log("cafe24Response, ", cafe24Response);
          }
          // }
        }
      }
    } catch (e) {
      console.log("errirooo", e);
    }
    await sleep(1000);
  }

  console.timeEnd("IHERBPRICESYNC");
  console.log("끝----");
};

const getIherbSalePrice = (price, marginInfo) => {
  let weightPrice = 0;

  if (price < 20000) {
    weightPrice = 5000;
  } else {
    weightPrice = 0;
  }

  let margin = 30;
  let marginArr = marginInfo.filter((fItem) => fItem.title >= Number(price));

  if (marginArr.length > 0) {
    margin = Number(marginArr[0].price);
  } else {
    margin = Number(marginInfo[marginInfo.length - 1].price);
  }
  let addPrice = addIherbPriceCalc(price, weightPrice, margin);
  let salePrice =
    Math.ceil((Number(price) + Number(addPrice) + Number(weightPrice)) * 0.1) *
    10;

  return salePrice;
};

const addIherbPriceCalc = (price, weightPrice, margin) => {
  const addPrice = -(
    ((margin + 11) * Number(price) + weightPrice * margin + 11 * weightPrice) /
    (margin - 89)
  );
  return addPrice;
};

const getPermutations = function (arr, selectNumber) {
  const results = [];
  if (selectNumber === 1) return arr.map((el) => [el]);
  // n개중에서 1개 선택할 때(nP1), 바로 모든 배열의 원소 return. 1개선택이므로 순서가 의미없음.

  arr.forEach((fixed, index, origin) => {
    const rest = [...origin.slice(0, index), ...origin.slice(index + 1)];
    // 해당하는 fixed를 제외한 나머지 배열
    const permutations = getPermutations(rest, selectNumber - 1);
    // 나머지에 대해서 순열을 구한다.
    const attached = permutations.map((el) => [fixed, ...el]);
    //  돌아온 순열에 떼 놓은(fixed) 값 붙이기
    results.push(...attached);
    // 배열 spread syntax 로 모두다 push
  });

  return results; // 결과 담긴 results return
};

RakutenPriceSync();
BrandPriceSync();

const getVVICItems = async () => {
  try {
    await getVVIC({
      url: "https://www.vvic.com/item/634952642f99950008b96b27",
    });
  } catch (e) {
    console.log("getVVICItems.", e);
  }
};

// getVVICItems()

// 소이지 api
app.post("/seller/login", async (req, res) => {
  console.log("req.body", req.body);
  try {
    if (!req.body.email || req.body.email.length === 0) {
      res.json({
        code: "ERROR",
        message: "이메일주소를 입력해주세요.",
      });
      return;
    }

    if (!req.body.password || req.body.password.length === 0) {
      res.json({
        code: "ERROR",
        message: "패스워드를 입력해주세요.",
      });
      return;
    }

    const response = await User.findOne({
      email: req.body.email,
    });
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
        });
      } else {
        res.json({
          code: "ERROR",
          message: "패스워드가 일치하지 않습니다.",
        });
      }
    } else {
      res.json({
        code: "ERROR",
        message: "등록된 사용자가 없습니다.",
      });
    }
  } catch (e) {
    res.json({ code: "ERROR" });
  }
});

// 직원 -> 관리자 조회
app.get("/seller/getCEO", async (req, res) => {
  try {
    if (!req.query.email) {
      res.json({
        code: "ERROR",
        message: "이메일주소를 입력해주세요.",
      });
      return;
    }

    const response = await User.findOne({
      email: req.query.email,
      grade: "2",
    });
    if (!response) {
      res.json({
        code: "ERROR",
        message: "등록된 사용자가 없습니다.",
      });
      return;
    }

    const ceo = await User.findOne({
      _id: response.adminUser,
      // grade: "1"
    });
    if (ceo) {
      res.json({
        code: "SUCCESS",
        data: {
          email: ceo.email,
          nickname: ceo.nickname,
          avatar: ceo.avatar,
        },
      });
    } else {
      res.json({
        code: "ERROR",
        message: "관리자가 존재하지 않습니다.",
      });
    }
  } catch (e) {
    res.json({
      code: "ERROR",
      message: e.message,
    });
  }
});
// 관라지 -> 직원 정보
app.get("/seller/getStaff", async (req, res) => {
  try {
    if (!req.query.email) {
      res.json({
        code: "ERROR",
        message: "이메일주소를 입력해주세요.",
      });
      return;
    }
    const response = await User.findOne({
      email: req.query.email,
      grade: "1",
    });
    if (!response) {
      res.json({
        code: "ERROR",
        message: "등록된 사용자가 없습니다.",
      });
      return;
    }

    const staff = await User.find({
      adminUser: response._id,
      grade: "2",
    });
    res.json({
      code: "SUCCESS",
      data: staff.map((item) => {
        return {
          email: item.email,
          nickname: item.nickname,
          avatar: item.avatar,
        };
      }),
    });
  } catch (e) {
    res.json({
      code: "ERROR",
      message: e.message,
    });
  }
});
// 배송비 무게
app.get("/seller/shippingPrice", async (req, res) => {
  console.log("req.query", req.query);
  try {
    if (!req.query.email) {
      res.json({
        code: "ERROR",
        message: "email 없습니다.",
      });
      return;
    }
    let user = null;
    const user1 = await User.findOne({
      email: req.query.email,
    });
    if (!user1) {
      res.json({
        code: "ERROR",
        message: "가입된 사용자가 존재하지 않습니다.1",
      });
      return;
    }
    user = user1._id;

    if (user1.grade !== "1") {
      const user2 = await User.findOne({
        email: user1.adminUser,
      });
      if (!user2) {
        res.json({
          code: "ERROR",
          message: "가입된 사용자가 존재하지 않습니다.2",
        });
        return;
      }
      user = user2._id;
    }

    const shipping = await ShippingPrice.find({
      userID: user,
      type: 2,
    }).sort({ title: 1 });

    res.json({
      code: "SUCCESS",
      data: shipping.map((item) => {
        return {
          weight: item.title,
          price: item.price,
        };
      }),
    });
  } catch (e) {
    console.log("e", e);
    res.json({
      code: "ERROR",
      message: e.message,
    });
  }
});
// 환율
app.get("/seller/getExchangeRate", async (req, res) => {
  try {
    const response = await ExchangeRate.findOne({
      CNY_송금보내실때: { $ne: null },
    }).sort({ 날짜: -1 });
    res.json({
      code: "SUCCESS",
      data: {
        date: response.날짜,
        exchange: response.CNY_송금보내실때,
      },
    });
  } catch (e) {
    console.log("getExchangeRate", e);
    res.json({
      code: "ERROR",
      message: e.message,
    });
  }
});
// 마진
app.get("/seller/getProfit", async (req, res) => {
  try {
    if (!req.query.email) {
      res.json({
        code: "ERROR",
        message: "email 없습니다.",
      });
      return;
    }
    let user = null;
    const user1 = await User.findOne({
      email: req.query.email,
    });
    if (!user1) {
      res.json({
        code: "ERROR",
        message: "가입된 사용자가 존재하지 않습니다.1",
      });
      return;
    }
    user = user1._id;

    if (user1.grade !== "1") {
      const user2 = await User.findOne({
        email: user1.adminUser,
      });
      if (!user2) {
        res.json({
          code: "ERROR",
          message: "가입된 사용자가 존재하지 않습니다.2",
        });
        return;
      }
      user = user2._id;
    }

    const shipping = await ShippingPrice.find({
      userID: user,
      type: 1,
    }).sort({ title: 1 });

    res.json({
      code: "SUCCESS",
      data: shipping.map((item) => {
        return {
          price: item.title,
          percent: item.price,
        };
      }),
    });
  } catch (e) {
    res.json({
      code: "ERROR",
      message: e.message,
    });
  }
});

// app.post("/seller/localImage", async (req, res) => {
//   try {
//     if (!req.body.base64Image) {
//       res.json({
//         code: "ERROR",
//         message: "base64Image 없습니다.",
//       });
//       return;
//     }

//     const agent = new http.Agent({
//       rejectUnauthorized: false,
//     });

//     let base64Image = req.body.base64Image;
//     if (req.body.base64Image.includes("base64,")) {
//       base64Image = req.body.base64Image.split("base64,")[1];
//     }
//     const params = new url.URLSearchParams({ image: base64Image });

//     const options = {
//       method: "POST",
//       url: "https://api.imgbb.com/1/upload?key=2319d7ccd2d019c84b68246f8d3c5c69",
//       httpsAgent: agent,
//       data: params.toString(),
//     };
//     const response = await axios({
//       ...options,
//     });

//     if (response && response.data && response.data.status === 200) {
//       res.json({
//         code: "SUCCESS",
//         data: {
//           path: response.data.data.url,
//         },
//       });
//     } else {
//       res.json({
//         code: "ERROR",
//         message: response.message || null,
//       });
//     }

//     // const response = await Cafe24UploadLocalImage({base64Image: req.body.base64Image})

//     // if(response && response.message === null){
//     //   res.json({
//     //     code: "SUCCESS",
//     //     data: {
//     //       path: response.data.images[0].path
//     //     }
//     //   })
//     // }
//     // res.json({
//     //   code: "ERROR",
//     //   message: response.message || null
//     // })
//   } catch (e) {
//     console.log(e);
//     res.json({ code: "ERROR", message: e.message });
//   }
// });

// 타오바오 이미지
// app.post("/seller/getTaobaoImage", async (req, res) => {
//   try {
//     if (!req.body.imageUrl) {
//       res.json({
//         code: "ERROR",
//         message: "image 없습니다.",
//       });
//       return;
//     }

//     const today = moment().format("YYYYMMDD");

//     if (!fs.existsSync("./temp")) {
//       fs.mkdirSync("./temp");
//     }
//     const options = {
//       url: req.body.imageUrl.split("?")[0],
//       dest: "../../temp",
//     };

//     const { filename } = await download.image(options);

//     const form = new FormData();
//     form.append("imgfile", fs.createReadStream(filename), {
//       filename,
//       knownLength: fs.statSync(filename).size,
//     });
//     let response = null;

//     const cookies = await Cookie.aggregate([
//       {
//         $match: {
//           name: { $ne: null },
//           name: { $ne: "xman_t" },
//         },
//       },
//       {
//         $sort: {
//           lastUpdate: -1,
//         },
//       },
//     ]);

//     response = await ImageUpload({
//       data: form,
//       referer: "https://s.taobao.com/search",
//       // cookie: {}
//       cookie: cookies[0].cookie,
//     });

//     try {
//       fs.rmdirSync("./temp", { recursive: true });
//     } catch (e) {
//       console.log("디렉토리 삭제 에러", e);
//     }

//     if (response) {
//       res.json({
//         code: "SUCCESS",
//         data: {
//           path: `https://s.taobao.com/search?q=&imgfile=&js=1&stats_click=search_radio_all%253A1&initiative_id=staobaoz_${today}&ie=utf8&tfsid=${response.name}&app=imgsearch`,
//         },
//       });
//     } else {
//       res.json({
//         code: "ERROR",
//         message: "이미지 검색 실패",
//       });
//     }
//   } catch (e) {
//     res.json({
//       code: "ERROR",
//       message: e.message,
//     });
//   }
// });
// 판매가격 = (위안화 * 환율 + 추가금액) + 배송비
// 추가금액 = - ( (((exchange * margin + 11 * exchange) * Number(wian) ) + (weightPrice * margin) + (11 * weightPrice)) / (margin - 89) )
//  - ( (((환율 * 마진 + 11 * 환율) * 위안가격 ) + (배송가격 * 마진) + (11 * 배송가격)) / (마진 - 89) )

app.post("/seller/product", async (req, res) => {
  // console.log("req.body", req.body);
  // 유저아이디
  // 상품명
  // 상품 아이디
  // 타오바오 URL
  // 브랜드
  // 제조사
  // 상품명
  // 한국 상품명
  // 메인이미지[String]
  // 타오바오 상세이미지[String]
  // 옵션 [key,value,image,stock,price]

  // console.log("req.body", req.body);
  try {
    if (!req.body.email) {
      console.log("email 없습니다.");
      res.json({
        code: "ERROR",
        message: "email 없습니다.",
      });
      return;
    }
    if (!req.body.naverID) {
      console.log("네이버 상품 아이디가 없습니다.");
      res.json({
        code: "ERROR",
        message: "네이버 상품 아이디가 없습니다.",
      });
      return;
    }
    if (!req.body.url) {
      console.log("타오바오 URL이 없습니다.");
      res.json({
        code: "ERROR",
        message: "타오바오 URL이 없습니다.",
      });
      return;
    }
    if (!req.body.title) {
      console.log("상품명 (중문)이 없습니다.");
      res.json({
        code: "ERROR",
        message: "상품명 (중문)이 없습니다.",
      });
      return;
    }
    if (!req.body.korTitle) {
      console.log("상품명이 없습니다.");
      res.json({
        code: "ERROR",
        message: "상품명이 없습니다.",
      });
      return;
    }
    if (
      !req.body.mainImages ||
      !Array.isArray(req.body.mainImages) ||
      req.body.mainImages.length === 0
    ) {
      console.log("메인이미지가 없습니다.");
      res.json({
        code: "ERROR",
        message: "메인이미지가 없습니다.",
      });
      return;
    }
    if (!req.body.content || !Array.isArray(req.body.content)) {
      console.log("상세이미지가 없습니다.");
      res.json({
        code: "ERROR",
        message: "상세이미지가 없습니다.",
      });
      return;
    }
    if (
      !req.body.options
      //  ||
      // !Array.isArray(req.body.options) ||
      // req.body.options.length === 0
    ) {
      console.log("옵션이 없습니다.");
      res.json({
        code: "ERROR",
        message: "옵션이 없습니다.",
      });
      return;
    }

    let user = null;
    let writerID = null;
    const user1 = await User.findOne({
      email: req.body.email,
    });
    if (!user1) {
      console.log("가입된 사용자가 존재하지 않습니다.1");
      res.json({
        code: "ERROR",
        message: "가입된 사용자가 존재하지 않습니다.1",
      });
      return;
    }
    user = user1._id;
    writerID = user1._id;

    if (user1.grade !== "1") {
      const user2 = await User.findOne({
        _id: user1.adminUser,
      });
      if (!user2) {
        console.log("가입된 사용자가 존재하지 않습니다.2");
        res.json({
          code: "ERROR",
          message: "가입된 사용자가 존재하지 않습니다.2",
        });
        return;
      }
      user = user2._id;
      writerID = user1._id;
    }

    // console.log("req.body.options --- ", JSON.stringify(req.body.options));
    const objItem = await getProductData({
      userID: user,
      url: req.body.url,
      brand: req.body.brand,
      title: req.body.title || "",
      korTitle: req.body.korTitle.naver || "",
      mainImages: req.body.mainImages || [],
      content: req.body.content || [],
      prop: req.body.prop || null,
      options: req.body.options.naver || [],
      isClothes: req.body.isClothes === "Y" ? true : false,
      isShoes: req.body.isShoes === "Y" ? true : false,
    });

    const coupangObjItem = await getProductData({
      userID: user,
      url: req.body.url,
      brand: req.body.brand,
      title: req.body.title || "",
      korTitle: req.body.korTitle.coupang || "",
      mainImages: req.body.mainImages || [],
      content: req.body.content || [],
      prop: req.body.prop || null,
      options: req.body.options.coupang || [],
      isClothes: req.body.isClothes === "Y" ? true : false,
      isShoes: req.body.isShoes === "Y" ? true : false,
    });

    const basic = {
      url: req.body.url,
      naverID: req.body.naverID,
      brand: objItem.brand,
      manufacture: objItem.manufacture,
      good_id: objItem.good_id,
      title: objItem.title,
      korTitle: objItem.korTitle,
      price: objItem.price,
      salePrice: objItem.salePrice,
      mainImages: objItem.mainImages,
      content: objItem.content,
      options: objItem.options,
      categoryCode: objItem.categoryCode,
      attributes: objItem.attribute,
      noticeCategories: objItem.noticeCategories,
      requiredDocumentNames: objItem.requiredDocumentNames,
      certifications: objItem.certifications,
      afterServiceInformation: objItem.afterServiceInformation,
      afterServiceContactNumber: objItem.afterServiceContactNumber,
      topImage: objItem.topImage,
      bottomImage: objItem.bottomImage,
      vendorId: objItem.vendorId,
      vendorUserId: objItem.vendorUserId,
      shipping: objItem.shipping,
      returnCenter: objItem.returnCenter,
      invoiceDocument: objItem.invoiceDocument,
      maximumBuyForPerson: objItem.maximumBuyForPerson,
      maximumBuyForPersonPeriod: objItem.maximumBuyForPersonPeriod,
      keywords: [],
    };

    const product = {
      exchange: req.body.exchange || 0,
      weightPrice: objItem.options[0].weightPrice,
      profit: objItem.options[0].margin,
      good_id: objItem.good_id,
      korTitle: objItem.korTitle,
      korTitleObj: req.body.korTitle,
      mainImages: objItem.mainImages,
      price: objItem.price,
      salePrice: objItem.salePrice,
      topHtml: objItem.topImage,
      clothesHtml: objItem.clothesHtml,
      isClothes: req.body.isClothes === "Y" ? true : false,
      shoesHtml: objItem.shoesHtml,
      isShoes: req.body.isShoes === "Y" ? true : false,
      optionHtml: objItem.optionHtml,
      html: objItem.detailHtml,
      bottomHtml: objItem.bottomImage,
      keyword: req.body.search_word || [],
      brand: objItem.brand,
      manufacture: objItem.manufacture,
      outboundShippingTimeDay: objItem.shipping.outboundShippingTimeDay,
      // deliveryChargeType: objItem.shipping.deliveryChargeType,
      deliveryChargeType:
        req.body.delivery.coupang && req.body.delivery > 0
          ? "NOT_FREE"
          : "FREE",
      // deli_pri_cupang && deli_pri_cupang > 0 ? "NOT_FREE" : "FREE",
      // deliveryCharge: objItem.shipping.deliveryCharge,
      deliveryCharge: req.body.delivery.coupang,
      deliveryChargeOnReturn: objItem.returnCenter.deliveryChargeOnReturn,
      weightPrice: objItem.options[0].weightPrice || 0,
      korTitleArray: req.body.korTitle.coupang,
      deliveryFee: req.body.delivery,
      pageTitle:
        req.body.page_title && req.body.page_title.length > 0
          ? req.body.page_title
          : objItem.korTitle,
    };
    const prop = objItem.prop;
    const options = objItem.options.map((item) => {
      return {
        ...item,
        active: true,
        disabled: false,
      };
    });

    const coupangProduct = {
      exchange: req.body.exchange || 0,
      weightPrice: coupangObjItem.options[0].weightPrice,
      profit: coupangObjItem.options[0].margin,
      good_id: coupangObjItem.good_id,
      korTitle: coupangObjItem.korTitle,
      mainImages: coupangObjItem.mainImages,
      price: coupangObjItem.price,
      salePrice: coupangObjItem.salePrice,
      topHtml: coupangObjItem.topImage,
      clothesHtml: coupangObjItem.clothesHtml,
      isClothes: req.body.isClothes === "Y" ? true : false,
      shoesHtml: coupangObjItem.shoesHtml,
      isShoes: req.body.isShoes === "Y" ? true : false,
      optionHtml: coupangObjItem.optionHtml,
      html: coupangObjItem.detailHtml,
      bottomHtml: coupangObjItem.bottomImage,
      keyword: req.body.search_word || [],
      brand: coupangObjItem.brand,
      manufacture: coupangObjItem.manufacture,
      outboundShippingTimeDay: coupangObjItem.shipping.outboundShippingTimeDay,
      // deliveryChargeType: objItem.shipping.deliveryChargeType,
      deliveryChargeType:
        req.body.delivery.coupang && req.body.delivery > 0
          ? "NOT_FREE"
          : "FREE",
      // deli_pri_cupang && deli_pri_cupang > 0 ? "NOT_FREE" : "FREE",
      // deliveryCharge: objItem.shipping.deliveryCharge,
      deliveryCharge: req.body.delivery.coupang,
      deliveryChargeOnReturn:
        coupangObjItem.returnCenter.deliveryChargeOnReturn,
      weightPrice: coupangObjItem.options[0].weightPrice || 0,
      korTitleArray: req.body.korTitle.coupang,
      deliveryFee: req.body.delivery,
    };

    const coupangOptions = coupangObjItem.options.map((item) => {
      return {
        ...item,
        active: true,
        disabled: false,
      };
    });

    const coupang = {
      displayCategoryCode: objItem.categoryCode,
      displayCategoryName: "",
      vendorId: objItem.vendorId,
      deliveryCompanyCode: objItem.shipping.deliveryCompanyCode,
      returnCenterCode: objItem.returnCenter.returnCenterCode,
      returnChargeName: objItem.returnCenter.shippingPlaceName,
      companyContactNumber:
        objItem.returnCenter.placeAddresses[0].companyContactNumber,
      returnZipCode: objItem.returnCenter.placeAddresses[0].returnZipCode, // 반품지우편번호
      returnAddress: objItem.returnCenter.placeAddresses[0].returnAddress, // 반품지주소
      returnAddressDetail:
        objItem.returnCenter.placeAddresses[0].returnAddressDetail,
      returnCharge: objItem.returnCenter.returnCharge,
      afterServiceInformation: objItem.afterServiceInformation,
      afterServiceContactNumber: objItem.afterServiceContactNumber,
      outboundShippingPlaceCode: objItem.shipping.outboundShippingPlaceCode,
      vendorUserId: objItem.vendorUserId,
      invoiceDocument: objItem.invoiceDocument,
      maximumBuyForPerson: objItem.maximumBuyForPerson,
      maximumBuyForPersonPeriod: objItem.maximumBuyForPersonPeriod,
      notices: objItem.noticeCategories,
      attributes: objItem.attributes,
    };

    const sk11stObjItem = await getProductData({
      userID: user,
      url: req.body.url,
      brand: req.body.brand,
      title: req.body.title || "",
      korTitle: req.body.korTitle.sk11st || "",
      mainImages: req.body.mainImages || [],
      content: req.body.content || [],
      prop: req.body.prop || null,
      options: req.body.options.sk11st || [],
      isClothes: req.body.isClothes === "Y" ? true : false,
      isShoes: req.body.isShoes === "Y" ? true : false,
    });

    const sk11stProduct = {
      exchange: req.body.exchange || 0,
      weightPrice: sk11stObjItem.options[0].weightPrice,
      profit: sk11stObjItem.options[0].margin,
      good_id: sk11stObjItem.good_id,
      korTitle: sk11stObjItem.korTitle,
      mainImages: sk11stObjItem.mainImages,
      price: sk11stObjItem.price,
      salePrice: sk11stObjItem.salePrice,
      topHtml: sk11stObjItem.topImage,
      clothesHtml: sk11stObjItem.clothesHtml,
      isClothes: req.body.isClothes === "Y" ? true : false,
      shoesHtml: sk11stObjItem.shoesHtml,
      isShoes: req.body.isShoes === "Y" ? true : false,
      optionHtml: sk11stObjItem.optionHtml,
      html: sk11stObjItem.detailHtml,
      bottomHtml: sk11stObjItem.bottomImage,
      keyword: req.body.search_word || [],
      brand: sk11stObjItem.brand,
      manufacture: sk11stObjItem.manufacture,
      outboundShippingTimeDay: sk11stObjItem.shipping.outboundShippingTimeDay,
      // deliveryChargeType: objItem.shipping.deliveryChargeType,
      deliveryChargeType:
        req.body.delivery.coupang && req.body.delivery > 0
          ? "NOT_FREE"
          : "FREE",
      // deli_pri_cupang && deli_pri_cupang > 0 ? "NOT_FREE" : "FREE",
      // deliveryCharge: objItem.shipping.deliveryCharge,
      deliveryCharge: req.body.delivery.coupang,
      deliveryChargeOnReturn: sk11stObjItem.returnCenter.deliveryChargeOnReturn,
      weightPrice: sk11stObjItem.options[0].weightPrice || 0,
      korTitleArray: req.body.korTitle.coupang,
      deliveryFee: req.body.delivery,
    };

    const sk11stOptions = sk11stObjItem.options.map((item) => {
      return {
        ...item,
        active: true,
        disabled: false,
      };
    });

    const emsplusObjItem = await getProductData({
      userID: user,
      url: req.body.url,
      brand: req.body.brand,
      title: req.body.title || "",
      korTitle: req.body.korTitle.emsplus[0] || "",
      mainImages: req.body.mainImages || [],
      content: req.body.content || [],
      prop: req.body.prop || null,
      options: req.body.options.emsplus || [],
      isClothes: req.body.isClothes === "Y" ? true : false,
      isShoes: req.body.isShoes === "Y" ? true : false,
    });

    const emsplusProduct = {
      exchange: req.body.exchange || 0,
      weightPrice: emsplusObjItem.options[0].weightPrice,
      profit: emsplusObjItem.options[0].margin,
      good_id: emsplusObjItem.good_id,
      korTitle: emsplusObjItem.korTitle,
      mainImages: emsplusObjItem.mainImages,
      price: emsplusObjItem.price,
      salePrice: emsplusObjItem.salePrice,
      topHtml: emsplusObjItem.topImage,
      clothesHtml: emsplusObjItem.clothesHtml,
      isClothes: req.body.isClothes === "Y" ? true : false,
      shoesHtml: emsplusObjItem.shoesHtml,
      isShoes: req.body.isShoes === "Y" ? true : false,
      optionHtml: emsplusObjItem.optionHtml,
      html: emsplusObjItem.detailHtml,
      bottomHtml: emsplusObjItem.bottomImage,
      keyword: req.body.search_word || [],
      brand: emsplusObjItem.brand,
      manufacture: emsplusObjItem.manufacture,
      outboundShippingTimeDay: emsplusObjItem.shipping.outboundShippingTimeDay,
      // deliveryChargeType: objItem.shipping.deliveryChargeType,
      deliveryChargeType:
        req.body.delivery.coupang && req.body.delivery > 0
          ? "NOT_FREE"
          : "FREE",
      // deli_pri_cupang && deli_pri_cupang > 0 ? "NOT_FREE" : "FREE",
      // deliveryCharge: objItem.shipping.deliveryCharge,
      deliveryCharge: req.body.delivery.coupang,
      deliveryChargeOnReturn:
        emsplusObjItem.returnCenter.deliveryChargeOnReturn,
      weightPrice: emsplusObjItem.options[0].weightPrice || 0,
      korTitleArray: req.body.korTitle.coupang,
      deliveryFee: req.body.delivery,
    };

    const emsplusOptions = emsplusObjItem.options.map((item) => {
      return {
        ...item,
        active: true,
        disabled: false,
      };
    });

    const tempProduct = await Product.create({
      userID: user,
      writerID,
      isDelete: false,
      basic: objItem,
      product,
      prop: objItem.prop ? objItem.prop : [],
      options: objItem.options,
      coupang,
      initCreatedAt: moment().toDate(),
      optionsObj: req.body.options,
    });

    let responseCoupang = null;
    let responseNaver = null;
    let response11st = null;
    let responseCafe24 = null;

    const promiseArray = [
      new Promise(async (resolve, reject) => {
        try {
          responseCoupang = await updateCoupang({
            id: tempProduct._id,
            basic,
            product: coupangProduct,
            prop,
            options: coupangOptions,
            coupang,
            userID: user,
            writerID,
            deli_pri_cupang: req.body.delivery.coupang,
          });

          resolve();
        } catch (e) {
          reject(e);
        }
      }),
      new Promise(async (resolve, reject) => {
        try {
          responseNaver = await updateNaver({
            id: tempProduct._id,
            basic,
            product,
            prop,
            options,
            userID: user,
            deli_pri_naver: req.body.delivery.naver,
            attribute:
              req.body.attribute && Array.isArray(req.body.attribute)
                ? req.body.attribute
                : [],
            tag:
              req.body.tag && Array.isArray(req.body.tag) ? req.body.tag : [],
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      }),
      new Promise(async (resolve, reject) => {
        try {
          response11st = await update11st({
            id: tempProduct._id,
            basic,
            product: sk11stProduct,
            prop,
            options: sk11stOptions,
            userID: user,
            deli_pri_11st: req.body.delivery.sk11st,
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      }),
      new Promise(async (resolve, reject) => {
        try {
          responseCafe24 = await updateCafe24({
            id: tempProduct._id,
            product: emsplusProduct,
            prop,
            options: emsplusOptions,
            korTitleArray: req.body.korTitle.emsplus,
            userID: user,
            writerID,
            deli_pri_emsplus: req.body.delivery.emsplus,
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      }),
    ];

    await Promise.all(promiseArray);

    await Product.findOneAndUpdate(
      {
        _id: ObjectId(tempProduct._id),
      },
      {
        $set: {
          "product.coupang": responseCoupang,
          "product.naver": responseNaver,
          "product.sk11st": response11st,
        },
      }
    );

    console.log({
      coupang: responseCoupang,
      naver: responseNaver,
      sk11st: response11st,
      cafe24: responseCafe24,
    });
    res.json({
      coupang: responseCoupang,
      naver: responseNaver,
      sk11st: response11st,
      cafe24: responseCafe24,
    });
  } catch (e) {
    console.log(e);
    res.json({ code: "ERROR", message: e.message });
  }
});

app.post("/seller/get11stProduct", async (req, res) => {
  try {
    const { id, basic, product, options, prop, userID, deli_pri_11st } =
      req.body;
    const response = await get11stProduct({
      id,
      basic,
      product,
      options,
      prop,
      userID,
      deli_pri_11st,
    });
    res.json(response);
  } catch (e) {
    return null;
  }
});

app.post("/seller/create11stProdct", async (req, res) => {
  try {
    if (!req.body.productBody || !req.body.userID) {
      res.json(null);
      return null;
    }
    const { userID, productBody } = req.body;
    const response = await skCreateProduct({
      userID,
      productBody,
    });
    res.json(response);
  } catch (e) {
    return null;
  }
});

app.post("/seller/update11stProdct", async (req, res) => {
  try {
    if (!req.body.productBody || !req.body.userID || !req.body.productNo) {
      res.json(null);
      return null;
    }
    const { userID, productBody, productNo } = req.body;
    const response = await skModifyProduct({
      userID,
      productBody,
      prdNo: productNo,
    });
    res.json(response);
  } catch (e) {
    return null;
  }
});

app.post("/seller/update11stDesc", async (req, res) => {
  try {
    if (!req.body.content || !req.body.userID || !req.body.productNo) {
      res.json(null);
      return null;
    }
    const { userID, content, productNo } = req.body;
    const response = await skModifyProduct({
      userID,
      content,
      prdNo: productNo,
    });
    res.json(response);
  } catch (e) {
    return null;
  }
});

app.post("/seller/update11stSalePrice", async (req, res) => {
  try {
    if (!req.body.saleBody || !req.body.userID || !req.body.productNo) {
      res.json(null);
      return null;
    }
    const { userID, saleBody, productNo } = req.body;
    const response = await skModifySalePrice({
      userID,
      saleBody,
      prdNo: productNo,
    });
    res.json(response);
  } catch (e) {
    return null;
  }
});

app.post("/seller/update11stOption", async (req, res) => {
  try {
    if (!req.body.option || !req.body.userID || !req.body.productNo) {
      res.json(null);
      return null;
    }
    const { userID, option, productNo } = req.body;
    const response = await skModifyOption({
      userID,
      option,
      prdNo: productNo,
    });
    res.json(response);
  } catch (e) {
    return null;
  }
});
