import express from "express"
import cors from "cors"

export const app = express()

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(statusCode).json({ message });
}

// Some important configurations for every requests
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
// app.use(express.json({limit: "10mb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.json())

// Routes
import { stationRouter } from "./routes/station.routes.js";
app.use("/station", stationRouter)

import { userRouter } from "./routes/user.routes.js";
app.use("/user", userRouter)

import { commentRouter } from "./routes/comment.routes.js";
app.use("/comment", commentRouter)

app.use(errorHandler)
