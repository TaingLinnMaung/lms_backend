import express from "express"
import dotEnv from "dotenv"
import cookieParser from "cookie-parser"
import cors from "cors"
import {ErrorMiddleware} from "./middleware/error.js"

export const app = express()

dotEnv.config()

//body parser
app.use(express.json({limit:"50mb"}))

//cookie parser
app.use(cookieParser())

//cors
// app.use(cors({
//     origin:process.env.ORIGIN
// }))

app.use(cors())


//api
app.get("/api/test",(req,res,next) => {
    res.status(200).json({
        success:true,
        message:"api is working"
    })
})

app.all("*",(req,res,next) => {
    const err = new Error(`Route ${req.originalUrl} is not Found! `)
    err.statusCode = 404
    next(err)
})

app.use(ErrorMiddleware)