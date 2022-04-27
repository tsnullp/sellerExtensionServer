
const Brand = require("../models/Brand")
const { AmazonAsin, regExp_test } = require("../lib/userFunc")
const {iHerbDetail} = require("../api/iHerb")

const findIherbDetailAPI = async ({ url, title, userID }) => {
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
          console.log("---->", asin)
          const korResponse = await iHerbDetail({asin, isUSA: false})
          const engResponse = await iHerbDetail({asin, isUSA: true})
        
          if(korResponse.prohibited){
            ObjItem.prohibited = true
          } else {
            ObjItem.title = `${engResponse.displayName} ${engResponse.brandName}`
            ObjItem.korTitle = `${regExp_test(korResponse.displayName.replace(/,/gi, ""))} ${regExp_test(korResponse.brandName)}`
            ObjItem.keyword = []
            if(korResponse.productRanks && Array.isArray(korResponse.productRanks)) {
              ObjItem.keyword.push(...korResponse.productRanks.map(item => regExp_test(item.categoryDisplayName)))
            }
            ObjItem.keyword.push(
              regExp_test(engResponse.brandName)
            )
            ObjItem.keyword.push(
              regExp_test(korResponse.brandName)
            )
           
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
            ObjItem.detailUrl = url
            ObjItem.brand = engResponse.brandName
            ObjItem.manufacture = engResponse.brandName
            ObjItem.titleArray = titleArr
            ObjItem.korTitleArray = korTitleArr
            ObjItem.good_id = korResponse.id.toString()
            ObjItem.price = Number(engResponse.listPrice.replace("₩", "").replace("$", "").replace(/,/gi, "")) || 0
            ObjItem.salePrice = Number(engResponse.discountPrice.replace("₩", "").replace("$", "").replace(/,/gi, "")) || 0
            ObjItem.mainImages = 
            engResponse.imageIndices.map(item => {
              return `https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/${engResponse.partNumber.split("-")[0]}/${engResponse.partNumber.replace("-", "").toLowerCase()}/l/${item}.jpg`.replace("f_auto,q_auto:eco/", "")
            })
  
            // [`https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/${engResponse.partNumber.split("-")[0]}/${engResponse.partNumber.replace("-", "").toLowerCase()}/v/${engResponse.primaryImageIndex}.jpg`.replace("f_auto,q_auto:eco/", "")]
  
  
            ObjItem.content =  engResponse.show360 && engResponse.imageIndices360 && engResponse.imageIndices360.length > 0? 
              engResponse.imageIndices360.map(item => {
                return `https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/${engResponse.partNumber.split("-")[0]}/${engResponse.partNumber.replace("-", "").toLowerCase()}/l/${item}.jpg`.replace("f_auto,q_auto:eco/", "")
            })
              :engResponse.imageIndices.map(item => {
                return `https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/${engResponse.partNumber.split("-")[0]}/${engResponse.partNumber.replace("-", "").toLowerCase()}/l/${item}.jpg`.replace("f_auto,q_auto:eco/", "")
              })
  
            ObjItem.prop = [
              {
                pid: "1",
                korTypeName: "종류",
                values: [
                  {
                    vid: korResponse.id.toString(),
                    name: engResponse.packageQuantity ? engResponse.packageQuantity : "단일상품",
                    korValueName: korResponse.packageQuantity ? korResponse.packageQuantity : "단일상품",
                    image: `https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/${engResponse.partNumber.split("-")[0]}/${engResponse.partNumber.replace("-", "").toLowerCase()}/y/${engResponse.primaryImageIndex}.jpg`.replace("f_auto,q_auto:eco/", "")
                  }
                ]
              }
            ]
            ObjItem.options = [
              {
                key: korResponse.id.toString(),
                propPath: `1:${korResponse.id}`,
                price: Number(korResponse.discountPrice.replace("₩", "").replace("$", "").replace(/,/gi, "")) || 0,
                promotion_price: Number(korResponse.listPrice.replace("₩", "").replace("$", "").replace(/,/gi, "")) || 0,
                stock: korResponse.stockStatusV2 === 0 ? 1000 : 0,
                image: `https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/${engResponse.partNumber.split("-")[0]}/${engResponse.partNumber.replace("-", "").toLowerCase()}/y/${engResponse.primaryImageIndex}.jpg`.replace("f_auto,q_auto:eco/", ""),
                disabled: korResponse.id ? false : true,
                active: korResponse.id ? true : false,
                value: engResponse.packageQuantity ? engResponse.packageQuantity : "단일상품",
                korValue: korResponse.packageQuantity ? korResponse.packageQuantity : "단일상품",
                attributes: [
                  {
                    attributeTypeName: "종류",
                    attributeValueName: korResponse.packageQuantity ? korResponse.packageQuantity : "단일상품",
                  }
                ],
              }
            ]
            
            
            let engSentence = ``
            let prohibitWord = []
  
            engSentence += `${ObjItem.title} ` 
            engSentence += `${ObjItem.korTitle} ` 
  
            if(ObjItem.keyword){
              for(const item of ObjItem.keyword){
                engSentence += item
              }
            }
  
            if(engResponse.description){
              engSentence += `${engResponse.description} `
            }
            if(korResponse.description){
              engSentence += `${korResponse.description} `
            }
            if(engResponse.ingredients){
              engSentence += `${engResponse.ingredients} `
            }
            if(korResponse.ingredients){
              engSentence += `${korResponse.ingredients} `
            }
            if(engResponse.suggestedUse){
              engSentence += `${engResponse.suggestedUse} `
            }
            if(korResponse.suggestedUse){
              engSentence += `${korResponse.suggestedUse} `
            }
  
            if(engResponse.warnings){
              engSentence += `${engResponse.warnings} `
            }
            if(korResponse.warnings){
              engSentence += `${korResponse.warnings} `
            }
            if(engResponse.supplementFacts){
              engSentence += `${engResponse.supplementFacts} `
            }
            if(korResponse.warnings){
              engSentence += `${korResponse.supplementFacts} `
            }
  
  
            // 제품설명
            ObjItem.description = korResponse.description
            // 제품 사용법
            ObjItem.suggestedUse = korResponse.suggestedUse
            // 포함된 다른 성분들
            ObjItem.ingredients = korResponse.ingredients
            .replace("이러한 알레르기 유발 성분 또는 물질을, 함유한 다른 제품을 처리할 수 있는 우수 제조 및 품질 관리 기준(cGMP) 인증 시설에서 생산되었습니다.", "")
            .replace("이러한 알레르기 유발 물질 또는 성분을 함유한 다른 제품을 처리할 수 있는 cGMP 인증 시설에서 생산됩니다.", "")
            .replace("이러한 알레르기 유발 물질을 함유한 다른 성분을 처리하는 GMP 시설에서 생산되었습니다.", "")
            .replace("알레르기 유발", "")
            .replace("알레르기", "")
            .replace("제약", "")
            // 주의사항
            ObjItem.warnings = korResponse.warnings.replace("저하", "변질")
            // 면책사항
            // ObjItem.disclaimer = `저희는 고객님이 수령 제품과 100% 동일한 사진을 사이트에 반영하기 위해 노력을 하고 있습니다. 하지만, 제품 제조사가 포장 혹은 성분을 업데이트하는 경우 사이트의 정보 업데이트까지 시간이 소요될 수 있습니다. 제품의 포장은 다를 수 있지만, 제품의 신선도는 저희가 보장해드립니다. 적절한 제품 사용을 위해 제품 포장에 기입된 내용을 기준으로 사용하시길 권장해드립니다.`
            // 영양 성분 정보
            ObjItem.supplementFacts = korResponse.supplementFacts
  
  
            for(const item of prohibitList){
              if(engSentence.toUpperCase().includes(item.prohibit.toUpperCase())){
                if(!prohibitWord.includes(item.prohibit)){
                  prohibitWord.push(item.prohibit)
                }
              }
            }
  
  
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
    console.log("getIherbItemAPI", e)
  } finally {
    return ObjItem
  }
}

const findIherbDetailSimple = async ({url}) => {
  try {

    const asin = AmazonAsin(url)
    const korResponse = await iHerbDetail({asin, isUSA: false})

    const price = Number(korResponse.discountPrice.replace("₩", "").replace("$", "").replace(/,/gi, ""))
    let stock = 0
    if(korResponse.stockStatusV2 === 0){
      stock = 1000
    } else if(korResponse.stockStatusV2 === 1 || korResponse.stockStatusV2 === 2){
      stock = 3
    } else if(korResponse.stockStatusV2 === 3){
      stock = 0
    } 

    return {
      asin,
      price,
      stock
    }
  } catch (e) {
    console.log("findIherbDetailSimple", e)
  }

}
module.exports = {
  findIherbDetailAPI,
  findIherbDetailSimple
}


