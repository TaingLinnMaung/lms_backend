import userModel from "../models/user.model.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import CatchAsyncError from "../middleware/catchAsyncError.js";
import jwt from "jsonwebtoken";
import ejs from "ejs";
import dotEnv from "dotenv";
import path from "path";
import sendMail from "../utils/sendMail.js";
import {__dirname,__filename} from "../config/filePath.js"
import { accessTokenOptions, refreshTokenOptions, sendToken } from "../utils/jwt.js";
import commonPasswords from "../staticData/commonPassword.js" 
import { redis } from "../config/redis.js";
import { decode } from "punycode";
import { getUserById } from "../services/user.service.js";

dotEnv.config();

//register user
export const registrationUser = CatchAsyncError(async (req, res, next) => {

  try {
    const { name, email, password } = req.body;
    const isEmailExist = await userModel.findOne({ email });
    if (isEmailExist) {
      return next(new ErrorHandler("Email is already exist", 400));
    }

    const user = { name, email, password };


    if (commonPasswords.common_passwords.includes(password)) {
        return next(new ErrorHandler("Password is too common", 400));
      }
  
    const activationToken = createActivationToken(user);

    const activationCode = activationToken.activationCode;

    const data = { user: { name: user.name }, activationCode };

    const html = await ejs.renderFile(
      path.join(__dirname, "../mails/activation-mail.ejs"),
      data
    );

    try {
      await sendMail({
        email: user.email,
        subject: "Activate your account",
        template: "activation-mail.ejs",
        data,
      });
      res.status(201).json({
        success: true,
        message: `Please check your email: ${user.email} to activate your account!`,
        activationToken: activationToken.token,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});


//create activation token
export const createActivationToken = (user) => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
  const token = jwt.sign(
    { user, activationCode },
    process.env.ACTIVATION_SECRET,
    {
      expiresIn: "5m",
    }
  );
  return { token, activationCode };
};


//activate user
export const activateUser = CatchAsyncError(async (req,res,next) => {
    try {
        const {activation_token,activation_code} = req.body

        const newUser  = jwt.verify(activation_token,process.env.ACTIVATION_SECRET)

        if(newUser.activationCode !== activation_code){
            return next(new ErrorHandler("Invalid activation code!"))
        }

        const {name,email,password} = newUser.user
        const existUser = await userModel.findOne({email})

        if(existUser){
            return next(new ErrorHandler('Email already exist',400))
        }

        const user = await userModel.create({
            name,
            email,
            password
        })
        res.status(201).json({
            success:true,
            user

        })
        
    } catch (error) {
        return next(new ErrorHandler(error.message,400))
    }
})


//login user
export const loginUser = CatchAsyncError(async (req,res,next) => {
    try {
        const {email,password} = req.body
        if(!email || !password) {
            return next(new ErrorHandler("Please enter email and password",400))
        }
        const user = await userModel.findOne({email}).select("+password")

        if(!user) {
            return next(new ErrorHandler("Invalid email or password"))
        }

        const isPasswordMatch = await user.comparePassword(password)

        if(!isPasswordMatch) {
            return next(new ErrorHandler("Invalid email or password"))
        }

        sendToken(user,200,res)
        
    } catch (error) {
        return next(new ErrorHandler(error.message,400))
    }
})


//logout user
export const logoutUser = CatchAsyncError(async (req,res,next) => {
    try {
        res.cookie("access_token","",{maxAge:1})
        res.cookie("refresh_token","",{maxAge:1})
        redis.del(req.user._id || "")
        res.status(200).json({
            success:true,
            message:"Logged out successfully!"
        })
    } catch (error) {
        return next(new ErrorHandler(error.message,400))
    }
})


//update access token
export const updateAccessToken = CatchAsyncError(async (req,res,next) =>{
    try {
        const refresh_token = req.cookies.refresh_token
        const decoded = jwt.verify(refresh_token,process.env.REFRESH_TOKEN)

        const message = `Could not refresh token`
        if(!decode) {
            return next(new ErrorHandler(message,400))
        }

        const session = await redis.get(decoded.id)

        if(!session) {
            return next(new ErrorHandler(message,400))
        }

        const user =  JSON.parse(session)

        const accessToken = jwt.sign({id:user._id},process.env.ACCESS_TOKEN,{
            expiresIn:"5m"
        })

        const refreshToken = jwt.sign({id:user._id},process.env.REFRESH_TOKEN,{
            expiresIn:"3d"
        })

        req.user = user

        res.cookie("access_token",accessToken,accessTokenOptions)
        res.cookie("refresh_token",refreshToken,refreshTokenOptions)

        res.status(200).json({
            status:'success',
            accessToken
        })

    } catch (error) {
        return next(new ErrorHandler(error.message,400))
    }
})


///get user info
export const getUserInfo = CatchAsyncError(async (req,res,next) => {
    try {
        const userId = req.user?._id
        getUserById(userId,res)
        
    } catch (error) {
        return next(new ErrorHandler(error.message,400))
    }
})


//social authh
export const socialAuth = CatchAsyncError(async (req,res,next) => {
    try {
        const {email,name,avatar} = req.body
        const user = await userModel.findOne({email})  
        if(!user){
            const newUser = await userModel.create({email,name,avatar})
            sendToken(newUser,200,res)
        }else{
            sendToken(user,200,res)
        }
    } catch (error) {
        return next(new ErrorHandler(error.message,400))
    }
})


//update user info
export const updateUser = CatchAsyncError(async (req,res,next) => {
    try {
        const {name,email} = req.body
        const userId = req.user?._id

        const user = await userModel.findById(userId)

        if(email && user){
            const isEmailExist = await userModel.findOne({email})
            if(isEmailExist){
                return next(new ErrorHandler('Email already exist',400))
            }
            user.email = email
        }

        if(name && user){
            user.name = name
        }

      await  user?.save()
      await redis.set(userId,JSON.stringify(user))

      res.status(200).json({
        success:true,
        user,
      })
    } catch (error) {
        return next(new ErrorHandler(error.message,400))
    }
})


//update user password
export const updatePassword = CatchAsyncError(async (req,res,next) => {
    try {
        const {oldPassword,newPassword} = req.body

        if(!oldPassword || !newPassword){
            return next(new ErrorHandler('Please enter old and new password',400))
        }

        const userId = req.user?._id

        const user = await userModel.findById(userId).select("+password")
        console.log(user)
        if(user?.password === undefined){
            return next(new ErrorHandler('Invalid user',400))
        }

        const isPasswordMatch = await user?.comparePassword(oldPassword)
       
        if(!isPasswordMatch){
            return next(new ErrorHandler('Invalid old password!',400))
        }

        user.password = newPassword

        await user.save()
        await redis.set(userId,JSON.stringify(user))

        res.status(200).json({
            success:true,
            user,
        })
        
    } catch (error) {
        return next(new ErrorHandler(error.message,400))
    }
})
