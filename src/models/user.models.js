//data modelling
import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken"; // jwt is like a key , only those can open a lock who has the key
import bcrypt from "bcrypt"; // hashing and comparing password
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
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
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
      required: true,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// these are the hooks of mongoose aggregate functions which are used to perform some operations before or after the operation
// syntax goes schemaName.hookName("operation", async function(next){})
// next bcoz middleware he so it will then go to the next middleware

// "PRE" hook is for data database save hone se pehle uspe kuch operation karna chahte ho toh. For example password ko hash karna he fhir store karna he
userSchema.pre("save", async function (next) {
  // password field ko lo and encrpyt kar do

  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10); // 10 is rounds of hashing
  next();
});

// similarly like middlewares in mongoose, we can also create CUSTOM METHODS in mongoose

// checking password is correct or not
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// another method to generate access token for the user
// cannot use async function bcoz it will return promise since jwt.sign is already an async function
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
      email: this.email,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

// another method to generate refresh token for the user
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

// PLUGIN hook is for adding some plugins to the schema
userSchema.plugin(mongooseAggregatePaginate);

export const User = mongoose.model("User", userSchema);
