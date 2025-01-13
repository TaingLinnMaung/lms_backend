import mongoose from "mongoose"
import bcrypt from "bcryptjs"

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
    required:[true,'Please enter your password'],
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

const UserModel = mongoose.model("User", userSchema);
export default UserModel
