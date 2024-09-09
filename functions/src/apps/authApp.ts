// src/controllers/idTokenApp.ts

import express from "express";
import authRouter from "../routers/authRouter";

// Initialize Express app
const app = express();

// Define routes
app.use("/", authRouter);
// Define routes

// Export the app to be used in other modules
export {app};
