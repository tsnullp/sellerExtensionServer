const mongoose = require("mongoose")


const UserSchema = mongoose.Schema({
  adminUser: {
    type: mongoose.Schema.Types.ObjectId
  },
  grade: {
    type: String
  },
  email: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  nickname: {
    type: String,
    trim: true
  },
  password:{
    type: String
  },
  admin: {
    type: Boolean,
    sparce: true
  },
  avatar: {
    type: String,
    sparce: true
  },
  providers: {
    type: [
      {
        provider: {
          type: String
        },
        id: {
          type: String
        },
        _id: false
      }
    ]
  }
})

// model
const User = mongoose.model("User", UserSchema)

module.exports = User
