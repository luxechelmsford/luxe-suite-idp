import express from "express";
import authRouter from "./authRouter";

// Initialize express application
const authApp = express();

// Define routes
authApp.use("/", authRouter);

// Export the app to be used in other modules
export {authApp};
