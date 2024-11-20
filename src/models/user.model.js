import mongoose from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    totalUpdates: {
        type: Number,
        default: 0
    },
    falseUpdates: {
        type: Number,
        default: 0
    },
    refreshToken: {
        type: String,
    },
    reports: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Report"
    }],
    avatar: {
        type: String,
        default: "https://www.shutterstock.com/image-vector/blank-avatar-photo-place-holder-600nw-1095249842.jpg"
    },
})

// userSchema.pre("save", async function (next) {
//     if (!this.isModified("password")) next();
//     this.password = await bcrypt.hash(this.password, 10)
//     next()
// })
// userSchema.method.isPasswordCorrect = async function (password) {
//     return await bcrypt.compare(password, this.password)
// }
userSchema.methods.generateAccessToken = async function () {
    return jwt.sign(
        {
            _id: this._id,
            fullname: this.fullname,
            username: this.username
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    )
}
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    )
}

export const User = mongoose.model("User", userSchema)