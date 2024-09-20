import express from "express";
import providerRouter from "./providerRouter";

// Initialize express application
const providerApp = express();

// Define routes
providerApp.use("/", providerRouter);

// Export the app to be used in other modules
export {providerApp};
