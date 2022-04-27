const axios = require("axios")
const crypto = require("crypto")
const Market = require("../../models/Market")

const start = async ({ userID, pathSegment, path, method, parameter, query = "" }) => {
  try {
    const market = await Market.findOne({
      userID
    })

    if (!market || !market.coupang) {
      return null
    }

    const datetime =
      new Date()
        .toISOString()
        .substr(2, 17)
        .replace(/:/gi, "")
        .replace(/-/gi, "") + "Z"

    let message = datetime + method + path + query

    const hostName = "https://api-gateway.coupang.com"
    let urlPath
    if (pathSegment && Array.isArray(pathSegment) && pathSegment.length > 1) {
      urlPath = `${pathSegment[0]}${market.coupang.vendorId}${pathSegment[1]}?${query}`
      message =
        datetime + method + `${pathSegment[0]}${market.coupang.vendorId}${pathSegment[1]}` + query
    } else {
      
      urlPath = path + "?" + query
      message = datetime + method + path + query
    }

    // const urlPath = path + "?" + query
    const url = `${hostName}${urlPath}`
    
    //input your accessKey
    const ACCESS_KEY = market.coupang.accessKey
    //input your secretKey
    const SECRET_KEY = market.coupang.secretKey
    const algorithm = "sha256"

    const signature = crypto
      .createHmac(algorithm, SECRET_KEY)
      .update(message)
      .digest("hex")

    const authorization =
      "CEA algorithm=HmacSHA256, access-key=" +
      ACCESS_KEY +
      ", signed-date=" +
      datetime +
      ", signature=" +
      signature

    const strjson = parameter ? JSON.stringify(parameter, null, 2) : null

    
    // console.log("aaa===", {
    //   url,
    //   method,
    //   headers: {
    //     "Content-Type": "application/json;charset=UTF-8",
    //     "Content-Length": Buffer.byteLength(strjson, "utf8"),
    //     Authorization: authorization,
    //     "X-EXTENDED-TIMEOUT": 90000
    //   },
    //   data: strjson
    // })
    const response = await axios({
      url,
      method,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "Content-Length": Buffer.byteLength(strjson, "utf8"),
        Authorization: authorization,
        "X-EXTENDED-TIMEOUT": 90000
      },
      data: strjson
    })

    return response.data
  } catch (e) {
    // console.log("CoupangAPI - ", `${path} - ${e.message} - ${parameter}`)
    // console.log("COUAPG-- ", e)
    // console.log("CoupangAPI - parameter ", parameter)
    return {
      message: `${path} - ${e.message}`,
      data: null
    }
  }
}

const CoupangAPI = async ({ userID, pathSegment, path, method, parameter, query = "" }) => {
  return await start({ userID, pathSegment, path, method, parameter, query })
}

module.exports = CoupangAPI
