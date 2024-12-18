import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";

// EXTRA PRODUCTION GRADE CODE PRACTISE
// _ means we are not using next so we can use _ instead of response
// export const verifyJWT = asyncHandler(async (req, _, next) => {});

export const verifyJWT = asyncHandler(async (req, res, next) => {

    try {
        // Step 1: get token access from cookies 
        // Step 2: get token access from headers bcoz mobile app will send token in headers not in cookies so we need to check both . Bearer go on google and search what is Bearer token JWT
        const token= req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
        if(!token){
           throw new ApiError(401, "Unauthorized, please login first");
        }
    
        // Step 3: verify the token
        const decodedToken= jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user= await User.findById(decodedToken?._id).select("-password refreshToken"); // _id bcoz we have saved _id in token while genrating token in user.models.js
    
        if(!user){
            throw new ApiError(404, "Invalid Access Token");
        }
    
        req.user=user;
    
        next();
    } catch (error) {
        next(new ApiError(401, "Inavlid Access Token"));
        
    }
})