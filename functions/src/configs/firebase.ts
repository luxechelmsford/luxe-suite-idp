/*
 * do not copy thos accross the various projects - start
 *
 */
import * as admin from "firebase-admin";
import {ServiceAccount} from "firebase-admin";
import idpServiceAccount from "./idpServiceAccountKey.json";
const localServiceAccount = {};

const appName = "";
const idpAppName = "idpApp";
const idpDatabaseUrl = "https://luxe-suite-idp-default-rtdb.europe-west1.firebasedatabase.app/";
/*
 * do not copy thos accross the various projects - end
 *
 */

export const defaultRegion = "europe-west2";
export const defaultOrganisationId = "luxe-studio";
export const csrfSecret = idpServiceAccount.private_key_id;

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
/*
 * do not copy thos accross the various projects - end
 *
 */
