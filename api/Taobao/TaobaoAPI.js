const axios = require("axios")
const iconv = require("iconv-lite")

const start = async ({ path, method, header, data, parameter, decoding = true }) => {
  try {
    const response = await axios({
      url: path,
      method,
      headers: {
        ...header
      },
      data,
      params: {
        ...parameter
      },
      responseType: "arraybuffer"
    })

    if (!decoding) {
      if (typeof response == "object") {
        return response.data.toString()
      }
    }

    return JSON.parse(iconv.decode(response.data, "GB18030").toString())
  } catch (e) {
    console.log("TaobaoAPI -", e)
    return null
  }
}

module.exports = start
