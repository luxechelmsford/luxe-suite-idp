// Import Firebase Functions and Express
import * as v2 from "firebase-functions/v2";
import express, {Request, Response, NextFunction} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import {defaultRegion} from "./configs/firebase";
import {Auth} from "./middlewares/common/auth";
import {authApp} from "./collections/auth/authApp";
import {providerApp} from "./collections/provider/providerApp";
import {userApp} from "./collections/user/userApp";
import {userProfileApp} from "./collections/userProfile/userProfileApp";

// Import triggers
import {onUserCreated, onUserWritten} from "./triggers/userTriggers";
// import {onProviderProfileUpdate, onUserProviderProfileDelete} from "./triggers/providerProfileTriggers";

// Create the main Express application
const app = express();

// Debugging middleware at the start before CORS
app.use((req: Request, res: Response, next: NextFunction) => {
  console.debug(`****************************Received |${req.method}| request for |${req.originalUrl}|`);
  console.log("process.env.NODE_ENV === production:", process.env.NODE_ENV === "production", "|"); // Logs all cookies from the request
  next();
});

const allowedOriginPatterns = process.env.NODE_ENV === "production" ?
  "^https://backoffice\\.theluxestudio\\.co\\.uk$|^https://luxe-suite-backoffice\\.web\\.app$" :
  "^https://backoffice\\.theluxestudio\\.co\\.uk$|^https://luxe-suite-backoffice\\.web\\.app$|^https://backoffice\\.[a-zA-Z1-9]*\\.luxesuite\\.thetek\\.co\\.uk$";

const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Check if the origin is in the allowedOrigins array
    if (!origin || new RegExp(allowedOriginPatterns).test(origin)) {
      // Allow the origin
      callback(null, origin);
    } else {
      // Disallow the origin
      callback(new Error("Not allowed by CORS"));
    }
  },

  methods: ["GET", /* "HEAD", "PUT", "PATCH",*/ "POST", /* "DELETE",*/ "OPTIONS"], // Allow all methods
  allowedHeaders: ["Accept", "Content-Type", /* "Range",*/ "Authorization", "X-CSRF-Token", "X-Subdomain"], // Specify allowed headers
  credentials: true, // Allow credentials
  exposedHeaders: ["Cache-Control", "Content-Language", "Content-Type", "Expires",
    "Last-Modified", "Pragma", /* "X-Content-Range",*/ "X-CSRF-Token"], // Expose these headers
});

// Middleware configuration
app.use(express.json()); // For parsing application/json
app.use(cookieParser());

// Handle preflight requests (OPTIONS) if needed
app.options("*", cors({
  origin: function(origin, callback) {
    // Check if the origin is in the allowedOrigins array
    if (!origin || new RegExp(allowedOriginPatterns).test(origin)) {
      // Allow the origin
      callback(null, origin);
    } else {
      // Disallow the origin
      callback(new Error("Not allowed by CORS"));
    }
  },

  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Middleware to log cookies
app.use((req, res, next) => {
  console.log("Received Cookies:", JSON.stringify(req.cookies), "|"); // Logs all cookies from the request
  next();
});

// Apply globals middleware routes
app.use(Auth.verifyIdToken);
// app.use(Auth.applyCsrfProtection);
app.use(Auth.validateProviderId);

// Middleware to log provider
app.use((req, res, next) => {
  console.log("Provider in the Request:", JSON.stringify(req.provider), "|");
  next();
});

// Attach all applications to the middleware
app.use("/api/v1/auth", authApp);
app.use("/api/v1/provider", providerApp);
app.use("/api/v1/users", userApp);
app.use("/api/v1/user-profiles", userProfileApp);

// Export the Express app as a Firebase Cloud Function
export const api = v2.https.onRequest({region: defaultRegion}, (req, res) => {
  corsMiddleware(req, res, async () => {
    app(req, res);
    console.debug(`++++++++++++++ Exiting |${req.method}| request for |${req.originalUrl}|`);
  });
});

// Export triggers
export {
  onUserCreated,
  onUserWritten,
};
