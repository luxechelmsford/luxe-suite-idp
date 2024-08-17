/*
// import firebase fucntions must be before the app initialisation
import * as v2 from "firebase-functions/v2";

// then import fireabse.ts which has app initalisations etc
// import {idpAuth, idpDatabase} from "../configs/firebase";
//
// then import anythign else
import express from "express";
import {onUserRegistered, onRealtimeDbUserCreated, onRealtimeDbUserUpdated, onRealtimeDbUserDeleted} from "./triggers/user-triggers";
import {app as tokenClaimsApp} from "./controllers/token-claims.js";

// Create "main" function to host all other top-level functions
const api = express();
api.use("/v1/tokenClaims", tokenClaimsApp);
exports.api = v2.https.onRequest({region: "europe-west2"}, async (request, response) => {
  api(request, response);
});

// Export the functions to FirebaseY
exports.onUserRegistered = onUserRegistered;
exports.onRealtimeDbUserCreated = onRealtimeDbUserCreated;
exports.onRealtimeDbUserUpdated = onRealtimeDbUserUpdated;
exports.onRealtimeDbUserDeleted = onRealtimeDbUserDeleted;
*/

// Import Firebase Functions and Express
import * as v2 from "firebase-functions/v2";
import express from "express";
import cors from "cors";

// Import configuration and application setup
import {defaultRegion} from "./configs/firebase";
import {verifyIdToken} from "./controllers/idToken";
import {app as idTokenApp} from "./apps/idTokenApp";
import {app as providerProfileApp} from "./apps/providerProfileApp";

// Import triggers
import {onGlobalUserCreate, onGlobalProfileUpdate} from "./triggers/globalProfileTriggers";
import {onProviderProfileUpdate, onUserProviderProfileDelete} from "./triggers/providerProfileTriggers";

// Create the main Express application
const api = express();

// Enable CORS
api.use(cors({origin: true}));

// Middleware to parse JSON request bodies
api.use(express.json());

// Support URL-encoded bodies
express.urlencoded({extended: true});

// Middleware to set additional CORS headers for all routes
// todo remove before we going to production
api.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*"); // For testing purposes, allow all origins
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});


// Apply the middleware function globally
// so that the token in the header is verified and appened to the resposse object
api.use(verifyIdToken);

api.use("/v1/provider-profile", providerProfileApp);
api.use("/v1/id-token", idTokenApp);

// Export the API function
exports.api = v2.https.onRequest({region: defaultRegion}, (request, response) => {
  api(request, response);
});

// Export triggers
exports.onGlobalUserCreate = onGlobalUserCreate;
exports.onGlobalProfileUpdate = onGlobalProfileUpdate;
exports.onProviderProfileUpdate = onProviderProfileUpdate;
exports.onUserProviderProfileDelete = onUserProviderProfileDelete;
