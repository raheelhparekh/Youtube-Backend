import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
            $set:{
                refreshToken:undefined
            }
            
        }
    );

    // cookies clear karne ke liye clearCookie() method use karenge
    const options = {
        httpOnly: true,
        secure: true,
    };

    res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(
        200, 
        {}, 
        "User logged out successfully"
    )
    );
});

export { registerUser, loginUser , logoutUser};
