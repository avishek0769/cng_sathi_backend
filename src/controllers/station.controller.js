import { Station } from "../models/station.model.js"
import { User } from "../models/user.model.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import { ApiError } from "../utils/ApiError.js"
import mongoose from "mongoose";
import Redis from "ioredis";

export const client = new Redis()

const addStationsToDB = asyncHandler(async (req, res) => {
    const { index } = req.query;
    const { name } = req.params;

    // const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${name}&inputtype=textquery&fields=place_id,name,geometry,formatted_address&key=AIzaSyD0ppWVQlibdy0Jn18flA35qOsFG21OBXo`;
    // const fetchResponse = await fetch(url);
    // const data = await fetchResponse.json();

    // const station = data.candidates[Number(index)]
    // 22.523712675178462, 88.39060737356424
    await Station.create({
        name: "GreenFuel CNG Station",
        location: {
            type: "Point",
            coordinates: [88.39060737356424, 22.523712675178462]
        },
        place_id: "abc123def456",
        address: "1234 Main St, Example City, EX 12345",
        comments: [],
        cng_available: 2,
        cng_arrival_time: 1682955600,
        pressure: 3,
        queue: "20-30",
        cng_amount: 600,
        updatedAt: 1682955800,
        vicinity: "Near Main Road, Example Area"
    });

    res.status(200).json({ success: true });
})
const updateVicinity = asyncHandler(async (req, res) => {
    const { placeId } = req.params;
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=AIzaSyD0ppWVQlibdy0Jn18flA35qOsFG21OBXo`;
    const fetchResponse = await fetch(url);
    const data = await fetchResponse.json();

    const doc = await Station.updateOne(
        { place_id: placeId },
        { $set: { vicinity: data.result.vicinity } }
    )

    res.status(200).json({ success: true });
})
const populateStateData = asyncHandler(async (req, res) => {
    const stations = await Station.find({}).select("-address -cng_arrival_time -pressure -cng_amount -updatedAt");
    req.app.locals.io.emit("test", {_id: "test", cng_available: 0, queue: "nil"})

    for (const station of stations) {
        const placeId = station.place_id;

        await client.set(`cngStatusRelevancy:${placeId}`, JSON.stringify({"1": 0, "2": 0, "3": 0}));
        await client.set(`queueRelevancy:${placeId}`, JSON.stringify([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
        await client.set(`pressureRelevancy:${placeId}`, JSON.stringify({"1": 0, "2": 0, "3": 0}));
        await client.set(`quantityRelevancy:${placeId}`, JSON.stringify({"600": 0, "1200": 0}));
        await client.set(`arrivalTimeRelevancy:${placeId}`, JSON.stringify({}));
        await client.set(`lastUpdatedData:${placeId}`, JSON.stringify({
            "cng_available": 0,
            "queue": "nil",
            "pressure": 0,
            "cng_amount": 0,
            "cng_arrival_time": "nil"
        }))
    }

    res.status(200).json(new ApiResponse(200, {Lol: true}, "Populated !"))
})

const getAllStations = asyncHandler(async (req, res) => {
    // TODO: I want to show the stations in the radius of 100 km. That feature should be implemented. When my app will be used by users outside Kolkata !
    const stations = await Station.find({}).select("-address -cng_arrival_time -pressure -cng_amount -updatedAt -userResponsible -updatedAt -vicinity -comments")
    res.status(200).json(new ApiResponse(200, stations, "All the stations fetched successfully"))
})

const getStationById = asyncHandler(async (req, res) => {
    const { stationId } = req.params;
    const station = await Station.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(stationId) }
        },
        {
            $lookup: {
                from: "comments",
                foreignField: "_id",
                localField: "comments",
                as: "comments",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            foreignField: "_id",
                            localField: "commenter",
                            as: "commenter",
                            pipeline: [
                                {
                                    $project: {
                                        avatar: 1,
                                        fullname: 1,
                                        username: 1
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
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "userResponsible",
                as: "userResponsible",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            fullname: 1,
                            username: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                userResponsible: {
                    $first: "$userResponsible"
                }
            }
        }
    ])

    if (!station) throw new ApiError(401, "Station Id is wrong");

    res.status(200).json(new ApiResponse(200, station[0], "Station details fetched !"));
})

const searchStation = asyncHandler(async (req, res) => {
    const { input } = req.query;
    const regex = new RegExp(input, 'i');

    const stations = await Station.find({
        $or: [
            { address: { $regex: regex } },
            { name: { $regex: regex } }
        ]
    })
    .select("-address -comments -cng_available -cng_arrival_time -pressure -queue -cng_amount -updatedAt");

    res.status(200).json(new ApiResponse(200, stations, "Searched all the stations"));
})

const cngAvailableStations = asyncHandler(async (req, res) => {
    const stations = await Station.find({ cng_available: 1 }).select("-address -comments -cng_arrival_time -cng_amount -pressure -updatedAt -vicinity")
    res.status(200).json(new ApiResponse(200, stations, "All the cng available pumps"))
})

const bestCngOption = asyncHandler(async (req, res) => {
    const { lat, lng, maxDist } = req.query

    const station = await Station.aggregate([
        {
            $geoNear: {
                near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
                maxDistance: Number(maxDist),
                distanceField: "dist.calculated",
                spherical: true
            }
        },
        {
            $match: { cng_available: 1 }
        },
        {
            $lookup: {
                from: "comments",
                foreignField: "_id",
                localField: "comments",
                as: "comments",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            foreignField: "_id",
                            localField: "commenter",
                            as: "commenter",
                            pipeline: [
                                {
                                    $project: {
                                        avatar: 1,
                                        fullname: 1,
                                        username: 1
                                    }
                                },
                                {
                                    $addFields: {
                                        commenter: {
                                            $first: "$commenter"
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }
    ])

    res.status(200).json(new ApiResponse(200, station, "Best cng option"))
})

const updateStationStatus = asyncHandler(async (req, res) => {
    const { cngStatus, pressure, queue, quantity, arrivalTime, placeId, relevancy } = req.query;

    console.log(cngStatus, pressure, queue, quantity, arrivalTime);
    
    // Fetch the data from Redis for the relevant station
    const cngStatusData = JSON.parse(await client.get(`cngStatusRelevancy:${placeId}`))
    const queueData = JSON.parse(await client.get(`queueRelevancy:${placeId}`))
    const pressureData = JSON.parse(await client.get(`pressureRelevancy:${placeId}`))
    const quantityData = JSON.parse(await client.get(`quantityRelevancy:${placeId}`))
    const arrivalTimeData = JSON.parse(await client.get(`arrivalTimeRelevancy:${placeId}`))
    let lastUpdatedData = JSON.parse(await client.get(`lastUpdatedData:${placeId}`))

    // Updating Relevancy in Redis for different keys
    if (cngStatus != "nil") {
        cngStatusData[cngStatus] += Number(relevancy);
        await client.set(`cngStatusRelevancy:${placeId}`, JSON.stringify(cngStatusData));
    }
    if (queue != "nil") {
        queueData[Number(queue)] += Number(relevancy);
        await client.set(`queueRelevancy:${placeId}`, JSON.stringify(queueData));
    }
    if (pressure != "nil") {
        pressureData[pressure] += Number(relevancy);
        await client.set(`pressureRelevancy:${placeId}`, JSON.stringify(pressureData));
    }
    if (quantity != "nil") {
        quantityData[quantity] += Number(relevancy);
        await client.set(`quantityRelevancy:${placeId}`, JSON.stringify(quantityData));
    }
    if (arrivalTime != "nil") {
        if (arrivalTimeData[arrivalTime]) {
            arrivalTimeData[arrivalTime] += Number(relevancy);
        } else {
            arrivalTimeData[arrivalTime] = Number(relevancy);
        }
        await client.set(`arrivalTimeRelevancy:${placeId}`, JSON.stringify(arrivalTimeData));
    }
console.log(cngStatusData,"\n");
console.log(queueData,"\n");
console.log(pressureData,"\n");
console.log(quantityData,"\n");
console.log(arrivalTimeData,"\n");
console.log("Last updated-->", lastUpdatedData,"\n");
console.log("\n");

let mostlyProbableData = { ...lastUpdatedData };

console.log("Mostly initially-->", mostlyProbableData,"\n");

    // Find the most probable CNG status based on relevancy
    let relevantCngStat = Object.entries(cngStatusData).reduce((a, b) => b[1] > a[1] ? b : a);
    if (relevantCngStat[1] >= 25) {
        mostlyProbableData["cng_available"] = Number(relevantCngStat[0]);
        
        if(queue != "nil"){
            let index = queueData.reduce((maxIdx, num, idx, arr) => num > arr[maxIdx] ? idx : maxIdx, 0);
            if (queueData[index] >= 15) {
                mostlyProbableData["queue"] = index !== 10 ? `${index * 10}-${(index + 1) * 10}` : "100+";
            }
        }
        if (pressure != "nil") {
            let relevantPressure = Object.entries(pressureData).reduce((a, b) => b[1] > a[1] ? b : a);
            if (relevantPressure[1] >= 15) {
                mostlyProbableData["pressure"] = Number(relevantPressure[0]);
            }
        }
        if (quantity != "nil") {
            if (quantityData["600"] > quantityData["1200"] && quantityData["600"] >= 15) {
                mostlyProbableData["cng_amount"] = 600;
            }
            else if (quantityData["1200"] > quantityData["600"] && quantityData["1200"] >= 15) {
                mostlyProbableData["cng_amount"] = 1200;
            }
        }
        console.log(arrivalTime, arrivalTime != "nil");
        if (arrivalTime != "nil") {
            console.log("lol");
            let arrivalArray = Object.entries(arrivalTimeData)
            console.log("Arrival Array-->", arrivalArray);
            let relevantArrTime;
            if(arrivalArray.length == 1){
                if(arrivalArray[0][1] >= 15) mostlyProbableData["cng_arrival_time"] = arrivalArray[0][0];
            }
            else {
                relevantArrTime = arrivalArray.reduce((a, b) => b[1] > a[1] ? b : a);
                console.log("Relevant array tiem-->", relevantArrTime);``
                if (relevantArrTime[1] >= 15) {
                    mostlyProbableData["cng_arrival_time"] = relevantArrTime[0];
                }
            }
        }
    }
    console.log("Mostly after updated-->", mostlyProbableData,"\n");

    // Compare and update only if necessary
    if (JSON.stringify(lastUpdatedData) != JSON.stringify(mostlyProbableData)) {
        const station = await Station.findOneAndUpdate(
            { place_id: placeId },
            {
                ...mostlyProbableData,
                updatedAt: Date.now(),
                userResponsible: req.user._id,
            },
            { new: true }
        )
        // TODO: Trigger Web Socket event
        req.app.locals.io.emit("stationStatusUpdated", {_id: station._id, cng_available: mostlyProbableData.cng_available, queue: mostlyProbableData.queue})

        await User.findByIdAndUpdate(req.user._id, { $inc: { totalUpdates: 1 } });
        let latUP = await client.set(`lastUpdatedData:${placeId}`, JSON.stringify(mostlyProbableData));
        console.log("Last updated response-->", latUP,"\n");

        res.status(200).json(new ApiResponse(200, { dbUpdated: true }, "Your update is updated"));
    }
    else {
        res.status(200).json(new ApiResponse(200, { dbUpdated: false }, "Your update is already up to date"));
    }
})

export { 
    addStationsToDB,
    getAllStations,
    getStationById,
    updateVicinity,
    searchStation,
    cngAvailableStations,
    bestCngOption,
    populateStateData,
    updateStationStatus
}