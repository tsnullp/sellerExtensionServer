const {
  ItemSKU,
  ItemSKUV2,
  ItemDescription,
  ItemDescriptionV2,
  ItemDetails,
} = require("../api/Taobao")
const { AmazonAsin } = require("../lib/userFunc")
const { korTranslate } = require("./translate")
const { getMainKeyword } = require("./keywordSourcing")

const start = async ({ url, cnTitle, userID, orginalTitle }) => {
  const ObjItem = {
    brand: "기타",
    manufacture: "기타",
    good_id: AmazonAsin(url),
    title: "",
    mainImages: [],
    price: 0,
    salePrice: 0,
    content: [],
    options: [],
    attribute: [],
    taobaoAttributes: [],
    exchange: "",
    marginInfo: [],
    shippingWeightInfo: [],
  }

  try {
    // await page.setJavaScriptEnabled(true)

    const promiseArr = [
      new Promise(async (resolve, reject) => {
        try {
          ObjItem.content = await getContent({
            itemId: ObjItem.good_id,
          })

          const { title, options, tempMainImages, tempOptionImages, prop } = await getOptionsV2({
            itemId: ObjItem.good_id,
            userID,
            url,
            // mainImage: Array.isArray(mainImages) && mainImages.length > 0 ? mainImages[0] : null
          })
          if (title) {
            ObjItem.korTitle = await korTranslate(title.trim())
          } else {
            ObjItem.title = cnTitle
            ObjItem.korTitle = await korTranslate(cnTitle)
          }

          ObjItem.mainKeyword = await getMainKeyword(ObjItem.korTitle)

          if (ObjItem.mainKeyword.length === 0) {
            ObjItem.mainKeyword = await getMainKeyword(ObjItem.korTitle, true)
          }

          ObjItem.options = options
          ObjItem.optionImage = tempOptionImages
          ObjItem.prop = prop

          ObjItem.mainImages = tempMainImages

          resolve()
        } catch (e) {
          reject(e)
        }
      }),
    ]

    await Promise.all(promiseArr)
  } catch (e) {
    console.log("getTaobaoItemAPI", e)
  } finally {
    // console.log("ObjItem", ObjItem.options)
    // for(const item of ObjItem.options){
    //   console.log("option_--", item.attributes)
    // }
    for (const pItem of ObjItem.prop) {
      for (const item of pItem.values) {
        // console.log("item.", item)
        ObjItem.taobaoAttributes.push({
          attributeTypeName: pItem.korTypeName,
          attributeValueName: item.korValueName,
        })
      }
    }

    // console.log("ObjItem", ObjItem.attributes)
    return ObjItem
  }
}

module.exports = start

