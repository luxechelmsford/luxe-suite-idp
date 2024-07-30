// first import fireabse.ts which has app initalisations etc
import {auth} from "../configs/firebase";
// then import anythign else
//
import express, {Request, Response} from "express";
import bodyParser from "body-parser";
import cors from "cors";
import {logger} from "firebase-functions";

// initialise objects
//
// express
export const app = express();
// Enable cors
app.use(cors({origin: true}));
// Support JSON-encoded bodies.
app.use(bodyParser.json());
// Support URL-encoded bodies.
app.use(bodyParser.urlencoded({
  extended: true,
}));
// Authentication - this projects all routes
// app.use(validateFirebaseIdToken);

// REST API
//
// GET Token Claims
app.get("/", async (request: Request, response: Response) => {
  // debugger;
  // set origin on cors handler
  // corsHandler(request, response, () => {});
  logger.log("In getCustomClaims");
  try {
    if ((!request.headers.authorization || !request.headers.authorization.startsWith("Bearer ")) &&
      !(request.cookies && request.cookies.__session)) {
      console.error("No Firebase ID token was passed as a Bearer token in the Authorization header.",
        "Make sure you authorize your request by providing the following HTTP header:",
        "Authorization: Bearer <Firebase ID Token>",
        "or by passing a __session cookie.");
      response.status(403).send("Unauthorized");
      return;
    }

    let idToken;
    if (request.headers.authorization && request.headers.authorization.startsWith("Bearer ")) {
      console.log("Found \"Authorization\" header");
      // Read the ID Token from the Authorization header.
      idToken = request.headers.authorization.split("Bearer ")[1];
    } else if (request.cookies) {
      console.log("Found \"__session\" cookie");
      // Read the ID Token from cookie.
      idToken = request.cookies.__session;
    } else {
      // No cookie
      response.status(403).send("Unauthorized");
      return;
    }

    const tokenClaims = await auth.verifyIdToken(idToken);
    response.status(200).send({
      status: "Success",
      tokenClaims: tokenClaims,
    });
    return;
  } catch (error) {
    response.status(500).send({
      status: "Failed",
      tokenClaims: {},
      // requestBody: request.body,
      message: (error as Error).message,
    });
    return;
  }
});


/* const refreshCustomClaims = async (request: Request, response: Response) => {
  // debugger;
  // set origin on cors handler
  // corsHandler(request, response, () => {});
  logger.log("In refreshCustomClaims");
  try {
    if ((!request.headers.authorization || !request.headers.authorization.startsWith("Bearer ")) &&
      !(request.cookies && request.cookies.__session)) {
      console.error("No Firebase ID token was passed as a Bearer token in the Authorization header.",
        "Make sure you authorize your request by providing the following HTTP header:",
        "Authorization: Bearer <Firebase ID Token>",
        "or by passing a __session cookie.");
      response.status(403).send("Unauthorized");
      return;
    }

    let idToken;
    if (request.headers.authorization && request.headers.authorization.startsWith("Bearer ")) {
      console.log("Found \"Authorization\" header");
      // Read the ID Token from the Authorization header.
      idToken = request.headers.authorization.split("Bearer ")[1];
    } else if (request.cookies) {
      console.log("Found \"__session\" cookie");
      // Read the ID Token from cookie.
      idToken = request.cookies.__session;
    } else {
      // No cookie
      response.status(403).send("Unauthorized");
      return;
    }

    const tokenClaims = await auth.verifyIdToken(idToken);

    // read roles
    if ((typeof tokenClaims.email !== undefined &&
        typeof tokenClaims.email_verified !== undefined &&
        tokenClaims.email_verified)) {
      const dbRef = idpDatabase.ref(`/users/${tokenClaims.uid}`);
      const snapshot = await dbRef.once("value");
      if (snapshot.exists()) {
        const user = snapshot.val();
        // Retrieve the user record to get existing tokenClaims
        const existingClaims = (await auth.getUser(tokenClaims.uid)).customClaims || {};

        if ((existingClaims.roles === undefined || existingClaims.roles !== user.roles) ||
            (existingClaims.accessLevel === undefined && existingClaims.accessLevel !== user.accessLevel)) {
          try {
            await auth.setCustomUserClaims(tokenClaims.uid, {
              roles: user.roles === undefined ? "" : user.roles,
              accessLevel: user.accessLevel === undefined ? 0 : user.accessLevel,
            });

            // Retrieve the user record to get existing tokenClaims
            const updatedClaims = (await auth.getUser(tokenClaims.uid)).customClaims || {};

            response.status(200).send({
              status: "Success",
              result: "customClaimsReset",
              user: user,
              tokenClaims: tokenClaims,
              existingClaims: existingClaims,
              updatedClaims: updatedClaims,
            });
            return;
          } catch (error) {
            logger.error("Error setting custom claims:", error);
            response.status(500).send({
              status: "Error",
              result: "customClaimsFailed",
              error: (error as Error).message,
            });
          }
        } else {
          response.status(200).send({
            status: "Success",
            result: "ExistingClaim",
            user: user,
            tokenClaims: tokenClaims,
            existingClaims: existingClaims,
          });
          return;
        }
      } else {
        // its a new user
        // create the user in the database
        // so that roles can be assined via the admin user interface, later
        const timestamp = new Date().getTime();
        await dbRef.set({
          emailId: tokenClaims.email ? tokenClaims.email : "",
          fullName: tokenClaims.name ? tokenClaims.name : "",
          profilePhoto: tokenClaims.picture ? tokenClaims.picture : "",
          roles: "",
          accessLevel: 0,
          created: timestamp,
          lastUpdated: timestamp,
        });
        response.status(200).send({status: "Success", result: "userAdded", tokenClaims: tokenClaims});
        return;
      }
    } else {
      response.status(200).send({status: "Success", result: "userUnverified", tokenClaims: tokenClaims});
      return;
    }
  } catch (error) {
    response.status(500).send(
      {status: "Failed", customToken: "", requestBody: request.body, msg: (error as Error).message}
    );
    return;
  }
};

export {getCustomClaims, refreshCustomClaims};*/

