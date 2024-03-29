const probe = require("probe-image-size");
const url = require("url");
const path = require("path");
const _ = require("lodash");
const crypto = require("crypto");
const axios = require("axios");

const sleep = (t) => {
  return new Promise((resolve) => setTimeout(resolve, t));
};
const checkStr = (str, para, type) => {
  if (type) {
    if (str.includes(para)) {
      return true;
    } else {
      return false;
    }
  } else {
    if (!str.includes(para)) {
      return true;
    } else {
      return false;
    }
  }
};

const regExp_test = (str) => {
  //함수를 호출하여 특수문자 검증 시작.
  try {
    // eslint-disable-next-line no-useless-escape
    var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;
    if (regExp.test(str)) {
      var t = str.replace(regExp, "");
      //특수문자를 대체. ""

      return t;
      //특수문자 제거. ==>20171031
    } else {
      return str;
    }
  } catch (e) {
    return str;
  }
};
const imageCheck = (path) => {
  return new Promise((resolve, reject) => {
    probe(path)
      .then((result) => {
        resolve({
          width: result.width,
          height: result.heigh,
        });
      })
      .catch((e) => reject(e));
  });
};

const AmazonAsin = (addr) => {
  try {
    if (!addr) {
      return null;
    }

    if (addr.includes("amazon.com")) {
      const q1 = url.parse(addr, true);
      const temp1 = q1.pathname.split("/dp/");
      const temp2 = temp1[temp1.length - 1];
      const temp3 = temp2.split("/")[0];
      return temp3;
    } else if (addr.includes("iherb.com")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const temp1 = q1.pathname.split("/")[q1.pathname.split("/").length - 1];
      return temp1;
    } else if (addr.includes("aliexpress.com")) {
      const tmepUrl = addr.split(".html")[0];
      const q1 = url.parse(tmepUrl, true);
      const temp1 = q1.pathname.split("/")[q1.pathname.split("/").length - 1];
      return temp1;
    } else if (addr.includes("taobao.com")) {
      const q1 = url.parse(addr, true);
      if (Array.isArray(q1.query.id) && q1.query.id.length > 0) {
        return q1.query.id[0];
      }
      return q1.query.id;
    } else if (addr.includes("tmall.com")) {
      const q1 = url.parse(addr, true);
      if (Array.isArray(q1.query.id) && q1.query.id.length > 0) {
        return q1.query.id[0];
      }
      return q1.query.id;
    } else if (addr.includes("vvic.com")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const temp1 = q1.pathname.split("/")[q1.pathname.split("/").length - 1];
      return temp1;
    } else if (addr.includes("item.rakuten.co.jp")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      return q1.path
        .split("/")
        .filter((item) => item.length > 0)
        .join("/");
    } else if (addr.includes("studious.co.jp")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      return q1.path;
    } else if (addr.includes("isseymiyake.com")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const temp1 = q1.pathname.split("/")[q1.pathname.split("/").length - 1];

      return temp1;
    } else if (addr.includes("keenfootwear.jp")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const temp1 = q1.pathname.split("/")[q1.pathname.split("/").length - 1];

      return temp1;
    } else if (addr.includes("brandavenue.rakuten.co.jp")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const pathnames = q1.pathname
        .split("/")
        .filter((item) => item.length > 0);
      const temp1 = pathnames[pathnames.length - 1];
      return temp1;
    } else if (addr.includes("uniqlo.com/jp")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const pathnames = q1.pathname
        .split("/")
        .filter((item) => item.length > 0);
      const temp1 = pathnames[pathnames.length - 2];
      return temp1;
    } else if (addr.includes("charleskeith.jp")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      return q1.path
        .split("/")
        .filter((item) => item.length > 0)
        .filter((_, i) => i > 0)
        .join("/");
    } else if (addr.includes("crocs.co.jp")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const pathnames = q1.pathname
        .split("/")
        .filter((item) => item.length > 0);
      const temp1 = pathnames[pathnames.length - 2];
      const temp2 = pathnames[pathnames.length - 1];

      return `${temp1}/${temp2}`;
    } else if (addr.includes("barns.jp")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const pathnames = q1.pathname
        .split("/")
        .filter((item) => item.length > 0);
      const temp1 = pathnames[pathnames.length - 1];
      return temp1;
    } else if (addr.includes("asics.com/jp")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const pathnames = q1.pathname
        .split("/")
        .filter((item) => item.length > 0);
      const temp1 = pathnames[pathnames.length - 1];
      return temp1.split(".")[0];
    } else if (addr.includes("jp.stussy.com")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const pathnames = q1.pathname
        .split("/")
        .filter((item) => item.length > 0);
      const temp1 = pathnames[pathnames.length - 1];
      return temp1;
    } else if (addr.includes("goldwin.co.jp")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const pathnames = q1.pathname
        .split("/")
        .filter((item) => item.length > 0);
      const temp1 = pathnames[pathnames.length - 1];
      return temp1;
    } else if (addr.includes("vans.co.jp")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const pathnames = q1.pathname
        .split("/")
        .filter((item) => item.length > 0);
      const temp1 = pathnames[pathnames.length - 1];
      return temp1.split(".")[0];
    } else if (addr.includes("converse.co.jp")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const pathnames = q1.pathname
        .split("/")
        .filter((item) => item.length > 0);
      const temp1 = pathnames[pathnames.length - 1];
      return temp1.split("?")[0];
    } else if (addr.includes("abc-mart.net/shop")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const pathnames = q1.pathname
        .split("/")
        .filter((item) => item.length > 0);
      const temp1 = pathnames[pathnames.length - 1];
      return temp1.split("?")[0];
    } else if (addr.includes("viviennewestwood-tokyo.com")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const pathnames = q1.pathname
        .split("/")
        .filter((item) => item.length > 0);
      const temp1 = pathnames[pathnames.length - 1];
      return temp1.split("?")[0];
    } else if (addr.includes("miharayasuhiro.jp")) {
      const q1 = url.parse(addr, true);
      return q1.search
        .replace(/\\/g, "")
        .replace(/\*/g, "")
        .replace(/\?/g, "")
        .replace(/"/g, "")
        .replace(/</g, "")
        .replace(/>/g, "")
        .replace(/'/g, "");
    } else if (addr.includes("onlinestore.nepenthes.co.jp")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const pathnames = q1.pathname
        .split("/")
        .filter((item) => item.length > 0);
      const temp1 = pathnames[pathnames.length - 1];
      return temp1;
    } else if (addr.includes("doverstreetmarket.com")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const pathnames = q1.pathname
        .split("/")
        .filter((item) => item.length > 0);
      const temp1 = pathnames[pathnames.length - 1];
      return temp1;
    } else if (addr.includes("titleist.co.jp")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const pathnames = q1.pathname
        .split("/")
        .filter((item) => item.length > 0);
      const temp1 = pathnames[pathnames.length - 1];
      return temp1;
    } else if (addr.includes("amiacalva.shop-pro.jp")) {
      const q1 = url.parse(addr, true);
      return q1.search.replace("?", "");
    } else if (addr.includes("shop.ordinary-fits.online")) {
      const q1 = url.parse(addr, true);
      return q1.search.replace("?", "");
    } else if (addr.includes("fullcount-online.com")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const pathnames = q1.pathname
        .split("/")
        .filter((item) => item.length > 0);
      const temp1 = pathnames[pathnames.length - 2];
      const temp2 = pathnames[pathnames.length - 1];

      return `${temp1}/${temp2}`;
    } else if (addr.includes("ware-house.co.jp")) {
      const q1 = url.parse(addr, true);
      return q1.search.replace("?", "");
    } else if (addr.includes("onitsukatiger.com")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const pathnames = q1.pathname
        .split("/")
        .filter((item) => item.length > 0);
      const temp1 = pathnames[pathnames.length - 2];
      const temp2 = pathnames[pathnames.length - 1];

      return `${temp1}/${temp2.replace(".html", "")}`;
    } else if (addr.includes("store.toyo-enterprise.co.jp")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const pathnames = q1.pathname
        .split("/")
        .filter((item) => item.length > 0);
      return pathnames[1];
    } else if (addr.includes("supersports.com")) {
      const tmepUrl = addr.split("?")[0];
      const q1 = url.parse(tmepUrl, true);
      const pathnames = q1.pathname
        .split("/")
        .filter((item) => item.length > 0);
      const temp1 = pathnames[pathnames.length - 1];
      return temp1;
    }

    return null;
  } catch (e) {
    console.log("AmazonAsin", e);
    return null;
  }
};

const DimensionArray = (array, criteria = 1) => {
  try {
    if (!Array.isArray(array)) {
      return array;
    }

    return array.reduce((array, number, index) => {
      const arrayIndex = Math.floor(index / criteria);
      if (!array[arrayIndex]) {
        array[arrayIndex] = [];
      }
      array[arrayIndex] = [...array[arrayIndex], number];
      return array;
    }, []);
  } catch (e) {
    console.log("DimensionArray", e);
    return array;
  }
};

const shuffle = (array) => {
  return array.sort(() => Math.random() - 0.5);
};

const getAppDataPath = () => {
  switch (process.platform) {
    case "darwin": {
      return path.join(
        process.env.HOME,
        "Library",
        "Application Support",
        "smartseller"
      );
    }
    case "win32": {
      return path.join(process.env.APPDATA, "smartseller");
    }
    case "linux": {
      return path.join(process.env.HOME, ".smartseller");
    }
    default: {
      console.log("Unsupported platform!");
      process.exit(1);
    }
  }
};

function ranking(array, count = 3) {
  if (!Array.isArray(array)) {
    return [];
  }
  const res = array.reduce((t, a) => {
    if (t[a]) {
      t[a]++;
    } else {
      t[a] = 1;
    }
    return t;
  }, {});

  const arrayValue = Object.keys(res).map((item) => {
    return {
      name: item,
      count: res[item],
    };
  });
  const sortArray = arrayValue.sort((a, b) => b.count - a.count);

  return sortArray.filter((item) => item.count >= count);
}

const getMonthName = (month) => {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return monthNames[parseInt(month) - 1];
};
const getSbth = () => {
  const algorithm = "aes-256-cbc";
  const key = Buffer.from("12501986019234170293715203984170", "utf8");
  const iv = Buffer.from("6269036102394823", "utf8");

  const date = new Date();
  const year = date.getUTCFullYear();
  const month = ("0" + (date.getUTCMonth() + 1)).slice(-2);
  const day = ("0" + date.getUTCDate()).slice(-2);
  const hours = ("0" + date.getUTCHours()).slice(-2);
  const minutes = ("0" + date.getUTCMinutes()).slice(-2);
  const seconds = ("0" + date.getUTCSeconds()).slice(-2);

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekday = weekdays[date.getUTCDay()];

  const dateString = `${weekday}, ${day} ${getMonthName(
    month
  )} ${year} ${hours}:${minutes}:${seconds} GMT`;

  const plaintext = `sb${dateString}th`;

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  return encrypted;
};

const getOcrText = async (imageUrl) => {
  try {
    const response = await axios({
      url: "http://tsnullp.chickenkiller.com/imageOcr",
      method: "POST",
      data: {
        image: imageUrl,
      },
    });

    if (response && response.data && response.data.status === true) {
      return response.data.message;
    } else {
      return "";
    }
  } catch (e) {
    return "";
  }
};

const groupBy = (arr, key) => {
  const grouped = {};

  arr.forEach((obj) => {
    const value = obj[key];

    if (grouped[value]) {
      grouped[value].push(obj);
    } else {
      grouped[value] = [obj];
    }
  });

  return Object.values(grouped);
};

const extractWeight = (specifications) => {
  try {
    const weightRegex = /(\d+(?:\.\d+)?)\s*(kg|g)/i;
    const matches = specifications.match(weightRegex);
    if (matches && matches.length > 2) {
      const weight = parseFloat(matches[1]);
      const unit = matches[2].toLowerCase();
      if (unit === "kg") {
        return weight + 0.2;
      } else if (unit === "g") {
        return weight / 1000 + 0.2;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
};

module.exports = {
  sleep,
  checkStr,
  regExp_test,
  imageCheck,
  AmazonAsin,
  DimensionArray,
  shuffle,
  getAppDataPath,
  ranking,
  getSbth,
  getOcrText,
  groupBy,
  extractWeight,
};
