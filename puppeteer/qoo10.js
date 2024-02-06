const axios = require("axios");
const Cookie = require("../models/Cookie");
const { sleep, getSbth } = require("../lib/userFunc");
const cheerio = require("cheerio");
const Qoo10Keyword = require("../models/Qoo10Keyword");
const Qoo10Brand = require("../models/Qoo10Brand");
const Qoo10Store = require("../models/Qoo10Store");
const Qoo10Product = require("../models/Qoo10Product");
const { papagoTranslate } = require("./translate");

const start = async () => {
  const SyncFun = async () => {
    while (true) {
      const cookie = await Cookie.findOne({
        name: "qoo10",
      });

      const content1 = await axios({
        url: "https://qsm.qoo10.jp/GMKT.INC.Gsm.Web/swe_ADPlusBizService.asmx/GetPlusItemsPopularKeywordList",
        method: "POST",
        headers: {
          Cookie: cookie.cookie,
        },
        data: {
          count: "100",
          filter_list: "",
          group_count: "30",
          order_type: "POPULAR",
        },
      });

      const content2 = await axios({
        url: "https://qsm.qoo10.jp/GMKT.INC.Gsm.Web/swe_ADPlusBizService.asmx/GetPlusItemsPopularKeywordList",
        method: "POST",
        headers: {
          Cookie: cookie.cookie,
        },
        data: {
          count: "10",
          filter_list: "",
          group_count: "10",
          order_type: "DAILY HOT",
        },
      });
      const content3 = await axios({
        url: "https://qsm.qoo10.jp/GMKT.INC.Gsm.Web/swe_ADPlusBizService.asmx/GetPlusItemsPopularKeywordList",
        method: "POST",
        headers: {
          Cookie: cookie.cookie,
        },
        data: {
          count: "10",
          filter_list: "",
          group_count: "10",
          order_type: "WEEKLY HOT",
        },
      });

      let mainKeyword = [
        ...content1.data.d.Rows
          // .filter((item) => item.group_code === 2)
          .map((item) => item.keyword),
        ...content2.data.d.Rows
          // .filter((item) => item.group_code === 2)
          .map((item) => item.keyword),
        ...content3.data.d.Rows
          // .filter((item) => item.group_code === 2)
          .map((item) => item.keyword),
      ];

      console.log("----", mainKeyword);
      let searchResult = [];
      let groupPlusID = [];
      for (const keyword of mainKeyword) {
        console.log(
          " *********** *********** keyword *********** ************   ",
          keyword
        );
        await searchRelatedKeywords({
          keyword,
          searchResult,
          groupPlusID,
        });

        console.log("-----끝-----");
        await sleep(1000);
      }
    }
  };
  SyncFun();
  // await searchCategoryList();
  // await getStoreInfo();
  productImages();
  shoppingLeng();
};

