const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const UserSchema = new mongoose.Schema({
  mail: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  slug: { type: String, required: true },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "restaurant" },

})

UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10)
  }
  next()
})

UserSchema.methods.isValidPassword = async function (password) {
  return await bcrypt.compare(password, this.password)
}

const User = mongoose.model("User", UserSchema)

module.exports = User
