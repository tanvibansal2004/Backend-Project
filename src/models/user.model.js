import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true, // to make any field searchable, just make its index true - becomes a little expensive but is worth it!
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // cloudinary url
      required: true,
    },
    coverImage: {
      type: String, // cloudinary url
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String, // we shouldn't keep password in clear text format - it should be kept in an encrypted format but how do we compare then? -> we'll solve this challenege further!
      required: [true, "Password is required!"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// userSchema.pre("save", () => {}) // we want this hook to work before "save" functionality works // don't write like this because arrow function doesn't have context of super or this but we need all this userSchema attributes, therefore we follow another way!

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // we want that this should change only when we change and save the password, otherwise this code will run every time something is saved, which we dont want!

  this.password = await bcrypt.hash(this.password, 10); // 2 arguments, what to encrypt, how many rounds of encryption
  next();
}); // async because encryption is a complex process

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
}; // we need methods because we need to check whether the pswd is correct or wrong since we have stored encrypted pswd but our user will enter plain text pswd only!

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      // yeh saara payload h!
      _id: this._id, // we get these from our DB only, usme stored h already! chahe toh only id store bhi krwa skte baaki sb kuchh db query se bhi le skte h
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id, // less info in refresh token
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema); // this User can directly contact or call our mongodb as many times as we want on our behalf because we/ve made it through mongoose.
