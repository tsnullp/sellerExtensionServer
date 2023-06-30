const {
  Cafe24CreateProduct,
  Cafe24UpdateProduct,
  Cafe24UploadImages,
  Cafe24CreateProductsOption,
  Cafe24DeleteProductsOption,
  Cafe24ListProductsVariants,
  Cafe24UpdateProductsVariants,
  Cafe24UpdateProductsVariantsInventories,
} = require("../api/Market");
const moment = require("moment");
const { regExp_test, sleep, groupBy } = require("../lib/userFunc");
const Product = require("../models/Product");
const Basic = require("../models/Basic");
const Market = require("../models/Market");
const CategoryInfo = require("../models/CategoryInfo");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const updateCafe24 = async ({
  id,
  isSingle,
  product,
  korTitleArray,
  prop,
  options,
  userID,
  writerID,
  deli_pri_emsplus,
}) => {
  const returnMessage = {
    code: null,
    message: null,
  };

  const market = await Market.findOne({
    userID,
  });
  const cafe24 = market.cafe24;

  let shipping_price = 0;
  let optionValue = options
    .filter((item) => item.active && !item.disabled)
    .filter((i, index) => index < 100)
    .map((item) => {
      if (item.weightPrice > shipping_price) {
        shipping_price = item.weightPrice;
      }
      return item;
    })
    .sort((a, b) => a.salePrice - b.salePrice);

  try {
    const basic = await Basic.findOne({
      userID,
    });

    let searchTags = [];

    const tempProduct = await Product.findOne({
      userID: ObjectId(userID),
      _id: ObjectId(id),
      isDelete: false,
    });

    if (tempProduct) {
      tempProduct.options.forEach((tItem, index) => {
        if (tItem.cafe24 && options[index]) {
          options[index].cafe24 = tItem.cafe24;
        }
      });
      if (tempProduct.product.cafe24) {
        product.cafe24 = tempProduct.product.cafe24;
      }
    }

    if (
      product.keyword &&
      Array.isArray(product.keyword) &&
      product.keyword.length > 0
    ) {
      searchTags = product.keyword.map((item) =>
        regExp_test(item.replace(/ /gi, ""))
      );
    } else {
      searchTags = [...regExp_test(product.korTitle).split(" ")];
    }

    searchTags = searchTags.filter((item, i) => i < 5);

    //
    let cafe24Product = null;
    // let mainImage = product.cafe24_mainImage ? product.cafe24_mainImage : null
    let mainImage = null;

    if (!product.cafe24) {
      product.cafe24 = {};
    }
    // console.log("cafe24", cafe24)
    if (!mainImage) {
      const imagesResponse = await Cafe24UploadImages({
        mallID: cafe24.mallID,
        // images: [...product.mainImages, ...options.map(item => item.image)]
        images:
          product.mainImages && product.mainImages.length > 0
            ? [product.mainImages[0]]
            : [optionValue[0].image],
      });

      imagesResponse &&
        imagesResponse.data &&
        imagesResponse.data.images &&
        imagesResponse.data.images.forEach((item, index) => {
          if (index === 0) {
            mainImage = item.path
              .replace(`http://${cafe24.mallID}.cafe24.com`, "")
              .replace(`https://${cafe24.mallID}.cafe24.com`, "");

            if (mainImage.includes(cafe24.mallID)) {
              mainImage = mainImage.split(cafe24.mallID)[1];
            }
            product.cafe24.mainImage = mainImage;
          }
        });
    }

    let otherImage = [];
    try {
      otherImage = [
        ...product.mainImages.filter((item, index) => index > 0),
        // ...options.map(item => `${item.image}_800x800.jpg`)
      ];
    } catch (e) {}

    if (otherImage.length > 20) {
      otherImage = otherImage.filter((item, index) => {
        if (index < 20) {
          return true;
        } else {
          return false;
        }
      });
    }

    let cafe24response = null;
    let cafe24Option = null;

    const categoryInfo = await CategoryInfo.findOne({
      userID: ObjectId(userID),
      naverCode: product.naverCategoryCode,
    });

    let add_category_no = null;
    if (categoryInfo && categoryInfo.cafe24Code) {
      add_category_no = [
        {
          category_no: categoryInfo.cafe24Code,
          recommend: "F",
          new: "T",
        },
      ];
    }

    // 옵션을 가격별로 묶음
    optionValue = groupBy(optionValue, "salePrice").filter(
      (_, i) => i < korTitleArray.length
    );

    let i = 0;
    for (const SplitOptions of optionValue) {
      let korTitle = korTitleArray[i++];

      let optionHtml = ``;

      for (const item of SplitOptions) {
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
      const htmlContent = `${product.gifHtml}${product.topHtml}${
        product.isClothes && product.clothesHtml ? product.clothesHtml : ""
      }${
        product.isShoes && product.shoesHtml ? product.shoesHtml : ""
      }${optionHtml}${product.html}${product.bottomHtml}`;

      // let tempTitle = product.korTitle;
      // let korTitle = `${tempTitle} ${getAlphabet(i)}`;

      // if (optionValue.length > 1) {
      //   let isDone = false;
      //   while (!isDone) {
      //     if (getByte(korTitle) > 100) {
      //       tempTitle = tempTitle.subString(0, tempTitle.length - 1);
      //       korTitle = `${tempTitle} ${getAlphabet(i)}`;
      //     } else {
      //       isDone = true;
      //     }
      //   }

      //   i++;
      // }

      let price = 0;
      let retail_price = 0;
      if (
        SplitOptions.filter(
          (item) => item.active && !item.disabled && item.base
        ).length === 0
      ) {
        price =
          SplitOptions.filter((item) => item.active && !item.disabled)[0]
            .salePrice - deli_pri_emsplus;
        retail_price =
          SplitOptions.filter((item) => item.active && !item.disabled)[0]
            .productPrice - deli_pri_emsplus;
      } else {
        price =
          SplitOptions.filter(
            (item) => item.active && !item.disabled && item.base
          )[0].salePrice - deli_pri_emsplus;
        retail_price =
          SplitOptions.filter(
            (item) => item.active && !item.disabled && item.base
          )[0].productPrice - deli_pri_emsplus;
      }

      if (!price) {
        price = SplitOptions[0].salePrice - deli_pri_emsplus;
        retail_price = SplitOptions[0].productPrice - deli_pri_emsplus;
      }
      // console.log("price", price);
      if (!price) {
        return {
          message: "판매가 없음",
        };
      }

      //// 카페 24 ////

      let cafe24ProductsVariants = null;
      // console.log("product.cafe24_product_no", product.cafe24_product_no)

      if (product.cafe24_product_no) {
        otherImage = [
          ...product.mainImages.filter((item, index) => index > 0),
          ...SplitOptions.map((item) => {
            if (item.image.includes("//img.alicdn.com/")) {
              return `${item.image}_800x800.jpg`;
            } else {
              return item.image;
            }
          }),
        ];

        if (otherImage.length > 20) {
          otherImage = otherImage.filter((item, index) => {
            if (index < 20) {
              return true;
            } else {
              return false;
            }
          });
        }

        if (isSingle) {
          otherImage = [];
        }

        // console.log("price", price);
        // console.log("retail_price", retail_price);
        // 수정
        cafe24Product = {
          shop_no: cafe24.shop_no,
          request: {
            display: "T", // 진열상태
            selling: isSingle ? (options[0].stock === 0 ? "F" : "T") : "T", // 판매상태
            product_condition: "N", // 상품상태
            add_category_no,
            custom_product_code: product.good_id, // 자체상품 코드
            product_name: korTitle, // 상품명
            price, // 상품 판매가
            retail_price, // 상품 소비자가
            supply_price: 0, // 상품 공급가
            // has_option: isSingle ? "F" : "T", // 옵션 사용여부
            options:
              // !SplitOptions.filter((item) => item.active && !item.disabled)[0]
              //   .korKey &&
              // prop &&
              // Array.isArray(prop) &&
              // prop.length > 0 &&
              // (SplitOptions.filter((item) => item.active && !item.disabled)[0]
              //   .korKey === null ||
              //   (SplitOptions.filter((item) => item.active && !item.disabled)[0]
              //     .korKey &&
              //     SplitOptions.filter((item) => item.active && !item.disabled)[0]
              //       .korKey.length === 0))
              //   ? prop.map((item) => {
              //       return {
              //         name: item.korTypeName,
              //         value: item.values.map(
              //           (valueItem) => valueItem.korValueName
              //         ),
              //       };
              //     })
              //   :
              [
                {
                  name: "종류",
                  value: SplitOptions.filter(
                    (item) => item.active && !item.disabled
                  )
                    .filter((i, index) => index < 100)
                    .map((item) =>
                      regExp_test(item.korKey ? item.korKey : item.korValue)
                    ),
                },
              ],
            // options: [
            //   {
            //     name: "종류",
            //     value: options
            //       .filter(item => item.active && !item.disabled)
            //       .map(item => regExp_test(item.korKey ? item.korKey : item.korValue))
            //   }
            // ],
            product_weight: "1.00", // 상품 중량
            description: htmlContent, // 상품상세설명
            // summary_description: product.korTitle, // 상품요약설명
            simple_description: product.korTitle, // 상품간략설명
            product_tag: searchTags.join(), // 상품검색어
            payment_info: "상세페이지 참조", // 상품결제안내
            shipping_info: "상세페이지 참조", // 상품배송안내
            exchange_info: "상세페이지 참조", // 교환/반품안내
            service_info: "상세페이지 참조", // 서비스문의/안내
            shipping_scope: "A", // 배송정보
            shipping_method: "01", // 배송방법
            shipping_fee_by_product: "F", // 개별배송여부
            shipping_area: "국내", // 배송지역
            shipping_period: {
              // 배송기간
              minimum: product.outboundShippingTimeDay,
              maximum: product.outboundShippingTimeDay,
            },
            shipping_fee_type:
              deli_pri_emsplus && deli_pri_emsplus > 0 ? "R" : "T",
            // 배송비 타입
            shipping_rates: [
              {
                shipping_fee: deli_pri_emsplus, // 배송비
              },
            ],
            prepaid_shipping_fee: "P", // 배송비 선결제 설정
            detail_image: mainImage, // 상세이미지
            image_upload_type: "A", // 이미지 업로드 타입
            buy_limit_by_product: "T",
            buy_limit_type: "F",
            repurchase_restriction: "F",
            single_purchase_restriction: "F",
            buy_unit_type: "O",
            buy_unit: 1,
            order_quantity_limit_type: "O",
            minimum_quantity: 1,
            maximum_quantity: 1,
            points_by_product: "F",
            // points_setting_by_payment: "B",
            origin_classification: "T", // 원산지
            origin_place_no: 264,
            made_in_code: "CN",
            tax_type: "A",
            tax_amount: 10,
            additional_image: otherImage,
            adult_certification: "F", // 성인인증
          },
        };

        if (isSingle) {
          delete cafe24Product.request.options;
        }

        // console.log("cafe24Product---", cafe24Product.request)

        cafe24response = await Cafe24UpdateProduct({
          mallID: cafe24.mallID,
          payload: cafe24Product,
          product_no: product.cafe24_product_no,
        });
        // console.log("cafe24response", cafe24response)
        // console.log("**** 제품업데이트 ****")
        // const productTemp = await Product.findOne({
        //   userID,
        //   _id: id
        // })

        if (!isSingle) {
          await Cafe24DeleteProductsOption({
            mallID: cafe24.mallID,
            product_no: product.cafe24_product_no,
          });

          // console.log("**** 옵션삭제 ****", cafe24response)

          if (
            cafe24response &&
            cafe24response.data &&
            cafe24response.data.product
          ) {
            cafe24ProductsVariants = await Cafe24ListProductsVariants({
              mallID: cafe24.mallID,
              product_no: cafe24response.data.product.product_no,
            });
          }

          // options.map(item => {
          //   if (!item.cafe24) {
          //     item.cafe24 = {}
          //   }
          // })
          // console.log("options", options)
          // cafe24Option = {
          //   shop_no: cafe24.shop_no,
          //   has_option: "T",
          //   request: options
          //     .filter(item => {
          //       if(item.cafe24_variant_code){
          //         return true
          //       }
          //       if(item.cafe24 && item.cafe24.variant_code){
          //         return true
          //       }
          //       console.log("item.cafe24", item.cafe24)
          //       return false
          //     })
          //     .map((item, index) => {
          //       return {
          //         variant_code: item.cafe24_variant_code ? item.cafe24_variant_code : item.cafe24.variant_code,
          //         // custom_variant_code: options[index].key,
          //         display: "T",
          //         selling: "T",
          //         additional_amount: item.salePrice - price,
          //         quantity: item.stock,
          //         use_inventory: "T",
          //         important_inventory: "A",
          //         inventory_control_type: "A",
          //         display_soldout: "T",
          //         safety_inventory: 0
          //       }
          //     })
          // }

          cafe24Option = {
            shop_no: cafe24.shop_no,
            request: {
              has_option: isSingle ? "F" : "T",
              option_type: "T",
              option_list_type: "S",
              options:
                // !SplitOptions.filter((item) => item.active && !item.disabled)[0]
                //   .korKey &&
                // prop &&
                // Array.isArray(prop) &&
                // prop.length > 0
                //   ? prop.map((item) => {
                //       return {
                //         option_name: item.korTypeName,
                //         option_value: item.values.map((valueItem) => {
                //           return {
                //             option_text: regExp_test(valueItem.korValueName),
                //           };
                //         }),
                //         option_display_type: "S",
                //       };
                //     })
                //   :
                [
                  {
                    option_name: "종류",
                    option_value: SplitOptions.filter(
                      (item) => item.active && !item.disabled
                    ).map((item, index) => {
                      return {
                        option_text: regExp_test(
                          item.korKey ? item.korKey : item.korValue
                        ),
                      };
                    }),
                    option_display_type: "S",
                  },
                ],
            },
          };
          // console.log("cafe24Option", cafe24Option)

          const createProductsOptionResponse = await Cafe24CreateProductsOption(
            {
              mallID: cafe24.mallID,
              payload: cafe24Option,
              product_no: cafe24response.data
                ? cafe24response.data.product.product_no
                : product.cafe24_product_no,
            }
          );

          // console.log("**** 옵션 업데이트 ****")
          // console.log("createProductsOptionResponse", createProductsOptionResponse)
          cafe24ProductsVariants = await Cafe24ListProductsVariants({
            mallID: cafe24.mallID,
            product_no: cafe24response.data
              ? cafe24response.data.product.product_no
              : product.cafe24_product_no,
          });
          // console.log("cafe24ProductsVariants", cafe24ProductsVariants)
          cafe24ProductsVariants.data.variants.forEach((item) => {
            // console.log(" item ", item)
            const optionName =
              item.options && item.options.length > 0
                ? item.options[0].value
                : null;

            SplitOptions.forEach((oItem) => {
              // console.log(" oItem ", oItem)
              if (
                regExp_test(oItem.korValue) === optionName ||
                regExp_test(oItem.korKey) === optionName
              ) {
                if (!oItem.cafe24) {
                  oItem.cafe24 = {};
                }
                oItem.cafe24.variant_code = item.variant_code;
                // oItem.cafe24_variant_code = item.variant_code;
              }
            });
          });
        }
      } else {
        // 생성

        otherImage = [
          ...product.mainImages.filter((item, index) => index > 0),
          ...optionValue.map((item) => {
            if (item.image && item.image.includes("//img.alicdn.com/")) {
              return `${item.image}_800x800.jpg`;
            } else {
              return item.image;
            }
          }),
        ].filter((item) => !item || !item.includes("undefind"));

        if (otherImage.length > 20) {
          otherImage = otherImage.filter((item, index) => {
            if (index < 20) {
              return true;
            } else {
              return false;
            }
          });
        }

        if (isSingle) {
          otherImage = [];
        }

        // console.log("options-->", options)
        cafe24Product = {
          shop_no: cafe24.shop_no,
          request: {
            display: "T", // 진열상태
            selling: "T", // 판매상태
            product_condition: "N", // 상품상태
            add_category_no,
            custom_product_code: product.good_id, // 자체상품 코드
            product_name: korTitle, // 상품명
            price, // 상품 판매가
            retail_price, // 상품 소비자가
            supply_price: 0, // 상품 공급가
            has_option: isSingle ? "F" : "T", // 옵션 사용여부
            options:
              // !optionValue.filter((item) => item.active && !item.disabled)[0]
              //   .korKey &&
              // prop &&
              // Array.isArray(prop) &&
              // prop.length > 0 &&
              // (optionValue.filter((item) => item.active && !item.disabled)[0]
              //   .korKey === null ||
              //   (optionValue.filter((item) => item.active && !item.disabled)[0]
              //     .korKey &&
              //     optionValue.filter((item) => item.active && !item.disabled)[0]
              //       .korKey.length === 0))
              //   ? prop.map((item) => {
              //       return {
              //         name: item.korTypeName,
              //         value: item.values
              //           .filter((valueItem) => {
              //             const temp = item.values.filter(
              //               (vItem) =>
              //                 vItem.korValueName.trim() ===
              //                 valueItem.korValueName.trim()
              //             );

              //             if (temp.length > 1) {
              //               return false;
              //             }
              //             return true;
              //           })
              //           .map((valueItem) =>
              //             regExp_test(valueItem.korValueName)
              //           ),
              //       };
              //     })
              //   :
              [
                {
                  name: "종류",
                  value: SplitOptions.filter(
                    (item) => item.active && !item.disabled
                  )
                    .filter((valueItem) => {
                      if (valueItem.korKey) {
                        return true;
                      }
                      const temp = SplitOptions.filter(
                        (vItem) =>
                          vItem.korValue.toString().trim() ===
                          valueItem.korValue.toString().trim()
                      );
                      if (temp.length > 1) {
                        return false;
                      }
                      return true;
                    })
                    .map((item) => {
                      return regExp_test(
                        item.korKey ? item.korKey : item.korValue
                      );
                    }),
                },
              ],
            // options: [
            //   {
            //     name: "종류",
            //     value: options
            //       .filter(item => item.active && !item.disabled)
            //       .filter((i, index) => index < 100)
            //       .map(item => regExp_test(item.korKey ? item.korKey : item.korValue))
            //   }
            // ],
            product_weight: "1.00", // 상품 중량
            description: htmlContent, // 상품상세설명
            // summary_description: product.korTitle, // 상품요약설명
            simple_description: product.korTitle, // 상품간략설명
            product_tag: searchTags.join(), // 상품검색어
            payment_info: "상세페이지 참조", // 상품결제안내
            shipping_info: "상세페이지 참조", // 상품배송안내
            exchange_info: "상세페이지 참조", // 교환/반품안내
            service_info: "상세페이지 참조", // 서비스문의/안내
            shipping_scope: "A", // 배송정보
            shipping_method: "01", // 배송방법
            shipping_fee_by_product: "F", // 개별배송여부
            shipping_area: "국내", // 배송지역
            shipping_period: {
              // 배송기간
              minimum: product.outboundShippingTimeDay,
              maximum: product.outboundShippingTimeDay,
            },
            shipping_fee_type:
              deli_pri_emsplus && deli_pri_emsplus > 0 ? "R" : "T", // 배송비 타입
            shipping_rates: [
              {
                shipping_fee: deli_pri_emsplus,
              },
            ],
            prepaid_shipping_fee: "P", // 배송비 선결제 설정
            detail_image: mainImage, // 상세이미지
            image_upload_type: "A", // 이미지 업로드 타입
            buy_limit_by_product: "T",
            buy_limit_type: "F",
            repurchase_restriction: "F",
            single_purchase_restriction: "F",
            buy_unit_type: "O",
            buy_unit: 1,
            order_quantity_limit_type: "O",
            minimum_quantity: 1,
            maximum_quantity: 1,
            points_by_product: "F",
            // points_setting_by_payment: "B",
            origin_classification: "T", // 원산지
            origin_place_no: 264,
            made_in_code: "CN",
            tax_type: "A",
            tax_amount: 10,
            additional_image: otherImage,
            adult_certification: "F", // 성인인증
          },
        };

        if (isSingle) {
          delete cafe24Product.request.options;
        }

        cafe24response = await Cafe24CreateProduct({
          mallID: cafe24.mallID,
          payload: cafe24Product,
        });
        if (!cafe24response || !cafe24response.data) {
          console.log("cafe24reaponse", cafe24response);
          console.log("cafe24.mallID", cafe24.mallID);
          console.log("cafe24Product", cafe24Product);

          for (const item of cafe24Product.request.options) {
            console.log("ITE0--->", item);
          }
        }

        if (!isSingle) {
          cafe24ProductsVariants = await Cafe24ListProductsVariants({
            mallID: cafe24.mallID,
            product_no: cafe24response.data.product.product_no,
          });

          cafe24ProductsVariants.data.variants.forEach((item) => {
            let optionName = "";
            let i = 0;
            for (const optionItem of item.options) {
              if (i === 0) {
                optionName += optionItem.value;
              } else {
                optionName += ` ${optionItem.value}`;
              }
              i++;
            }

            SplitOptions.forEach((oItem) => {
              if (
                regExp_test(oItem.korValue) === optionName ||
                oItem.korValue === optionName ||
                regExp_test(oItem.korKey) === optionName ||
                oItem.korKey === optionName
              ) {
                if (!oItem.cafe24) {
                  oItem.cafe24 = {};
                }
                oItem.cafe24.variant_code = item.variant_code;
                // oItem.cafe24_variant_code = item.variant_code;
              }
            });
          });
        }

        // cafe24Option = {
        //   shop_no: cafe24.shop_no,
        //   request: {
        //     has_option: "T",
        //     option_type: "T",
        //     option_list_type: "S",
        //     options: [
        //       {
        //         option_name: "종류",
        //         option_value: options
        //           .filter(item => item.active && !item.disabled)
        //           .map((item, index) => {
        //             return {
        //               option_text: regExp_test(item.korKey ? item.korKey : item.korValue)
        //             }
        //           }),
        //         option_display_type: "S"
        //       }
        //     ]
        //   }
        // }
        // console.log("payload--", {
        //   mallID: cafe24.mallID,
        //   payload: cafe24Option,
        //   product_no: cafe24response.data.product.product_no
        // })
        // await Cafe24CreateProductsOption({
        //   mallID: cafe24.mallID,
        //   payload: cafe24Option,
        //   product_no: cafe24response.data.product.product_no
        // })
      }
      //////////////////////////
      if (!cafe24response.data) {
        returnMessage.code = "ERROR";
        returnMessage.message = cafe24response.message;

        return returnMessage;
      }

      product.cafe24.mallID = cafe24.mallID;
      product.cafe24.shop_no = cafe24response.data.product.shop_no;
      if (
        !product.cafe24.product_nos.includes(
          cafe24response.data.product.product_no
        )
      ) {
        product.cafe24.product_nos.push(cafe24response.data.product.product_no);
      }
      if (
        !product.cafe24.product_codes.includes(
          cafe24response.data.product.product_code
        )
      ) {
        product.cafe24.product_codes.push(
          cafe24response.data.product.product_code
        );
      }
      if (
        !product.cafe24.custom_product_codes.includes(
          cafe24response.data.product.custom_product_code
        )
      ) {
        product.cafe24.custom_product_codes.push(
          cafe24response.data.product.custom_product_code
        );
      }

      // product.cafe24.product_no = cafe24response.data.product.product_no;
      // product.cafe24.product_code = cafe24response.data.product.product_code;
      // product.cafe24.custom_product_code =
      //   cafe24response.data.product.custom_product_code;

      cafe24ProductsVariants = await Cafe24ListProductsVariants({
        mallID: cafe24.mallID,
        product_no: cafe24response.data.product.product_no,
      });

      options.map((item, i) => {
        if (!item.cafe24) {
          item.cafe24 = {};
        }
        if (
          isSingle &&
          cafe24ProductsVariants.data &&
          Array.isArray(cafe24ProductsVariants.data.variants) &&
          cafe24ProductsVariants.data.variants.length > i
        ) {
          item.cafe24.variant_code =
            cafe24ProductsVariants.data.variants[i].variant_code;
        }
      });

      const cafe24ProductVariantsPayload = {
        shop_no: cafe24.shop_no,
        request: optionValue
          .filter((item) => {
            if (item.cafe24_variant_code) {
              return true;
            }
            if (item.cafe24 && item.cafe24.variant_code) {
              return true;
            }

            return false;
          })
          .map((item, index) => {
            return {
              variant_code: item.cafe24_variant_code
                ? item.cafe24_variant_code
                : item.cafe24.variant_code,
              // custom_variant_code: options[index].key,
              display: "T",
              selling: "T",
              additional_amount: item.salePrice - deli_pri_emsplus - price,
              quantity: item.stock,
              use_inventory: "T",
              important_inventory: "A",
              inventory_control_type: "A",
              display_soldout: "T",
              safety_inventory: 0,
            };
          }),
      };
      // console.log("cafe24ProductVariantsPayload", cafe24ProductVariantsPayload)
      if (!isSingle) {
        // console.log("cafe24ProductVariantsPayload", cafe24ProductVariantsPayload.request)
        const variantsResponse = await Cafe24UpdateProductsVariants({
          mallID: cafe24.mallID,
          payload: cafe24ProductVariantsPayload,
          product_no: cafe24response.data.product.product_no,
        });
        // console.log("variantsResponse", variantsResponse)
        if (
          variantsResponse &&
          variantsResponse.data &&
          variantsResponse.data.variants
        ) {
          variantsResponse.data.variants.forEach((item) => {
            // console.log("item--", item)
            SplitOptions.filter((item) => item.cafe24_variant_code).forEach(
              (oItem) => {
                oItem.cafe24.variant_code = item.variant_code;
              }
            );
          });
        } else {
        }
      }

      for (const item of SplitOptions) {
        if (item.cafe24.variant_code) {
          await Cafe24UpdateProductsVariantsInventories({
            mallID: cafe24.mallID,
            payload: {
              shop_no: cafe24.shop_no,
              request: {
                use_inventory: "T",
                display_soldout: "T",
                quantity: item.stock,
              },
            },
            product_no: cafe24response.data.product.product_no,
            variant_code: item.cafe24.variant_code,
          });

          await sleep(500);
        }
      }
    }

    for (const item of options) {
      for (const SplitOptions of optionValue) {
        for (const sOption of SplitOptions) {
          if (item.propPath === sOption.propPath) {
            item.cafe24 = sOption.cafe24;
          }
        }
      }
    }

    const productTemp = await Product.findOne({ _id: id, isDelete: false });

    if (productTemp) {
      productTemp.product.coupang = productTemp.product.coupang;
    }

    await Product.findOneAndUpdate(
      {
        userID,
        _id: id,
      },
      {
        $set: {
          writerID: tempProduct ? tempProduct.writerID : writerID,
          product: productTemp.product,
          options,
          createdAt:
            productTemp && productTemp.createdAt
              ? productTemp.createdAt
              : moment().toDate(),
          cafe24UpdatedAt:
            productTemp && productTemp.cafe24UpdatedAt
              ? productTemp.cafe24UpdatedAt
              : moment().toDate(),
        },
      },
      {
        new: true,
        upsert: true,
      }
    );
  } catch (e) {
    console.log("updateCafe24", e);
  } finally {
    return returnMessage;
  }
};

module.exports = updateCafe24;
