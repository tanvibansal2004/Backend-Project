import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken"

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        // we want tokens ka access which is v easy since req has access to cookies (through cookie parser)
    
        // ho skta h cookies m accessToken ka access na bhi ho (jaha humne hamare controller m cookies set kri h, vaha hi humne data m alag se bhi di h in case cookies m set na ho ya cookies hi na ho toh (can be due to various reasons)) - so we should check all possibilities - like user might be sending a custom header or smth like that
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "") // basically yeh aisa hota h header m -> Authorization: Bearer <token> - to we have now replaced the "Bearer " part with "" (empty string and no space also)
    
        if(!token) {
            throw new ApiError(401, "Unauthorized Request!")
        }
    
        // if we have the token - have to check whether its correct or not!
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        // now using this decoded token, we can access the user!
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken") // we have _id here because jb humne controller m access token banaya tha, vaha humne _id name rkha tha!
    
        if(!user) {
            throw new ApiError(401, "Invalid Access Token!")
        }
    
        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token!")
    }
})