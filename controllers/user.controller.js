import UserModel from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import CatchAsyncError from "../middleware/catchAsyncError.js"
import jwt from "jsonwebtoken"
import ejs from "ejs"
import dotEnv from "dotenv"
import path from "path"

dotEnv.config()



export const registrationUser = CatchAsyncError(async (req,res,next ) => {
    try {
        const {name,email,password} = req.body
        const isEmailExist = await UserModel.findOne({email})
        if(isEmailExist){
            return next(new ErrorHandler('Email is already exist',400))
        }

        const user = {name,email,password}

        const activationToken = createActivationToken(user)

        const activationCode = activationToken.activationCode

        const data = {user:{name:user.name},activationCode}

        const html = await ejs.renderFile(path.join())

    } catch (error) {
        return next(new ErrorHandler(error.message,400))
    }
})

export const createActivationToken = (user) => {
    const activationCode = Math.floor(1000+Math.random() *9000).toString()
    const token = jwt.sign({user,activationCode},
        process.env.ACTIVATION_SECRET,{
            expiresIn:"5m"
        }
    )
    return {token,activationCode}
}