const request = require("request-promise-native")
const AccessToken = require("../../models/AccessToken")

// const CLIENT_ID = process.env.CLIENT_ID
// const SECRET_KEY = process.env.SECRET_KEY
// const REDIRECT_URL = process.env.REDIRECT_URL

const Cafe24API = async ({ mallID, payload, method, path }) => {
  try {
    const access = await AccessToken.findOne({
      mall_id: mallID
    })

    if (!access) return null

    let options = {
      method,
      url: `https://${mallID}.cafe24api.com/api/v2/${path}`,
      headers: {
        Authorization: `Bearer ${access.access_token}`,
        "Content-Type": "application/json"
      },
      body: payload,
      json: true
    }
    // console.log("options", options)
    const response = await request(options)
    // console.log("RESPONSE", response)

    return {
      message: null,
      data: response
    }
  } catch (e) {
    // console.log("Cafe24API-", method, path)
    // console.log("Cafe24API-", method, e.error.error.message)
    
    return {
      message: e.message,
      data: null
    }
  }
}

module.exports = Cafe24API
