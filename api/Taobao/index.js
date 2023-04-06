const TaobaoAPI = require("./TaobaoAPI")
const moment = require("moment")
const axios = require("axios")
const User = require("../../models/User")
const _ = require("lodash")
const {imageCheck, getAppDataPath} = require("../../lib/userFunc")
const fs = require("fs")
const path = require("path")
const {Cafe24UploadLocalImage} = require("../Market/index")

exports.TaobaoOrderList = async ({ pageNum, referer, cookie }) => {
  const path =
    "https://buyertrade.taobao.com/trade/itemlist/asyncBought.htm?action=itemlist/BoughtQueryAction&event_submit_do_query=1&_input_charset=utf8"
  return await TaobaoAPI({
    method: "POST",
    path,
    header: {
      referer,
      cookie,
    },
    parameter: {
      pageNum,
    },
  })
}

exports.TaobaoTrade = async ({ id, referer, cookie }) => {
  const path = `https://buyertrade.taobao.com/trade/json/transit_step.do?bizOrderId=${id}`
  return await TaobaoAPI({
    method: "GET",
    path,
    header: {
      referer,
      cookie,
    },
  })
}

exports.TaobaoDetailOption = async ({ sellerId, itemId, referer, cookie }) => {
  // const path = `https://detailskip.taobao.com/service/getData/1/p1/item/detail/sib.htm?itemId=${itemId}&sellerId=${sellerId}&modules=dynStock,qrcode,viewer,price,duty,xmpPromotion,delivery,upp,activity,fqg,zjys,couponActivity,soldQuantity,page,originalPrice,tradeContract&callback=onSibRequestSuccess`
  const path = `https://detailskip.taobao.com/service/getData/1/p1/item/detail/sib.htm?itemId=${itemId}&sellerId=${sellerId}&modules=dynStock,qrcode,viewer,price,duty,xmpPromotion,delivery,upp,activity,fqg,zjys,couponActivity,soldQuantity,page,originalPrice,tradeContract`
  return await TaobaoAPI({
    method: "GET",
    path,
    header: {
      referer,
      cookie,
    },
    decoding: false,
  })
}

exports.TaobaoDetailImage = async ({ path }) => {
  return await TaobaoAPI({
    method: "GET",
    path,
    decoding: false,
  })
}

exports.TMallOptionApi = async ({ path, referer, cookie }) => {
  return await TaobaoAPI({
    method: "GET",
    path,
    header: {
      referer,
      cookie,
    },
    decoding: true,
  })
}

exports.ImageUpload = async ({ data, referer, cookie }) => {
  try {
    return await TaobaoAPI({
      method: "POST",
      path: "https://s.taobao.com/image",
      header: {
        ...data.getHeaders(),
        referer,
        cookie,
        origin: "https://s.taobao.com",
      },
      data,
    })
  } catch (e) {
    return null
  }
}

exports.ImageList = async ({ tfsid, referer, cookie }) => {
  try {
    const path = `https://s.taobao.com/search?&imgfile=&js=1&stats_click=search_radio_all%3A1&initiative_id=staobaoz_${moment().format(
      "YYYYMMDD"
    )}&ie=utf8&tfsid=${tfsid}&app=imgsearch`

    return await TaobaoAPI({
      method: "GET",
      path,
      header: {
        referer,
        cookie,
      },
      decoding: false,
    })
  } catch (e) {
    console.log("ImageList-->", e)
    return null
  }
}

exports.ItemSKU = async ({ num_iid }) => {
  try {
    const options = {
      method: "GET",
      url: "https://taobao-api.p.rapidapi.com/api",
      params: { num_iid, api: "item_sku" },
      headers: {
        "x-rapidapi-key": "932f64e27amsh78cdad966b2c2c0p129e12jsn92420146f153",
        "x-rapidapi-host": "taobao-api.p.rapidapi.com",
        // "useQueryString": true
      },
    }
    const response = await axios({
      ...options,
    })

    return response.data.result
  } catch (e) {
    console.log("ItemSKU", e)
    return null
  }
}

