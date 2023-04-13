const CoupangAPI = require("./CoupangAPI")
const Cafe24API = require("./Cafe24API")
const { encode } = require("node-base64-image")
const axios = require("axios")
const url = require('url')
const moment = require("moment")
const https = require('https')

exports.CategoryPredict = async ({ userID, productName }) => {
  const path = "/v2/providers/openapi/apis/api/v1/categorization/predict"
  return await CoupangAPI({
    userID,
    method: "POST",
    path,
    parameter: {
      productName
    }
  })
}

exports.CategorySearch = async ({ userID, displayCategoryCode }) => {
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/meta/display-categories/${displayCategoryCode}`
  return await CoupangAPI({
    userID,
    method: "GET",
    path,
    parameter: {}
  })
}

exports.DisplayCategories = async ({ userID }) => {
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/meta/display-categories`
  return await CoupangAPI({
    userID,
    method: "GET",
    path,
    parameter: {}
  })
}

exports.Outbound = async ({ userID }) => {
  const path = `/v2/providers/marketplace_openapi/apis/api/v1/vendor/shipping-place/outbound`
  return await CoupangAPI({
    userID,
    method: "GET",
    path,
    parameter: {},
    query: "pageSize=50&pageNum=1"
  })
}

exports.ReturnShippingCenter = async ({ userID }) => {
  const pathSegment = [`/v2/providers/openapi/apis/api/v4/vendors/`, `/returnShippingCenters`]
  return await CoupangAPI({
    userID,
    method: "GET",
    pathSegment,
    parameter: {},
    query: "pageSize=50&pageNum=1"
  })
}

exports.CategoryMeta = async ({ userID, categoryCode }) => {
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/meta/category-related-metas/display-category-codes/${categoryCode}`
  return await CoupangAPI({
    userID,
    method: "GET",
    path,
    parameter: {}
  })
}

exports.CoupnagCreateProduct = async ({ userID, product }) => {
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products`
  return await CoupangAPI({
    userID,
    method: "POST",
    path,
    parameter: product
  })
}

exports.CoupnagUpdateProduct = async ({ userID, product }) => {
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products`
  return await CoupangAPI({
    userID,
    method: "PUT",
    path,
    parameter: product
  })
}

exports.CoupnagUPDATE_PARTIAL_PRODUCT = async ({ userID, sellerProductId, parameter }) => {
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${sellerProductId}/partial`
  return await CoupangAPI({
    userID,
    method: "PUT",
    path,
    parameter,
  })
}

exports.CoupnagGET_PRODUCT_STATUS_HISTORY = async ({ userID, productID }) => {
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${productID}/histories`
  return await CoupangAPI({
    userID,
    method: "GET",
    path,
    parameter: {}
  })
}

exports.CoupnagGET_PRODUCT_BY_PRODUCT_ID = async ({ userID, productID }) => {
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${productID}`
  return await CoupangAPI({
    userID,
    method: "GET",
    path,
    parameter: {}
  })
}

exports.CoupnagUPDATE_PRODUCT = async ({ userID, product }) => {
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products`
  return await CoupangAPI({
    userID,
    method: "PUT",
    path,
    parameter: product
  })
}

exports.CoupnagSTOP_PRODUCT_SALES_BY_ITEM = async ({ userID, vendorItemId }) => {
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/${vendorItemId}/sales/stop`
  return await CoupangAPI({
    userID,
    method: "PUT",
    path,
    parameter: {}
  })
}

exports.CoupnagRESUME_PRODUCT_SALES_BY_ITEM = async ({ userID, vendorItemId }) => {
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/${vendorItemId}/sales/resume`
  return await CoupangAPI({
    userID,
    method: "PUT",
    path,
    parameter: {}
  })
}

exports.CoupnagUPDATE_PRODUCT_PRICE_BY_ITEM = async ({ userID, vendorItemId, price }) => {
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/${vendorItemId}/prices/${price}`
  return await CoupangAPI({
    userID,
    method: "PUT",
    path,
    parameter: {}
  })
}

