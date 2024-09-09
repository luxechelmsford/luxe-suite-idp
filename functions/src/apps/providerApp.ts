import express from "express";
import providerRouter from "../routers/providerRouter";

// Initialize express application
const app = express();

// Define routes
app.use("/", providerRouter);

// Export the app to be used in other modules
export {app};
