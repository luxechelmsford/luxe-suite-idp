import * as admin from "firebase-admin";
import {ServiceAccount} from "firebase-admin";
import localServiceAccount from "./serviceAccountKey.json";


const defaultRegion = "europe-west2";
const defaultOrganisationId = "luxe-studio";

// Assuming `App` type has a `name` property
interface App {
  name: string;
}


const isAppNamed = (appInstance: App | null, name: string): appInstance is App => {
  return appInstance !== null && appInstance.name === name;
};


// Check if the app instance with the name "app" already exists
let app;
if (!admin.apps.find((appInstance) => isAppNamed(appInstance, "app"))) {
  // Initialize a new app instance if it does not exist
  app = admin.initializeApp({
    credential: admin.credential.cert(localServiceAccount as ServiceAccount),
    databaseURL: "https://luxe-suite-idp-default-rtdb.europe-west1.firebasedatabase.app/",
  }, "app");
} else {
  // Retrieve the existing app instance
  app = admin.app("app");
}

// Export the database references for both apps
const auth = admin.auth(app);
const database = admin.database(app);

export {auth, database, defaultRegion, defaultOrganisationId};
