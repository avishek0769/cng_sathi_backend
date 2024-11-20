import mongoose, { Schema } from "mongoose"
import { app } from "../app.js";

const activeCountdowns = new Map();

async function startCountdown(stationId) {
    const stationKey = stationId.toString();

    if (activeCountdowns.has(stationKey)) {
        console.log("Cleared prev timeout");
        clearTimeout(activeCountdowns.get(stationKey)); // Clear existing countdown
    }

    const countdownTimeoutId = setTimeout(async () => {
        try {
            await Station.findByIdAndUpdate(stationId, {
                cng_available: 0,
                cng_amount: 0,
                cng_arrival_time: "nil",
                pressure: 0,
                queue: "nil",
                userResponsible: null,
                updatedAt: 0,
            });
            // TODO: Trigger Web Socket event
            app.locals.io.emit("stationStatusUpdated", {_id: stationId, cng_available: 0, queue: "nil"})
            console.log(`Fields reset to default for station ID: ${stationId}`);
        }
        catch (error) {
            console.error("Failed to reset fields:", error);
        }
        finally {
            activeCountdowns.delete(stationKey); // Remove from Map when done
        }
    }, 5 * 60 * 60 * 1000);
    activeCountdowns.set(stationKey, countdownTimeoutId);
}

// 5 * 60 * 60 * 1000

const stationSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
    place_id: {
        type: String,
        required: true
    },
    address: {
        type: String,
        default: ""
    },
    comments: [{
        type: Schema.Types.ObjectId,
        ref: "Comment"
    }],
    cng_available: {
        type: Number, // 0,1,2,3
        default: "nil",
        required: true
    },
    cng_arrival_time: {
        type: String,
        default: "nil"
    },
    pressure: {
        type: Number, // 0,1,2,3
        default: 0
    },
    queue: {
        type: String,
        required: true,
        default: "nil"
    },
    cng_amount: {
        type: Number,
        default: 0
    },
    userResponsible: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    updatedAt: {
        type: Number,
        default: 0
    },
    vicinity: {
        type: String
    }
})

stationSchema.index({ "location.lat": 1, "location.lng": 1 })

export const Station = mongoose.model("Station", stationSchema);

const changeStream = Station.watch(
    [
        {
            $match: {
                operationType: { $in: ["update", "replace"] }
            }
        }
    ],
    { fullDocument: 'updateLookup', fullDocumentBeforeChange: "whenAvailable" }
);

changeStream.on("change", (change) => {
    const updatedValue = change.fullDocument.cng_available;
    const prevValue = change.fullDocumentBeforeChange.cng_available;

    if (prevValue != updatedValue && updatedValue != 0) {
        console.log("Starting 5-hour countdown...");
        startCountdown(change.documentKey._id);
    }
})