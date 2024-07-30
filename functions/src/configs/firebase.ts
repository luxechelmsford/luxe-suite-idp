// client side auth
/* const firebaseConfig = {
  apiKey: "AIzaSyC7IdF5NRur0c8AvJwuIb7a09Z8wjoAxqc",
  authDomain: "luxe-suite-idp.firebaseapp.com",
  databaseURL: "https://luxe-suite-idp-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "luxe-suite-idp",
  storageBucket: "luxe-suite-idp.appspot.com",
  messagingSenderId: "824996429457",
  appId: "1:824996429457:web:9f9bbd6bafe86a56874930",
  serviceAccountId: "firebase-adminsdk-1lvi7@luxe-suite-idp.iam.gserviceaccount.com",
};*/

import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK with the provided configuration
admin.initializeApp();

const auth = admin.auth();
const database = admin.database();

export {auth, database};