exports.ItemSKUV2 = async ({ userID, item_id }) => {
  try {
    let apiToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRzbnVsbHAifQ.KLUeGxRdf088cUQwnYt-XS3Tgk8fxr-o7IpqG_BZmuI"

    if(userID) {
      const groupUser = await User.find(
        {
          group: "3"
        }
      )
      const userIDs = groupUser.map(item => item._id.toString())
      if(userIDs.includes(userID.toString())) {
        apiToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VybmFtZSI6InppdGFuZTM4IiwiQ29taWQiOm51bGwsIlJvbGVpZCI6bnVsbCwiaXNzIjoidG1hcGkiLCJzdWIiOiJ6aXRhbmUzOCIsImF1ZCI6WyIiXX0.csSgsUbe-9VruviWYF-AXKaZDP_mO8pFiyKNFSe0N1s"
      }
    }
    const options = {
      method: "GET",
      url: "http://api.tmapi.top/taobao/item_detail",
      params: { item_id, apiToken },
    }
    const response = await axios({
      ...options,
    })


    //TODO:
    let mainImages = []
   
    console.log("response", response.data)
    
    mainImages = _.sortBy(mainImages.filter(item => item.image), "textLength")
   
    

    response.data.data.main_imgs = mainImages.map(item => item.image)

    const appDataDirPath = getAppDataPath()
    
    if (!fs.existsSync(appDataDirPath)) {
      fs.mkdirSync(appDataDirPath)
    }

    if (!fs.existsSync(path.join(appDataDirPath, "temp"))) {
      fs.mkdirSync(path.join(appDataDirPath, "temp"))
    }

    for(const props of response.data.data.sku_props){
      
      for(const value of props.values){
        try {
          if(value.imageUrl) {
            const imageCheckValue = await imageCheck(value.imageUrl)
          
            if(imageCheckValue && (imageCheckValue.width < 400 || imageCheckValue.height < 400)) {
              console.log("imageCheckValue", imageCheckValue)
              try {
                const imageRespone = await axios({
                  method: "GET",
                  url: value.imageUrl,
                  responseType: "arraybuffer"
                })
                const image = Buffer.from(imageRespone.data)
                await sharp(image).resize(500, 500).toFile(path.join(appDataDirPath, "temp", "resize.jpg"))
                const bitmap = fs.readFileSync(path.join(appDataDirPath, "temp", "resize.jpg"))
                const base64 = new Buffer(bitmap).toString("base64")
                const imageUrlResponse = await Cafe24UploadLocalImage({base64Image: `base64,${base64}`})
                console.log("imageUrlResponse", imageUrlResponse)
                if(imageUrlResponse){
                  value.imageUrl = imageUrlResponse
                }
              } catch(e){
                // value.imageUrl = null
              }
            }
            
          }
        } catch (e) {
          console.log("error", e)
          value.imageUrl = null
        }
        
      }
    }
    return response.data.data
  } catch (e) {
    console.log("ItemSKUV2", e)
    return null
  }
}

exports.ItemDetails = async ({ num_iid }) => {
  try {
    const options = {
      method: "GET",
      url: "https://taobao-api.p.rapidapi.com/api",
      params: { api: "item_detail_simple", num_iid },
      headers: {
        "x-rapidapi-key": "932f64e27amsh78cdad966b2c2c0p129e12jsn92420146f153",
        "x-rapidapi-host": "taobao-api.p.rapidapi.com",
        // "useQueryString": true
      },
    }
    const response = await axios({
      ...options,
    })

    return response.data
  } catch (e) {
    console.log("ItemDetails", e.message)
    return null
  }
}

