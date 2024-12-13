import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/apiError.js';
import {User} from '../models/user.models.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser=asyncHandler(async(req,res,next)=>{
    // get user details from frontend
    // validate user details -- not empty, valid email, password length
    // check if user already exists : username and email
    // check for images and check for avatar
    // upload them to cloudinary , avatar 
    // create user object-- create entry in db
    // remove password and refres token from response
    // check for user created or not
    // return response


    const {fullName,email,username,password}=req.body
    console.log("email:",email)

    if([fullName,email,username,password].some((field)=>field?.trim()==='')){
        throw new ApiError(400,'Please fill all the fields')
    }

    const existedUser= await User.findOne({email}).then((user)=>{
        $or:[{username},{email}]
    })

    if (existedUser){
        throw new ApiError(409,'User already exists')
    }

    const avatarLocalPath=req.files?.avatar[0]?.path
    const coverImageLocalPath=req.files?.coverImage[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required");
        
    }


    // upload them to cloudinary , avatar 
    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar is required")
    }


    //create user object-- create entry in db
    const user=await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage.url || "",
        email,
        password,
        username:username.toLowerCase() 
    })

    //remove password and refres token from response
    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"

    )


    // check for user created or not
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while creating user")
    }

    // return response
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User created successfully")
    )
})

export {registerUser}