const {
  Cafe24CreateProduct,
  Cafe24UpdateProduct,
  Cafe24UploadImages,
  Cafe24CreateProductsOption,
  Cafe24DeleteProductsOption,
  Cafe24ListProductsVariants,
  Cafe24UpdateProductsVariants,
  Cafe24UpdateProductsVariantsInventories,
} = require("../api/Market")
const moment = require("moment")
const { regExp_test } = require("../lib/userFunc")
const Product = require("../models/Product")
const Basic = require("../models/Basic")
const CategoryInfo = require("../models/CategoryInfo")
const mongoose = require("mongoose")
const ObjectId = mongoose.Types.ObjectId

const updateCafe24 = async ({ id, isSingle, product, prop, options, cafe24, userID, writerID }) => {
  const returnMessage = {
    cafe24: {
      code: null,
      message: null,
    },
  }

  try {
    let baseIndex = 0
    const inValidArr = []
    options.forEach((item) => {
      let salePrice = item.salePrice

      let minPassablePrice = Math.ceil((salePrice - (salePrice * 50) / 100) * 0.1) * 10
      let maxPassablePrice = Math.floor((salePrice + (salePrice * 50) / 100) * 0.1) * 10 - 10

      const inValid = []

      options
        .filter((item) => item.active && !item.disabled)
        .forEach((item1) => {
          if (item1.price < minPassablePrice || item1.price > maxPassablePrice) {
            inValid.push(item1)
          }
        })
      inValidArr.push(inValid.length)
    })

    const minValue = Math.min.apply(null, inValidArr)
    baseIndex = inValidArr.indexOf(minValue)

    let basePrice = options[0].salePrice
    let minPrice = basePrice - basePrice * 0.5
    let maxPrice = basePrice + basePrice * 0.5

    options
      .filter((item) => item.active && !item.disabled)
      .map((item, index) => {
        if (index === baseIndex) {
          item.base = true
          basePrice = item.salePrice
          minPrice = basePrice - basePrice * 0.5
          maxPrice = basePrice + basePrice * 0.5
        } else {
          item.base = false
        }
      })

    options.map((item) => {
      if (item.salePrice >= minPrice && item.salePrice <= maxPrice) {
        item.active = true
      } else {
        item.active = false
      }
    })

    const basic = await Basic.findOne({
      userID,
    })

    let searchTags = []

    const tempProduct = await Product.findOne({
      userID: ObjectId(userID),
      _id: ObjectId(id),
      isDelete: false,
    })

    if (tempProduct) {
      tempProduct.options.forEach((tItem, index) => {
        if (tItem.cafe24 && options[index]) {
          options[index].cafe24 = tItem.cafe24
        }
      })
      if (tempProduct.product.cafe24) {
        product.cafe24 = tempProduct.product.cafe24
      }
    }

    if (product.keyword && Array.isArray(product.keyword) && product.keyword.length > 0) {
      searchTags = product.keyword.map((item) => regExp_test(item.replace(/ /gi, "")))
    } else {
      searchTags = [...regExp_test(product.korTitle).split(" ")]
    }

    searchTags = searchTags.filter((item, i) => i < 5)

    const htmlContent = `${product.topHtml}${
      product.isClothes && product.clothesHtml ? product.clothesHtml : ""
    }${product.isShoes && product.shoesHtml ? product.shoesHtml : ""}${product.optionHtml}${
      product.html
    }${product.bottomHtml}`

    //
    let cafe24Product = null
    let mainImage = product.cafe24_mainImage ? product.cafe24_mainImage : null
    // let mainImage = null

    if (!product.cafe24) {
      product.cafe24 = {}
    }

    if (!mainImage) {
      const imagesResponse = await Cafe24UploadImages({
        mallID: cafe24.mallID,
        // images: [...product.mainImages, ...options.map(item => item.image)]
        images:
          product.mainImages && product.mainImages.length > 0
            ? [product.mainImages[0]]
            : [options[0].image],
      })

      imagesResponse &&
        imagesResponse.data &&
        imagesResponse.data.images &&
        imagesResponse.data.images.forEach((item, index) => {
          if (index === 0) {
            mainImage = item.path
              .replace(`http://${cafe24.mallID}.cafe24.com`, "")
              .replace(`https://${cafe24.mallID}.cafe24.com`, "")
            product.cafe24.mainImage = mainImage
          }
        })
    }

    let otherImage = []
    try {
      otherImage = [
        ...product.mainImages.filter((item, index) => index > 0),
        // ...options.map(item => `${item.image}_800x800.jpg`)
      ]
    } catch (e) {}

    if (otherImage.length > 20) {
      otherImage = otherImage.filter((item, index) => {
        if (index < 20) {
          return true
        } else {
          return false
        }
      })
    }

    let cafe24response = null
    let cafe24Option = null

    const categoryInfo = await CategoryInfo.findOne({
      userID: ObjectId(userID),
      naverCode: product.naverCategoryCode,
    })

    let add_category_no = null
    if (categoryInfo && categoryInfo.cafe24Code) {
      add_category_no = [
        {
          category_no: categoryInfo.cafe24Code,
          recommend: "F",
          new: "T",
        },
      ]
    }

    let price = 0
    let retail_price = 0
    if (options.filter((item) => item.active && !item.disabled && item.base).length === 0) {
      price = options.filter((item) => item.active && !item.disabled)[0].salePrice
      retail_price = options.filter((item) => item.active && !item.disabled)[0].productPrice
    } else {
      price = options.filter((item) => item.active && !item.disabled && item.base)[0].salePrice
      retail_price = options.filter((item) => item.active && !item.disabled && item.base)[0]
        .productPrice
    }

    if (!price) {
      price = options[0].salePrice
      retail_price = options[0].productPrice
    }

    if (!price) {
      await Product.findOneAndUpdate(
        {
          _id: ObjectId(id),
          userID,
        },
        {
          $set: {
            isDelete: true,
          },
        }
      )
      return
    }

    if (basic && basic.kiprisInter) {
      const kiprise = await getKiprisWords(product.korTitle)
      let tempKorTitleArray = product.korTitle.split(" ")
      let tempKorTitle = ""
      let kipriseAray = kiprise.filter((item) => item.result === true)
      for (const item of kipriseAray) {
        while (tempKorTitleArray.indexOf(item.search) !== -1) {
          tempKorTitleArray.splice(tempKorTitleArray.indexOf(item.search), 1)
        }
      }
      tempKorTitle = tempKorTitleArray.join(" ")
      product.korTitle = tempKorTitle
    }

    //// 카페 24 ////

    let cafe24ProductsVariants = null
    // console.log("product.cafe24_product_no", product.cafe24_product_no)

    if (product.cafe24_product_no) {
      otherImage = [
        ...product.mainImages.filter((item, index) => index > 0),
        ...options.map((item) => {
          if (item.image.includes("//img.alicdn.com/")) {
            return `${item.image}_800x800.jpg`
          } else {
            return item.image
          }
        }),
      ]

      if (otherImage.length > 20) {
        otherImage = otherImage.filter((item, index) => {
          if (index < 20) {
            return true
          } else {
            return false
          }
        })
      }

      if (isSingle) {
        otherImage = []
      }
      // 수정
      cafe24Product = {
        shop_no: cafe24.shop_no,
        request: {
          display: "T", // 진열상태
          selling: isSingle ? (options[0].stock === 0 ? "F" : "T") : "T", // 판매상태
          product_condition: "N", // 상품상태
          add_category_no,
          custom_product_code: product.good_id, // 자체상품 코드
          product_name: product.korTitle, // 상품명
          price, // 상품 판매가
          retail_price, // 상품 소비자가
          supply_price: 0, // 상품 공급가
          has_option: isSingle ? "F" : "T", // 옵션 사용여부
          options:
            !options.filter((item) => item.active && !item.disabled)[0].korKey &&
            prop &&
            Array.isArray(prop) &&
            prop.length > 0 &&
            (options.filter((item) => item.active && !item.disabled)[0].korKey === null ||
              (options.filter((item) => item.active && !item.disabled)[0].korKey &&
                options.filter((item) => item.active && !item.disabled)[0].korKey.length === 0))
              ? prop.map((item) => {
                  return {
                    name: item.korTypeName,
                    value: item.values.map((valueItem) => valueItem.korValueName),
                  }
                })
              : [
                  {
                    name: "종류",
                    value: options
                      .filter((item) => item.active && !item.disabled)
                      .filter((i, index) => index < 100)
                      .map((item) => regExp_test(item.korKey ? item.korKey : item.korValue)),
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
          shipping_fee_type: product.deliveryChargeType === "FREE" ? "T" : "R", // 배송비 타입
          shipping_rates: [
            {
              shipping_fee: product.deliveryCharge, // 배송비
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
      }

      if (isSingle) {
        delete cafe24Product.request.options
      }

      cafe24response = await Cafe24UpdateProduct({
        mallID: cafe24.mallID,
        payload: cafe24Product,
        product_no: product.cafe24_product_no,
      })
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
        })

        // console.log("**** 옵션삭제 ****", cafe24response)

        if (cafe24response && cafe24response.data && cafe24response.data.product) {
          cafe24ProductsVariants = await Cafe24ListProductsVariants({
            mallID: cafe24.mallID,
            product_no: cafe24response.data.product.product_no,
          })
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
              !options.filter((item) => item.active && !item.disabled)[0].korKey &&
              prop &&
              Array.isArray(prop) &&
              prop.length > 0
                ? prop.map((item) => {
                    return {
                      option_name: item.korTypeName,
                      option_value: item.values.map((valueItem) => {
                        return {
                          option_text: regExp_test(valueItem.korValueName),
                        }
                      }),
                      option_display_type: "S",
                    }
                  })
                : [
                    {
                      option_name: "종류",
                      option_value: options
                        .filter((item) => item.active && !item.disabled)
                        .map((item, index) => {
                          return {
                            option_text: regExp_test(item.korKey ? item.korKey : item.korValue),
                          }
                        }),
                      option_display_type: "S",
                    },
                  ],
          },
        }

        const createProductsOptionResponse = await Cafe24CreateProductsOption({
          mallID: cafe24.mallID,
          payload: cafe24Option,
          product_no: cafe24response.data.product.product_no,
        })

        // console.log("**** 옵션 업데이트 ****")
        cafe24ProductsVariants = await Cafe24ListProductsVariants({
          mallID: cafe24.mallID,
          product_no: cafe24response.data.product.product_no,
        })

        cafe24ProductsVariants.data.variants.forEach((item) => {
          const optionName = item.options && item.options.length > 0 ? item.options[0].value : null

          options.forEach((oItem) => {
            if (
              regExp_test(oItem.korValue) === optionName ||
              regExp_test(oItem.korKey) === optionName
            ) {
              oItem.cafe24_variant_code = item.variant_code
            }
          })
        })
      }
    } else {
      // 생성

      otherImage = [
        ...product.mainImages.filter((item, index) => index > 0),
        ...options.map((item) => {
          if (item.image.includes("//img.alicdn.com/")) {
            return `${item.image}_800x800.jpg`
          } else {
            return item.image
          }
        }),
      ]

      if (otherImage.length > 20) {
        otherImage = otherImage.filter((item, index) => {
          if (index < 20) {
            return true
          } else {
            return false
          }
        })
      }

      if (isSingle) {
        otherImage = []
      }

      cafe24Product = {
        shop_no: cafe24.shop_no,
        request: {
          display: "T", // 진열상태
          selling: "T", // 판매상태
          product_condition: "N", // 상품상태
          add_category_no,
          custom_product_code: product.good_id, // 자체상품 코드
          product_name: product.korTitle, // 상품명
          price, // 상품 판매가
          retail_price, // 상품 소비자가
          supply_price: 0, // 상품 공급가
          has_option: isSingle ? "F" : "T", // 옵션 사용여부
          options:
            !options.filter((item) => item.active && !item.disabled)[0].korKey &&
            prop &&
            Array.isArray(prop) &&
            prop.length > 0 &&
            (options.filter((item) => item.active && !item.disabled)[0].korKey === null ||
              (options.filter((item) => item.active && !item.disabled)[0].korKey &&
                options.filter((item) => item.active && !item.disabled)[0].korKey.length === 0))
              ? prop.map((item) => {
                  return {
                    name: item.korTypeName,
                    value: item.values
                      .filter((valueItem) => {
                        const temp = item.values.filter(
                          (vItem) => vItem.korValueName.trim() === valueItem.korValueName.trim()
                        )

                        if (temp.length > 1) {
                          return false
                        }
                        return true
                      })
                      .map((valueItem) => regExp_test(valueItem.korValueName)),
                  }
                })
              : [
                  {
                    name: "종류",
                    value: options
                      .filter((item) => item.active && !item.disabled)
                      .filter((valueItem) => {
                        const temp = options.filter(
                          (vItem) =>
                            vItem.korValue.toString().trim() ===
                            valueItem.korValue.toString().trim()
                        )
                        if (temp.length > 1) {
                          return false
                        }
                        return true
                      })
                      .map((item) => {
                        return regExp_test(item.korKey ? item.korKey : item.korValue)
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
          shipping_fee_type: product.deliveryChargeType === "FREE" ? "T" : "R", // 배송비 타입
          shipping_rates: [
            {
              shipping_fee: product.deliveryCharge, // 배송비
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
      }

      if (isSingle) {
        delete cafe24Product.request.options
      }
      cafe24response = await Cafe24CreateProduct({
        mallID: cafe24.mallID,
        payload: cafe24Product,
      })
      if (!cafe24response || !cafe24response.data) {
        console.log("cafe24reaponse", cafe24response)
        console.log("cafe24.mallID", cafe24.mallID)
        console.log("cafe24Product", cafe24Product)
      }

      if (!isSingle) {
        cafe24ProductsVariants = await Cafe24ListProductsVariants({
          mallID: cafe24.mallID,
          product_no: cafe24response.data.product.product_no,
        })

        cafe24ProductsVariants.data.variants.forEach((item) => {
          let optionName = ""
          let i = 0
          for (const optionItem of item.options) {
            if (i === 0) {
              optionName += optionItem.value
            } else {
              optionName += ` ${optionItem.value}`
            }
            i++
          }

          options.forEach((oItem) => {
            if (
              regExp_test(oItem.korValue) === optionName ||
              oItem.korValue === optionName ||
              regExp_test(oItem.korKey) === optionName ||
              oItem.korKey === optionName
            ) {
              oItem.cafe24_variant_code = item.variant_code
            }
          })
        })
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
      returnMessage.cafe24.code = "ERROR"
      returnMessage.cafe24.message = cafe24response.message

      return returnMessage
    }

    product.cafe24.mallID = cafe24.mallID
    product.cafe24.shop_no = cafe24response.data.product.shop_no
    product.cafe24.product_no = cafe24response.data.product.product_no
    product.cafe24.product_code = cafe24response.data.product.product_code
    product.cafe24.custom_product_code = cafe24response.data.product.custom_product_code

    cafe24ProductsVariants = await Cafe24ListProductsVariants({
      mallID: cafe24.mallID,
      product_no: cafe24response.data.product.product_no,
    })

    options.map((item, i) => {
      if (!item.cafe24) {
        item.cafe24 = {}
      }
      if (
        isSingle &&
        cafe24ProductsVariants.data &&
        Array.isArray(cafe24ProductsVariants.data.variants) &&
        cafe24ProductsVariants.data.variants.length > i
      ) {
        item.cafe24.variant_code = cafe24ProductsVariants.data.variants[i].variant_code
      }
    })

    const cafe24ProductVariantsPayload = {
      shop_no: cafe24.shop_no,
      request: options
        .filter((item) => {
          if (item.cafe24_variant_code) {
            return true
          }
          if (item.cafe24 && item.cafe24.variant_code) {
            return true
          }

          return false
        })
        .map((item, index) => {
          return {
            variant_code: item.cafe24_variant_code
              ? item.cafe24_variant_code
              : item.cafe24.variant_code,
            // custom_variant_code: options[index].key,
            display: "T",
            selling: "T",
            additional_amount: item.salePrice - price,
            quantity: item.stock,
            use_inventory: "T",
            important_inventory: "A",
            inventory_control_type: "A",
            display_soldout: "T",
            safety_inventory: 0,
          }
        }),
    }

    if (!isSingle) {
      // console.log("cafe24ProductVariantsPayload", cafe24ProductVariantsPayload.request)
      const variantsResponse = await Cafe24UpdateProductsVariants({
        mallID: cafe24.mallID,
        payload: cafe24ProductVariantsPayload,
        product_no: cafe24response.data.product.product_no,
      })
      // console.log("variantsResponse", variantsResponse)
      if (variantsResponse && variantsResponse.data && variantsResponse.data.variants) {
        variantsResponse.data.variants.forEach((item) => {
          options
            .filter((item) => item.cafe24_variant_code)
            .forEach((oItem) => {
              oItem.cafe24.variant_code = item.variant_code
            })
        })
      } else {
      }
    }

    for (const item of options) {
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
        })
      }
    }

    const productTemp = await Product.findOne({ _id: id, isDelete: false })

    if (productTemp) {
      product.coupang = productTemp.product.coupang
    }

    await Product.findOneAndUpdate(
      {
        userID,
        _id: id,
      },
      {
        $set: {
          writerID: tempProduct ? tempProduct.writerID : writerID,
          product,
          options,
          createdAt:
            productTemp && productTemp.createdAt ? productTemp.createdAt : moment().toDate(),
          cafe24UpdatedAt:
            productTemp && productTemp.cafe24UpdatedAt
              ? productTemp.cafe24UpdatedAt
              : moment().toDate(),
        },
      },
      {
        upsert: true,
      }
    )
  } catch (e) {
    console.log("updateCafe24", e)
  } finally {
    return returnMessage
  }
}

module.exports = updateCafe24
