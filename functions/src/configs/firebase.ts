/*
 * do not copy thos accross the various projects - start
 *
 */
import * as admin from "firebase-admin";
import {ServiceAccount} from "firebase-admin";
import idpServiceAccount from "./idpServiceAccountKey.json";
const localServiceAccount = {};
import gsuiteServiceAccount from "../configs/gsuiteServiceAccountKey.json";

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
// [END auth_emulator_connect_modular]}
export const database = admin.database(idpApp);
export const firestore = admin.firestore(idpApp);

// Setting Firestore settings to follow simulate JSON naming conventions
firestore.settings({
  ignoreUndefinedProperties: true,
  timestampsInSnapshots: true,
  // Add more settings if needed for Simsilat convention
});

// GSuite configs
export const luxeSuiteNoRelyEmailId = "donotreply@theluxestudio.co.uk";
export const luxeSuiteAdminEmailId = "info@theluxestudio.co.uk";
export const luxeSuiteProviderEmailId = "info@theluxestudio.co.uk";
export const gsuiteServiceAccountEmail = gsuiteServiceAccount.client_email;
export const gsuiteServiceAccountPrivateKey = gsuiteServiceAccount.private_key;
/*
 * do not copy thos accross the various projects - end
 *
 */