const shoppingLeng = async () => {
  try {
    const products = await Qoo10Product.find({
      marginRate: null,
    }).sort({ sold: 1 });

    for (const product of products) {
      try {
        const content = await axios.get(
          `https://msearch.shopping.naver.com/search/image?iu=${encodeURI(
            product.thumb
          )}`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Linux; Android 8.0.0; SM-G955U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Mobile Safari/537.36",
              "sec-fetch-site": "same-origin",
              "sec-fetch-mode": "cors",
              "Accept-Encoding": "gzip, deflate, br",
              Connection: "keep-alive",
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
              Expires: "0",
              referer: `https://msearch.shopping.naver.com/search/image`,
            },
          }
        );
        const data = content.data
          .split(`<script id="__NEXT_DATA__" type="application/json">`)[1]
          .split(`</script></body></html>`)[0];
        const jsonObj = JSON.parse(data.replace(/\\"/), `"`);
        // console.log("jsonObj", jsonObj)
        const initialState = JSON.parse(
          jsonObj.props.pageProps.initialState.replace(
            "undefined",
            `"undefined`
          )
        );
        // console.log("initialState", initialState.imageSearch.searchResult);
        await sleep(1000);
        const id = initialState.imageSearch.searchResult.id;
        const contentCrop = await axios.get(
          `https://msearch.shopping.naver.com/api/search/image/crop?from=shoppinglensurl&height=${initialState.imageSearch.searchResult.size.h}&id=${id}&width=${initialState.imageSearch.searchResult.size.w}&x=9&y=18`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Linux; Android 8.0.0; SM-G955U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Mobile Safari/537.36",
              "sec-fetch-site": "same-origin",
              "sec-fetch-mode": "cors",
              "Accept-Encoding": "gzip, deflate, br",
              Connection: "keep-alive",
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
              Expires: "0",
              referer: `https://msearch.shopping.naver.com/search/image`,
              sbth: getSbth(),
            },
          }
        );

        if (
          contentCrop.data.searchResponse &&
          contentCrop.data.searchResponse.similarImages &&
          Array.isArray(contentCrop.data.searchResponse.similarImages)
        ) {
          // const products = contentCrop.data.searchResponse.similarImages
          //   .filter((item) => item.score >= 0.94)
          //   .map((item) =>
          //     item.productTitle.split("{")[0].replace(/,/, "").trim()
          //   );

          if (
            contentCrop.data.searchResponse.card &&
            contentCrop.data.searchResponse.card.entryName
          ) {
            // console.log("카드 -- ", contentCrop.data.searchResponse.card.shoppingItem);
            let deliverFee = product.deliverFee;
            let price = 0;
            if (product.dcPrice) {
              price = product.dcPrice;
            } else {
              price = product.price;
            }
            let janpanPrice = Math.ceil((price + deliverFee) * 9.02);

            const {
              title,
              lowPrice,
              deliveryFeeContent,
              src,
              link,
              brand,
              imgSgnt,
            } = contentCrop.data.searchResponse.card.shoppingItem;
            console.log("*** CARD ****");
            console.log("brand ", brand);
            console.log("title ", title);
            console.log("일본 판매가 ", janpanPrice);
            console.log("일본 주소 ", product.detailUrl);
            console.log("lowPrice ", lowPrice, Number(lowPrice));
            console.log(
              "deliveryFeeContent ",
              deliveryFeeContent,
              Number(deliveryFeeContent)
            );

            console.log(
              "차액 --> ",
              janpanPrice - (Number(lowPrice) + Number(deliveryFeeContent))
            );

            let 정산금액 = janpanPrice - janpanPrice * 0.1 - 5000;
            let 마진 =
              정산금액 - (Number(lowPrice) + Number(deliveryFeeContent));
            let 마진율 = (마진 / 정산금액) * 100;
            console.log("정산금액", 정산금액);
            console.log("마진", 마진);
            console.log("마진율", 마진율);

            console.log("src ", src);
            console.log("link ", link);
            console.log("imgSgnt ", imgSgnt);
            await Qoo10Product.findOneAndUpdate(
              {
                _id: product._id,
              },
              {
                $set: {
                  korBrand: brand,
                  korTitle: title,
                  korPrice: Number(lowPrice),
                  korDeliveryFee: Number(deliveryFeeContent),
                  difference:
                    janpanPrice -
                    (Number(lowPrice) + Number(deliveryFeeContent)),
                  amountPrice: 정산금액,
                  margin: 마진,
                  marginRate: 마진율,
                  korSrc: src,
                  korLink: link,
                  korImgSgnt: imgSgnt,
                  lengID: id,
                },
              }
            );
            // searchKeyword.push(
            //   ...contentCrop.data.searchResponse.card.entryName.split(" ")
            // );
          } else {
            const {
              title,
              lowPrice,
              deliveryFeeContent,
              src,
              link,
              brand,
              imgSgnt,
            } = contentCrop.data.searchResponse.similarImages[0];
            console.log("*** similarImages ****");
            let deliverFee = product.deliverFee;
            let price = 0;
            if (product.dcPrice) {
              price = product.dcPrice;
            } else {
              price = product.price;
            }
            let janpanPrice = Math.ceil((price + deliverFee) * 9.02);
            console.log("brand ", brand);
            console.log("title ", title);
            console.log("일본 판매가 ", janpanPrice);
            console.log("일본 주소 ", product.detailUrl);
            console.log("lowPrice ", lowPrice);
            console.log("deliveryFeeContent ", deliveryFeeContent);
            console.log(
              "차액 --> ",
              janpanPrice - (Number(lowPrice) + Number(deliveryFeeContent))
            );
            let 정산금액 = janpanPrice - janpanPrice * 0.1 - 5000;
            let 마진 =
              정산금액 - (Number(lowPrice) + Number(deliveryFeeContent));
            let 마진율 = (마진 / 정산금액) * 100;
            console.log("정산금액", 정산금액);
            console.log("마진", 마진);
            console.log("마진율", 마진율);
            console.log("src ", src);
            console.log("link ", link);
            console.log("imgSgnt ", imgSgnt);

            await Qoo10Product.findOneAndUpdate(
              {
                _id: product._id,
              },
              {
                $set: {
                  korBrand: brand,
                  korTitle: title,
                  korPrice: Number(lowPrice),
                  korDeliveryFee: Number(deliveryFeeContent),
                  difference:
                    janpanPrice -
                    (Number(lowPrice) + Number(deliveryFeeContent)),
                  amountPrice: 정산금액,
                  margin: 마진,
                  marginRate: 마진율,
                  korSrc: src,
                  korLink: link,
                  korImgSgnt: imgSgnt,
                  lengID: id,
                },
              }
            );
          }
        } else {
          console.log("contentCrop.data", contentCrop.data);
        }
      } catch (e) {
        console.log("--- ", e);
      }

      await sleep(1000);
    }
  } catch (e) {
    console.log("shoppoingLeng", e);
  }
};
const productImages = async () => {
  try {
    const products = await Qoo10Product.find().sort({ _id: 1 });

    for (const product of products) {
      const content = await axios({
        method: "GET",
        url: `${product.detailUrl}`,
      });

      const $ = cheerio.load(content.data);

      let image = $("#GoodsImage").attr("content");
      let group_code = $("#group_code").attr("value");
      let gdlc_cd = $("#gdlc_cd").attr("value");
      let gdmc_cd = $("#gdmc_cd").attr("value");
      let gdsc_cd = $("#gdsc_cd").attr("value");
      // console.log("image-- ", image);
      console.log("group_code-- ", group_code, gdlc_cd, gdmc_cd, gdsc_cd);

      await Qoo10Product.findOneAndUpdate(
        {
          _id: product._id,
        },
        {
          $set: {
            thumb: image,
            group_code,
            gdlc_cd,
            gdmc_cd,
            gdsc_cd,
          },
        }
      );
      await sleep(1000);
    }
    console.log("*************** 끝 *************");
  } catch (e) {
    console.log("productImages", e);
  }
};
const searchCategoryList = async () => {
  let categoryes = [
    "120000012/220000159",
    "120000012/220000160",
    "120000012/220000161",
    "120000012/220000162",
    "120000012/220000163",

    "120000013/220000164",
    "120000013/220000165",
    "120000013/220000166",
    "120000013/220000167",
    "120000013/220000168",
    "120000013/220000169",
    "120000013/220000170",

    "120000014/220000171",
    "120000014/220000172",
    "120000014/220000173",
    "120000014/220000174",
    "120000014/220000175",
    "120000014/220000176",
    "120000014/220000177",

    "120000015/220000178",
    "120000015/220000179",

    "120000016/220000180",
    "120000016/220000181",

    "120000017/220000182",
    "120000017/220000183",

    "120000018/220000184",
    "120000018/220000185",
    "120000018/220000186",

    "120000019/220000187",
    "120000019/220000188",

    "120000020/220000189",
    "120000020/220000190",
    "120000020/220000191",
    "120000020/220000192",

    "120000021/220000193",
    "120000021/220000194",
    "120000021/220000195",

    "120000022/220000196",
    "120000022/220000197",

    "120000023/220000198",
    "120000023/220000199",

    "120000024/220000200",
    "120000024/220000201",

    "120000025/220000202",
    "120000025/220000203",
    "120000025/220000204",
  ].sort((a, b) => {
    const numA = parseInt(a.split("/")[1], 10);
    const numB = parseInt(b.split("/")[1], 10);

    // Compare in reverse order
    return numB - numA;
  });
  try {
    let tempTemp = null;
    for (const category of categoryes) {
      console.log(" ** category ** ", category);
      let pages = [];
      for (let i = 1; i < 101; i++) {
        pages.push(i);
      }
      for (const page of pages) {
        try {
          const content = await axios({
            method: "POST",
            url: `https://www.qoo10.jp/gmkt.inc/Search/SearchResultAjaxTemplate.aspx?gdlc_cd=${
              category.split("/")[0]
            }&gdmc_cd=${
              category.split("/")[1]
            }&keywordArrLength=1&sortType=SORT_RANK_POINT&dispType=LIST&filterDelivery=NNNNNANNNN&shipFromNation=KR&is_research_yn=Y&coupon_filter_no=0&partial=on&curPage=${page}&pageSize=40&ajax_search_type=C`,
          });

          //SORT_GD_NO
          //SORT_RANK_POINT
          if (tempTemp === content.data.toString()) {
            console.log("같음--------------------", page);
            break;
          }
          tempTemp = content.data.toString();
          const $ = cheerio.load(
            `<table><tbody>${content.data}</tbody></table>`
          );
          if ($("table > tbody").children("tr").length === 0) {
            break;
          }
          for (const item of $("table > tbody").children("tr")) {
            let official = false;
            let brandName = $(item).find(".sbj > .txt_brand").text();
            let brandUrl = $(item).find(".sbj > .txt_brand").attr("href");
            if (brandName.includes("公式")) {
              official = true;
              brandName = brandName.replace("公式", "").trim();
            }
            let brandNameKor = await papagoTranslate(brandName, "ja", "ko");
            const storeName = $(item).find(".opt_dtl > a.lnk_sh").attr("title");
            const storeUrl = $(item)
              .find(".opt_dtl > a.lnk_sh")
              .attr("href")
              .split("?")[0];
            console.log("brandName", brandName);
            console.log("brandNameKor", brandNameKor);
            console.log("brandUrl", brandUrl);
            console.log("official", official);
            console.log("storeName", storeName);
            console.log("storeUrl", storeUrl);

            await Qoo10Brand.findOneAndUpdate(
              {
                brandName,
              },
              {
                $set: {
                  brandName,
                  brandNameKor,
                  brandUrl,
                },
              },
              {
                upsert: true,
              }
            );

            await Qoo10Store.findOneAndUpdate(
              {
                storeName,
              },
              {
                $set: {
                  storeName,
                  storeUrl,
                },
              },
              {
                upsert: true,
              }
            );
          }

          await sleep(2000);
        } catch (e) {
          console.log("--- ", e);
        }
      }

      await sleep(2000);
    }
  } catch (e) {
    console.log("--", e);
  }
  console.log(
    "------------------------------------  끝 -----------------------------------"
  );
};

