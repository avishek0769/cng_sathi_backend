import mongoose, { Schema } from "mongoose"

const commentSchema = new Schema({
    comment: {
        type: String,
        required: true
    },
    commenter: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    station: {
        type: Schema.Types.ObjectId,
        ref: "Station",
        required: true
    }
})

export const Comment = mongoose.model("Comment", commentSchema);