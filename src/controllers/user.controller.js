import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import fs from "fs"

dotenv.config({
    path: ".env"
})

// AWS.config.update({
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
//     region: 'us-east-1',
// });

// const s3 = new AWS.S3();

const generateTokens = async (userId) => {
    const user = await User.findById(userId)
    const accessToken = await user.generateAccessToken()
    const refreshToken = await user.generateRefreshToken()
    return { accessToken, refreshToken }
}

const signUp = asyncHandler(async (req, res) => {
    const { username, fullname, password } = req.body;
    if (!username || !fullname || !password) ApiError(401, "Fields are empty in Sign up controller");

    const user = await User.create({
        username, fullname, password
    })
    const { accessToken, refreshToken } = await generateTokens(user._id)
    user.refreshToken = refreshToken
    await user.save();

    res
        .status(200)
        .setHeader("accessToken", accessToken)
        .setHeader("refreshToken", refreshToken)
        .json(new ApiResponse(200, user, "Account created"))
})

const logIn = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) ApiError(401, "Fields are empty in Log in controller");

    const user = await User.findOne({ username })
    if (!user) throw new ApiError(492, "User not found !");

    const isPasswordValid = user.password == password;
    if (!isPasswordValid) throw new ApiError(491, "Password is wrong !")

    const { accessToken, refreshToken } = await generateTokens(user._id)

    user.refreshToken = refreshToken;
    await user.save()

    res
        .status(200)
        .setHeader("accessToken", accessToken)
        .setHeader("refreshToken", refreshToken)
        .json(new ApiResponse(200, user, "User Logged in"))
})

const logout = asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { refreshToken: "" } },
        { new: true }
    )
    res.status(200).json(new ApiResponse(200, { success: true }, "Logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const refreshToken = req.header("Authorization")?.replace("Bearer ", "");
    if (!refreshToken) throw new ApiError(401, "No Refresh Token in header !");

    const decodedToken = jwt.decode(refreshToken, process.env.REFRESH_TOKEN_SECRET)
    if (!decodedToken) throw new ApiError(402, "Refresh Token is wrong, it is not decoding")

    const user = await User.findById(decodedToken._id);
    if (!user) throw new ApiError(401, "User not found, Refresh Token is wrong");

    if (user.refreshToken == refreshToken) {
        const { accessToken, refreshToken } = await generateTokens(user._id);
        user.refreshToken = refreshToken
        await user.save();
        res
            .status(200)
            .setHeader("accessToken", accessToken)
            .setHeader("refreshToken", refreshToken)
            .json(new ApiResponse(200, user, "Tokens refreshed Successfully !"))
    }
    throw new ApiError(401, "User is unauthorised !")
})

const getCurrentUser = asyncHandler(async (req, res) => {
    res.status(200).json(new ApiResponse(200, req.user, "Current User fetched"))
})

// const uploadAvatar = async (req, res) => {
//     const fileStream = fs.createReadStream(`C:\\Users\\avish\\OneDrive\\Desktop\\Programming\\Full_Stack_Projects\\CNG_Sathi_Backend\\uploads\\b.jpg`);

//     const uploadParams = {
//         Bucket: process.env.BUCKET_NAME,
//         Key: "key",
//         Body: fileStream,
//         ContentType: 'image/jpeg'
//     };

//     // Execute the upload command
//     const result = await s3Client.send(new PutObjectCommand(uploadParams));
//     console.log(result);
    
//     res.status(200).json(new ApiResponse(200, result, "Uploaded"))
// }


export {
    signUp,
    logIn,
    getCurrentUser,
    logout,
    refreshAccessToken,
    // uploadAvatar
}