const getStoreInfo = async () => {
  try {
    const stores = await Qoo10Store.find({
      official: null,
      // {
      //   $ne: true,
      // },
    });
    // .sort({
    //   _id: -1,
    // });
    console.log("stores", stores.length);
    let ii = 1;
    for (const store of stores) {
      try {
        console.log(
          "store -- ",
          store.storeName,
          ` --  (${ii++} / ${stores.length})`
        );
        const content = await axios({
          method: "GET",
          url: `${store.storeUrl.replace("shop", "shop-info")}?global_yn=N`,
        });

        const $ = cheerio.load(content.data);

        let i = 0;
        let address = null;
        let email = null;
        let phone = null;
        let workingHour = null;
        let productCount = 0;
        productCount = Number(
          $(".info_dtl > a > span").text().replace(/,/g, "")
        );
        for (const item of $(".slr_info > dl").children("dd")) {
          switch (i) {
            case 0:
              address = $(item).text();
              break;
            case 1:
              email = $(item).text();
              break;
            case 2:
              phone = $(item).text();
              break;
            case 3:
              etc = $(item).text();
              break;
            default:
              break;
          }
          i++;
        }
        console.log("url : ", store.storeUrl);
        console.log("주소 : ", address);
        console.log("이메일 : ", email);
        console.log("핸드폰 : ", phone);
        console.log("업무시간 : ", workingHour);
        console.log("상품갯수 : ", productCount);
        let sell_cust_no = $("#sell_coupon_cust_no").attr("value");
        console.log("sell_cust_no", sell_cust_no);
        if (!sell_cust_no) {
          continue;
        }
        await Qoo10Store.findOneAndUpdate(
          {
            storeName: store.storeName,
          },
          {
            $set: {
              storeName: store.storeName,
              productCount,
              address,
              email,
              phone,
              workingHour,
              official: false,
            },
          },
          {
            upsert: true,
          }
        );

        let pages = [];
        for (let i = 1; i < productCount / 60 + 1; i++) {
          pages.push(i);
        }
        console.log("pages", pages);
        let official = false;
        for (const page of pages) {
          if (official) {
            break;
          }
          const content = await axios({
            method: "POST",
            url: `https://www.qoo10.jp/gmkt.inc/Search/SearchResultAjaxTemplate.aspx?minishop_bar_onoff=Y&sell_coupon_cust_no=${sell_cust_no}&SellerCooponDisplay=N&sell_cust_no=${encodeURI(
              sell_cust_no
            )}&theme_sid=0&global_yn=N&qid=0&fbidx=-1&sortType=MOST_REVIEWED&dispType=UIG4&filterDelivery=NNNNNANNNN&search_global_yn=N&shipto=ALL&is_research_yn=Y&coupon_filter_no=0&partial=on&paging_value=1&curPage=${page}&pageSize=60&ajax_search_type=M`,
          });

          const $ = cheerio.load(`<ul>${content.data}</ul>`);

          for (const item of $("ul").children("li")) {
            // console.log("----", $(item).text());
            let href = $(item).find("a.thmb").attr("href");
            official = $(item)
              .find("a.txt_brand > span.official")
              .text()
              .trim();
            if (official === "公式") {
              console.log("official -- ", official);
              await Qoo10Store.findOneAndUpdate(
                {
                  storeName: store.storeName,
                },
                {
                  $set: {
                    official: true,
                  },
                },
                {
                  upsert: true,
                }
              );
              break;
            }

            const detailContent = await axios({
              method: "GET",
              url: href,
            });

            const detail$ = cheerio.load(detailContent.data);
            let sold = detail$("span.sold > strong").text();
            let review = detail$(
              ".review_star_area > .review_count > span"
            ).text();
            if (sold && sold.length > 0) {
              sold = Number(sold.replace(/,/g, ""));
            }
            if (review && review.length > 0) {
              review = Number(review.replace(/,/g, ""));
            }
            console.log("href", href);
            console.log("sold", sold);
            console.log("review", review);
            if (sold > 0 || review > 0) {
              let image = detail$("#GoodsImage").attr("content");
              console.log("image", image);
              let brand = detail$(".text_title > a").text();
              let title = detail$(".text_title")
                .text()
                .replace(brand, "")
                .trim();

              console.log("brand=", brand);
              console.log("title=", title);
              let deliverFee = detail$("#delivery_option_fee_0").text();
              if (deliverFee && deliverFee.length > 0) {
                if (deliverFee.includes("無料")) {
                  deliverFee = 0;
                } else {
                  deliverFee = Number(
                    deliverFee.replace("円 ~", "").replace(/,/g, "").trim()
                  );
                }
              }
              console.log("deliverFee=", deliverFee);

              let dcPrice = detail$(
                ".detailsArea.q_dcprice > dd > strong"
              ).text();
              let price = detail$(".detailsArea.lsprice > dd >strong").text();

              if (price && price.length > 0) {
                price = Number(
                  price.replace(/,/g, "").replace("円", "").trim()
                );
              } else {
                price = null;
              }
              if (dcPrice && dcPrice.length > 0) {
                dcPrice = Number(
                  dcPrice.replace(/,/g, "").replace("円", "").trim()
                );
              } else {
                dcPrice = null;
              }

              console.log("dcPrice ", dcPrice);
              console.log("price ", price);

              await Qoo10Product.findOneAndUpdate(
                {
                  storeName: store.storeName,
                  detailUrl: href,
                },
                {
                  $set: {
                    storeName: store.storeName,
                    detailUrl: href,
                    thumb: image,
                    brand,
                    title,
                    sold,
                    review,
                    deliverFee,
                    dcPrice,
                    price,
                  },
                },
                {
                  upsert: true,
                }
              );
            } else {
              break;
            }
          }
          await sleep(500);
        }
      } catch (e) {
        console.log("무슨 에러", e);
      }

      await sleep(1000);
    }

    console.log("------ 끝 ------");
  } catch (e) {
    console.log("getStoreInfo", e);
  }
};
const searchRelatedKeywords = async ({
  keyword,
  searchResult,
  groupPlusID,
}) => {
  const cookie = await Cookie.findOne({
    name: "qoo10",
  });

  let currentKeywords = [{ keyword, count: 0 }];
  // console.log("currentKeywords.length", keyword, currentKeywords.length);
  while (currentKeywords.length > 0) {
    const newKeywords = [];

    for (const { keyword: currentKeyword, count } of currentKeywords) {
      console.log("currentKeyword - ", currentKeyword);
      // console.log("currentKeyword, count ", currentKeyword, count);
      try {
        const content = await axios({
          url: "https://qsm.qoo10.jp/GMKT.INC.Gsm.Web/swe_ADPlusBizService.asmx/GetPlusItemKeywordGroup",
          method: "POST",
          headers: {
            Cookie: cookie.cookie,
          },
          data: {
            keyword: currentKeyword,
            plus_type: "KW",
          },
        });

        const group_plus_id = content.data.d.group_plus_id;
        const reloatedCategoryCode = content.data.d.KW.related_gdlc_cd;
        const reloatedCategoryName = content.data.d.KW.related_gdlc_nm;
        if (groupPlusID.includes(group_plus_id)) {
          continue;
        } else {
          groupPlusID.push(group_plus_id);
        }
        console.log("group_plus_id", group_plus_id);
        const relatedGroup = await searchRelatedGroupKeywords(
          currentKeyword,
          group_plus_id
        );

        // const relatedKeywords = content.data.d.list_keyword_group || [];
        // console.log(
        //   `Related keywords for "${currentKeyword}": (${count}) -> ${relatedKeywords
        //     .map((item) => item.keyword)
        //     .join(", ")}`
        // );

        // 연관 키워드를 모두 다시 검색
        newKeywords.push(
          ...relatedGroup.map((relatedKeyword) => ({
            keyword: relatedKeyword.keyword,
            count: count + 1,
            searchCount: relatedKeyword.searchCount,
            yesterdayCount: relatedKeyword.yesterdayCount,
            reloatedCategoryCode,
            reloatedCategoryName,
          }))
        );

        for (const item of newKeywords) {
          if (
            searchResult.filter((result) => result.keyword === item.keyword)
              .length === 0
          ) {
            searchResult.push(item);
            console.log("item-- ", item);
            item.korKeyword = await papagoTranslate(item.keyword, "ja", "ko");
            item.categoryKorName = await papagoTranslate(
              item.reloatedCategoryName,
              "ja",
              "ko"
            );

            await searchKeywordWebPage(item);
          }
        }
      } catch (error) {
        console.error("Error fetching related keywords:", error);
      }
      await sleep(1000);
    }

    // 새로운 키워드로 갱신
    currentKeywords = newKeywords;
    // .filter((item) => {
    //   if (
    //     searchResult.filter((result) => result.keyword === item.keyword)
    //       .length === 0
    //   ) {
    //     return true;
    //   }
    //   return false;
    // });

    console.log("while 끝");
  }
};

