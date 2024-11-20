import { Router } from "express";
import { addComment, deleteComment, editComment, getCommentsOfAStation } from "../controllers/comment.controller.js";
import { verifyStrictJWT } from "../middlewares/auth.middleware.js";


export const commentRouter = Router()

commentRouter.route("/getComment/:stationId").get(getCommentsOfAStation)
commentRouter.route("/addComment").post(verifyStrictJWT, addComment)
commentRouter.route("/edit").put(verifyStrictJWT, editComment)
commentRouter.route("/delete/:commentId").delete(verifyStrictJWT, deleteComment)
