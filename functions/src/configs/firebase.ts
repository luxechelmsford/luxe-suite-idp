import * as admin from "firebase-admin";
import {ServiceAccount} from "firebase-admin";
import idpServiceAccount from "./idpServiceAccountKey.json";
// import localServiceAccount from "./serviceAccountKey.json";


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


// Check if the app instance with the name "app" already exists
/*
let app;
// Check if the app instance with the name "app" already exists
if (!admin.apps.find((appInstance) => isAppNamed(appInstance, "app"))) {
  // Initialize a new app instance if it does not exist
  app = admin.initializeApp({
    credential: admin.credential.cert(localServiceAccount as ServiceAccount),
    databaseURL: "https://luxe-suite-core-api-default-rtdb.europe-west1.firebasedatabase.app/",
  }, "app");
} else {
  // Retrieve the existing app instance
  app = admin.app("app");
}*/


// Check if the app instance with the name "idpApp" already exists
let idpApp;
if (!admin.apps.find((appInstance) => isAppNamed(appInstance, "idpApp"))) {
  // Initialize a new app instance if it does not exist
  idpApp = admin.initializeApp({
    credential: admin.credential.cert(idpServiceAccount as ServiceAccount),
    databaseURL: "https://luxe-suite-idp-default-rtdb.europe-west1.firebasedatabase.app/",
  }, "idpApp");
} else {
  // Retrieve the existing app instance
  idpApp = admin.app("idpApp");
}

// Initialize auth realtime db aad firestre instances with smilar JSON naming conventions
export const auth = admin.auth(idpApp);
export const database = admin.database(/* app*/ idpApp);
/*
export const firestore = admin.firestore(app);

// Setting Firestore settings to follow Simsilat JSON naming conventions
firestore.settings({
  ignoreUndefinedProperties: true,
  timestampsInSnapshots: true,
  // Add more settings if needed for Simsilat convention
});
*/
