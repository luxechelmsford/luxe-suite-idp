// Import Firebase Functions and Express
import * as v2 from "firebase-functions/v2";
import express, {Request, Response, NextFunction} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// Import configuration and application setup
import {defaultRegion} from "./configs/firebase";
import {Auth} from "./controllers/auth";
import {app as idTokenClaimsApp} from "./apps/idTokenClaimsApp";
import {app as providerProfileApp} from "./apps/providerProfileApp";

// Import triggers
import {onGlobalUserCreate, onGlobalProfileUpdate} from "./triggers/globalProfileTriggers";
import {onProviderProfileUpdate, onUserProviderProfileDelete} from "./triggers/providerProfileTriggers";

// Create the main Express application
const app = express();

// Debugging middleware at the start before CORS
app.use((req: Request, res: Response, next: NextFunction) => {
  console.debug(`****************************Received |${req.method}| request for |${req.originalUrl}|`);
  console.log("process.env.NODE_ENV === production:", process.env.NODE_ENV === "production", "|"); // Logs all cookies from the request
  next();
});

// Apply CORS middleware
const allowedOrigins: string[] = process.env.NODE_ENV === "production" ?
  ["https://backoffice.theluxestudio.co.uk", "https://luxe-suite-backoffice.web.app"] :
  ["https://backoffice.theluxestudio.co.uk", "https://luxe-suite-backoffice.web.app", "http://backoffice.localhost.com"];

app.use(cors({
  origin: function(origin, callback) {
    if (allowedOrigins.indexOf(origin as string) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },

  methods: ["GET", /* "HEAD", "PUT", "PATCH",*/ "POST", /* "DELETE",*/ "OPTIONS"], // Allow all methods
  allowedHeaders: ["Accept", "Content-Type", /* "Range",*/ "Authorization", "X-CSRF-Token", "X-Subdomain"], // Specify allowed headers
  credentials: true, // Allow credentials
  exposedHeaders: ["Cache-Control", "Content-Language", "Content-Type", "Expires",
    "Last-Modified", "Pragma", /* "X-Content-Range",*/ "X-CSRF-Token"], // Expose these headers
}));

// Middleware configuration
app.use(express.json()); // For parsing application/json
app.use(cookieParser());

// Handle preflight requests (OPTIONS) if needed
app.options("*", cors({
  origin: function(origin, callback) {
    if (allowedOrigins.indexOf(origin as string) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Middleware to log requests
app.use((req, _res, next) => {
  console.debug(`Received |${req.method}| request for |${req.originalUrl}|`);
  next();
});

app.use(Auth.verifyIdToken);
// app.use(Auth.applyCsrfProtection);

app.use("/api/v1/id-token-claims", idTokenClaimsApp);
app.use("/api/v1/provider-profile", providerProfileApp);

// Export the Express app as a Firebase Cloud Function
export const api = v2.https.onRequest({region: defaultRegion}, (req, res) => {
  // corsMiddleware(req, res, async () => {
  app(req, res);
  console.debug(`++++++++++++++ Exiting |${req.method}| request for |${req.originalUrl}|`);
  // )};
});

// Export triggers
export {
  onGlobalUserCreate,
  onGlobalProfileUpdate,
  onProviderProfileUpdate,
  onUserProviderProfileDelete,
};
