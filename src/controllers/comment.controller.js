import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js"
import { Station } from "../models/station.model.js";

const addComment = asyncHandler(async (req, res) => {
    const { stationId, message } = req.body;
    
    const comment = await Comment.create({
        commenter: req.user._id,
        comment: message,
        station: stationId
    })
    await Station.findByIdAndUpdate(
        stationId,
        { $addToSet: { comments: comment._id } }
    )
    res.status(200).json(new ApiResponse(200, {commentId: comment._id}, "Comment added"))
})

const getCommentsOfAStation = asyncHandler(async (req, res) => {
    const { stationId } = req.params;
    const comments = await Comment.aggregate([
        {
            $match: { station: new mongoose.Types.ObjectId(stationId) }
        },
        {
            $lookup: {
                from: "users",
                localField: "commenter",
                foreignField: "_id",
                as: "commenter",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            username: 1,
                            fullname: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                commenter: {
                    $first: "$commenter"
                }
            }
        }
    ])
    res.status(200).json(new ApiResponse(200, comments, "All the comments fetched for the given station id"))
})

const editComment = asyncHandler(async (req, res) => {
    const { commentId, message } = req.body;
    const comment = await Comment.findByIdAndUpdate(
        commentId,
        { comment: message },
        { new: true }
    )
    res.status(200).json(new ApiResponse(200, {success: true}, "Comment edited"))
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const comment = await Comment.findByIdAndDelete(commentId)
    await Station.findByIdAndUpdate(
        comment.station,
        { $pull: { comments: comment._id } }
    )
    res.status(200).json(new ApiResponse(200, {success: true}, "Comment deleted"))
})

export {
    addComment,
    getCommentsOfAStation,
    editComment,
    deleteComment
}