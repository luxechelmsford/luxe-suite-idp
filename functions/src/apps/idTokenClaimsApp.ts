// src/controllers/idTokenApp.ts

import express from "express";
import {IdToken} from "../controllers/idToken";

// Initialize Express app
const app = express();

// Define routes
app.get("/", IdToken.getClaims);
// Define routes

// Export the app to be used in other modules
export {app};
