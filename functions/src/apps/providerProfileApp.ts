import express from "express";
import {createProviderProfile} from "../controllers/providerProfile"; // Import the function from users.ts

// Initialize express application
const app = express();

// Define routes
app.post("/", createProviderProfile);

// Export the app to be used in other modules
export {app};