exports.CoupangAPPROVE_PRODUCT = async ({userID, sellerProductId}) => {
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${sellerProductId}/approvals`

  return await CoupangAPI({
    userID,
    method: "PUT",
    path,
    parameter: {}
  })
}
exports.CoupnagUPDATE_PRODUCT_QUANTITY_BY_ITEM = async ({ userID, vendorItemId, quantity }) => {
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/${vendorItemId}/quantities/${quantity}`

  return await CoupangAPI({
    userID,
    method: "PUT",
    path,
    parameter: {}
  })
}
exports.CouapngDeleteProduct = async ({ userID, productID }) => {
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${productID}`
  return await CoupangAPI({
    userID,
    method: "DELETE",
    path,
    parameter: {}
  })
}

exports.Cafe24CreateProduct = async ({ mallID, payload }) => {
  const path = `admin/products`
  return await Cafe24API({
    mallID,
    payload,
    method: "POST",
    path
  })
}

exports.Cafe24UpdateProduct = async ({ mallID, payload, product_no }) => {
  const path = `admin/products/${product_no}`
  return await Cafe24API({
    mallID,
    payload,
    method: "PUT",
    path
  })
}

exports.Cafe24UploadImages = async ({ mallID, images }) => {
  try {
    const base64Image = []

    const options = {
      string: true,
      headers: {
        "User-Agent": "my-app"
      }
    }

    for (const item of images) {
      const image = await encode(item, options)
      base64Image.push({ image })
    }

    const path = `admin/products/images`
    const payload = {
      requests: base64Image
    }

    return await Cafe24API({
      mallID,
      payload,
      method: "POST",
      path
    })
  } catch (e) {
    console.log("Cafe24UploadImages", e)
  }
}


exports.Cafe24UploadLocalImage = async ({ base64Image }) => {
  try {
    const params = new url.URLSearchParams({ base64str: base64Image.split("base64,")[1] })
    const options = {
      method: "POST",
      url: `http://tsnullp.chickenkiller.com/upload`,
      data: params.toString(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      rejectUnauthorized: false
    }
    const response = await axios({
      ...options,
    })
 
    if(response && response.data.status === true) {
      
      return response.data.data
    }
    return null
   
  } catch (e) {
    // console.log("Cafe24UploadLocalImage", e)
    console.log("Cafe24UploadLocalImage", e)
    
  }
}

