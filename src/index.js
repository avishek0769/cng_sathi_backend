/* This is a one-time use code (RIP English)
1. Create a model for the stations.
2. Create a controller & route to push all the gas stations in kolkata in the DB.
3. Whenever a user will open the app, i will fetch the stations from my DB and show the marker in the map with other info
*/
import { app } from "./app.js";
import connectDB from "./utils/connectDB.js";
import dotenv from "dotenv"
import http from "http"
import { Server } from "socket.io"

const server = http.createServer(app)
const io = new Server(server)

app.locals.io = io;

io.on("connection", (socket) => {
    console.log("Connected--> ", socket.id);
    // socket.on()
})

dotenv.config({
    path: "./.env"
})

connectDB().then(() => {
    server.on("error", (error) => {
        console.log("Server issue: ", error);
    })
    server.listen(process.env.PORT, () => {
        console.log("Server running at: ", process.env.PORT);
    })
})