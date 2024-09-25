import * as functions from "firebase-functions";
import {auth, database, defaultRegion} from "../configs/firebase"; // Import auth from configs/firebase
import Lock from "../utils/lock";

/**
 * Trigger function that fires when a new user is created in Firebase Authentication.
 * It creates a global profile for the user in the Realtime Database and logs the event.
 *
 * @param {functions.auth.UserRecord} user - The newly created user record.
 * @returns {Promise<void>} - A promise that resolves when the profile is created and the event is logged.
 */
export const onGlobalUserCreate = functions.region(defaultRegion).auth.user().onCreate(async (user) => {
  const uid = user.uid;
  const emailId = user.emailId || "N/A"; // Handle cases where emailId might be null
  const fullName = user.displayName || "N/A"; // Handle cases where displayName might be null
  const profileURL = user.photoURL || "N/A"; // Assuming `photoURL` can be used as `profileURL`

  try {
    // Create an instance of the Lock class
    const lock = new Lock(`users-${uid}`);

    // define our update claims fucntion
    const registerUser = async () => {
      // Fetch the updated user data
      const userRecord = await auth.getUser(uid);

      const currentClaims = userRecord.customClaims || {};

      const oldSuperAdmin = currentClaims.supperAdmin || false;
      const newSuperAdmin = oldSuperAdmin || false;

      const updatedClaims = {
        ...currentClaims,
        superAdmin: newSuperAdmin,
      };

      // Create a global profile in Realtime Database
      await database.ref(`/global/users/${uid}/`).set({
        emailId: emailId,
        fullName: fullName,
        superAdmin: false, // Set default value for superAdmin
        profileURL: profileURL, // Use the profile URL from the user record
      });

      await auth.setCustomUserClaims(uid, updatedClaims);

      // Log user registration in the database
      const timestamp = Date.now(); // Current timestamp in milliseconds
      await database.ref(`/global/logs/users/${timestamp}/`).set({
        event: "userRegistered",
        uid: uid,
        emailId: emailId,
        fullName: fullName,
        oldProfile: currentClaims.supperAdmin ? JSON.stringify({superAdmin: currentClaims.supperAdmin}) : "",
        newProfile: JSON.stringify({superAdmin: newSuperAdmin}) || "",
        oldClaims: JSON.stringify(userRecord.customClaims) || "",
        newClaims: updatedClaims || {},
      });
    };

    // Now create the user pfofile and update the claims in the firebase admin in a single go
    try {
      // Use the performOperation method to execute the operation
      await lock.performOperation(registerUser);
      console.log(`Global user profile for user [${uid}] created successfully.`);
    } catch (error) {
      console.error("Failed to create global user profile", error);
      const timestamp = Date.now(); // Current timestamp in milliseconds
      await database.ref(`/global/logs/errors/${timestamp}/`).set({
        event: "userRegistrationFailed",
        uid: uid,
        emailId: emailId,
        fullName: fullName,
        error: (error as Error).message,
      });
      throw new Error( (error as Error).message);
    }
  } catch (error) {
    console.error(`Error handling user creation for UID: ${uid}`, error);
  }
});


/**
 * Trigger function that fires when a global user profile is updated in the Realtime Database.
 * It updates the user's superAdmin flag in the custom claims.
 *
 * @param {functions.Change<functions.database.DataSnapshot>} change - Contains the data before and after the update.
 * @param {functions.context} context - Context object containing information about the trigger event.
 * @return {Promise<void>} - A promise that resolves when the function completes.
 */
export const onGlobalProfileUpdate = functions.region(defaultRegion).database
  .ref("/global/users/{uid}")
  .onUpdate(async (change, context) => {
    const before = change.before.val();
    const after = change.after.val();
    const uid = context.params.uid;
    const timestamp = Date.now(); // Current timestamp in milliseconds

    try {
      // Fetch the updated user data
      const userRecord = await auth.getUser(uid);

      // Determine if superAdmin flag has changed
      const oldSuperAdmin = before.superAdmin || false;
      const newSuperAdmin = after.superAdmin || false;

      // Extract relevant fields
      const emailId = userRecord.emailId || "";
      const fullName = userRecord.displayName || "";

      // Create an instance of the Lock class
      const lock = new Lock(`users-${uid}`);

      // define our update claims fucntion
      const updateProfile = async () => {
        // Update the user's custom claims in Firebase Authentication
        const currentClaims = userRecord.customClaims || {};
        const updatedClaims = {
          ...currentClaims,
          superAdmin: newSuperAdmin,
        };

        await auth.setCustomUserClaims(uid, updatedClaims);

        // Log the event to /globals/logs/users/{timestamp}
        await database.ref(`/global/logs/users/${timestamp}`).set({
          event: "globalProfileUpdated",
          uid: uid,
          emailId: emailId,
          fullName: fullName,
          oldProfile: JSON.stringify({superAdmin: oldSuperAdmin}) || "",
          newProfile: JSON.stringify({superAdmin: newSuperAdmin}) || "",
          oldClaims: JSON.stringify(userRecord.customClaims) || "",
          newClaims: JSON.stringify(updatedClaims) || "",
        });
      };

      // Now update the claims in the firebase admin by locking the profile during update
      try {
        // Use the performOperation method to execute the operation
        await lock.performOperation(updateProfile);
        console.log(`Global user profile for user [${uid}] updated succesfully.`);
      } catch (error) {
        console.error("Failed to updated global user profile", error);
        const timestamp = Date.now(); // Current timestamp in milliseconds
        await database.ref(`/global/logs/errors/${timestamp}/`).set({
          event: "GlobalProfileUpdateFailed",
          uid: uid,
          emailId: emailId,
          fullName: fullName,
          error: (error as Error).message,
        });
        throw new Error( (error as Error).message);
      }
    } catch (error) {
      console.error(`Error updating user claims and logging event for UID: ${uid}`, error);
    }
  });

