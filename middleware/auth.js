import ErrorHandler from "../utils/ErrorHandler.js";
import CatchAsyncError from "./catchAsyncError.js";
import jwt from "jsonwebtoken"
import dotEnv from "dotenv"
import { redis } from "../config/redis.js";

//authenticated user
dotEnv.config()
export const isAuthenticated = CatchAsyncError(async (req,res,next) => {
    try {
        const access_token = req.cookies.access_token
       
        if(!access_token){
            return next(new ErrorHandler("Please Login To Access This Resources",400))
        }

        const decoded = jwt.verify(access_token,process.env.ACCESS_TOKEN)

        if(!decoded){
            return next(new ErrorHandler("access token is not valid",400))
        }

        const user = await redis.get(decoded.id)

        if(!user) {
            return next(new ErrorHandler("user not found",400))
        }

        req.user = JSON.parse(user)

        next()

    } catch (error) {
        
    }
})

//validate user role

export const authorizeRoles = (...roles) => {
    return (req,res,next) => {
        if(!roles.includes(req.user?.role || "")){
            return next(new ErrorHandler(`Role:${req.user?.role} is not allowed to access this resources`,403))
        }
        next()
    }
}