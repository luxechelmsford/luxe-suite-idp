import express from "express";
import userRouter from "./userRouter";

// Initialize express application
const userApp = express();

// Define routes
userApp.use("/", userRouter);

// Export the app to be used in other modules
export {userApp};
