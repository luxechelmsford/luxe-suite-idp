import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK with the provided configuration
admin.initializeApp();

const auth = admin.auth();
const database = admin.database();

export {auth, database};
