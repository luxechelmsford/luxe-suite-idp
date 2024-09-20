import express from "express";
import {ProviderController} from "./providerController";

// eslint-disable-next-line new-cap
const providerRouter = express.Router(); // Use Router as a functio

const providerController = new ProviderController();

// Define routes

// Route to get a provider with passed id (get)
providerRouter.get("/id", providerController.getId);

export default providerRouter;
