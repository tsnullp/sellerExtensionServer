const express = require("express");
const http = require("https");
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
const updateCafe24 = require("./puppeteer/updateCafe24");
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
    console.log("detailUrl, use", detailUrl, user);
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
      detailUrl.includes("aliexpress.com")
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
              items[0].includes("vvic.com")
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

    const tempArr = await TempProduct.aggregate([
      {
        $match: {
          userID: ObjectId(userInfo._id),
          good_id: { $in: asinArr },
        },
      },
    ]);

    const productArr = [];
    for (const item of products) {
      let isRegister = false;
      for (const rItem of registerProducts) {
        if (
          rItem.options.filter((fItem) => fItem.key === item.asin).length > 0
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
    }
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
              item.detailUrl.includes("vvic.com")
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
                  console.log("item.detailUrl", item.detailUrl);
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

// IherbPriceSync()

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
  console.log("req.query", req.query);
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
  console.log("req.body", req.body);
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
      !req.body.options ||
      !Array.isArray(req.body.options) ||
      req.body.options.length === 0
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

    const objItem = await getData({
      userID: user,
      url: req.body.url,
      brand: req.body.brand,
      title: req.body.title || "",
      korTitle: req.body.korTitle || "",
      mainImages: req.body.mainImages || [],
      content: req.body.content || [],
      prop: req.body.prop || null,
      options: req.body.options || [],
      isClothes: req.body.isClothes === "Y" ? true : false,
      isShoes: req.body.isShoes === "Y" ? true : false,
    });

    const returnMessage = await updateCoupang({
      basic: {
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
      },
      product: {
        exchange: req.body.exchange || 0,
        weihtPrice: objItem.options[0].weihtPrice,
        profit: objItem.options[0].margin,
        good_id: objItem.good_id,
        korTitle: objItem.korTitle,
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
        keyword: req.body.keywords || [],
        brand: objItem.brand,
        manufacture: objItem.manufacture,
        outboundShippingTimeDay: objItem.shipping.outboundShippingTimeDay,
        deliveryChargeType: objItem.shipping.deliveryChargeType,
        deliveryCharge: objItem.shipping.deliveryCharge,
        deliveryChargeOnReturn: objItem.returnCenter.deliveryChargeOnReturn,
        weightPrice: objItem.options[0].weightPrice || 0,
      },
      prop: objItem.prop,
      options: objItem.options,
      coupang: {
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
      },
      userID: user,
      writerID,
    });
    console.log("returnMessage", returnMessage);
    res.json(returnMessage.coupang);
  } catch (e) {
    console.log(e);
    res.json({ code: "ERROR", message: e.message });
  }
});

const getAlphabet = (index) => {
  const alphabet = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
  ];
  const letter = alphabet[index % 25];
  let number = "";
  if (Math.floor(index / 25) > 0) {
    number = Math.floor(index / 25);
  }
  return `${letter}${number}`;
};

const getData = async ({
  userID,
  url,
  brand,
  title,
  korTitle,
  mainImages,
  content,
  prop,
  options,
  isClothes,
  isShoes,
}) => {
  const ObjItem = {
    brand: "기타",
    good_id: "",
    title: "",
    mainImages: [],
    price: 0,
    salePrice: 0,
    content: [],
    prop,
    options: [],
    attribute: [],
    shipping: {},
    returnCenter: {},
    vendorId: "",
    vendorUserId: "",
    invoiceDocument: "",
    maximumBuyForPerson: "",
    maximumBuyForPersonPeriod: "",
    cafe24_mallID: "",
    cafe24_shop_no: "",
  };
  try {
    // await page.setJavaScriptEnabled(true)

    let duplication = false;
    let optionValueArray = [];

    let tempOptions = options;
    for (const item of tempOptions) {
      if (optionValueArray.includes(item.korValue)) {
        duplication = true;
      }
      optionValueArray.push(item.korValue);

      if (item.korValue.length > 25) {
        duplication = true;
      }

      if (
        item.attributes.filter(
          (attrItem) => attrItem.attributeValueName.length > 30
        ).length > 0
      ) {
        duplication = true;
      }
    }

    if (duplication) {
      tempOptions = tempOptions.map((item, index) => {
        delete item.attributes;
        return {
          ...item,
          korKey: `${getAlphabet(index)}옵션`,
        };
      });
    }

    const promiseArr = [
      new Promise(async (resolve, reject) => {
        try {
          ObjItem.good_id = getGoodid(url);
          if (brand) {
            ObjItem.brand = brand;
          }
          ObjItem.title = title;
          ObjItem.price =
            Array.isArray(tempOptions) && options.length > 0
              ? tempOptions[0].price
              : 0;
          ObjItem.mainImages = mainImages;
          ObjItem.content = content;
          ObjItem.options = tempOptions;
          ObjItem.salePrice = tempOptions[0] ? tempOptions[0].price : 0;
          ObjItem.brand = brand;
          ObjItem.manufacture = ObjItem.brand;
          ObjItem.title = title;
          ObjItem.korTitle = korTitle;

          const {
            categoryCode,
            attributes,
            noticeCategories,
            requiredDocumentNames,
            certifications,
          } = await getCategoryInfo({ userID, korTitle: ObjItem.korTitle });

          ObjItem.categoryCode = categoryCode;
          ObjItem.attributes = attributes;
          ObjItem.noticeCategories = noticeCategories;
          ObjItem.requiredDocumentNames = requiredDocumentNames;
          ObjItem.certifications = certifications;

          resolve();
        } catch (e) {
          reject(e);
        }
      }),

      new Promise(async (resolve, reject) => {
        try {
          const {
            shipping,
            returnCenter,
            vendorId,
            vendorUserId,
            invoiceDocument,
            maximumBuyForPerson,
            maximumBuyForPersonPeriod,
            cafe24_mallID,
            cafe24_shop_no,
          } = await getShippingInfo({ userID });
          ObjItem.shipping = shipping;
          ObjItem.returnCenter = returnCenter;
          ObjItem.vendorId = vendorId;
          ObjItem.vendorUserId = vendorUserId;
          ObjItem.invoiceDocument = invoiceDocument;
          ObjItem.maximumBuyForPerson = maximumBuyForPerson;
          ObjItem.maximumBuyForPersonPeriod = maximumBuyForPersonPeriod;
          ObjItem.cafe24_mallID = cafe24_mallID;
          ObjItem.cafe24_shop_no = cafe24_shop_no;
          resolve();
        } catch (e) {
          reject(e);
        }
      }),
      new Promise(async (resolve, reject) => {
        try {
          const {
            afterServiceInformation,
            afterServiceContactNumber,
            topImage,
            bottomImage,
            clothImage,
            shoesImage,
            optionHtml,
            detailHtml,
          } = await getBasicItem({
            userID,
            options: tempOptions,
            prop,
            content,
            duplication,
          });
          ObjItem.afterServiceInformation = afterServiceInformation;
          ObjItem.afterServiceContactNumber = afterServiceContactNumber;
          ObjItem.topImage = topImage;
          ObjItem.bottomImage = bottomImage;
          ObjItem.clothesHtml = isClothes ? clothImage : null;
          ObjItem.shoesHtml = isShoes ? shoesImage : null;
          ObjItem.optionHtml = optionHtml;
          ObjItem.detailHtml = detailHtml;
          resolve();
        } catch (e) {
          reject();
        }
      }),
    ];

    await Promise.all(promiseArr);
    // console.log("ObjItem", ObjItem.options)
  } catch (e) {
    console.log("taobaoDetailNew", e);
    return null;
  } finally {
    return ObjItem;
  }
};

const getGoodid = (url) => {
  let id = 0;
  url = url.split("&");
  if (url.length) {
    for (let i = 0, len = url.length; i < len; i++) {
      if (checkStr(url[i], "id=", true)) {
        let idt = url[i].split("=");
        id = idt[1];
        return id;
      }
    }
  }
  return id;
};
const getShippingInfo = async ({ userID }) => {
  const objItem = {
    shipping: {},
    returnCenter: {},
    vendorId: "",
    vendorUserId: "",
    invoiceDocument: "",
    maximumBuyForPerson: "",
    maximumBuyForPersonPeriod: "",
    cafe24_mallID: "",
    cafe24_shop_no: "",
  };
  if (!userID) {
    return objItem;
  }
  try {
    const outbound = await Outbound({ userID });

    if (outbound && outbound.content.length > 0) {
      const temp = outbound.content.filter((item) => item.usable === true);
      if (temp.length > 0) {
        objItem.shipping.outboundShippingPlaceCode =
          temp[0].outboundShippingPlaceCode;
        objItem.shipping.shippingPlaceName = temp[0].shippingPlaceName;
        objItem.shipping.placeAddresses = temp[0].placeAddresses;
        objItem.shipping.remoteInfos = temp[0].remoteInfos;
      }
    }
    const returnShippingCenter = await ReturnShippingCenter({ userID });

    if (returnShippingCenter && returnShippingCenter.data.content.length > 0) {
      const temp = returnShippingCenter.data.content.filter(
        (item) => item.usable === true
      );

      if (temp.length > 0) {
        objItem.returnCenter.returnCenterCode = temp[0].returnCenterCode;
        objItem.returnCenter.shippingPlaceName = temp[0].shippingPlaceName;
        objItem.returnCenter.deliverCode = temp[0].deliverCode;
        objItem.returnCenter.deliverName = temp[0].deliverName;
        objItem.returnCenter.placeAddresses = temp[0].placeAddresses;
      }
    }

    const market = await Market.findOne({
      userID,
    });

    if (market) {
      objItem.vendorId = market.coupang.vendorId;
      objItem.vendorUserId = market.coupang.vendorUserId;
      objItem.shipping.deliveryCompanyCode = market.coupang.deliveryCompanyCode;
      objItem.shipping.deliveryChargeType = market.coupang.deliveryChargeType;
      objItem.shipping.deliveryCharge = market.coupang.deliveryCharge || 0;
      objItem.returnCenter.deliveryChargeOnReturn =
        market.coupang.deliveryChargeOnReturn || 0;
      objItem.returnCenter.returnCharge = market.coupang.returnCharge || 0;
      objItem.shipping.outboundShippingTimeDay =
        market.coupang.outboundShippingTimeDay || 0;
      objItem.invoiceDocument = market.coupang.invoiceDocument;
      objItem.maximumBuyForPerson = market.coupang.maximumBuyForPerson;
      objItem.maximumBuyForPersonPeriod =
        market.coupang.maximumBuyForPersonPeriod;
      objItem.cafe24_mallID = market.cafe24.mallID;
      objItem.cafe24_shop_no = market.cafe24.shop_no;
    }
  } catch (e) {
    console.log("getShippingInfo", e);
  } finally {
    return objItem;
  }
};

