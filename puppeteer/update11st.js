const { get11stProduct, skCreateProduct } = require("../api/11st");
const Product = require("../models/Product");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const update11st = async ({
  id,
  basic,
  product,
  options,
  prop,
  userID,
  deli_pri_11st,
}) => {
  try {
    const productBody = await get11stProduct({
      id,
      basic,
      product,
      options,
      prop,
      userID,
      deli_pri_11st,
    });

    if (productBody.message) {
      return {
        message: productBody.message,
      };
    } else if (productBody) {
      const response = await skCreateProduct({
        userID,
        productBody,
      });

      return {
        productNo: response.productNo,
        message: response.message,
      };
    }
  } catch (e) {}
};

module.exports = update11st;