exports.ItemDescription = async ({ num_iid }) => {
  try {
    const options = {
      method: "GET",
      url: "https://taobao-api.p.rapidapi.com/api",
      params: { num_iid, api: "item_desc" },
      headers: {
        "x-rapidapi-key": "932f64e27amsh78cdad966b2c2c0p129e12jsn92420146f153",
        "x-rapidapi-host": "taobao-api.p.rapidapi.com",
        // "useQueryString": true
      },
    }
    const response = await axios({
      ...options,
    })

    return response.data.result
  } catch (e) {
    console.log("ItemDescription", e)
    return null
  }
}

exports.ItemDescriptionV2 = async ({ userID, item_id, detailImages = [] }) => {
  let detailUrls = []
  try {
    if(detailImages.length === 0) {
      let apiToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRzbnVsbHAifQ.KLUeGxRdf088cUQwnYt-XS3Tgk8fxr-o7IpqG_BZmuI"

      if(userID) {
        const groupUser = await User.find(
          {
            group: "3"
          }
        )
        const userIDs = groupUser.map(item => item._id.toString())
        if(userIDs.includes(userID.toString())) {
          apiToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VybmFtZSI6InppdGFuZTM4IiwiQ29taWQiOm51bGwsIlJvbGVpZCI6bnVsbCwiaXNzIjoidG1hcGkiLCJzdWIiOiJ6aXRhbmUzOCIsImF1ZCI6WyIiXX0.csSgsUbe-9VruviWYF-AXKaZDP_mO8pFiyKNFSe0N1s"
        }
      }
      // const options = {
      //   method: "GET",
      //   url: "https://taobao-tmall-product-data-v2.p.rapidapi.com/api/sc/taobao/item_desc",
      //   params: { item_id },
      //   headers: {
      //     "x-rapidapi-host": "taobao-tmall-product-data-v2.p.rapidapi.com",
      //     "x-rapidapi-key": "932f64e27amsh78cdad966b2c2c0p129e12jsn92420146f153",
      //   },
      // }
      const options = {
        method: "GET",
        url: "http://api.tmapi.top/taobao/item_desc",
        params: { item_id, apiToken },
      }
      const response = await axios({
        ...options,
      })

      // console.log("response.data", response.data)
      
      if(response.data && response.data.code === 200){
        for(const item of response.data.data.detail_imgs){
          try {
            await imageCheck(item)
            detailUrls.push(item)
          } catch(e){
            // console.log("imageCheck", e)
          }
          
          // const img = await axios.get(item, {responseType: "arraybuffer"}).then((response) => Buffer.from(response.data))
          // await sharp(img).withMetadata().then(info => {
          //   console.log("img", img)
          //   console.log("info", info)
          // })
        }
      }
    } else {
      for(const item of detailImages){
        try {
          await imageCheck(item)
          detailUrls.push(item)
        } catch(e){
         
        }
      }
    }
    
    return detailUrls
  } catch (e) {
    console.log("ItemDescription", e)
    return []
  }
}

exports.TaobaoImageUpload = async ({ img, imageKey }) => {
  try {
    const options = {
      method: "POST",
      url: "https://taobao-tmall-data-service.p.rapidapi.com/Picture/WebPictureUpload.ashx",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-rapidapi-key": imageKey,
        "x-rapidapi-host": "taobao-tmall-data-service.p.rapidapi.com",
      },
      params: {
        image_url: img,
        image_type: "3",
      },
    }
    const response = await axios({
      ...options,
    })

    return response.data
  } catch (e) {
    console.log("ItemSeTaobaoImageUploadarchByImage", e)
    return null
  }
}

exports.ItemSearchByImage = async ({ img, imageKey }) => {
  try {
    const options = {
      method: "POST",
      url: "https://taobao-tmall-data-service.p.rapidapi.com/Item/MobileWsearchPicture.ashx",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-rapidapi-key": imageKey,
        "x-rapidapi-host": "taobao-tmall-data-service.p.rapidapi.com",
      },
      params: {
        image_url: img,
        page_num: "1",
        page_size: "20",
        sort: "3",
      },
    }
    const response = await axios({
      ...options,
    })

    return response.data
  } catch (e) {
    console.log("ItemSearchByImage", e)
    return null
  }
}
