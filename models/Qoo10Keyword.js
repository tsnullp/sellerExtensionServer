const mongoose = require("mongoose");

const Qoo10KeywordSchema = mongoose.Schema({
  keyword: String,
  korKeyword: String,
  categoryCode: String,
  categoryName: String,
  categoryKorName: String,
  searchCount: Number,
  yesterdayCount: Number,
  janpanRate: Number,
  koreaRate: Number,
  etcRate: Number,
  competitionJapan: Number,
  competitionKorea: Number,
  competitionEtc: Number,
  date: Date,
});

module.exports = mongoose.model("Qoo10Keyword", Qoo10KeywordSchema);
