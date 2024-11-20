import { Router } from "express";
import { addStationsToDB, bestCngOption, cngAvailableStations, getAllStations, getStationById, populateStateData, searchStation, updateStationStatus, updateVicinity } from "../controllers/station.controller.js";
import { verifyStrictJWT } from "../middlewares/auth.middleware.js"

export const stationRouter = Router()

stationRouter.route("/addStationsToDB/:name").get(addStationsToDB)
stationRouter.route("/updateVicinity/:placeId").get(updateVicinity)
stationRouter.route("/getAllStations").get(getAllStations)
stationRouter.route("/getStationById/:stationId").get(getStationById)
stationRouter.route("/searchStation").get(searchStation)
stationRouter.route("/cngAvailableStations").get(cngAvailableStations)
stationRouter.route("/bestCngOption").get(bestCngOption)
stationRouter.route("/populateStateData").get(populateStateData)
stationRouter.route("/updateStationStatus").get(verifyStrictJWT, updateStationStatus)