exports.Cafe24UploadLocalImages = async ({ base64Images }) => {
  try {
    axios.interceptors.request.use(request => {
      request.maxContentLength = Infinity;
      request.maxBodyLength = Infinity;
      return request;
    })
    
    const params = new url.URLSearchParams({ base64strs: base64Images.replace(/base64,/gi, "") })
    const options = {
      method: "POST",
      url: `http://tsnullp.chickenkiller.com/upload-multi`,
      data: params.toString(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      rejectUnauthorized: false
    }
    const response = await axios({
      ...options,
    })
 
    if(response && response.data.status === true) {
      return response.data.data.map(item => {
        return item.replace("https", "http")
      })
    }
    return null
  } catch (e) {
    // console.log("Cafe24UploadLocalImage", e)
    console.log("ImgbbUploadLocalImages--", e.message)
    
  }
}

exports.Cafe24ListAllOrigin = async ({ mallID, offset }) => {
  try {
    const path = `admin/origin?limit=100&offset=${offset}`
    return await Cafe24API({
      mallID,

      method: "GET",
      path
    })
  } catch (e) {
    console.log("Cafe24ListAllOrigin", e)
    return null
  }
}

exports.Cafe24CreateProductsOption = async ({ mallID, product_no, payload }) => {
  try {
    const path = `admin/products/${product_no}/options`

    return await Cafe24API({
      mallID,
      method: "POST",
      path,
      payload
    })
  } catch (e) {
    console.log("Cafe24CreateProductsOption", e)
    return null
  }
}

exports.Cafe24UpdateProductsOption = async ({ mallID, product_no, payload }) => {
  try {
    const path = `admin/products/${product_no}/options`

    return await Cafe24API({
      mallID,
      method: "PUT",
      path,
      payload
    })
  } catch (e) {
    console.log("Cafe24CreateProductsOption", e)
    return null
  }
}

exports.Cafe24DeleteProductsOption = async ({ mallID, product_no }) => {
  try {
    const path = `admin/products/${product_no}/options`

    return await Cafe24API({
      mallID,
      method: "DELETE",
      path
    })
  } catch (e) {
    console.log("Cafe24CreateProductsOption", e)
    return null
  }
}

exports.Cafe24ListProductsVariants = async ({ mallID, product_no }) => {
  try {
    const path = `admin/products/${product_no}/variants`
    return await Cafe24API({
      mallID,

      method: "GET",
      path
    })
  } catch (e) {
    console.log("Cafe24ListProductsVariants", e)
    return null
  }
}

exports.Cafe24UpdateProductsVariants = async ({ mallID, product_no, payload }) => {
  try {
    const path = `admin/products/${product_no}/variants`
    return await Cafe24API({
      mallID,
      payload,
      method: "PUT",
      path
    })
  } catch (e) {
    console.log("Cafe24ListProductsVariants", e)
    return null
  }
}

exports.Cafe24UpdateProductsVariantsInventories = async ({ mallID, product_no, variant_code, payload }) => {
  try {
    const path = `admin/products/${product_no}/variants/${variant_code}/inventories`
    return await Cafe24API({
      mallID,
      payload,
      method: "PUT",
      path
    })
  } catch (e) {
    console.log("Cafe24ListProductsVariants", e)
    return null
  }
}

exports.Cafe24DeleteProductsVariants = async ({ mallID, product_no, variant_code }) => {
  try {
    const path = `admin/products/${product_no}/variants/${variant_code}`
    return await Cafe24API({
      mallID,
      method: "DELETE",
      path
    })
  } catch (e) {
    console.log("Cafe24DeleteProductsVariants", e)
    return null
  }
}

exports.Cafe24DeleteProduct = async ({ mallID, product_no }) => {
  try {
    const path = `admin/products/${product_no}`
    return await Cafe24API({
      mallID,
      method: "DELETE",
      path
    })
  } catch (e) {
    console.log("Cafe24DeleteProduct", e)
    return null
  }
}

exports.Cafe24CreateCategory = async ({ mallID, payload }) => {
  try {
    const path = `admin/categories`
    return await Cafe24API({
      mallID,
      method: "POST",
      path,
      payload
    })
  } catch (e) {
    console.log("Cafe24CreateCategory", e)
    return null
  }
}

exports.GetOrderSheet = async ({ userID, vendorId, status }) => {
  const path = `/v2/providers/openapi/apis/api/v4/vendors/${vendorId}/ordersheets`
  const createdAtFrom = moment()
    .add(-30, "days")
    .format("YYYY-MM-DD")
  const createdAtTo = moment().format("YYYY-MM-DD")
  // const createdAtFrom = "2021-12-01"
  // const createdAtTo = "2021-12-31"

  return await CoupangAPI({
    userID,
    method: "GET",
    path: path,
    parameter: {
      // createdAtFrom,
      // createdAtTo,
      // status
    },
    query: `createdAtFrom=${createdAtFrom}&createdAtTo=${createdAtTo}&status=${status}&maxPerPage=50`
  })
}

exports.GetOrderID = async ({ userID, vendorId,  orderId}) => {
  const path = `/v2/providers/openapi/apis/api/v4/vendors/${vendorId}/${orderId}/ordersheets`
  
  return await CoupangAPI({
    userID,
    method: "GET",
    path,
    parameter: {},
   
  })
}

exports.GetProductList = async ({ userID, vendorId, nextToken=1 }) => {
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products`

  return await CoupangAPI({
    userID,
    method: "GET",
    path,
    parameter: {},
    query: `vendorId=${vendorId}&nextToken=${nextToken}&maxPerPage=100`
  })
}

exports.GetProductOptions = async ({userID, sellerProductId }) => {
  try {
    const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${sellerProductId}`
    return await CoupangAPI({
      userID,
      method: "GET",
      path,
      parameter: {},
    })
  } catch (e) {
    console.log("GetProductOptions", e)
    return null
  }
}

