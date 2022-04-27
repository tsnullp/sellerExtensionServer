
const Brand = require("../models/Brand")

const { ProductDetails } = require("../api/Amazon")
const { AmazonAsin } = require("../lib/userFunc")
const { EngtoKorTranslate } = require("./translate")


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
    detailUrl: url
  }

  try {
    // await page.setJavaScriptEnabled(true)
    
    const promiseArr = [
      
      new Promise(async (resolve, reject) => {
        try {
         
          const asin = AmazonAsin(url)

          const response = await ProductDetails({productId: asin})
          if(response && response.noResults === false) {

            ObjItem.isPrime = response.isPrime
            ObjItem.title = response.product_title
            if(!title || title.length === 0){
              ObjItem.korTitle = await EngtoKorTranslate(response.product_title)
            } else {
              ObjItem.korTitle = title
            }
            ObjItem.korTitle = ObjItem.korTitle.replace(/&amp;/gi, "&")
            let brandList = await Brand.find(
              {
                brand: { $ne: null }
              },
              { brand: 1 }
            )
    
            let banList = []
            if(userID.toString() === "5f0d5ff36fc75ec20d54c40b" || userID.toString() === "5f1947bd682563be2d22f008"){
              banList = await Brand.find(
                {
                  userID: {$in: ["5f0d5ff36fc75ec20d54c40b", "5f1947bd682563be2d22f008"]}
                },
                { banWord: 1 }
              )
            } else {
              banList = await Brand.find(
                {
                  userID: userID
                },
                { banWord: 1 }
              )
            }

            let prohibitList = await Brand.find(
              {
                prohibit: { $ne: null }
              },
              { prohibit: 1 }
            )
            
            let titleArr = ObjItem.title.split(" ")
            
            titleArr = titleArr.map(tItem => {
              const brandArr = brandList.filter(item =>
                tItem.toUpperCase().includes(item.brand.toUpperCase())
              )
              const banArr = banList.filter(item =>
                tItem.toUpperCase().includes(item.banWord.toUpperCase())
              )
           
              const prohibitArr = prohibitList.filter(item =>
                tItem.toUpperCase().includes(item.prohibit.toUpperCase())
              )

              return {
                word: tItem,
                brand: brandArr.length > 0 ? brandArr.map(item => item.brand) : [],
                ban: banArr.length > 0 ? banArr.map(item => item.banWord) : [],
                prohibit: prohibitArr.length > 0 ? prohibitArr.map(item => item.prohibit) : [],
           
              }
            })

            let korTitleArr = ObjItem.korTitle.split(" ")
            
            korTitleArr = korTitleArr.map(tItem => {
              const brandArr = brandList.filter(item =>
                tItem.toUpperCase().includes(item.brand.toUpperCase())
              )
              const banArr = banList.filter(item =>
                tItem.toUpperCase().includes(item.banWord.toUpperCase())
              )
           
              const prohibitArr = prohibitList.filter(item =>
                tItem.toUpperCase().includes(item.prohibit.toUpperCase())
              )

              return {
                word: tItem,
                brand: brandArr.length > 0 ? brandArr.map(item => item.brand) : [],
                ban: banArr.length > 0 ? banArr.map(item => item.banWord) : [],
                prohibit: prohibitArr.length > 0 ? prohibitArr.map(item => item.prohibit) : [],
           
              }
            })
            
            ObjItem.titleArray = titleArr
            ObjItem.korTitleArray = korTitleArr
            ObjItem.good_id = response.product_id
            ObjItem.price = Number(response.original_price) || 0
            ObjItem.salePrice = Number(response.app_sale_price) || 0
            ObjItem.feature = []
            for(const item of response.feature_bullets){
              ObjItem.feature.push(
                await EngtoKorTranslate(item)
              )
            }
          
            if(response.product_overview && response.product_overview._Brand_){
              ObjItem.brand = response.product_overview._Brand_
            }

            ObjItem.content = response.product_small_image_urls
              .filter((item, i) => i !== 0 && item.includes("._AC_US40_"))
              .map(item => item.replace("._AC_US40_", ""))
            console.log("variantAsin", response.variantAsin)
            console.log("variantImages", response.variantImages)
            console.log("variantSizes", response.variantSizes)
            let tempOption = []
            let tempProp = []
            let optionImages = []
            let productOverview = []
            let engSentence = ``
            let prohibitWord = []
            if(response.variantSizes && response.variantSizes.length > 0){
              /*
              // 사이즈가 있는 경우
              for(const key1 in response.variantAsin){
                // console.log("key1", key1)
                const asin1 = response.variantAsin[key1].asin.replace(/\\/gi, "")
                const korValue1 = await EngtoKorTranslate(key1)
                let tempOp = []
                for(const key2 in response.variantSizes){
                  // console.log("key2", key2)
                  const optionName = `${key1} ${response.variantSizes[key2].size}`
                  const korValue2 = await EngtoKorTranslate(response.variantSizes[key2].size)
                  // console.log("optionName", optionName)
                  const asin2 = response.variantSizes[key2].product_id
                  const productURL = response.variantSizes[key2].url
                  console.log("productUrl", productURL)
                  const subResponse = await ProductDetails({productURL})
                  // console.log("subResponse", subResponse)
                  console.log("asin1, product_id", asin1, subResponse.product_id)
                  if(response.variantImages && response.variantImages[key1]){
                    optionImages = response.variantImages[key1].map(item => item.hiRes)
                  }

                  for(const viewKey in response.product_overview){
                    productOverview.push(
                      `${viewKey.replace(/_/gi,"")} : ${response.product_overview[viewKey]}`
                    )
                  }
                  
                  tempOption.push(
                    {
                      key: response.variantSizes[key2].product_id,
                      propPath: `${asin1}:${asin2}`,
                      price: !subResponse.original_price || subResponse.original_price === 0 ? subResponse.app_sale_price :subResponse.original_price,
                      promotion_price: subResponse.app_sale_price,
                      stock: subResponse.available_quantity,
                      optionImages,
                      productOverview,
                      disabled: asin1 && asin2 ? false : true,
                      active: asin1 && asin2 ? true : false,
                      value: optionName.replace(/\\/gi, ""),
                      korValue: `${korValue1.replace(/\\/gi, "")} ${korValue2.replace(/\\/gi, "")}`,
                      attribute: [
                        {
                          attributeTypeName: "종류",
                          attributeValueName: korValue1
                        },
                        {
                          attributeTypeName: "사이즈",
                          attributeValueName: korValue2
                        }
                      ]
                    }
                  )

                  
                  
                }
                tempOption.push([...tempOp])
                

              }

              tempProp.push(
                {
                  pid: response.product_id,
                  name: "종류",
                  korTypeName: "종류",
                  values: tempOption.map(item => {
                    return {
                      vid: item.key,
                      name: item.value,
                      korValueName: item.korValue,
                      image: item.image
                    }
                  })
                }
              )
              */
            } else {
              // 사이즈가 없는 경우
              if(response.variantAsin && !response.variantAsin.initial){
                console.log("옵션 있음")
                for(const key in response.variantAsin){
                  console.log("key", key, response.variantAsin[key])
                  const optionName = key
                  const korValue = await EngtoKorTranslate(optionName)
                  const asin = response.variantAsin[key].asin
                  const subResponse = await ProductDetails({productId: asin})
                
                  if(response.variantImages && response.variantImages[optionName]){
                    optionImages = response.variantImages[optionName].map(item => {
                      if(item.hiRes) {
                        return item.hiRes
                      } else {
                        return item.large
                      }
                    })
                  }
                  
                  for(const viewKey in response.product_overview){
                    productOverview.push(
                      `${viewKey.replace(/_/gi,"")} : ${response.product_overview[viewKey]}`
                    )
                  }
                  tempOption.push(
                    {
                      key: asin,
                      propPath: `${response.product_id}:${asin}`,
                      price: !subResponse.original_price || subResponse.original_price === 0 ? subResponse.app_sale_price :subResponse.original_price,
                      promotion_price: subResponse.app_sale_price,
                      stock: subResponse.available_quantity,
                      image: optionImages.length > 0? optionImages[0] : subResponse.product_main_image_url,
                      optionImages,
                      productOverview,
                      disabled: asin ? false : true,
                      active: asin ? true : false,
                      value: optionName.replace(/\\/gi, ""),
                      korValue: korValue.replace(/\\/gi, ""),
                      attributes: [
                        {
                          attributeTypeName: "종류",
                          attributeValueName: korValue
                        }
                      ],
                    }
                  )
                  
                }

                tempProp.push(
                  {
                    pid: response.product_id,
                    name: "종류",
                    korTypeName: "종류",
                    values: tempOption.map(item => {
                      return {
                        vid: item.key,
                        name: item.value,
                        korValueName: item.korValue,
                        image: item.image
                      }
                    })
                  }
                )

              } else {
                // 단일 상품
                // console.log("response", response)
                console.log("단일 상품")
                optionImages = response.product_small_image_urls.filter(item => item.includes("._AC_US40_")).map(item => item.replace("._AC_US40_", ""))

                for(const viewKey in response.product_overview){
                  productOverview.push(
                    `${viewKey.replace(/_/gi,"")} : ${response.product_overview[viewKey]}`
                  )
                }

                tempOption.push(
                  {
                    key: response.product_id,
                    propPath: `1:${response.product_id}`,
                    price: !response.original_price || response.original_price === 0 ? response.app_sale_price :response.original_price,
                    promotion_price: response.app_sale_price,
                    stock: response.available_quantity,
                    image: optionImages.length > 0 ? optionImages[0] : response.product_main_image_url,
                    optionImages,
                    productOverview,
                    disabled: response.product_id ? false : true,
                    active: response.product_id ? true : false,
                    value: "단일상품",
                    korValue: "단일상품",
                    attributes: [
                      {
                        attributeTypeName: "종류",
                        attributeValueName: "단일상품"
                      }
                    ],
                  }
                )

                tempProp.push(
                  {
                    pid: "1",
                    name: "종류",
                    korTypeName: "종류",
                    values: [
                      {
                        vid: response.product_id,
                        name: "단일상품",
                        korValueName: "단일상품",
                        image: optionImages.length > 0 ? optionImages[0] : response.product_main_image_url,
                      }
                    ]
                  }
                )
              }
             
              
            }
            console.log("여기??/")
            ObjItem.options = tempOption.filter(item => item.stock > 0)
            ObjItem.prop = tempProp
            

            if(ObjItem.options.length > 1){
              ObjItem.mainImages = ObjItem.options.map(item => item.optionImages[0])
            } else {
              ObjItem.mainImages = response.product_small_image_urls.filter(item => {
                if(item.includes(".gif")){
                  return false
                }
                if(item.includes("play-icon-overlay")){
                  return false
                }
                return true   
               }
              ).map(item => item.replace("._AC_US40_", ""))
            }
            
            engSentence += `${ObjItem.title} ` 
              
            for(const item of ObjItem.options){
              for(const overView of item.productOverview){
                if(!engSentence.includes(overView)){
                  engSentence += `${overView} `
                }
                
              }
            }
       
            for(const item of response.feature_bullets){
              engSentence += `${item} `
            }
       
            for(const item of response.product_information_html){
              engSentence += `${item} `
            }

            // for(const item of ObjItem.mainImages.filter(item => item !== null)){
            //   try{
            //     const text = await tesseract.recognize(item)
            //     engSentence += `${text} `
            //   }catch(e) {
            //     console.log("recognize", item)
            //     console.log("recognize", e)
            //   }
              
            // }
            // for(const item of ObjItem.content){
            //   try{
            //     const text = await tesseract.recognize(item)
            //     engSentence += `${text} `
            //   }catch(e) {
            //     console.log("recognize", item)
            //     console.log("recognize", e)
            //   }
              
            // }
         
            // for(const item of prohibitList){
            //   if(engSentence.toUpperCase().includes(item.prohibit.toUpperCase())){
            //     if(!prohibitWord.includes(item.prohibit)){
            //       prohibitWord.push(item.prohibit)
            //     }
            //   }
            // }
         
            ObjItem.prohibitWord = prohibitWord
            ObjItem.engSentence = engSentence
          }
        
          
          resolve()
        } catch (e) {
          reject(e)
        }
      }), 
    ]

    await Promise.all(promiseArr)
  } catch(e){
    console.log("getTaobaoItemAPI", e)
  } finally {
    return ObjItem
  }
}

module.exports = start