const getOptionsV2 = async ({ itemId, userID, url }) => {
  let tempTitle = ""
  let tempOption = []
  let tempMainImages = []
  let tempOptionImages = []
  let tempProp = []
  try {
    console.log("getOptionsV2 시작")
    const response = await ItemSKUV2({ item_id: itemId })

    if (response.skus) {
      console.log("getOptionsV2 끝", response.skus.length)
    } else {
      console.log("getOptionsV2 실패")
    }
    const { title, sku_props, skus, main_imgs } = response

    // tempMainImags.push(
    //   item.pic.includes("https:") ? item.pic : `https:${item.pic}`
    // )

    tempTitle = title
    tempMainImages = main_imgs

    if (sku_props && sku_props.length > 0) {
      let ii = 0
      for (const item of sku_props) {
        item.korTypeName = await korTranslate(item.prop_name.trim())

        try {
          let valueNamesArr = []

          for (const value of item.values) {
            valueNamesArr.push(value.name.replace(/#/gi, "").trim())
          }

          const tempValueKor = await korTranslate(valueNamesArr.join("#"))
          const tempValueKorArr = tempValueKor.split("#")

          let i = 0
          for (const value of item.values) {
            value.korValueName = tempValueKorArr[i].trim()

            if (value.imageUrl) {
              const imageUrl = value.imageUrl.replace("https:", "").replace("http:", "")
              value.image = imageUrl.includes("http")
                ? imageUrl
                : imageUrl
                ? `https:${imageUrl}`
                : tempMainImages[0]
              tempOptionImages.push({
                vid: value.vid,
                name: value.name,
                korName: value.korValueName,
                image: imageUrl.includes("http")
                  ? imageUrl
                  : imageUrl
                  ? `https:${imageUrl}`
                  : tempMainImages[0],
              })
            } else {
              if (ii === 0) {
                value.image = tempMainImages && tempMainImages.length > 0 ? tempMainImages[0] : null
              }
            }
            i++
          }
        } catch (e) {
          console.log("번역 오류")

          tempOptionImages = []
          for (const value of item.values) {
            value.korValueName = await korTranslate(value.name)

            if (value.imageUrl) {
              const imageUrl = value.imageUrl.replace("https:", "").replace("http:", "")
              value.image = imageUrl.includes("http")
                ? imageUrl
                : imageUrl
                ? `https:${imageUrl}`
                : tempMainImages[0]
              tempOptionImages.push({
                vid: value.vid,
                name: value.name,
                korName: value.korValueName,
                image: imageUrl.includes("http")
                  ? imageUrl
                  : imageUrl
                  ? `https:${imageUrl}`
                  : tempMainImages[0],
              })
            } else {
              if (ii === 0) {
                value.image = tempMainImages && tempMainImages.length > 0 ? tempMainImages[0] : null
              }
            }
          }
        }
        ii++
        // console.log("ITEM__", item)
      }
      console.log("번역 끝")
      if (sku_props.length === 1) {
        for (const pItem of sku_props[0].values) {
          const propPath = `${sku_props[0].pid}:${pItem.vid}`
          let skuId = null
          let price,
            promotion_price,
            quantity = 0

          const filterSku = skus
            .filter((item) => item.props_ids === propPath)
            .filter((item) => Number(item.stock) > 0)
          if (filterSku.length > 0) {
            skuId = filterSku[0].skuid
            price = filterSku[0].sale_price
            promotion_price = filterSku[0].sale_price
            quantity = filterSku[0].stock

            let imageUrl = null
            if (pItem.imageUrl) {
              imageUrl = pItem.imageUrl.replace("https:", "").replace("http:", "")
            } else {
              imageUrl = main_imgs[0]
            }

            tempOption.push({
              key: skuId,
              propPath,
              price: price ? price : 0,
              promotion_price: promotion_price ? promotion_price : 0,
              stock: quantity ? quantity : 0,
              image: imageUrl && imageUrl.includes("http") ? imageUrl : `https:${imageUrl}`,
              attributes: [
                {
                  typeName: sku_props[0].name,
                  attributeTypeName: sku_props[0].korTypeName,
                  valueName: pItem.name,
                  attributeValueName: pItem.korValueName,
                },
              ],
              disabled: skuId ? false : true,
              active: skuId ? true : false,
              value: pItem.name,
              korValue: pItem.korValueName,
            })
          }
        }
      } else if (sku_props.length === 2) {
        for (const pItem of sku_props[0].values) {
          for (const vItem of sku_props[1].values) {
            let propPath = `${sku_props[0].pid}:${pItem.vid};${sku_props[1].pid}:${vItem.vid}`

            // console.log("propPath", propPath)
            let skuId = null
            let price,
              promotion_price,
              quantity = 0
            // console.log("skus", skus)
            let filterSku = skus
              .filter((item) => item.props_ids === propPath)
              .filter((item) => Number(item.stock) > 0)
            if (filterSku.length > 0) {
              skuId = filterSku[0].skuid
              price = filterSku[0].sale_price
              promotion_price = filterSku[0].sale_price
              quantity = filterSku[0].stock
            } else {
              propPath = `${sku_props[1].pid}:${vItem.vid};${sku_props[0].pid}:${pItem.vid}`
              filterSku = skus.filter((item) => item.props_ids === propPath)
              if (filterSku.length > 0) {
                skuId = filterSku[0].skuid
                price = filterSku[0].sale_price
                promotion_price = filterSku[0].sale_price
                quantity = filterSku[0].stock
              }
            }

            if (filterSku.length > 0) {
              let imageUrl = pItem.imageUrl
                ? pItem.imageUrl.replace("https:", "").replace("http:", "")
                : vItem.imageUrl
                ? vItem.imageUrl.replace("https:", "").replace("http:", "")
                : null

              tempOption.push({
                key: skuId,
                propPath,
                price: price ? price : 0,
                promotion_price: promotion_price ? promotion_price : 0,
                stock: quantity ? quantity : 0,
                image: imageUrl && imageUrl.includes("https") ? imageUrl : `https:${imageUrl}`,
                attributes: [
                  {
                    typeName: sku_props[0].name,
                    attributeTypeName: sku_props[0].korTypeName,
                    valueName: pItem.name,
                    attributeValueName: pItem.korValueName,
                  },
                  {
                    typeName: sku_props[1].name,
                    attributeTypeName: sku_props[1].korTypeName,
                    valueName: vItem.name,
                    attributeValueName: vItem.korValueName,
                  },
                ],
                disabled: skuId ? false : true,
                active: skuId ? true : false,
                korValue: `${pItem.korValueName} ${vItem.korValueName}`,
              })
            }
          }
        }
      } else if (sku_props.length === 3) {
        //https://detail.tmall.com/item.htm?id=613191480612
        for (const pItem of sku_props[0].values) {
          for (const vItem of sku_props[1].values) {
            for (const v2Item of sku_props[2].values) {
              let propPath = `${sku_props[2].pid}:${v2Item.vid};${sku_props[1].pid}:${vItem.vid};${sku_props[0].pid}:${pItem.vid}`

              let skuId = null
              let price,
                promotion_price,
                quantity = 0

              let filterSku = skus
                .filter((item) => item.props_ids === propPath)
                .filter((item) => Number(item.stock) > 0)
              if (filterSku.length > 0) {
                skuId = filterSku[0].skuid
                price = filterSku[0].sale_price
                promotion_price = filterSku[0].sale_price
                quantity = filterSku[0].quantity
              } else {
                propPath = `${sku_props[0].pid}:${pItem.vid};${sku_props[1].pid}:${vItem.vid};${sku_props[2].pid}:${v2Item.vid}`
                filterSku = skus.filter((item) => item.props_ids === propPath)
                if (filterSku.length > 0) {
                  skuId = filterSku[0].skuid
                  price = filterSku[0].sale_price
                  promotion_price = filterSku[0].sale_price
                  quantity = filterSku[0].quantity
                }
              }

              if (filterSku.length > 0) {
                let imageUrl = pItem.imageUrl
                  ? pItem.imageUrl.replace("https:", "").replace("http:", "")
                  : vItem.imageUrl
                  ? vItem.imageUrl.replace("https:", "").replace("http:", "")
                  : v2Item.imageUrl.replace("https:", "")

                tempOption.push({
                  key: skuId,
                  propPath,
                  price: price ? price : 0,
                  promotion_price: promotion_price ? promotion_price : 0,
                  stock: quantity ? quantity : 0,
                  image: imageUrl && imageUrl.includes("https") ? imageUrl : `https:${imageUrl}`,
                  attributes: [
                    {
                      typeName: sku_props[0].name,
                      attributeTypeName: sku_props[0].korTypeName,
                      valueName: pItem.name,
                      attributeValueName: pItem.korValueName,
                    },
                    {
                      typeName: sku_props[1].name,
                      attributeTypeName: sku_props[1].korTypeName,
                      valueName: vItem.name,
                      attributeValueName: vItem.korValueName,
                    },
                    {
                      typeName: sku_props[2].name,
                      attributeTypeName: sku_props[2].korTypeName,
                      valueName: v2Item.name,
                      attributeValueName: v2Item.korValueName,
                    },
                  ],
                  disabled: skuId ? false : true,
                  active: skuId ? true : false,
                  korValue: `${pItem.korValueName} ${vItem.korValueName} ${v2Item.korValueName}`,
                })
              }
            }
          }
        }
      }

      // for(const item of sku_props){
      //   console.log("sku_props", item)
      // }

      tempProp = sku_props

      // for(const sku of sku_base.skus){

      //   const propPath = sku.propPath.substring(1, sku.propPath.length -1)
      //   const propPathArr = propPath.split(";")
      //   let value = ``
      //   let korValue = ``
      //   let image = null
      //   for(const path of propPathArr){
      //     if(path.split(":").length === 2){
      //       const pid = path.split(":")[0]
      //       const vid = path.split(":")[1]
      //       const propsValue = response.prop.filter(item => item.pid === pid)[0].values.filter(item => item.vid === vid)[0]
      //       value += `${propsValue.name} `
      //       korValue += `${propsValue.korValue} `
      //       if(propsValue.image){
      //         image = `https:${propsValue.image}`
      //       }
      //     }
      //   }

      //   tempOption.push({
      //     key: sku.skuId,
      //     value: value.trim(),
      //     korValue: korValue.length > 0 ? korValue.trim() : "단일상품",
      //     image: image ? image : `https:${response.item.pic}`,
      //     price: skus[sku.skuId].promotion_price ? skus[sku.skuId].promotion_price :skus[sku.skuId].price,
      //     stock: skus[sku.skuId].quantity,
      //     disabled: false,
      //     active: true
      //   })

      // }
    } else {
      for (const item of skus.filter((item) => Number(item.stock) > 0)) {
        tempOption.push({
          key: item.skuid,
          value: "单一商品",
          korValue: "단일상품",
          image: tempMainImages && tempMainImages.length > 0 ? tempMainImages[0] : null,
          price: item.sale_price,
          stock: item.stock,
          disabled: false,
          active: true,
          attributes: [
            {
              attributeTypeName: "종류",
              attributeValueName: "단일상품",
            },
          ],
        })
      }
      // tempOption.push({
      //   key: "1",
      //   value: "单一商品",
      //   korValue: "단일상품",
      //   image: `https:${item.pic}`,
      //   price: item.promotion_price ? item.promotion_price : item.price,
      //   stock: item.quantity,
      //   disabled: false,
      //   active: true
      // })
    }

    tempOption = tempOption.filter((item) => {
      if (item.korValue.includes("고객")) {
        return false
      }
      if (item.korValue.includes("커스텀")) {
        return false
      }
      if (item.korValue.includes("연락")) {
        return false
      }
      if (item.korValue.includes("문의")) {
        return false
      }
      if (item.korValue.includes("주문")) {
        return false
      }
      if (item.korValue.includes("참고")) {
        return false
      }
      if (item.korValue.includes("이벤트")) {
        return false
      }
      if (item.korValue.includes("맞춤")) {
        return false
      }
      if (item.korValue.includes("상담")) {
        return false
      }
      if (item.korValue.includes("사용자")) {
        return false
      }
      if (item.korValue.includes("옵션")) {
        return false
      }
      if (item.korValue.includes("사진")) {
        return false
      }
      if (item.korValue.includes("비고")) {
        return false
      }
      if (item.korValue.includes("무료")) {
        return false
      }
      if (item.korValue.includes("Express")) {
        return false
      }
      if (item.korValue.includes("예약")) {
        return false
      }
      if (item.korValue.includes("메시지")) {
        return false
      }
      if (item.korValue.includes("서비스")) {
        return false
      }
      if (item.korValue.includes("구독")) {
        return false
      }
      if (item.korValue.includes("경품")) {
        return false
      }
      if (item.korValue.includes(">>>")) {
        return false
      }
      return true
    })
  } catch (e) {
    console.log("eeee", e)
    // try {
    //   const { title, mainImages, price, salePrice, content } = await getDetail({
    //     itemId,
    //     userID,
    //     url,
    //   })

    //   const optionValue = await getOptions({
    //     itemId,
    //   })
    //   console.log("optionValue", optionValue)
    //   ;(tempTitle = title), (tempOption = optionValue.options)
    //   tempMainImages =
    //     mainImages && mainImages.length > 0
    //       ? mainImages
    //       : optionValue.tempMainImages.map((item) => item.image)
    //   tempOptionImages = optionValue.tempMainImages
    //   tempProp = optionValue.prop
    // } catch (e) {
    //   console.log("에러", e)
    // }
  } finally {
    return {
      title: tempTitle,
      options: tempOption.filter((item) => !item.image.includes("undefind")),
      tempMainImages: tempMainImages,
      tempOptionImages: tempOptionImages,
      prop: tempProp,
    }
  }
}

const getContent = async ({ itemId }) => {
  let content = []
  try {
    let response = await ItemDescriptionV2({ item_id: itemId })

    if (response && response.code === 200 && response.data.detail_imgs.length > 0) {
      content = response.data.detail_imgs.map((item) => {
        return item.includes("http") ? item : `https:${item}`
      })
    } else {
      // response = await ItemDescription({ num_iid: itemId })
      // if (response && response.status.code === 200) {
      //   content = response.item.map((item) => {
      //     return item.includes("http") ? item : `https:${item}`
      //   })
      // }
    }
  } catch (e) {
    console.log("getContent", e)
  } finally {
    return content
  }
}

const getDetail = async ({ itemId, userID, url }) => {
  const detail = {}
  try {
    const response = await ItemDetails({ num_iid: itemId })

    if (response && response.result.status.msg === "success") {
      const { item } = response.result

      detail.title = item.title
      detail.mainImages = item.images.map((item) =>
        item.includes("http") ? item : `https:${item}`
      )

      detail.price = item.price
      detail.salePrice = item.promotion_price
    } else {
      console.log("getDetail - response", response)

      // const browser = await startBrowser()
      // const page = await browser.newPage()
      // const detailItem = await findTaobaoDetail({
      //   page,
      //   url,
      //   userID
      // })
      // console.log("detailITem", detailItem)
      // if (page) {
      //   await page.goto("about:blank")
      //   await page.close()
      // }
      // if (browser) {
      //   await browser.close()
      // }
    }
    // if(response && response.statusCode === 200){
    //   const {data} = response

    //   detail.title = data.title
    //   detail.mainImages = data.item_imgs.map(item => {
    //     if(item.url.includes("https:")){
    //       return item.url
    //     } else {
    //       return `https:${item.url}`
    //     }

    //   })
    //   detail.price = data.price
    //   detail.salePrice = data.orginal_price
    //   detail.content = data.desc_img

    //   // console.log("prop_imgs", data.prop_imgs)
    //   // console.log("props_imgs", data.props_imgs)
    //   // console.log("props", data.props)
    //   console.log("skus:sku", data.skus.sku)
    //   console.log("props_list:", data.props_list)
    //   // console.log("props_img:", data.props_img)

    //   // for(const option of data.skus.sku){
    //   //   console.log("option", option)
    //   //   for(const propertiesName of option.properties_name.split(";")){

    //   //   }
    //   // }
    //   const propsList = {}
    //   for(const [key, value] of Object.entries(data.props_list)){
    //     // console.log(`${key}: ${value}`)
    //     if(!propsList[key.split(":")[0]]){
    //       propsList[key.split(":")[0]] = []
    //     }
    //     propsList[key.split(":")[0]].push({
    //       key1: key.split(":")[0],
    //       key2: key.split(":")[1],
    //       name: value.split(":")[0],
    //       value: value.split(":")[1],
    //     })
    //   }
    //   const propsArray = []
    //   for(const [key, value] of Object.entries(propsList)){

    //     propsArray.push(
    //       {
    //         key: key,
    //         name: value[0].name,
    //         values: value.map(item => {

    //           let image = null
    //           const propsImgs = data.prop_imgs.prop_img.filter(fItem => fItem.properties === `${key}:${item.key2}`)
    //           if(propsImgs.length > 0){
    //             image = propsImgs[0].url.includes("https:") ? propsImgs[0].url : `https:${propsImgs[0].url}`
    //           }
    //           return {
    //             key: item.key2,
    //             value: item.value,
    //             image
    //           }
    //         })
    //       }
    //     )
    //   }

    //   // for(const item of propsArray){
    //   //   console.log("item", item)
    //   // }
    //   detail.options = data.skus.sku.map(item => {

    //     const propertiesArray = []
    //     const propertiesKeyes = item.properties.split(";").map(pItem => {
    //       const key1 = pItem.split(":")[0]
    //       const key2 = pItem.split(":")[1]

    //       const tempProps = propsArray.filter(pItem => pItem.key === key1)[0]

    //       propertiesArray.push({
    //         key: pItem,
    //         name: tempProps.name,
    //         value: tempProps.values.filter(pItem => pItem.key === key2)[0].value
    //       })
    //     })

    //     return {
    //       key: item.sku_id,
    //       price: item.price,
    //       orginalPrice: item.orginalPrice,
    //       stock: item.quantity,
    //       properties: propertiesArray
    //     }
    //   })
    //   for(const item of detail.options){
    //     console.log("ITEM", item)
    //   }
    // } else {
    //   console.log("getDetail - response", itemId, response)
    // }
  } catch (e) {
    console.log("getDetail", e)
  } finally {
    return detail
  }
}