exports.GetOtherSellers = async ({itemId, vendorItemId}) => {
  try {
    const response = await axios({

      url: `https://www.coupang.com/vp/products/307227331/other-seller-json?itemId=${itemId}&selectedId=${vendorItemId}`,
      method: "GET",
      headers: {
        // 'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        // 'Accept': '*/*',
        'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.128 Safari/537.36",
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "cors",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
        "referer": `https://www.coupang.com/vp/products/307227331?vendorItemId=${itemId}&isAddedCart=`,
      },
      // withCredentials: true,
      // responseType: "arraybuffer"
    })
    // console.log("JSON,, ", response.data)
    
    return response.data
    // return JSON.parse(response.data.toString())
  } catch (e){
    console.log("GetOtherSellers", e)
    return null
  }
}

exports.CoupangStoreProductList = async ({ vendorId, sortType="BEST_SELLING" }) => {
  try {
    const response = await axios({
      url: `https://store.coupang.com/vp/vendors/${vendorId}/product/lists?&sortTypeValue=${sortType}`,
      method: "GET",
      responseType: "arraybuffer"
    })
    return JSON.parse(response.data.toString())
  } catch (e) {
    console.log("CoupangStoreProductList", e)
    return null
  }
}

exports.CoupangDetailProductQuantityInfo = async ({ productId, vendorItemId }) => {
  try {
    const response = await axios({
      url: `https://www.coupang.com/vp/products/${productId}/vendoritems/${vendorItemId}`,
      method: "GET",
      responseType: "arraybuffer"
    })
    return JSON.parse(response.data.toString())
  } catch (e) {
    console.log("CoupangStoreProductList", e)
    return null
  }
}

exports.CoupangSdp = async ({ url }) => {
  try {
   
   
    const response = await axios({
      url,
      method: "GET",
      responseType: "arraybuffer",
      headers: {
        // 'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        // 'Accept': '*/*',
        'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.128 Safari/537.36",
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "cors",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive"
      },
      // withCredentials: true
    })
   
    const tempStr = response.data
      .toString()
      .split("xports.sdp = ")[1]
      .split(";")[0]
    return JSON.parse(tempStr)
  } catch (e) {
    console.log("CoupangSdp", url, e.message)
    return null
  }
}