const getCategoryInfo = async ({ userID, korTitle }) => {
  const objItem = {
    categoryCode: "",
    attributes: [],
    noticeCategories: [],
    requiredDocumentNames: "",
    certifications: "",
  };
  try {
    const recommendedResponse = await CategoryPredict({
      userID,
      productName: korTitle,
    });

    objItem.categoryCode = recommendedResponse.data.predictedCategoryId;

    const metaResponse = await CategoryMeta({
      userID,
      categoryCode: recommendedResponse.data.predictedCategoryId,
    });

    if (metaResponse && metaResponse.data && metaResponse.data.attributes) {
      objItem.attributes = metaResponse.data.attributes.map((item) => {
        return {
          ...item,
          attributeValueName: `상세페이지 참조`,
        };
      });

      objItem.noticeCategories = metaResponse.data.noticeCategories.map(
        (item) => {
          const noticeCategoryDetailNames = item.noticeCategoryDetailNames
            .filter((item) => item.required === "MANDATORY")
            .map((item) => {
              return {
                ...item,
                content: "상세페이지 참조",
              };
            });
          return {
            ...item,
            noticeCategoryDetailNames,
          };
        }
      );
      objItem.requiredDocumentNames = metaResponse.data.requiredDocumentNames;
      objItem.certifications = metaResponse.data.certifications;
    } else {
      objItem.attributes = [];
      objItem.noticeCategories = [];
      objItem.requiredDocumentNames = [];
      objItem.certifications = [];
    }

    // console.log("------", metaResponse.data.noticeCategories[0].noticeCategoryDetailNames)
  } catch (e) {
    console.log("getCategoryInfo", e);
  } finally {
    return objItem;
  }
};

const getBasicItem = async ({
  userID,
  prop,
  options,
  content,
  duplication,
}) => {
  const objItem = {
    afterServiceInformation: "",
    afterServiceContactNumber: "",
    topImage: "",
    bottomImage: "",
  };
  try {
    const basic = await Basic.findOne({
      userID,
    });

    if (basic) {
      objItem.afterServiceInformation = basic.afterServiceInformation;
      objItem.afterServiceContactNumber = basic.afterServiceContactNumber;
      objItem.topImage = basic.topImage;
      objItem.bottomImage = basic.bottomImage;
      objItem.clothImage = basic.clothImage;
      objItem.shoesImage = basic.shoesImage;

      let optionHtml = ``;

      if (!duplication) {
        if (prop) {
          for (const item of prop) {
            for (const value of item.values) {
              if (value.image) {
                optionHtml += `
                <p style="text-align: center;" >
                <div style="text-align: center; font-size: 20px; font-weight: 700; color: white; background: #0090FF; padding: 10px; border-radius: 15px;">
                ${value.korValueName}
                </div>
                <img src="${value.image}" style="width: 100%; max-width: 800px; display: block; margin: 0 auto; " />
                <p style="text-align: center;" >
                <br />
                </p>
                `;
              }
            }
          }
        } else {
          for (const item of options) {
            if (item.image) {
              optionHtml += `
          <p style="text-align: center;" >
          <div style="text-align: center; font-size: 20px; font-weight: 700; color: white; background: #0090FF !important; padding: 10px; border-radius: 15px;">
          ${item.korKey ? `${item.korKey}: ${item.korValue}` : item.korValue}
          </div>
          <img src="${
            item.image
          }_800x800.jpg" style="width: 100%; max-width: 800px; display: block; margin: 0 auto; " />
          <p style="text-align: center;" >
          <br />
          </p>
          `;
            }
          }
        }
      } else {
        for (const item of options) {
          item.attributes = null;
          optionHtml += `
          <p style="text-align: center;" >
          <div style="text-align: center; font-size: 20px; font-weight: 700; color: white; background: #0090FF !important; padding: 10px; border-radius: 15px;">
          ${item.korKey ? `${item.korKey}: ${item.korValue}` : item.korValue}
          </div>
          <img src="${
            item.image
          }" style="width: 100%; max-width: 800px; display: block; margin: 0 auto; " />
          <p style="text-align: center;" >
          <br />
          </p>
          `;
        }
      }

      let detailHtml = ``;
      if (Array.isArray(content)) {
        for (const item of content) {
          detailHtml += `<img src="${item}" style="width: 100%; max-width: 800px; display: block; margin: 0 auto; "/ />`;
        }
      }

      objItem.optionHtml = optionHtml;
      objItem.detailHtml = detailHtml;
    }
  } catch (e) {
    console.log("ERROR1", e);
  } finally {
    return objItem;
  }
};

