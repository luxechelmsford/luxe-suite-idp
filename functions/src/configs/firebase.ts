/*
 * do not copy thos accross the various projects - start
 *
 */
import * as admin from "firebase-admin";
import {ServiceAccount} from "firebase-admin";
import idpServiceAccount from "./idpServiceAccountKey.json";
const localServiceAccount = {};
import gmailServiceAccount from "../configs/gmailServiceAccountKey.json";
import {google} from "googleapis";

const appName = "";
const idpAppName = "idpApp";
const idpDatabaseUrl = "https://luxe-suite-idp-default-rtdb.europe-west1.firebasedatabase.app/";
const skipIdTokenCheck = false;
/*
 * do not copy thos accross the various projects - end
 *
 */

export const defaultRegion = "europe-west2";
export const defaultOrganisationId = "luxe-studio";
export const csrfSecret = idpServiceAccount.private_key_id;
export const SessionCookieOnlyMode = skipIdTokenCheck;
export const defaultOriginUrl = process.env.NODE_ENV === "production" ?
  "https://backoffice.theluxestudio.co.uk" : "https://dev.luxesuite.thetek.co.uk";

// Assuming `App` type has a `name` property
interface App {
  name: string;
}

const isAppNamed = (appInstance: App | null, name: string): appInstance is App => {
  return appInstance !== null && appInstance.name === name;
};

// Check if the app instance with the name appName already exists
let app;
// Check if the app instance with the name appName already exists
if (appName) {
  if (!admin.apps.find((appInstance) => isAppNamed(appInstance, appName))) {
    // Initialize a new app instance if it does not exist
    app = admin.initializeApp({
      credential: admin.credential.cert(localServiceAccount as ServiceAccount),
    }, appName);
  } else {
    // Retrieve the existing app instance
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    app = admin.app(appName);
  }
}

// Check if the app instance with the name idpAppName already exists
let idpApp;
if (idpAppName) {
  if (!admin.apps.find((appInstance) => isAppNamed(appInstance, idpAppName))) {
    // Initialize a new app instance if it does not exist
    idpApp = admin.initializeApp({
      credential: admin.credential.cert(idpServiceAccount as ServiceAccount),
      databaseURL: idpDatabaseUrl,
    }, idpAppName);
  } else {
    // Retrieve the existing app instance
    idpApp = admin.app("idpApp");
  }
}

/*
 * do not copy thos accross the various projects - start
 *
 */
// Initialize auth realtime db aad firestre instances with smilar JSON naming conventions
export const auth = admin.auth(idpApp);
export const database = admin.database(idpApp);

// Initialize OAuth2 client
export const oAuth2Client = new google.auth.OAuth2(
  gmailServiceAccount.web.client_id,
  gmailServiceAccount.web.client_secret,
  "https://core.theluxestudio.co.uk" // Redirect URI
);
// Set refresh token
oAuth2Client.setCredentials({
  refresh_token: gmailServiceAccount.web.refresh_token,
});
/*
 * do not copy thos accross the various projects - end
 *
 */