exports.UpdateProductPriceByItem = async ({ userID, vendorItemId, price }) => {
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/${vendorItemId}/prices/${price}`
  return await CoupangAPI({
    userID,
    method: "PUT",
    path,
    parameter: {}
  })
}

exports.Cafe24CountAllProducts = async ({mallID}) =>{
  const path = `admin/products/count`
  return await Cafe24API({
    mallID,
    method: "GET",
    path
  })
}

exports.Cafe24ListAllProducts = async ({mallID, limit=100, offset=0}) =>{
  const path = `admin/products?limit=${limit}&offset=${offset}`
  return await Cafe24API({
    mallID,
    method: "GET",
    path
  })
}

exports.Cafe24CountAllOrders = async ({mallID, orderState="", startDate, endDate}) => {
  try {

    let order_state = ""
    switch(orderState) {
      case "상품준비":
        order_state = "N10,N20"
        break
      case "배송지시":
        order_state = "N21,N22"
        break
      case "배송중":
        order_state = "N30"
        break
      case "배송완료":
        order_state = "N40"
        break
      case "준비지시중":
        order_state ="N10,N20,N21,N22,N30"
        break
      default:
        break;
    }
    
    let path = ""
    if(order_state.length > 0){
      path = `admin/orders/count?shop_no=1&start_date=${startDate}&end_date=${endDate}&order_status=${order_state}&date_type=pay_date`
    } else {
      path = `admin/orders/count?shop_no=1&start_date=${startDate}&end_date=${endDate}&date_type=pay_date`
    }
    
    return await Cafe24API({
      mallID,
      method: "GET",
      path
    })
  } catch (e) {
    console.log("Cafe24CountAllOrders", e)
    return null
  }
}
exports.Cafe24ListOrders = async ({ mallID, orderState, startDate, endDate }) => {
  const Cafe24CountAllOrdersInner = async ({mallID, orderState="", startDate, endDate}) => {
    try {
  
      let order_state = ""
      switch(orderState) {
        case "상품준비":
          order_state = "N10,N20"
          break
        case "배송지시":
          order_state = "N21,N22"
          break
        case "배송중":
          order_state = "N30"
          break
        case "배송완료":
          order_state = "N40"
          break
        case "준비지시중":
          order_state ="N10,N20,N21,N22,N30"
          break
        default:
          break;
      }
      
      let path = ""
      if(order_state.length > 0){
        path = `admin/orders/count?shop_no=1&start_date=${startDate}&end_date=${endDate}&order_status=${order_state}&date_type=pay_date`
      } else {
        path = `admin/orders/count?shop_no=1&start_date=${startDate}&end_date=${endDate}&date_type=pay_date`
      }
      
      return await Cafe24API({
        mallID,
        method: "GET",
        path
      })
    } catch (e) {
      console.log("Cafe24CountAllOrders", e)
      return null
    }
  }

  try {
    console.log("startDate, endDate", startDate, endDate)
    const limit = 500
    const countResponse = await Cafe24CountAllOrdersInner({mallID, orderState, startDate, endDate})
    console.log("countResponse", countResponse)
    const count = countResponse.data.count
    const page = Math.ceil(count/limit)
    
    const pageArray = []
    for(let i = 0; i < page ; i++){
      pageArray.push (i)
    }
    
    let order_state = "N10,N20"
    switch(orderState) {
      case "상품준비":
        order_state = "N10,N20"
        break
      case "배송지시":
        order_state = "N21,N22"
        break
      case "배송중":
        order_state = "N30"
        break
      case "배송완료":
        order_state = "N40"
        break
      case "준비지시중":
        order_state ="N10,N20,N21,N22,N30"
        break
      default:
        order_state = ""
        break;
    }
    const list = []
    for(const item of pageArray){
      let path 
      if(order_state.length > 0){
        path = `admin/orders?order_status=${order_state}&date_type=pay_date&start_date=${startDate}&end_date=${endDate}&limit=${limit}&offset=${item*limit}&embed=items,receivers,buyer`
      } else {
        path = `admin/orders?date_type=pay_date&start_date=${startDate}&end_date=${endDate}&limit=${limit}&offset=${item*limit}&embed=items,receivers,buyer`
      }
      
      const response =  await Cafe24API({
        mallID,
        method: "GET",
        path
      })
      if(response.message === null){
        list.push(...response.data.orders)
      }
    }
    
    return list
    
  } catch (e) {
    console.log("Cafe24ListOrders", e)
    return []
  }
}

exports.Cafe24ListAllOrders = async ({ mallID, startDate, endDate }) => {
  try {
    const limit = 500
    const countResponse = await this.Cafe24CountAllOrders({mallID, startDate, endDate})
    console.log("countResponse", countResponse)
    const count = countResponse.data.count
    const page = Math.ceil(count/limit)
    
    const pageArray = []
    for(let i = 0; i < page ; i++){
      pageArray.push (i)
    }
    
    const list = []
    for(const item of pageArray){
      const path = `admin/orders?date_type=pay_date&start_date=${startDate}&end_date=${endDate}&limit=${limit}&offset=${item*limit}&embed=items,receivers,buyer`
      const response =  await Cafe24API({
        mallID,
        method: "GET",
        path
      })
      
      if(response.message === null){
        list.push(...response.data.orders)
      }
    }
    
    return list
    
  } catch (e) {
    console.log("Cafe24ListAllOrders", e)
    return []
  }
}

exports.Cafe24RegisterShipments = async ({ mallID, order_id, tracking_no, shipping_company_code = "0006", order_item_code, shipping_code}) => {
  try {
    
    const path = `admin/orders/${order_id}/shipments`
    return await Cafe24API({
      mallID,
      method: "POST",
      path,
      payload: {
        shop_no: 1,
        request: {
          order_id,
          tracking_no,
          shipping_company_code,
          status: "standby",
          order_item_code,
          shipping_code
        }
      }
    })
  } catch (e) {
    console.log("Cafe24CountAllOrders", e)
    return null
  }
}


exports.Cafe24UpdateShipments = async ({ mallID, input}) => {
  try {
    
    const path = `admin/shipments`
    return await Cafe24API({
      mallID,
      method: "PUT",
      path,
      payload: {
        shop_no: 1,
        requests: input.map(item => {
          return {
            shipping_code: item.shipping_code,
            order_id: item.order_id,
            status: "shipping"
          }
        })
      }
    })
  } catch (e) {
    console.log("Cafe24CountAllOrders", e)
    return null
  }
}
