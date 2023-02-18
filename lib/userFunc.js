const probe = require("probe-image-size")
const url = require("url")

const sleep = (t) => {
  return new Promise((resolve) => setTimeout(resolve, t))
}
const checkStr = (str, para, type) => {
  if (type) {
    if (str.includes(para)) {
      return true
    } else {
      return false
    }
  } else {
    if (!str.includes(para)) {
      return true
    } else {
      return false
    }
  }
}

const regExp_test = (str) => {
  //함수를 호출하여 특수문자 검증 시작.
  try {
    // eslint-disable-next-line no-useless-escape
    var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi
    if (regExp.test(str)) {
      var t = str.replace(regExp, "")
      //특수문자를 대체. ""

      return t
      //특수문자 제거. ==>20171031
    } else {
      return str
    }
  } catch (e) {
    return str
  }
}
const imageCheck = (path) => {
  return new Promise((resolve, reject) => {
    probe(path)
      .then((result) => {
        resolve({
          width: result.width,
          height: result.heigh,
        })
      })
      .catch((e) => reject(e))
  })
}

const AmazonAsin = (addr) => {
  try {
    if (!addr) {
      return null
    }

    if (addr.includes("amazon.com")) {
      const q1 = url.parse(addr, true)
      const temp1 = q1.pathname.split("/dp/")
      const temp2 = temp1[temp1.length - 1]
      const temp3 = temp2.split("/")[0]
      return temp3
    } else if (addr.includes("iherb.com")) {
      const tmepUrl = addr.split("?")[0]
      const q1 = url.parse(tmepUrl, true)
      const temp1 = q1.pathname.split("/")[q1.pathname.split("/").length - 1]
      return temp1
    } else if (addr.includes("aliexpress.com")) {
      const tmepUrl = addr.split(".html")[0]
      const q1 = url.parse(tmepUrl, true)
      const temp1 = q1.pathname.split("/")[q1.pathname.split("/").length - 1]
      return temp1
    } else if (addr.includes("taobao.com")) {
      const q1 = url.parse(addr, true)
      return q1.query.id
    } else if (addr.includes("tmall.com")) {
      const q1 = url.parse(addr, true)
      return q1.query.id
    } else if (addr.includes("vvic.com")) {
      const tmepUrl = addr.split("?")[0]
      const q1 = url.parse(tmepUrl, true)
      const temp1 = q1.pathname.split("/")[q1.pathname.split("/").length - 1]
      return temp1
    }

    return null
  } catch (e) {
    console.log("AmazonAsin", e)
    return null
  }
}

const DimensionArray = (array, criteria = 1) => {
  try {
    if (!Array.isArray(array)) {
      return array
    }

    return array.reduce((array, number, index) => {
      const arrayIndex = Math.floor(index / criteria)
      if (!array[arrayIndex]) {
        array[arrayIndex] = []
      }
      array[arrayIndex] = [...array[arrayIndex], number]
      return array
    }, [])
  } catch (e) {
    console.log("DimensionArray", e)
    return array
  }
}

const shuffle = (array) => {
  return array.sort(() => Math.random() - 0.5); 
}

module.exports = {
  sleep,
  checkStr,
  regExp_test,
  imageCheck,
  AmazonAsin,
  DimensionArray,
  shuffle
}
