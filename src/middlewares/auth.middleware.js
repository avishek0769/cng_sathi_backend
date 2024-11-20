import jwt from "jsonwebtoken"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js";

const verifyStrictJWT = async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if (!token) {
            throw new ApiError(452, "Unauthorised request");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken._id).select("-password -refreshToken")

        if (!user) throw new ApiError(452, "Invalid Access Token");

        req.user = user;
        next()
    }
    catch (error) {
        console.log("Error --> ", error);
        if (error instanceof ApiError) next(error);
        else next(new ApiError(452, "Your Access Token expired !"))
    }
}

const verifyJWT = async (req, res, next) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    if (token) {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken._id).select("-password -refreshToken")
        if (user) req.user = user;
    }
    next()
}

export { verifyStrictJWT, verifyJWT }