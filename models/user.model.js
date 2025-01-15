import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import dotEnv from "dotenv"
import jwt from "jsonwebtoken"
dotEnv.config()

const emailRegexPattern = /^[\w\.-]+@[\w\.-]+\.\w+$/;

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your name"]
  },
  email: {
    type: String,
    required: [true, "Please enter your email"],
    validate: {
      validator: function (value) {
        return emailRegexPattern.test(value);
      },
      message:"Please enter a valid email",
    },
    unique:true,
  },
  password: {
    type: String,
    // required:[true,'Please enter your password'],
    minlength:[6,'Password must be at least 6 characters'],
    select:false,
  },
  avatar: {
    public_id: String,
    url: String
  },
  role: {
    type: String,
    default: "user"
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  courses: [
    {
      courseId: String
    }
  ]
},{timestamps:true});

// Hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
      return next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next();
  });

// Adding a method to compare passwords
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

//sign access token
userSchema.methods.SignAccessToken =  function () {
    return jwt.sign({id:this.id},process.env.ACCESS_TOKEN || "",{
        expiresIn:"5m"
    })
}

//sign refresh token
userSchema.methods.SignRefreshToken =  function () {
    return jwt.sign({id:this._id},process.env.REFRESH_TOKEN || "",{
        expiresIn:"3d"
    })
}

const userModel = mongoose.model("User", userSchema);
export default userModel
