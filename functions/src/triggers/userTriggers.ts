import * as functions from "firebase-functions";
import {defaultRegion} from "../configs/firebase"; // Import auth from configs/firebase
import {FirestorePathBuilder} from "../dataStores/models/firestorePathBuilder";
import {CustomClaims} from "../middlewares/customClaims";
import {UserDataStore} from "../dataStores/collections/userDataStore";
import {Helper} from "../utils/helper";

/**
 * Trigger function that fires when a new user is created in Firebase Authentication.
 * It creates a global profile for the user in the Realtime Database and logs the event.
 *
 * @param {functions.auth.UserRecord} user - The newly created user record.
 * @returns {Promise<void>} - A promise that resolves when the profile is created and the event is logged.
 */
export const onUserCreated = functions.region(defaultRegion).auth.user().onCreate(async (user) => {
  console.debug("{{{{{{{{{{{{{{{{{{{ ]]]]]In onGlobalUserCreated with data:", user);

  const uid = user.uid;
  const emailId = user.email || "N/A"; // Handle cases where email might be null
  const displayName = user.displayName || "N/A"; // Handle cases where displayName might be null
  const profileURL = user.photoURL || null; // Assuming `photoURL` can be used as `profileURL`

  try {
    const user = {
      emailId: emailId,
      firstName: Helper.capitalizedString(Helper.extractFirstName(displayName)),
      lastName: Helper.capitalizedString(Helper.extractLastName(displayName)),
      profilePhoto: {
        url: profileURL || null,
        displayName: displayName,
      },
    };

    // console.debug("User created. updating the custom claims", user);
    // new CustomClaims(uid, {
    //   superAdmin: false,
    // }).setClaims();

    try {
      const dataStore = new UserDataStore();
      dataStore.createWithId(uid, user);
    } catch (error) {
      console.log(`Failed to create user |${uid}| with: |${JSON.stringify(user)}`);
      console.log(`Attempting to update |${uid}| user: |${JSON.stringify(user)}`);
      try {
        const dataStore = new UserDataStore();
        dataStore.transactionalUpdate(uid, user);
      } catch (error) {
        console.log(`Failed to create user |${uid}| with: |${JSON.stringify(user)}`);
        console.log(`Attempting to update |${uid}| user: |${JSON.stringify(user)}`);
        try {
          const dataStore = new UserDataStore();
          dataStore.transactionalUpdate(uid, user);
        } catch (error) {
          console.error(`Failed to update user |${uid}| to: |${JSON.stringify(user)}`);
        }
      }
    }
  } catch (error) {
    console.error(`Error creating glvoal user for UID: ${uid}`, error);
  }
});


/**
 * Trigger function that fires when a new user is created in Firebase Authentication.
 * It creates a global profile for the user in the Realtime Database and logs the event.
 *
 * @param {functions.auth.UserRecord} user - The newly created user record.
 * @returns {Promise<void>} - A promise that resolves when the profile is created and the event is logged.
 */
export const onUserWritten = functions.region(defaultRegion).firestore
  .document(FirestorePathBuilder.users() + "/{uid}")
  .onWrite(async (change, context) => {
    console.debug("{{{{{{{{{{{{{{{{{{{ ]]]]]In onGlobalUserWritten with data:", change.before, change.after);
    const uid = context.params?.uid;

    if (change.after.exists && change.before.exists) { // update
      const before = change.before.data();
      const after = change.after.data();
      console.debug("User updated. updating the custom claims", before, after);
      new CustomClaims(uid, {
        superAdmin: (after as {superAdmin: boolean[]}).superAdmin,
      }).setClaims();

      try {
        const dataStore = new UserDataStore();
        dataStore.transactionalUpdate(uid, after);
      } catch (error) {
        console.error(`Failed to update user |${uid}| from: |${JSON.stringify(before)} to: |${JSON.stringify(after)}`);
      }
    } else if (change.after.exists ) { // create
      const after = change.after.data();
      console.debug("User created. updating the custom claims", after);
      new CustomClaims(uid, {
        superAdmin: (after as {superAdmin: boolean[]}).superAdmin,
      }).setClaims();

      /*
      try {
        const dataStore = new UserDataStore();
        dataStore.createWithId(uid, after);
      } catch (error) {
        console.log(`Failed to create user |${uid}| with: |${JSON.stringify(after)}`);
        console.log(`Attempting to update |${uid}| user: |${JSON.stringify(after)}`);
        try {
          const dataStore = new UserDataStore();
          dataStore.transactionalUpdate(uid, after);
        } catch (error) {
          console.error(`Failed to update user |${uid}| to: |${JSON.stringify(after)}`);
        }
      }*/
    } else {
      const before = change.after.data();
      console.debug("User deleted. updating the custom claims", before);
      new CustomClaims(uid, {
        superAdmin: (before as {superAdmin: boolean[]}).superAdmin,
      }).unsetClaims();

      try {
        const dataStore = new UserDataStore();
        dataStore.delete(uid);
      } catch (error) {
        console.error(`Failed to delete user |${uid}| with: |${JSON.stringify(before)}`);
      }
    }
  });
