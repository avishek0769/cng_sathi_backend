import { Router } from "express";
import { getCurrentUser, logIn, logout, refreshAccessToken, signUp } from "../controllers/user.controller.js";
import {verifyJWT, verifyStrictJWT} from "../middlewares/auth.middleware.js"

export const userRouter = Router()

userRouter.route("/signup").post(signUp)
userRouter.route("/login").post(logIn)
userRouter.route("/getCurrentUser").get(verifyStrictJWT, getCurrentUser)
userRouter.route("/logout").get(verifyStrictJWT, logout)
userRouter.route("/refreshAccessToken").get(refreshAccessToken)
// userRouter.route("/uploadAvatar").post(verifyStrictJWT, uploadAvatar)