// src/controllers/idTokenApp.ts

import express from "express";
import {getTokenClaims} from "../controllers/idToken"; // Import the unchanged verifyIdToken middleware

// Initialize Express app
const app = express();

// Define routes
app.get("/", getTokenClaims);
// Define routes

// Export the app to be used in other modules
export {app};
