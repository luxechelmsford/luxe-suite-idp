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
