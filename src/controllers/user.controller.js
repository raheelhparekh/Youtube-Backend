import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// ALGORITHM TO REGISTER USER
// get user details from frontend
// validate user details -- not empty, valid email, password length
// check if user already exists : username and email
// check for images and check for avatar bcoz avatar is required in our database
// upload them to cloudinary , avatar again check upload hua he ya nahi
// create user object-- create entry in db
// remove password and refres token from response
// check for user created or not
// return response

const registerUser = asyncHandler(async (req, res, next) => {
  // Step1: from req.body--> json, form data
  const { fullName, email, username, password } = req.body;
  // console.log(req.body)

  // Step2: Validate user details
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "Please fill all the fields");
  }

  // Step3 : User is coming from mongoose model and User.findOne() is a method to check if user already exists
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  // Step4: Take images and avatar
  // from multer user.routes.js we are getting files from req.files
  // multer ne files li he user se aur apne server pe laya he for now
  // SYNTAX--> req.files?.filename[0]?.path

  // console.log(req.files)

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  // check for avatar which is required
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar File is required");
  }

  // Step5: upload them to cloudinary , avatar
  // uploadOnCloudinary is a function from cloudinary.js
  // file upload karne me time lagta he so we are using await. aage ka code jana hi nahi he jab tak ye complete nahi hota
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar File is required");
  }

  // STEP 6:create user object-- create entry in db
  // User.create() is a method to create user
  // await bcoz time lagta he user create hone me
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // STEP7: remove password and refresh token from response
  // SYNTAX IS WIERD
  // findById() is a method to find user by id
  // select() is a method to select fields which we want to show, -password, -refreshToken means we don't want to show password and refresh token
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // STEP 8: check for user created or not
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating user");
  }

  // STEP 9: return response from ApiResponse.js
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User created successfully"));
});

const generateAccessAndRefreshToken = async (userId) => {
  try {
    // user find karna padega to generate token
    const user = await User.findById(userId);

    //generateAccessToken $ generateRefreshToken are methods from user.models.js from JWT
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // console.log("Refresh Token Generated", refreshToken);
    // console.log("Acess Token Generated", accessToken);

    // refresh token save karna padega in database bcoz user model me refreshToken field he
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh tokens"
    );
  }
};

// ALGORITHM TO LOGIN USER
// req.body se email,username and password lelo
// check username and email are not empty and entered by user
// find if user exists in db via username or email
// check password entered is correct or not
// if correct then generate ACCESS TOKEN and REFRESH TOKEN
// send these tokens in response via secured COOKIES
// return response

const loginUser = asyncHandler(async (req, res, next) => {
  // Step1: from req.body--> json, form data
  const { email, username, password } = req.body;
  // console.log(req.body)

  // Step2: Validate user details
  if (!username && !email) {
    throw new ApiError(400, "Please enter username or email");
  }

  // Step3: find if user exists in db via username or email
  // $or is a operator in mongoose
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Step 4: user milgaya ab password check karna he
  // isPasswordCorrect is a method from user.models.js via bcrypt
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  // Step 5: generate ACCESS TOKEN and REFRESH TOKEN
  // creating a method to generate access token and refresh token above for user and saving refresh token in database and returning both tokens

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  // STEP 6 : send these tokens in response via secured COOKIES

  // but first we need to define what to send in response. we dont want to send password and refresh tokens
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

// requires a self middleware to check if user is logged in or not--> we will create a middleware auth.middlewares.js

const logoutUser = asyncHandler(async (req, res, next) => {
  // req.user._id is coming from auth.middlewares.js and user milgaya bcoz of verifyJWT
  // isse refresh token remove hoga from database
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  // cookies clear karne ke liye clearCookie() method use karenge
  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// if access token is expired then we can use refresh token to get new access token and refresh token, therefore we need a new route for this
const refreshAccessToken = asyncHandler(async (req, res) => {
  // incomingRefreshToken is the one which is already stores in our database whose access token is expired. so based on this user id we will generate new access token and refresh token
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    // isse we are getting our raw refresh token which is decoded by jwt.verify() method
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // now finding user by _id
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // checking if incoming refresh token is same as the one stored in database or not
    // if not same then throw error
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    // if same then generate new access token and refresh token via cookie
    const options = {
      httpOnly: true,
      secure: true,
    };

    // generate new access token and refresh token
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!(currentPassword || newPassword)) {
    throw new ApiError(400, "Please enter current password and new password");
  }

  // finding user by id
  const user = await User.findById(req.user._id);

  // checking if current password is entered correct or not. we had written a method in user.models.js to check this isPasswordCorrect()
  const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid current password");
  }

  // if correct then update the password in database
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  // return response
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// to get current user details we can get if user is logged in. req.user will have user details from the middleware
const getCurrentUser = asyncHandler(async (req, res, next) => {
  res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User Fetched Successfully"));
});

// to update account details such as email and fullName
const updateAccountDetails = asyncHandler(async (req, res, next) => {
  const { fullName, email } = req.body;

  if (!(fullName || email)) {
    throw new ApiError(400, "Please enter fullName or email to update");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  //return response
  res
    .status(200)
    .json(new ApiResponse(200, user, "User details updated successfully"));
});

// to update user avatar image
const updateUserAvatar = asyncHandler(async (req, res, next) => {
  // Step 1: get avatar from req.file
  const avatarLocalPath = req.file?.avatar[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar File is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Avatar Url is required");
  }

  // Step 2: update avatar in database
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  // Step 3: return response
  res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

// to update user cover image
const updateUserCoverImage = asyncHandler(async (req, res, next) => {
  // Step 1: get coverImage from req.file
  const coverImageLocalPath = req.file?.coverImage[0]?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image File is required");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "coverImage Url is required");
  }

  // Step 2: update coverImage in database
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  // Step 3: return response
  res
    .status(200)
    .json(new ApiResponse(200, user, "coverImage updated successfully"));
});

// Aggregate Pipelines in MongoDB to find Subscribers and subscribed to
const getUserChannelProfile = asyncHandler(async (req, res, next) => {
  const { username } = req.params; // params bcoz we are getting username from url /:username

  if (!username?.trim()) {
    throw new ApiError(400, "Please provide username");
  }

  // User.aggregate([{},{},{}] --> returns an array of objects with {} includes pipeline stages which u want to perform
  const channel = await User.aggregate([
    {
      // $match pipeline to match username
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      // $lookup has 4 fields from, localField, foreignField, as
      // kitne subscribers he us channel ke
      $lookup: {
        from: "subscriptions", // from which model we want to get data
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      // mene kitne channels ko subscribe kiya he
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      // $addFields is a pipeline to add new fields in the database
      // $size is a method to get the length of the array --> counting
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        subscribedToCount: {
          $size: "$subscribedTo",
        },
        // $in is a method to check if user is subscribed or not basically the button will be subscribe or unsubscribe
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      // $project means what fields we want to show
      $project: {
        fullName: 1,
        username: 1,
        subscribedToCount: 1,
        subscribersCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
      },
    },
  ]);
  // console.log(channel)

  if (!channel?.length) {
    throw new ApiError(404, "Channel not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User Channel Fetched Successfully")
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
};