const updateCoupang = async ({
  id,
  basic,
  product,
  prop,
  options,
  coupang,
  userID,
  writerID,
}) => {
  const returnMessage = {
    coupang: {
      code: null,
      message: null,
    },
  };

  try {
    let coupangProduct = null;
    let coupangProductResponse = null;
    let checkMainImage = [];
    let searchTags = [];

    const tempProduct = await Product.findOne({
      userID: ObjectId(userID),
      _id: ObjectId(id),
      isDelete: false,
    });

    if (tempProduct) {
      if (
        tempProduct.product &&
        tempProduct.product.coupang &&
        tempProduct.product.coupang.productID
      ) {
        product.coupang_productID = tempProduct.product.coupang.productID;
      }

      tempProduct.options.forEach((tItem, index) => {
        if (options[index]) {
          options[index].coupang = tItem.coupang;
          options[index].cafe24 = tItem.cafe24;
        }
      });

      product.coupang = tempProduct.product.coupang;
    }

    let tempCoupangResonse = null;
    if (product.coupang_productID) {
      tempCoupangResonse = await CoupnagGET_PRODUCT_BY_PRODUCT_ID({
        userID,
        productID: product.coupang_productID,
      });
    }

    if (
      tempCoupangResonse &&
      tempCoupangResonse.data &&
      Array.isArray(tempCoupangResonse.data.items)
    ) {
      tempCoupangResonse.data.items.forEach((item) => {
        for (const oItem of options) {
          if (
            oItem.korValue === item.itemName ||
            oItem.korKey === item.itemName
          ) {
            oItem.coupang.sellerProductItemId = `${item.sellerProductItemId}`;
            oItem.coupang.vendorItemId = `${item.vendorItemId}`;
            oItem.coupang.itemId = `${item.itemId}`;
          }
        }
      });
    }

    if (
      product.keyword &&
      Array.isArray(product.keyword) &&
      product.keyword.length > 0
    ) {
      searchTags = product.keyword
        .filter((item) => item.length > 0)
        .map((item) => regExp_test(item));
    } else {
      searchTags = [
        ...regExp_test(product.korTitle)
          .split(" ")
          .filter((item) => item.length > 0),
      ];
    }
    searchTags = searchTags
      .filter((item) => item.length > 0 && item.length < 20)
      .map((item) => regExp_test(item));

    const salePrice = options[0].salePrice;

    let minSalePrice = salePrice;
    options
      // .filter((item) => item.active && !item.disabled)
      .filter((i, index) => index < 100)
      .map((item) => {
        if (item.salePrice < minSalePrice) {
          minSalePrice = item.salePrice;
        }
      });

    let returnCharge = Math.floor((minSalePrice / 2) * 0.1) * 10;
    //coupang.displayCategoryCode
    if (getExceptCatetory(coupang.displayCategoryCode)) {
      // 카테고리 예외
      if (minSalePrice <= 60000) {
        if (returnCharge + returnCharge > 30000) {
          returnCharge = Math.floor((30000 / 2) * 0.1) * 10;
        }
      } else {
        if (returnCharge + returnCharge > 200000) {
          returnCharge = Math.floor((200000 / 2) * 0.1) * 10;
        }
      }
    } else {
      if (minSalePrice <= 20000) {
        if (returnCharge + returnCharge > 15000) {
          returnCharge = Math.floor((15000 / 2) * 0.1) * 10;
        }
      } else if (minSalePrice > 20000 && minSalePrice <= 40000) {
        if (returnCharge + returnCharge > 20000) {
          returnCharge = Math.floor((20000 / 2) * 0.1) * 10;
        }
      } else {
        if (returnCharge + returnCharge > 100000) {
          returnCharge = Math.floor((100000 / 2) * 0.1) * 10;
        }
      }
    }

    console.log("returnCharge", returnCharge);

    const htmlContent = `${product.topHtml}${
      product.isClothes && product.clothesHtml ? product.clothesHtml : ""
    }${product.isShoes && product.shoesHtml ? product.shoesHtml : ""}${
      product.optionHtml
    }${product.html}${product.bottomHtml}`;

    if (Array.isArray(product.mainImage)) {
      for (const item of product.mainImage) {
        try {
          const image = await imageCheck(item);

          if (image.width >= 500 && image.height >= 500) {
            checkMainImage.push(item);
          }
        } catch (e) {
          // checkMainImage.push(item)
          console.log("checkImage", e.message);
        }
      }
    }

    if (product.coupang_productID) {
      for (const item of options) {
        try {
          if (item.active && !item.disabled) {
            // 판매 중지 처리 한다
            const response = await CoupnagSTOP_PRODUCT_SALES_BY_ITEM({
              userID,
              vendorItemId: item.coupang.vendorItemId,
            });
            console.log("판매 중지 아이템 결과", response);
          }
        } catch (e) {
          console.log("판매 중지 처리 ", e.message);
        }
      }

      // 수정

      coupangProduct = {
        // ...coupang,
        sellerProductId: product.coupang_productID,
        displayCategoryCode: coupang.displayCategoryCode,
        sellerProductName: product.korTitle, // 등록상품명
        vendorId: coupang.vendorId,
        saleStartedAt: `${moment().format("yyyy-MM-DD")}T${moment().format(
          "hh:mm:ss"
        )}`, // 판매시작일시
        saleEndedAt: "2099-12-31T12:00:00", // 판매종료일시
        displayProductName: product.korTitle, // 등록상품명
        brand: product.brand, // 브랜드
        manufacture: product.manufacture, // 제조사
        deliveryMethod: "AGENT_BUY", // 배송방법
        deliveryCompanyCode: coupang.deliveryCompanyCode,
        deliveryChargeType: product.deliveryChargeType,
        deliveryCharge: product.deliveryCharge,
        freeShipOverAmount: 0, // 무료배송을 위한 조건 금액
        // deliveryChargeOnReturn: product.deliveryChargeOnReturn,
        deliveryChargeOnReturn:
          product.deliveryChargeOnReturn > minSalePrice / 2
            ? Math.floor((minSalePrice / 2) * 0.1) * 10
            : product.deliveryChargeOnReturn,
        remoteAreaDeliverable: "Y", // 도서산간 배송여부
        unionDeliveryType: "NOT_UNION_DELIVERY", // 묶음 배송여부
        returnCenterCode: coupang.returnCenterCode,
        returnChargeName: coupang.returnChargeName,
        companyContactNumber: coupang.companyContactNumber,
        returnZipCode: coupang.returnZipCode,
        returnAddress: coupang.returnAddress,
        returnAddressDetail: coupang.returnAddressDetail,
        returnCharge: returnCharge,
        // returnCharge:
        //   coupang.returnCharge > minSalePrice / 2
        //     ? Math.floor((minSalePrice / 2) * 0.1) * 10
        //     : coupang.returnCharge,
        afterServiceInformation: coupang.afterServiceInformation,
        afterServiceContactNumber: coupang.afterServiceContactNumber,
        outboundShippingPlaceCode: coupang.outboundShippingPlaceCode,
        vendorUserId: coupang.vendorUserId,
        requested: false, // 자동승인요청여부
        requiredDocuments: [
          {
            templateName: "인보이스영수증(해외구매대행 선택시)",
            // templateName: "MANDATORY_OVERSEAS_PURCH",
            vendorDocumentPath: coupang.invoiceDocument, // 구비서류벤더경로
          },
        ],
        items: options
          // .filter(item => item.active && !item.disabled)
          .map((item) => {
            return {
              sellerProductItemId: item.coupang_sellerProductItemId
                ? item.coupang_sellerProductItemId
                : item.coupang.sellerProductItemId,
              vendorItemId: item.coupang_vendorItemId
                ? item.coupang_vendorItemId
                : item.coupang.vendorItemId,
              itemName: item.korKey ? item.korKey : item.korValue, //업체상품옵션명
              originalPrice: item.productPrice, //할인율기준가 (정가표시)
              salePrice: item.salePrice, //판매가격
              maximumBuyCount: item.stock, //판매가능수량
              maximumBuyForPerson: coupang.maximumBuyForPerson, // 인당 최대 구매 수량
              maximumBuyForPersonPeriod: coupang.maximumBuyForPersonPeriod, // 최대 구매 수량 기간
              outboundShippingTimeDay: product.outboundShippingTimeDay, //기준출고일(일)
              unitCount: 0, // 단위수량
              adultOnly: "EVERYONE", // 19세이상
              taxType: "TAX", // 과세여부
              parallelImported: "NOT_PARALLEL_IMPORTED", // 병행수입여부
              overseasPurchased: "OVERSEAS_PURCHASED", // 해외구매대행여부
              pccNeeded: true, // PCC(개인통관부호) 필수/비필수 여부
              externalVendorSku: item.key, // 판매자상품코드 (업체상품코드)
              barcode: "",
              emptyBarcode: true,
              emptyBarcodeReason: "상품확인불가_구매대행상품",
              // modelNo: product.good_id,
              certifications: Array.isArray(coupang.certifications)
                ? coupang.certifications
                    .filter((item) => item.required === "required")
                    .map((item) => {
                      return {
                        certifications: item.certificationType,
                        certificationCode: "",
                      };
                    })
                : [],

              searchTags,
              images: (() => {
                let itemImage = item.image;
                if (itemImage.includes("//img.alicdn.com/")) {
                  itemImage = `${item.image}_500x500.jpg`;
                }
                const representation = {
                  imageOrder: 0,
                  imageType: "REPRESENTATION",
                  vendorPath: itemImage,
                };
                const detail = checkMainImage.map((item, index) => {
                  return {
                    imageOrder: index + 1,
                    imageType: "DETAIL",
                    vendorPath: itemImage,
                  };
                });
                return [representation, ...detail];
              })(),
              notices: coupang.notices,
              attributes: item.attributes
                ? item.attributes.map((attr, index) => {
                    if (attr.attributeValueName === "상세페이지 참조") {
                      if (index === 0) {
                        return {
                          attributeTypeName: attr.attributeTypeName,
                          attributeValueName: item.korKey
                            ? item.korKey
                            : item.korValue,
                        };
                      } else {
                        return {
                          attributeTypeName: attr.attributeTypeName,
                          attributeValueName: attr.attributeValueName,
                        };
                      }
                    } else {
                      return attr;
                    }
                  })
                : coupang.attributes.map((attr, index) => {
                    if (index === 0) {
                      return {
                        attributeTypeName: attr.attributeTypeName,
                        attributeValueName: item.korKey
                          ? item.korKey
                          : item.korValue,
                      };
                    } else {
                      return {
                        attributeTypeName: attr.attributeTypeName,
                        attributeValueName: attr.attributeValueName,
                      };
                    }
                  }),
              contents: [
                {
                  contentsType: "HTML",
                  contentDetails: [
                    {
                      content: htmlContent,
                      detailType: "TEXT",
                    },
                  ],
                },
              ],
              // requiredDocuments: [
              //   {
              //     templateName: "인보이스영수증(해외구매대행 선택시)",
              //     vendorDocumentPath: coupang.invoiceDocument
              //   }
              // ],
              offerCondition: "NEW", // 상품상태
              manufacture: product.manufacture, // 제조사
            };
          }),
      };
      console.log("==============================================");
      for (const item of coupangProduct.items) {
        console.log("attributes", item.attributes);
      }
      console.log("==============================================");
      if (
        coupangProduct.items.filter((item) => {
          if (
            item.vendorItemId &&
            item.vendorItemId !== null &&
            item.vendorItemId !== "null"
          ) {
            return true;
          }
          return false;
        }).length === 0
      ) {
        return {
          coupang: {
            code: "ERROR",
            message: `상품 수정 오류 - 아직 등록처리가 안된 상품입니다. 등록처리 완료 후 다시 시도해 주세요`,
          },
        };
      }

      try {
        coupangProductResponse = await CoupnagUpdateProduct({
          userID,
          product: coupangProduct,
        });
      } catch (e) {
        console.log("e-----", e);
      }

      if (!product.coupang) {
        product.coupang = {};
      }

      if (coupangProduct.sellerProductId) {
        const CoupangResonse = await CoupnagGET_PRODUCT_BY_PRODUCT_ID({
          userID,
          productID: coupangProduct.sellerProductId,
        });

        if (
          CoupangResonse &&
          CoupangResonse.data &&
          Array.isArray(CoupangResonse.data.items)
        ) {
          CoupangResonse.data.items.forEach((item) => {
            for (const oItem of options) {
              if (
                oItem.korValue === item.itemName ||
                oItem.korKey === item.itemName
              ) {
                oItem.coupang.sellerProductItemId = `${item.sellerProductItemId}`;
                oItem.coupang.vendorItemId = `${item.vendorItemId}`;
                oItem.coupang.itemId = `${item.itemId}`;
              }
            }
          });
        }
      }

      for (const item of options.filter(
        (item) => item.active && !item.disabled
      )) {
        try {
          if (
            item.coupang_vendorItemId !== "null" &&
            item.coupang_vendorItemId !== null &&
            item.coupang_vendorItemId
          ) {
            const response = await CoupnagUPDATE_PRODUCT_PRICE_BY_ITEM({
              userID,
              vendorItemId: item.coupang_vendorItemId,
              price: item.salePrice,
            });

            console.log(" ** 가격 ** ", response);
          }
        } catch (e) {}
      }
      console.log(" *** 쿠팡 옵션 가격 업데이트 완료 *** ");

      for (const item of options.filter(
        (item) => item.active && !item.disabled
      )) {
        try {
          if (
            item.coupang_vendorItemId !== "null" &&
            item.coupang_vendorItemId !== null &&
            item.coupang_vendorItemId
          ) {
            const response = await CoupnagUPDATE_PRODUCT_QUANTITY_BY_ITEM({
              userID,
              vendorItemId: item.coupang_vendorItemId,
              quantity: item.stock,
            });
            console.log(" ** 수량 ** ", response);
          }
        } catch (e) {}
      }
      console.log(" *** 쿠팡 옵션 수량 업데이트 완료 *** ");
      for (const item of options.filter(
        (item) => item.active && !item.disabled
      )) {
        try {
          if (
            item.coupang_vendorItemId !== "null" &&
            item.coupang_vendorItemId !== null &&
            item.coupang_vendorItemId
          ) {
            const response = await CoupnagRESUME_PRODUCT_SALES_BY_ITEM({
              userID,
              vendorItemId: item.coupang_vendorItemId,
            });
            console.log(" ** 판매재게 ** ", response);
          }
        } catch (e) {
          console.log("판매재개 --", e);
        }
      }
      console.log(" *** 쿠팡 판매 재게 완료 *** ");
    } else {
      // 생성

      const noticeTemp = [];
      if (
        coupang.notices &&
        Array.isArray(coupang.notices) &&
        coupang.notices.length > 0
      ) {
        for (const detailNames of coupang.notices[0].noticeCategoryDetailNames.filter(
          (item) => item.required === "MANDATORY"
        )) {
          noticeTemp.push({
            noticeCategoryName: coupang.notices[0].noticeCategoryName,
            noticeCategoryDetailName: detailNames.noticeCategoryDetailName,
            content: detailNames.content,
          });
        }
      }

      coupangProduct = {
        // ...coupang,
        displayCategoryCode: coupang.displayCategoryCode,
        sellerProductName: product.korTitle, // 등록상품명
        vendorId: coupang.vendorId,
        saleStartedAt: `${moment().format("yyyy-MM-DD")}T${moment().format(
          "hh:mm:ss"
        )}`, // 판매시작일시
        saleEndedAt: "2099-12-31T12:00:00", // 판매종료일시
        displayProductName: product.korTitle, // 등록상품명
        brand: product.brand, // 브랜드
        manufacture: product.manufacture, // 제조사
        deliveryMethod: "AGENT_BUY", // 배송방법
        deliveryCompanyCode: coupang.deliveryCompanyCode,
        deliveryChargeType: product.deliveryChargeType,
        deliveryCharge: product.deliveryCharge,
        freeShipOverAmount: 0, // 무료배송을 위한 조건 금액
        deliveryChargeOnReturn:
          product.deliveryChargeOnReturn > minSalePrice / 2
            ? Math.floor((minSalePrice / 2) * 0.1) * 10
            : product.deliveryChargeOnReturn,
        remoteAreaDeliverable: "Y", // 도서산간 배송여부
        unionDeliveryType: "NOT_UNION_DELIVERY", // 묶음 배송여부
        returnCenterCode: coupang.returnCenterCode,
        returnChargeName: coupang.returnChargeName,
        companyContactNumber: coupang.companyContactNumber,
        returnZipCode: coupang.returnZipCode,
        returnAddress: coupang.returnAddress,
        returnAddressDetail: coupang.returnAddressDetail,
        returnCharge: returnCharge,
        // returnCharge:
        //   coupang.returnCharge > minSalePrice / 2
        //     ? Math.floor((minSalePrice / 2) * 0.1) * 10
        //     : coupang.returnCharge,
        afterServiceInformation: coupang.afterServiceInformation,
        afterServiceContactNumber: coupang.afterServiceContactNumber,
        outboundShippingPlaceCode: coupang.outboundShippingPlaceCode,
        vendorUserId: coupang.vendorUserId,
        requested: false,
        requiredDocuments: [
          {
            templateName: "인보이스영수증(해외구매대행 선택시)",
            // templateName: "MANDATORY_OVERSEAS_PURCH",
            vendorDocumentPath: coupang.invoiceDocument, // 구비서류벤더경로
          },
        ],
        items: options.map((item) => {
          return {
            itemName: item.korKey ? item.korKey : item.korValue, //업체상품옵션명
            originalPrice: item.productPrice, //할인율기준가 (정가표시)
            salePrice: item.salePrice, //판매가격
            maximumBuyCount: item.stock, //판매가능수량
            maximumBuyForPerson: coupang.maximumBuyForPerson, // 인당 최대 구매 수량
            maximumBuyForPersonPeriod: coupang.maximumBuyForPersonPeriod, // 최대 구매 수량 기간
            outboundShippingTimeDay: product.outboundShippingTimeDay, //기준출고일(일)
            unitCount: 0, // 단위수량
            adultOnly: "EVERYONE", // 19세이상
            taxType: "TAX", // 과세여부
            parallelImported: "NOT_PARALLEL_IMPORTED", // 병행수입여부
            overseasPurchased: "OVERSEAS_PURCHASED", // 해외구매대행여부
            pccNeeded: true, // PCC(개인통관부호) 필수/비필수 여부
            externalVendorSku: item.key, // 판매자상품코드 (업체상품코드)
            barcode: "",
            emptyBarcode: true,
            emptyBarcodeReason: "상품확인불가_구매대행상품",
            // modelNo: product.good_id,
            certifications:
              basic.certifications && Array.isArray(basic.certifications)
                ? basic.certifications
                    .filter(
                      (item) =>
                        item.required === "required" ||
                        item.required === "REQUIRED"
                    )
                    .map((item) => {
                      return {
                        certifications: item.certificationType,
                        certificationCode: "",
                      };
                    })
                : [],
            searchTags,
            images: (() => {
              const representation = {
                imageOrder: 0,
                imageType: "REPRESENTATION",
                vendorPath: item.image,
              };

              const detail = checkMainImage.map((item, index) => {
                return {
                  imageOrder: index + 1,
                  imageType: "DETAIL",
                  vendorPath: { item },
                };
              });
              return [representation, ...detail];
            })(),
            // notices: coupang.notices.map(notice=>{
            //   console.log("NOTICE", notice)
            //   return {
            //     ...notice,
            //     noticeCategoryDetailName: notice.noticeCategoryDetailNames[0].noticeCategoryDetailName,
            //     content: "상세페이지 참조"
            //   }
            // }),
            notices: noticeTemp,
            attributes: item.attributes
              ? item.attributes.map((attr, index) => {
                  if (attr.attributeValueName === "상세페이지 참조") {
                    if (index === 0) {
                      return {
                        attributeTypeName: attr.attributeTypeName,
                        attributeValueName: item.korKey
                          ? item.korKey
                          : item.korValue,
                      };
                    } else {
                      return {
                        attributeTypeName: attr.attributeTypeName,
                        attributeValueName: attr.attributeValueName,
                      };
                    }
                  } else {
                    return attr;
                  }
                })
              : coupang.attributes.map((attr, index) => {
                  if (index === 0) {
                    return {
                      attributeTypeName: attr.attributeTypeName,
                      attributeValueName: item.korKey
                        ? item.korKey
                        : item.korValue,
                    };
                  } else {
                    return {
                      attributeTypeName: attr.attributeTypeName,
                      attributeValueName: attr.attributeValueName,
                    };
                  }
                }),
            // attributes: coupang.attributes.map((attr, index) => {
            //   if (index === 0) {
            //     return {
            //       attributeTypeName: attr.attributeTypeName,
            //       attributeValueName: item.korKey ? item.korKey : item.korValue
            //     }
            //   } else {
            //     return {
            //       attributeTypeName: attr.attributeTypeName,
            //       attributeValueName: attr.attributeValueName
            //     }
            //   }
            // }),
            contents: [
              {
                contentsType: "HTML",
                contentDetails: [
                  {
                    content: htmlContent,
                    detailType: "TEXT",
                  },
                ],
              },
            ],
            // requiredDocuments: [
            //   {
            //     templateName: "인보이스영수증(해외구매대행 선택시)",
            //     vendorDocumentPath: coupang.invoiceDocument
            //   }
            // ],
            offerCondition: "NEW", // 상품상태
            manufacture: product.manufacture, // 제조사
          };
        }),
      };
      console.log("==============================================");
      for (const item of coupangProduct.items) {
        console.log("attributes", item.attributes);
      }
      console.log("==============================================");
      try {
        coupangProductResponse = await CoupnagCreateProduct({
          userID,
          product: coupangProduct,
        });
      } catch (e) {
        return {
          coupang: {
            code: "ERROR",
            message: `상품 등록 오류 - ${e.message}`,
          },
        };
      }
    }

    // for (const item of coupangProduct.items) {
    //   console.log("attributes", item.attributes)
    // }

    if (!product.coupang_productID && !coupangProductResponse.data) {
      returnMessage.coupang.code = "ERROR";
      returnMessage.coupang.message = coupangProductResponse.message;
      return returnMessage;
    } else {
      if (!product.coupang) {
        product.coupang = {};
      }

      if (coupangProductResponse.code === "SUCCESS") {
        product.coupang.productID = `${coupangProductResponse.data}`;

        let response = await CoupnagGET_PRODUCT_BY_PRODUCT_ID({
          userID,
          productID: coupangProductResponse.data,
        });

        if (response && response.data && Array.isArray(response.data.items)) {
          response.data.items.forEach((item, index) => {
            if (!options[index].coupang) {
              options[index].coupang = {};
            }
            for (const oItem of options) {
              if (
                oItem.korValue === item.itemName ||
                oItem.korKey === item.itemName
              ) {
                oItem.coupang.sellerProductItemId = `${item.sellerProductItemId}`;
                oItem.coupang.vendorItemId = `${item.vendorItemId}`;
                oItem.coupang.itemId = `${item.itemId}`;
              }
            }
            // options[index].coupang.sellerProductItemId = `${item.sellerProductItemId}`
            // options[index].coupang.vendorItemId = `${item.vendorItemId}`
            // options[index].coupang.itemId = `${item.itemId}`
          });
        }
      } else {
        product.coupang.message = coupangProductResponse.message;
      }

      if (returnMessage.coupang.code === null) {
        returnMessage.coupang.code = "SUCCESS";
      }

      const productResponse = await Product.create({
        userID: ObjectId(userID),
        writerID: tempProduct ? tempProduct.writerID : writerID,
        basic,
        product,
        prop,
        options,
        coupang,
        isSoEasy: true,
        createdAt: moment().toDate(),
        initCreatedAt: moment().toDate(),
        coupangUpdatedAt: moment().toDate(),
      });
      returnMessage.coupang.message = productResponse._id;
    }
  } catch (e) {
    console.log("updateCoupang", e);
  } finally {
    return returnMessage;
  }
};

