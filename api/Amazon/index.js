const axios = require("axios")

exports.ProductDetails = async({productId = "0", productURL = ""}) => {

  const key = "932f64e27amsh78cdad966b2c2c0p129e12jsn92420146f153"
  try {
    const options = {
      method: 'GET',
      url: `https://amazon24.p.rapidapi.com/api/product/${productId}`,
      headers: {
        'x-rapidapi-host': 'amazon24.p.rapidapi.com',
        'x-rapidapi-key': key
      },
      params: {
        productURL, 
        country: 'US'
      }
    };
    const response = await axios({
      ...options
    })
    
    return response.data
  } catch (e) {
    console.log("ProductDetails", e)
    return null
  }
}

exports.GetProhibits = async ({start_idx = "1"}) => {
  try {
    const options = {
      method: 'POST',
      url: `hhttps://www.foodsafetykorea.go.kr/ajax/fooddanger/selectFoodDirectImportBlockList.do`,
      
      params: {
        menu_no: "3594", 
        menu_grp: 'MENU_NEW0',
        copyUrl: "https://www.foodsafetykorea.go.kr:443/portal/fooddanger/foodDirectImportBlock.do?menu_grp=MENU_NEW02&menu_no=3594",
        favorListCnt: "0",
        start_idx,
        prdt_category: "all",
        search_type_all: "001",
        show_cnt: "50",
        search_type: "001",
      }
    };
    const response = await axios({
      ...options
    })
   
    return response.data
  } catch (e) {
    console.log("GetProhibits", e)
    return null
  }
}