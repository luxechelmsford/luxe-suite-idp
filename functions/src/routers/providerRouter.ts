import express from "express";
import {ProviderController} from "../controllers/providerController";

// eslint-disable-next-line new-cap
const providerRouter = express.Router(); // Use Router as a function

// Define routes

// Route to get a list of providers (getList)
providerRouter.get("/id", ProviderController.getId);
providerRouter.post("/profile", ProviderController.createProfile);

export default providerRouter;
