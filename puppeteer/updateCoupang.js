const Product = require("../models/Product");
const {
  CoupnagGET_PRODUCT_BY_PRODUCT_ID,
  CoupnagUPDATE_PRODUCT_QUANTITY_BY_ITEM,
  CoupnagUPDATE_PRODUCT_PRICE_BY_ITEM,
  CoupnagSTOP_PRODUCT_SALES_BY_ITEM,
  CoupnagUpdateProduct,
  CoupnagRESUME_PRODUCT_SALES_BY_ITEM,
  CoupnagCreateProduct,
} = require("../api/Market");
const { imageCheck, regExp_test } = require("../lib/userFunc");
const moment = require("moment");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const _ = require("lodash");
const CoupangCategory = require("../models/CoupangCatetory");

const updateCoupang = async ({
  id,
  basic,
  product,
  prop,
  options,
  coupang,
  userID,
  writerID,
  deli_pri_cupang,
}) => {
  const returnMessage = {
    productID: null,
    message: null,
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

    const salePrice = options[0].salePrice - deli_pri_cupang;

    let minSalePrice = salePrice;
    options
      // .filter((item) => item.active && !item.disabled)
      .filter((i, index) => index < 100)
      .map((item) => {
        if (item.salePrice < minSalePrice) {
          minSalePrice = item.salePrice - deli_pri_cupang;
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
        deliveryCharge: deli_pri_cupang,
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
              salePrice: item.salePrice - deli_pri_cupang, //판매가격
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
        deliveryCharge: deli_pri_cupang,
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
            salePrice: item.salePrice - deli_pri_cupang, //판매가격
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
      returnMessage.message = coupangProductResponse.message;

      return returnMessage;
    } else {
      if (!product.coupang) {
        product.coupang = {};
      }

      if (coupangProductResponse.code === "SUCCESS") {
        returnMessage.productID = `${coupangProductResponse.data}`;

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
        returnMessage.message = coupangProductResponse.message;
      }

      // const productResponse = await Product.create({
      //   userID: ObjectId(userID),
      //   writerID: tempProduct ? tempProduct.writerID : writerID,
      //   basic,
      //   product,
      //   prop,
      //   options,
      //   coupang,
      //   isSoEasy: true,
      //   createdAt: moment().toDate(),
      //   initCreatedAt: moment().toDate(),
      //   coupangUpdatedAt: moment().toDate(),
      // });
      // returnMessage.coupang.message = productResponse._id;
    }
  } catch (e) {
    console.log("updateCoupang", e);
  } finally {
    return returnMessage;
  }
};

module.exports = updateCoupang;

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
