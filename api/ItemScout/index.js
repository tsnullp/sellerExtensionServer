const axios = require("axios");

exports.GetCategory = async ({ id }) => {
  try {
    const response = await axios({
      url: `https://api.itemscout.io/api/category/${id}/subcategories`,
      method: "GET",
      headers: {
        // 'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        // 'Accept': '*/*',
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.128 Safari/537.36",
      },
    });

    return response.data;
  } catch (e) {
    console.log("GetCategory", e);
    return null;
  }
};
exports.GetBrand = async ({ id }) => {
  try {
    const response = await axios({
      url: `https://api.itemscout.io/api/category/${id}/brands`,
      method: "GET",
      headers: {
        // 'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        // 'Accept': '*/*',
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.128 Safari/537.36",
      },
    });

    return response.data;
  } catch (e) {
    console.log("GetBrand", e);
    return null;
  }
};

exports.GetKeyword = async ({ id, month }) => {
  try {
    const response = await axios({
      url: `https://api.itemscout.io/api/category/${id}/data`,
      method: "POST",
      headers: {
        // 'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        // 'Accept': '*/*',
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.128 Safari/537.36",
      },
      data: {
        genders: "f,m",
        ages: "10,60",
        duration: month,
      },
    });

    return response.data;
  } catch (e) {
    console.log("GetKeyword", e);
    return null;
  }
};
