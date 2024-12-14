import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/apiError.js';
import {User} from '../models/user.models.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

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

    const registerUser=asyncHandler(async(req,res,next)=>{
    
    // Step1: from req.body--> json, form data
    const {fullName,email,username,password}=req.body
    console.log("email:",email)
    

    // Step2: Validate user details
    if([fullName,email,username,password].some((field)=>field?.trim()==='')){
        throw new ApiError(400,'Please fill all the fields')
    }

    // Step3 : User is coming from mongoose model and User.findOne() is a method to check if user already exists
    const existedUser= await User.findOne({
        $or:[{ username } , { email }]
    })
    if (existedUser){
        throw new ApiError(409,'User already exists')
    }

    // Step4: Take images and avatar
    // from multer user.routes.js we are getting files from req.files
    // multer ne files li he user se aur apne server pe laya he for now
    // SYNTAX--> req.files?.filename[0]?.path
    const avatarLocalPath=req.files?.avatar[0]?.path
    const coverImageLocalPath=req.files?.coverImage[0]?.path

    // check for avatar which is required
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar File is required");    
    }

    // Step5: upload them to cloudinary , avatar 
    // uploadOnCloudinary is a function from cloudinary.js
    // file upload karne me time lagta he so we are using await. aage ka code jana hi nahi he jab tak ye complete nahi hota
    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar File is required")
    }

    // STEP 6:create user object-- create entry in db
    // User.create() is a method to create user
    // await bcoz time lagta he user create hone me
    const user=await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase() 
    })

    // STEP7: remove password and refresh token from response
    // SYNTAX IS WIERD
    // findById() is a method to find user by id
    // select() is a method to select fields which we want to show, -password, -refreshToken means we don't want to show password and refresh token
    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // STEP 8: check for user created or not
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while creating user")
    }

    // STEP 9: return response from ApiResponse.js
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User created successfully")
    )
})

export {registerUser}