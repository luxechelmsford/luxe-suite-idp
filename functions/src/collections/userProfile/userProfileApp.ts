import express from "express";
import userProfileRouter from "./userProfileRouter";

// Initialize express application
const userProfileApp = express();

// Define routes
userProfileApp.use("/", userProfileRouter);

// Export the app to be used in other modules
export {userProfileApp};
