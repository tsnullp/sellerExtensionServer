const mongoose = require("mongoose")

const CategoryInfoSchema = mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId
  },
  naverCode: Number,
  cafe24Code: Number
})

module.exports = mongoose.model("CategoryInfo", CategoryInfoSchema)