const getExceptCatetory = (code) => {
  const exceptCategory = [
    {
      category1: "가구/홈데코",
      category2: "가구",
      category3: "의자",
    },
    {
      category1: "가구/홈데코",
      category2: "가구",
      category3: "행거",
    },
    {
      category1: "가구/홈데코",
      category2: "가구",
      category3: "침실가구세트",
    },
    {
      category1: "가구/홈데코",
      category2: "가구",
      category3: "침대",
    },
    {
      category1: "가구/홈데코",
      category2: "가구",
      category3: "매트리스",
    },
    {
      category1: "가구/홈데코",
      category2: "가구",
      category3: "토퍼",
    },
    {
      category1: "가구/홈데코",
      category2: "가구",
      category3: "옷장/드레스룸",
    },
    {
      category1: "가구/홈데코",
      category2: "가구",
      category3: "화장대/콘솔",
    },
    {
      category1: "가구/홈데코",
      category2: "가구",
      category3: "소파",
    },
    {
      category1: "가구/홈데코",
      category2: "가구",
      category3: "리클라이너",
    },
    {
      category1: "가구/홈데코",
      category2: "가구",
      category3: "거실테이블",
    },
    {
      category1: "가구/홈데코",
      category2: "가구",
      category3: "수납가구",
    },
    {
      category1: "가구/홈데코",
      category2: "가구",
      category3: "병풍/파티션",
    },
    {
      category1: "가구/홈데코",
      category2: "가구",
      category3: "주방가구",
    },
    {
      category1: "가구/홈데코",
      category2: "가구",
      category3: "학생/사무용가구",
    },
    {
      category1: "가구/홈데코",
      category2: "가구",
      category3: "유아동가구",
    },
    {
      category1: "가구/홈데코",
      category2: "가구",
      category3: "야외가구",
    },
    {
      category1: "가구/홈데코",
      category2: "가구",
      category3: "가구부속자재",
    },
    {
      category1: "가구/홈데코",
      category2: "금고",
      category3: "가정용금고",
    },
    {
      category1: "가구/홈데코",
      category2: "금고",
      category3: "금전출납기",
    },
    {
      category1: "가구/홈데코",
      category2: "금고",
      category3: "기타/휴대용금고",
    },
    {
      category1: "가구/홈데코",
      category2: "원예/가드닝",
      category3: "꽃",
    },
    {
      category1: "가구/홈데코",
      category2: "원예/가드닝",
      category3: "이벤트꽃",
    },
    {
      category1: "가구/홈데코",
      category2: "원예/가드닝",
      category3: "동양란/서양란",
    },
    {
      category1: "가구/홈데코",
      category2: "원예/가드닝",
      category3: "축하/근조화환",
    },
    {
      category1: "가구/홈데코",
      category2: "원예/가드닝",
      category3: "나무/다육식물",
    },
    {
      category1: "가구/홈데코",
      category2: "원예/가드닝",
      category3: "숯화분/석부작",
    },
    {
      category1: "가구/홈데코",
      category2: "원예/가드닝",
      category3: "수경재배",
    },
    {
      category1: "가구/홈데코",
      category2: "원예/가드닝",
      category3: "화병/화분",
    },
    {
      category1: "가구/홈데코",
      category2: "원예/가드닝",
      category3: "씨앗/묘종/묘목",
    },
    {
      category1: "가구/홈데코",
      category2: "원예/가드닝",
      category3: "흙/비료",
    },
    {
      category1: "가구/홈데코",
      category2: "원예/가드닝",
      category3: "제초/살충/살균제",
    },
    {
      category1: "가구/홈데코",
      category2: "원예/가드닝",
      category3: "물조리개/급수장치",
    },
    {
      category1: "가구/홈데코",
      category2: "원예/가드닝",
      category3: "원예도구/농기구",
    },
    {
      category1: "가구/홈데코",
      category2: "원예/가드닝",
      category3: "비닐/하우스",
    },
    {
      category1: "가구/홈데코",
      category2: "원예/가드닝",
      category3: "식물재배기",
    },
    {
      category1: "가구/홈데코",
      category2: "원예/가드닝",
      category3: "잔디깎기/예초기",
    },
    {
      category1: "가구/홈데코",
      category2: "원예/가드닝",
      category3: "정원장식물/조각",
    },
    {
      category1: "가구/홈데코",
      category2: "인테리어용품",
      category3: "조명/스탠드",
    },
    {
      category1: "가구/홈데코",
      category2: "인테리어용품",
      category3: "시계",
    },
    {
      category1: "가구/홈데코",
      category2: "인테리어용품",
      category3: "거울",
    },
    {
      category1: "가구/홈데코",
      category2: "인테리어용품",
      category3: "액자/프레임",
    },
    {
      category1: "가구/홈데코",
      category2: "인테리어용품",
      category3: "그림/사진",
    },
    {
      category1: "가구/홈데코",
      category2: "인테리어용품",
      category3: "인테리어소품",
    },
    {
      category1: "가구/홈데코",
      category2: "인테리어용품",
      category3: "크리스마스용품",
    },
    {
      category1: "가구/홈데코",
      category2: "인테리어자재",
      category3: "벽지/도배용품",
    },
    {
      category1: "가구/홈데코",
      category2: "인테리어자재",
      category3: "시트지",
    },
    {
      category1: "가구/홈데코",
      category2: "인테리어자재",
      category3: "폼블럭/폼패널",
    },
    {
      category1: "가구/홈데코",
      category2: "침구",
      category3: "이불",
    },
    {
      category1: "가구/홈데코",
      category2: "침구",
      category3: "이불솜/요솜",
    },
    {
      category1: "가구/홈데코",
      category2: "침구",
      category3: "이불속/속통",
    },
    {
      category1: "가구/홈데코",
      category2: "침구",
      category3: "요/매트/패드",
    },
    {
      category1: "가구/홈데코",
      category2: "침구",
      category3: "쿨매트",
    },
    {
      category1: "가구/홈데코",
      category2: "침구",
      category3: "침구세트류",
    },
    {
      category1: "가구/홈데코",
      category2: "침구",
      category3: "유아동침구",
    },
    {
      category1: "가구/홈데코",
      category2: "카페트/매트",
      category3: "러그/카페트",
    },
    {
      category1: "가구/홈데코",
      category2: "카페트/매트",
      category3: "원목/우드카페트",
    },
    {
      category1: "가구/홈데코",
      category2: "카페트/매트",
      category3: "대자리",
    },
    {
      category1: "가구/홈데코",
      category2: "커튼/침장",
      category3: "커튼",
    },
    {
      category1: "가구/홈데코",
      category2: "커튼/침장",
      category3: "블라인드/쉐이드",
    },
    {
      category1: "가구/홈데코",
      category2: "커튼/침장",
      category3: "롤스크린",
    },
    {
      category1: "가구/홈데코",
      category2: "커튼/침장",
      category3: "버티칼",
    },
    {
      category1: "가전/디지털",
      category2: "TV/영상가전",
      category3: "프로젝터/스크린",
    },
    {
      category1: "가전/디지털",
      category2: "TV/영상가전",
      category3: "TV",
    },
    {
      category1: "가전/디지털",
      category2: "TV/영상가전",
      category3: "홈시어터 악세사리",
    },
    {
      category1: "가전/디지털",
      category2: "계절환경가전",
      category3: "모기/해충 퇴치기",
    },
    {
      category1: "가전/디지털",
      category2: "계절환경가전",
      category3: "선풍기/서큘레이터",
    },
    {
      category1: "가전/디지털",
      category2: "계절환경가전",
      category3: "온수/전기매트",
    },
    {
      category1: "가전/디지털",
      category2: "계절환경가전",
      category3: "손발난로",
    },
    {
      category1: "가전/디지털",
      category2: "계절환경가전",
      category3: "제습기",
    },
    {
      category1: "가전/디지털",
      category2: "계절환경가전",
      category3: "가습기/에어워셔/공기청정기",
    },
    {
      category1: "가전/디지털",
      category2: "계절환경가전",
      category3: "히터/온풍기/보일러",
    },
    {
      category1: "가전/디지털",
      category2: "계절환경가전",
      category3: "냉난방/에어컨",
    },
    {
      category1: "가전/디지털",
      category2: "냉장고/밥솥/주방가전",
      category3: "전기포트/토스터/튀김기",
    },
    {
      category1: "가전/디지털",
      category2: "냉장고/밥솥/주방가전",
      category3: "중탕기/영양식/간식제조기",
    },
    {
      category1: "가전/디지털",
      category2: "냉장고/밥솥/주방가전",
      category3: "믹서/원액/반죽기",
    },
    {
      category1: "가전/디지털",
      category2: "냉장고/밥솥/주방가전",
      category3: "커피메이커/머신",
    },
    {
      category1: "가전/디지털",
      category2: "냉장고/밥솥/주방가전",
      category3: "전기밥솥",
    },
    {
      category1: "가전/디지털",
      category2: "냉장고/밥솥/주방가전",
      category3: "오븐/전자레인지",
    },
    {
      category1: "가전/디지털",
      category2: "냉장고/밥솥/주방가전",
      category3: "냉장고",
    },
    {
      category1: "가전/디지털",
      category2: "냉장고/밥솥/주방가전",
      category3: "김치냉장고",
    },
    {
      category1: "가전/디지털",
      category2: "냉장고/밥솥/주방가전",
      category3: "측정계량/기타주방가전",
    },
    {
      category1: "가전/디지털",
      category2: "냉장고/밥솥/주방가전",
      category3: "환풍기/레인지후드",
    },
    {
      category1: "가전/디지털",
      category2: "냉장고/밥솥/주방가전",
      category3: "식기세척/살균건조기",
    },
    {
      category1: "가전/디지털",
      category2: "냉장고/밥솥/주방가전",
      category3: "식품건조/진공포장/음식물처리기",
    },
    {
      category1: "가전/디지털",
      category2: "냉장고/밥솥/주방가전",
      category3: "정수기/냉온수기",
    },
    {
      category1: "가전/디지털",
      category2: "냉장고/밥솥/주방가전",
      category3: "가스/전기레인지",
    },
    {
      category1: "가전/디지털",
      category2: "생활가전",
      category3: "다리미/재봉틀/보풀제거기",
    },
    {
      category1: "가전/디지털",
      category2: "생활가전",
      category3: "도어록/비디오폰/보안",
    },
    {
      category1: "가전/디지털",
      category2: "생활가전",
      category3: "전동칫솔/구강세정기/살균기",
    },
    {
      category1: "가전/디지털",
      category2: "생활가전",
      category3: "비데/온수기",
    },
    {
      category1: "가전/디지털",
      category2: "생활가전",
      category3: "청소기",
    },
    {
      category1: "가전/디지털",
      category2: "생활가전",
      category3: "세탁기/건조기",
    },
    {
      category1: "가전/디지털",
      category2: "음향기기/이어폰/스피커",
      category3: "홈시어터/HiFi",
    },
    {
      category1: "가전/디지털",
      category2: "음향기기/이어폰/스피커",
      category3: "마이크/PA/레코딩장비",
    },
    {
      category1: "가전/디지털",
      category2: "이미용건강가전",
      category3: "안마기/건강/이미용가전",
    },
    {
      category1: "가전/디지털",
      category2: "이미용건강가전",
      category3: "살균소독기",
    },
    {
      category1: "가전/디지털",
      category2: "컴퓨터/게임/SW",
      category3: "게임기/소프트웨어",
    },
    {
      category1: "가전/디지털",
      category2: "컴퓨터/게임/SW",
      category3: "데스크탑/미니/일체형PC",
    },
    {
      category1: "가전/디지털",
      category2: "컴퓨터/게임/SW",
      category3: "모니터",
    },
    {
      category1: "가전/디지털",
      category2: "컴퓨터/게임/SW",
      category3: "PC 부품/주변기기",
    },
    {
      category1: "가전/디지털",
      category2: "컴퓨터/게임/SW",
      category3: "공유기/네트워크/CCTV",
    },
    {
      category1: "가전/디지털",
      category2: "컴퓨터/게임/SW",
      category3: "복합기/프린터/스캐너",
    },
    {
      category1: "도서",
      category2: "국내도서",
      category3: "전집",
    },
    {
      category1: "문구/오피스",
      category2: "사무기기",
      category3: "세단기/파쇄기",
    },
    {
      category1: "문구/오피스",
      category2: "사무기기",
      category3: "재단기/소모품",
    },
    {
      category1: "문구/오피스",
      category2: "사무기기",
      category3: "천공기/소모품",
    },
    {
      category1: "문구/오피스",
      category2: "사무기기",
      category3: "제본기/소모품",
    },
    {
      category1: "문구/오피스",
      category2: "사무기기",
      category3: "코팅기/소모품",
    },
    {
      category1: "문구/오피스",
      category2: "사무기기",
      category3: "팩스",
    },
    {
      category1: "문구/오피스",
      category2: "사무기기",
      category3: "출퇴근기록기",
    },
    {
      category1: "문구/오피스",
      category2: "사무기기",
      category3: "지폐계수기/감별기",
    },
    {
      category1: "문구/오피스",
      category2: "사무기기",
      category3: "카드단말기",
    },
    {
      category1: "문구/오피스",
      category2: "사무용품",
      category3: "계산기",
    },
    {
      category1: "문구/오피스",
      category2: "사무용품",
      category3: "보드/게시판/칠판",
    },
    {
      category1: "문구/오피스",
      category2: "사무용품",
      category3: "데스크정리용품",
    },
    {
      category1: "문구/오피스",
      category2: "사무용품",
      category3: "독서용품",
    },
    {
      category1: "문구/오피스",
      category2: "사무용품",
      category3: "점포/판촉용품",
    },
    {
      category1: "문구/오피스",
      category2: "문구/학용품",
      category3: "포장/파티용품",
    },
    {
      category1: "반려/애완용품",
      category2: "강아지/고양이 겸용",
      category3: "하우스/침대/방석",
    },
    {
      category1: "반려/애완용품",
      category2: "강아지/고양이 겸용",
      category3: "캐리어/이동장/유모차",
    },
    {
      category1: "반려/애완용품",
      category2: "강아지/고양이 겸용",
      category3: "안전문/울타리/철장",
    },
    {
      category1: "반려/애완용품",
      category2: "강아지/고양이 겸용",
      category3: "반려동물전용가전",
    },
    {
      category1: "반려/애완용품",
      category2: "강아지용품",
      category3: "철장",
    },
    {
      category1: "반려/애완용품",
      category2: "강아지용품",
      category3: "훈련용품",
    },
    {
      category1: "반려/애완용품",
      category2: "거북이/달팽이용품",
      category3: "수조/사육장",
    },
    {
      category1: "반려/애완용품",
      category2: "고슴도치용품",
      category3: "사육장/케이지",
    },
    {
      category1: "반려/애완용품",
      category2: "고슴도치용품",
      category3: "쳇바퀴/장난감",
    },
    {
      category1: "반려/애완용품",
      category2: "고양이용품",
      category3: "고양이 모래/ 화장실",
    },
    {
      category1: "반려/애완용품",
      category2: "고양이용품",
      category3: "철장",
    },
    {
      category1: "반려/애완용품",
      category2: "고양이용품",
      category3: "캣타워/스크래쳐",
    },
    {
      category1: "반려/애완용품",
      category2: "고양이용품",
      category3: "하우스/방석/해먹",
    },
    {
      category1: "반려/애완용품",
      category2: "관상어용품",
      category3: "수조/어항",
    },
    {
      category1: "반려/애완용품",
      category2: "조류용품",
      category3: "새장/관리용품",
    },
    {
      category1: "반려/애완용품",
      category2: "조류용품",
      category3: "이동장",
    },
    {
      category1: "반려/애완용품",
      category2: "파충류용품",
      category3: "하우스",
    },
    {
      category1: "반려/애완용품",
      category2: "햄스터/토끼/기니피그용품",
      category3: "하우스/이동장",
    },
    {
      category1: "반려/애완용품",
      category2: "햄스터/토끼/기니피그용품",
      category3: "쳇바퀴/장난감",
    },
    {
      category1: "생활용품",
      category2: "건강용품",
      category3: "보호대/교정용품",
    },
    {
      category1: "생활용품",
      category2: "건강용품",
      category3: "건강측정용품",
    },
    {
      category1: "생활용품",
      category2: "건강용품",
      category3: "찜질/부항/뜸/좌훈",
    },
    {
      category1: "생활용품",
      category2: "건강용품",
      category3: "지압/마사지용품",
    },
    {
      category1: "생활용품",
      category2: "건강용품",
      category3: "활동보조용품",
    },
    {
      category1: "생활용품",
      category2: "건강용품",
      category3: "건강액세서리",
    },
    {
      category1: "생활용품",
      category2: "공구",
      category3: "인두/기타납땜용품",
    },
    {
      category1: "생활용품",
      category2: "공구",
      category3: "절단기",
    },
    {
      category1: "생활용품",
      category2: "공구",
      category3: "전동공구",
    },
    {
      category1: "생활용품",
      category2: "공구",
      category3: "수공구/공구함",
    },
    {
      category1: "생활용품",
      category2: "공구",
      category3: "측정도구",
    },
    {
      category1: "생활용품",
      category2: "공구",
      category3: "소형기계",
    },
    {
      category1: "생활용품",
      category2: "공구",
      category3: "에어공구",
    },
    {
      category1: "생활용품",
      category2: "공구",
      category3: "용접용품",
    },
    {
      category1: "생활용품",
      category2: "공구",
      category3: "사다리/운반용품",
    },
    {
      category1: "생활용품",
      category2: "도장용품",
      category3: "페인트",
    },
    {
      category1: "생활용품",
      category2: "도장용품",
      category3: "페인트작업도구",
    },
    {
      category1: "생활용품",
      category2: "배관/건축자재",
      category3: "야외데크/목재",
    },
    {
      category1: "생활용품",
      category2: "배관/건축자재",
      category3: "건설자재",
    },
    {
      category1: "생활용품",
      category2: "배관/건축자재",
      category3: "시멘트/백색시멘트",
    },
    {
      category1: "생활용품",
      category2: "배관/건축자재",
      category3: "아스콘/도로포장자재",
    },
    {
      category1: "생활용품",
      category2: "배관/건축자재",
      category3: "파이프/배관",
    },
    {
      category1: "생활용품",
      category2: "배관/건축자재",
      category3: "기타배관용품",
    },
    {
      category1: "생활용품",
      category2: "배관/건축자재",
      category3: "보일러설비",
    },
    {
      category1: "생활용품",
      category2: "배관/건축자재",
      category3: "소방설비",
    },
    {
      category1: "생활용품",
      category2: "배관/건축자재",
      category3: "창호/샷시자재",
    },
    {
      category1: "생활용품",
      category2: "배관/건축자재",
      category3: "환기구/덕트",
    },
    {
      category1: "생활용품",
      category2: "배관/건축자재",
      category3: "DIY자재",
    },
    {
      category1: "생활용품",
      category2: "배관/건축자재",
      category3: "야외데크/목재",
    },
    {
      category1: "생활용품",
      category2: "배관/건축자재",
      category3: "유리/강화유리",
    },
    {
      category1: "생활용품",
      category2: "배관/건축자재",
      category3: "실내도어/샷시",
    },
    {
      category1: "생활용품",
      category2: "보수용품",
      category3: "방풍비닐/방풍커튼",
    },
    {
      category1: "생활용품",
      category2: "보수용품",
      category3: "방수/코팅제",
    },
    {
      category1: "생활용품",
      category2: "보수용품",
      category3: "기타 보수제",
    },
    {
      category1: "생활용품",
      category2: "보수용품",
      category3: "단열에어캡",
    },
    {
      category1: "생활용품",
      category2: "보수용품",
      category3: "단열필름",
    },
    {
      category1: "생활용품",
      category2: "보수용품",
      category3: "방음재/흡음재",
    },
    {
      category1: "생활용품",
      category2: "보수용품",
      category3: "방수/결로방지",
    },
    {
      category1: "생활용품",
      category2: "보수용품",
      category3: "기타 보수용품",
    },
    {
      category1: "생활용품",
      category2: "생활잡화",
      category3: "장바구니/카트",
    },
    {
      category1: "생활용품",
      category2: "생활잡화",
      category3: "야외매트",
    },
    {
      category1: "생활용품",
      category2: "생활잡화",
      category3: "비닐/포장용품",
    },
    {
      category1: "생활용품",
      category2: "생활잡화",
      category3: "기타잡화케이스",
    },
    {
      category1: "생활용품",
      category2: "생활잡화",
      category3: "광고/진열소품",
    },
    {
      category1: "생활용품",
      category2: "생활잡화",
      category3: "칠판/게시판",
    },
    {
      category1: "생활용품",
      category2: "생활잡화",
      category3: "생활측정도구",
    },
    {
      category1: "생활용품",
      category2: "생활잡화",
      category3: "금연/흡연용품",
    },
    {
      category1: "생활용품",
      category2: "생활잡화",
      category3: "기타생활용품",
    },
    {
      category1: "생활용품",
      category2: "성인용품(19)",
      category3: "성인 완구/게임(19)",
    },
    {
      category1: "생활용품",
      category2: "성인용품(19)",
      category3: "성인 가구(19)",
    },
    {
      category1: "생활용품",
      category2: "성인용품(19)",
      category3: "SM용품(19)",
    },
    {
      category1: "생활용품",
      category2: "성인용품(19)",
      category3: "성인용품세트(19)",
    },
    {
      category1: "생활용품",
      category2: "수납/정리",
      category3: "리빙박스/압축/커버",
    },
    {
      category1: "생활용품",
      category2: "수납/정리",
      category3: "옷걸이/다용도걸이",
    },
    {
      category1: "생활용품",
      category2: "수납/정리",
      category3: "바구니/이사박스",
    },
    {
      category1: "생활용품",
      category2: "수납/정리",
      category3: "공간박스/선반",
    },
    {
      category1: "생활용품",
      category2: "수납/정리",
      category3: "수납장/서랍장(플라스틱)",
    },
    {
      category1: "생활용품",
      category2: "수납/정리",
      category3: "행거",
    },
    {
      category1: "생활용품",
      category2: "수납/정리",
      category3: "기타수납/정리용품",
    },
    {
      category1: "생활용품",
      category2: "안전용품",
      category3: "산업안전용품/장갑",
    },
    {
      category1: "생활용품",
      category2: "안전용품",
      category3: "가정/생활안전용품",
    },
    {
      category1: "생활용품",
      category2: "안전용품",
      category3: "소화기/재난용품",
    },
    {
      category1: "생활용품",
      category2: "욕실용품",
      category3: "욕실용품/잡화",
    },
    {
      category1: "생활용품",
      category2: "욕실용품",
      category3: "욕실수납/정리",
    },
    {
      category1: "생활용품",
      category2: "욕실용품",
      category3: "변기용품",
    },
    {
      category1: "생활용품",
      category2: "욕실용품",
      category3: "샤워/세면대/수전",
    },
    {
      category1: "생활용품",
      category2: "욕실용품",
      category3: "욕조/좌욕/족욕기",
    },
    {
      category1: "생활용품",
      category2: "욕실용품",
      category3: "샤워/세면대/수전",
    },
    {
      category1: "생활용품",
      category2: "의료/간호용품",
      category3: "가정의료용품",
    },
    {
      category1: "생활용품",
      category2: "의료/간호용품",
      category3: "환자보조용품",
    },
    {
      category1: "생활용품",
      category2: "의료/간호용품",
      category3: "병원/의료용품",
    },
    {
      category1: "생활용품",
      category2: "접착용품",
      category3: "에폭시/수지경화제",
    },
    {
      category1: "생활용품",
      category2: "조명/전기용품",
      category3: "전기설비자재",
    },
    {
      category1: "생활용품",
      category2: "조명/전기용품",
      category3: "조명부자재",
    },
    {
      category1: "생활용품",
      category2: "철물",
      category3: "기타철물",
    },
    {
      category1: "생활용품",
      category2: "청소용품",
      category3: "휴지통/분리수거함",
    },
    {
      category1: "스포츠/레져",
      category2: "검도/격투/무술",
      category3: "검도",
    },
    {
      category1: "스포츠/레져",
      category2: "검도/격투/무술",
      category3: "권투/격투기",
    },
    {
      category1: "스포츠/레져",
      category2: "검도/격투/무술",
      category3: "쌍절곤/기타무술",
    },
    {
      category1: "스포츠/레져",
      category2: "검도/격투/무술",
      category3: "주짓수/유도",
    },
    {
      category1: "스포츠/레져",
      category2: "검도/격투/무술",
      category3: "태권도",
    },
    {
      category1: "스포츠/레져",
      category2: "골프",
      category3: "골프백",
    },
    {
      category1: "스포츠/레져",
      category2: "골프",
      category3: "골프클럽",
    },
    {
      category1: "스포츠/레져",
      category2: "골프",
      category3: "연습용품",
    },
    {
      category1: "스포츠/레져",
      category2: "골프",
      category3: "필드용품",
    },
    {
      category1: "스포츠/레져",
      category2: "구기스포츠",
      category3: "공 정리/보관용품",
    },
    {
      category1: "스포츠/레져",
      category2: "구기스포츠",
      category3: "넷볼/츄크볼/기타구기용품",
    },
    {
      category1: "스포츠/레져",
      category2: "구기스포츠",
      category3: "농구",
    },
    {
      category1: "스포츠/레져",
      category2: "구기스포츠",
      category3: "당구/포켓볼",
    },
    {
      category1: "스포츠/레져",
      category2: "구기스포츠",
      category3: "미식축구/럭비",
    },
    {
      category1: "스포츠/레져",
      category2: "구기스포츠",
      category3: "배구/피구/족구",
    },
    {
      category1: "스포츠/레져",
      category2: "구기스포츠",
      category3: "볼펌프/에어펌프",
    },
    {
      category1: "스포츠/레져",
      category2: "구기스포츠",
      category3: "야구",
    },
    {
      category1: "스포츠/레져",
      category2: "구기스포츠",
      category3: "축구",
    },
    {
      category1: "스포츠/레져",
      category2: "구기스포츠",
      category3: "티볼/소프트볼용품",
    },
    {
      category1: "스포츠/레져",
      category2: "구기스포츠",
      category3: "플로어볼/게이트볼용품",
    },
    {
      category1: "스포츠/레져",
      category2: "구기스포츠",
      category3: "하키",
    },
    {
      category1: "스포츠/레져",
      category2: "구기스포츠",
      category3: "핸드볼",
    },
    {
      category1: "스포츠/레져",
      category2: "구기스포츠",
      category3: "훈련/연습용품",
    },
    {
      category1: "스포츠/레져",
      category2: "기타스포츠",
      category3: "양궁/사격/승마",
    },
    {
      category1: "스포츠/레져",
      category2: "기타스포츠",
      category3: "육상/체조",
    },
    {
      category1: "스포츠/레져",
      category2: "기타스포츠",
      category3: "다트/레저",
    },
    {
      category1: "스포츠/레져",
      category2: "라켓스포츠",
      category3: "탁구",
    },
    {
      category1: "스포츠/레져",
      category2: "라켓스포츠",
      category3: "테니스",
    },
    {
      category1: "스포츠/레져",
      category2: "라켓스포츠",
      category3: "배드민턴/탁구/테니스 공용",
    },
    {
      category1: "스포츠/레져",
      category2: "라켓스포츠",
      category3: "배드민턴",
    },
    {
      category1: "스포츠/레져",
      category2: "라켓스포츠",
      category3: "기타 라켓용품",
    },
    {
      category1: "스포츠/레져",
      category2: "낚시",
      category3: "낚시장비",
    },
    {
      category1: "스포츠/레져",
      category2: "낚시",
      category3: "좌대/야외용품",
    },
    {
      category1: "스포츠/레져",
      category2: "수영/수상스포츠",
      category3: "서핑/수상보드",
    },
    {
      category1: "스포츠/레져",
      category2: "수영/수상스포츠",
      category3: "수영/물놀이용품",
    },
    {
      category1: "스포츠/레져",
      category2: "수영/수상스포츠",
      category3: "카누/카약/보트",
    },
    {
      category1: "스포츠/레져",
      category2: "자전거",
      category3: "로드 자전거",
    },
    {
      category1: "스포츠/레져",
      category2: "자전거",
      category3: "리컴번트 자전거",
    },
    {
      category1: "스포츠/레져",
      category2: "자전거",
      category3: "거치대/트레이너",
    },
    {
      category1: "스포츠/레져",
      category2: "자전거",
      category3: "아동용자전거",
    },
    {
      category1: "스포츠/레져",
      category2: "자전거",
      category3: "외발 자전거",
    },
    {
      category1: "스포츠/레져",
      category2: "자전거",
      category3: "자전거부품",
    },
    {
      category1: "스포츠/레져",
      category2: "자전거",
      category3: "전기자전거",
    },
    {
      category1: "스포츠/레져",
      category2: "자전거",
      category3: "클래식/미니벨로",
    },
    {
      category1: "스포츠/레져",
      category2: "자전거",
      category3: "펫바이크",
    },
    {
      category1: "스포츠/레져",
      category2: "자전거",
      category3: "텐덤/2인용 자전거",
    },
    {
      category1: "스포츠/레져",
      category2: "자전거",
      category3: "하이브리드자전거",
    },
    {
      category1: "스포츠/레져",
      category2: "자전거",
      category3: "픽시 자전거",
    },
    {
      category1: "스포츠/레져",
      category2: "자전거",
      category3: "BMX자전거",
    },
    {
      category1: "스포츠/레져",
      category2: "자전거",
      category3: "MTB/산악용",
    },
    {
      category1: "스포츠/레져",
      category2: "캠핑",
      category3: "랜턴/조명",
    },
    {
      category1: "스포츠/레져",
      category2: "캠핑",
      category3: "수납/정리소품",
    },
    {
      category1: "스포츠/레져",
      category2: "캠핑",
      category3: "의자/테이블",
    },
    {
      category1: "스포츠/레져",
      category2: "캠핑",
      category3: "침낭/매트/해먹",
    },
    {
      category1: "스포츠/레져",
      category2: "캠핑",
      category3: "캠핑공구",
    },
    {
      category1: "스포츠/레져",
      category2: "캠핑",
      category3: "캠핑주방용품",
    },
    {
      category1: "스포츠/레져",
      category2: "캠핑",
      category3: "타프/그늘막",
    },
    {
      category1: "스포츠/레져",
      category2: "캠핑",
      category3: "텐트",
    },
    {
      category1: "스포츠/레져",
      category2: "캠핑",
      category3: "화장실/샤워용품",
    },
    {
      category1: "스포츠/레져",
      category2: "킥보드/스케이트",
      category3: "전동휠/보드",
    },
    {
      category1: "스포츠/레져",
      category2: "헬스/요가",
      category3: "요가/필라테스용품",
    },
    {
      category1: "스포츠/레져",
      category2: "헬스/요가",
      category3: "헬스기구/용품",
    },
    {
      category1: "완구/취미",
      category2: "보드게임",
      category3: "화투/트럼프/마작",
    },
    {
      category1: "완구/취미",
      category2: "스포츠/야외완구",
      category3: "트램펄린/트램폴린",
    },
    {
      category1: "완구/취미",
      category2: "스포츠/야외완구",
      category3: "구기종목",
    },
    {
      category1: "완구/취미",
      category2: "승용완구",
      category3: "지붕차",
    },
    {
      category1: "완구/취미",
      category2: "승용완구",
      category3: "전동차",
    },
    {
      category1: "완구/취미",
      category2: "승용완구",
      category3: "유아용 세발자전거",
    },
    {
      category1: "완구/취미",
      category2: "승용완구",
      category3: "붕붕카",
    },
    {
      category1: "완구/취미",
      category2: "승용완구",
      category3: "전동오토바이",
    },
    {
      category1: "완구/취미",
      category2: "실내대형완구",
      category3: "시소",
    },
    {
      category1: "완구/취미",
      category2: "실내대형완구",
      category3: "볼풀",
    },
    {
      category1: "완구/취미",
      category2: "실내대형완구",
      category3: "볼텐트",
    },
    {
      category1: "완구/취미",
      category2: "실내대형완구",
      category3: "미끄럼틀",
    },
    {
      category1: "완구/취미",
      category2: "실내대형완구",
      category3: "놀이터널",
    },
    {
      category1: "완구/취미",
      category2: "실내대형완구",
      category3: "놀이집/놀이텐트",
    },
    {
      category1: "완구/취미",
      category2: "실내대형완구",
      category3: "그네/그네봉",
    },
    {
      category1: "완구/취미",
      category2: "실내대형완구",
      category3: "다기능놀이터",
    },
    {
      category1: "완구/취미",
      category2: "실내대형완구",
      category3: "정글짐",
    },
    {
      category1: "완구/취미",
      category2: "실내대형완구",
      category3: "에어바운스",
    },
    {
      category1: "완구/취미",
      category2: "악기/음향기기",
      category3: "건반악기",
    },
    {
      category1: "완구/취미",
      category2: "악기/음향기기",
      category3: "관악기",
    },
    {
      category1: "완구/취미",
      category2: "악기/음향기기",
      category3: "현악기",
    },
    {
      category1: "완구/취미",
      category2: "악기/음향기기",
      category3: "타악기",
    },
    {
      category1: "완구/취미",
      category2: "악기/음향기기",
      category3: "기타(guitar)/우쿨렐레",
    },
    {
      category1: "완구/취미",
      category2: "악기/음향기기",
      category3: "국악기",
    },
    {
      category1: "완구/취미",
      category2: "악기/음향기기",
      category3: "악기 주변용품",
    },
    {
      category1: "완구/취미",
      category2: "악기/음향기기",
      category3: "음향기자재",
    },
    {
      category1: "완구/취미",
      category2: "역할놀이",
      category3: "공구놀이",
    },
    {
      category1: "완구/취미",
      category2: "역할놀이",
      category3: "마트/계산대놀이",
    },
    {
      category1: "완구/취미",
      category2: "역할놀이",
      category3: "주방놀이",
    },
    {
      category1: "완구/취미",
      category2: "역할놀이",
      category3: "화장/꾸미기놀이",
    },
    {
      category1: "완구/취미",
      category2: "인형",
      category3: "봉제인형",
    },
    {
      category1: "자동차용품",
      category2: "DIY/공구용품",
      category3: "DIY용품",
    },
    {
      category1: "자동차용품",
      category2: "DIY/공구용품",
      category3: "공구/장비/캠핑",
    },
    {
      category1: "자동차용품",
      category2: "램프/배터리/전기",
      category3: "램프/LED/HID",
    },
    {
      category1: "자동차용품",
      category2: "램프/배터리/전기",
      category3: "배터리/전기용품",
    },
    {
      category1: "자동차용품",
      category2: "실외용품",
      category3: "익스테리어용품",
    },
    {
      category1: "자동차용품",
      category2: "오토바이용품",
      category3: "잡화/액세서리",
    },
    {
      category1: "자동차용품",
      category2: "오토바이용품",
      category3: "오토바이/스쿠터",
    },
    {
      category1: "자동차용품",
      category2: "오토바이용품",
      category3: "튜닝/부품/정비",
    },
    {
      category1: "자동차용품",
      category2: "차량용튜닝용품",
      category3: "엔진튠업",
    },
    {
      category1: "자동차용품",
      category2: "차량용튜닝용품",
      category3: "브레이크용품",
    },
    {
      category1: "자동차용품",
      category2: "차량용튜닝용품",
      category3: "바디보강/하체튜닝",
    },
    {
      category1: "자동차용품",
      category2: "차량용튜닝용품",
      category3: "스포일러/에어로파츠",
    },
    {
      category1: "자동차용품",
      category2: "차량용튜닝용품",
      category3: "흡기/배기튜닝",
    },
    {
      category1: "자동차용품",
      category2: "타이어/휠/체인",
      category3: "타이어용품",
    },
    {
      category1: "자동차용품",
      category2: "타이어/휠/체인",
      category3: "휠/휠액세서리",
    },
    {
      category1: "자동차용품",
      category2: "타이어/휠/체인",
      category3: "체인용품",
    },
    {
      category1: "주방용품",
      category2: "보관/밀폐용기",
      category3: "밀폐/보관용기",
    },
    {
      category1: "주방용품",
      category2: "보관/밀폐용기",
      category3: "기타보관용기",
    },
    {
      category1: "주방용품",
      category2: "제기/제수용품",
      category3: "제기/휴대용제기",
    },
    {
      category1: "주방용품",
      category2: "제기/제수용품",
      category3: "제기함",
    },
    {
      category1: "주방용품",
      category2: "제기/제수용품",
      category3: "기타제수용품",
    },
    {
      category1: "주방용품",
      category2: "조리용품",
      category3: "다지기/절구/맷돌",
    },
    {
      category1: "주방용품",
      category2: "조리용품",
      category3: "바베큐용품/숯/연료",
    },
    {
      category1: "주방용품",
      category2: "주방수납/정리",
      category3: "기타수납/정리용품",
    },
    {
      category1: "주방용품",
      category2: "주방잡화",
      category3: "계량용품",
    },
    {
      category1: "주방용품",
      category2: "주방잡화",
      category3: "주방위생소품",
    },
    {
      category1: "주방용품",
      category2: "주방잡화",
      category3: "주방수전/싱크볼",
    },
    {
      category1: "주방용품",
      category2: "취사도구",
      category3: "냄비",
    },
    {
      category1: "주방용품",
      category2: "취사도구",
      category3: "프라이팬",
    },
    {
      category1: "주방용품",
      category2: "취사도구",
      category3: "냄비/프라이팬세트",
    },
    {
      category1: "주방용품",
      category2: "취사도구",
      category3: "찜기/들통/솥",
    },
    {
      category1: "출산/유아동",
      category2: "기저귀/교체용품",
      category3: "기저귀교체용품",
    },
    {
      category1: "출산/유아동",
      category2: "놀이매트/안전용품",
      category3: "유아놀이방매트",
    },
    {
      category1: "출산/유아동",
      category2: "놀이매트/안전용품",
      category3: "유아안전문",
    },
    {
      category1: "출산/유아동",
      category2: "놀이매트/안전용품",
      category3: "침대가드/연결장치",
    },
    {
      category1: "출산/유아동",
      category2: "외출용품",
      category3: "유모차",
    },
    {
      category1: "출산/유아동",
      category2: "외출용품",
      category3: "유아용웨건",
    },
    {
      category1: "출산/유아동",
      category2: "외출용품",
      category3: "카시트",
    },
    {
      category1: "출산/유아동",
      category2: "유아가구/인테리어",
      category3: "유아동침대",
    },
    {
      category1: "출산/유아동",
      category2: "유아가구/인테리어",
      category3: "유아수납/정리함",
    },
    {
      category1: "출산/유아동",
      category2: "유아가구/인테리어",
      category3: "유아의자/소파",
    },
    {
      category1: "출산/유아동",
      category2: "유아가구/인테리어",
      category3: "유아공부상/책상",
    },
    {
      category1: "출산/유아동",
      category2: "유아동침구",
      category3: "낮잠이불/세트",
    },
    {
      category1: "출산/유아동",
      category2: "유아동침구",
      category3: "유아동이불",
    },
    {
      category1: "출산/유아동",
      category2: "유아동침구",
      category3: "요/패드",
    },
    {
      category1: "출산/유아동",
      category2: "유아동침구",
      category3: "유아동 침구세트",
    },
    {
      category1: "출산/유아동",
      category2: "출산준비물/선물",
      category3: "돌잔치용품",
    },
  ];

  let exceptArray = [];
  for (const item of exceptCategory) {
    let findObj1 = _.find(CoupangCategory, { label: item.category1 });
    if (findObj1) {
      let findObj2 = _.find(findObj1.children, { label: item.category2 });
      if (findObj2) {
        let findObj3 = _.find(findObj2.children, { label: item.category3 });
        if (findObj3) {
          exceptArray.push(findObj3.value);
          for (const children1 of findObj3.children) {
            exceptArray.push(children1.value);
            for (const children2 of children1.children) {
              exceptArray.push(children2.value);
            }
          }
        }
      }
    }
  }

  return exceptArray.includes(code);
};