const searchRelatedGroupKeywords = async (keyword, group_plus_id) => {
  const cookie = await Cookie.findOne({
    name: "qoo10",
  });

  try {
    const content = await axios({
      url: "https://qsm.qoo10.jp/GMKT.INC.Gsm.Web/swe_ADPlusBizService.asmx/GetPlusItemRelatedKeywordGroupList2",
      method: "POST",
      headers: {
        Cookie: cookie.cookie,
      },
      data: {
        group_plus_id,
        keyword_list: keyword,
        plus_type: "KW",
      },
    });

    let relatedKeywords = [];
    for (const item of content.data.d) {
      relatedKeywords.push(
        ...item.list_keyword_group.map((item) => {
          return {
            keyword: item.keyword,
            searchCount: item.search_cnt,
            yesterdayCount: item.yesterday_cnt,
          };
        })
      );
    }
    return relatedKeywords;
  } catch (error) {
    console.error("Error fetching related group keywords:", error);
    return [];
  }
};

const searchKeywordWebPage = async (item) => {
  const returnValue = {
    total: 0,
    janpan: 0,
    korea: 0,
    etc: 0,
  };
  try {
    const content = await axios({
      url: `https://www.qoo10.jp/s/${encodeURIComponent(
        item.keyword
      )}?keyword=${encodeURIComponent(
        item.keyword
      )}&furusato_gdlc_cd=&keyword_auto_change=`,
      method: "GET",
    });

    const $ = cheerio.load(content.data);

    const totalCount = $("#items > strong").text();
    returnValue.total = Number(totalCount.replace(/,/g, ""));
    // console.log("totalCount", totalCount);

    $("#div_global_domestic_tab > p").each(function () {
      const value = $(this).find("a").text();
      if (value.includes("国内")) {
        const num = $(this).find("a > span.num").text();
        returnValue.janpan = Number(
          num.replace(/\(/g, "").replace(/\)/g, "").replace(/,/g, "")
        );
      }
      if (value.includes("韓国")) {
        const num = $(this).find("a > span.num").text();
        returnValue.korea = Number(
          num.replace(/\(/g, "").replace(/\)/g, "").replace(/,/g, "")
        );
      }
      // console.log("value-", value, $(this).find("a").html());
    });

    returnValue.etc =
      returnValue.total - returnValue.janpan - returnValue.korea;

    returnValue.janpanRate = (returnValue.janpan / returnValue.total) * 100;
    returnValue.koreaRate = (returnValue.korea / returnValue.total) * 100;
    returnValue.etcRate = (returnValue.etc / returnValue.total) * 100;

    returnValue.competitionJapan =
      (returnValue.janpan / item.searchCount) * 100;
    returnValue.competitionKorea = (returnValue.korea / item.searchCount) * 100;
    returnValue.competitionEtc = (returnValue.etc / item.searchCount) * 100;
    console.log("returnValue", returnValue);

    await Qoo10Keyword.findOneAndUpdate(
      {
        keyword: item.keyword,
      },
      {
        $set: {
          keyword: item.keyword,
          korKeyword: item.korKeyword,
          categoryCode: item.reloatedCategoryCode,
          categoryName: item.reloatedCategoryName,
          categoryKorName: item.categoryKorName,
          searchCount: item.searchCount,
          yesterdayCount: item.yesterdayCount,
          janpanRate: returnValue.janpanRate,
          koreaRate: returnValue.koreaRate,
          etcRate: returnValue.etcRate,
          competitionJapan: returnValue.competitionJapan,
          competitionKorea: returnValue.competitionKorea,
          competitionEtc: returnValue.competitionEtc,
        },
      },
      {
        upsert: true,
      }
    );

    await sleep(2000);
  } catch (e) {
    console.log("searchKeywordWebPage  ---- >  error", item.keyword);
    await Qoo10Keyword.findOneAndUpdate(
      {
        keyword: item.keyword,
      },
      {
        $set: {
          keyword: item.keyword,
          korKeyword: item.korKeyword,
          categoryCode: item.reloatedCategoryCode,
          categoryName: item.reloatedCategoryName,
          categoryKorName: item.categoryKorName,
          searchCount: item.searchCount,
          yesterdayCount: item.yesterdayCount,
          janpanRate: 0,
          koreaRate: 0,
          etcRate: 0,
          competitionJapan: 0,
          competitionKorea: 0,
          competitionEtc: 0,
        },
      },
      {
        upsert: true,
      }
    );
  }
};
module.exports = start;
