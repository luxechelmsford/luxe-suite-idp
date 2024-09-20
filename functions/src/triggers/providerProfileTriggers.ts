/*
import * as functions from "firebase-functions";
import {auth, database, defaultRegion} from "../configs/firebase"; // Import auth from configs/firebase
import {jsonString2Array} from "../utils/helper";
import Lock from "../utils/lock";
*/

/**
 * Trigger function that fires when an provider's profile is updated in the Realtime Database.
 * It updates the user's claims for the specific provider while preserving other provider claims.
 *
 * @param {functions.Change<functions.database.DataSnapshot>} change - Contains the data before and after the update.
 * @param {functions.context} context - Context object containing information about the trigger event.
 * @return {Promise<void>} - A promise that resolves when the function completes.
 */
/*
export const onProviderProfileUpdate = functions.region(defaultRegion).database
  .ref("/providers/{providerId}/users/{uid}")
  .onUpdate(async (change, context) => {
    const before = change.before.val();
    const after = change.after.val();
    const uid = context.params.uid;
    const providerId = context.params.providerId;

    try {
      // Create an instance of the Lock class
      const lock = new Lock(`users-${uid}`);

      // define our update claims fucntion
      const updateProfile = async () => {
        // Fetch the user's current custom claims
        const userRecord = await auth.getUser(uid);

        // Extract relevant fields
        const email = userRecord.email || "N/A";
        const fullName = userRecord.displayName || "N/A";

        // find provider in the currentClaim with the same providerId
        //
        const updatedClaims = userRecord.customClaims || {};
        updatedClaims.superAdmin = updatedClaims.superAdmin || after.superAdmin || false;
        const index = updatedClaims.providers.findIndex((org: {id: string;}) => org.id === providerId);
        if (index != -1) {
          updatedClaims.providers[index].admin = after.admin || updatedClaims.providers[index].admin || false; // Update admin role
          updatedClaims.providers[index].roles = jsonString2Array(after.roles) || updatedClaims.providers[index].roles || [];// Update roles
          updatedClaims.providers[index].accessLevel = after.accessLevel || updatedClaims.providers[index].accessLevel || 0; // Update access level
        } else {
          updatedClaims.providers.push({
            id: providerId,
            admin: after.admin || false,
            roles: jsonString2Array(after.roles) || [],
            accessLevel: after.accessLevel || 0,
          });
        }

        // Update the claims for the specific provider

        updatedClaims.providers = (updatedClaims.providers || []).map((org: {id: string; admin: boolean; roles: string[]; accessLevel: number;}) => {
          if (org.id === providerId) {
            // Update the specific provider's claim
            return {
              ...org,
              admin: (jsonString2Array(after.roles) || []).includes("admin") || false, // Update admin role
              roles: jsonString2Array(after.roles) || org.roles, // Update roles
              accessLevel: after.accessLevel || org.accessLevel, // Update access level
            };
          }
          // Keep other providers' claims unchanged
          return org;
        });

        // Log the event to /providers/${providerId}/logs/users/{timestamp}
        const timestamp = Date.now(); // Current timestamp in milliseconds
        await database.ref(`/providers/${providerId}/logs/users/${timestamp}`).set({
          event: "providerProfileUpdatedAutomatically",
          providerIdUpdated: providerId,
          uid: uid,
          emailId: email,
          fullName: fullName,
          oldProfile: JSON.stringify(before || {}) || "",
          newProfile: JSON.stringify(after || {}) || "",
          oldClaims: JSON.stringify(userRecord.customClaims) || "",
          newClaims: JSON.stringify(updatedClaims) || "",
        });

        // Update the user's custom claims in Firebase Authentication
        await auth.setCustomUserClaims(uid, updatedClaims);
      };

      // Now delete the claims in both database and firebase admin in a single go
      try {
        // Use the performOperation method to execute the operation
        await lock.performOperation(updateProfile);
        console.log(`Claims for user [${uid}] updated after the user data updated by the provider [${providerId}].`);
      } catch (error) {
        console.error(`Failed to update the claims for user [${uid}] after the user data updated by the provider [${providerId}].`);
        const timestamp = Date.now(); // Current timestamp in milliseconds
        await database.ref(`/global/logs/errors/${timestamp}/`).set({
          event: "providerProfileUpdateFailed",
          providerId: providerId,
          uid: uid,
          oldProfile: JSON.stringify(before || {}) || "",
          newProfile: JSON.stringify(after || {}) || "",
          error: (error as Error).message,
        });
        throw new Error( (error as Error).message);
      }
    } catch (error) {
      console.error(`Error updating user claims and logging event for UID: ${uid}`, error);
    }
  });*/


/**
   * Trigger function that fires when a user's provider profile is deleted in the Realtime Database.
   * It removes the provider's claims from the custom claims of that specific user.
   *
   * @param {functions.Change<functions.database.DataSnapshot>} change - Contains the data before and after the delete.
   * @param {functions.context} context - Context object containing information about the trigger event.
   * @return {Promise<void>} - A promise that resolves when the function completes.
   */
/*
export const onUserProviderProfileDelete = functions.region(defaultRegion).database
  .ref("/providers/{providerId}/users/{uid}")
  .onDelete(async (snapshot, context) => {
    const providerId = context.params.providerId;
    const uid = context.params.uid;
    const timestamp = Date.now(); // Current timestamp in milliseconds

    try {
      // Create an instance of the Lock class
      const lock = new Lock(`users-${uid}`);

      // define our update claims fucntion
      const deleteProfile = async () => {
        // Fetch the user's current custom claims
        const userRecord = await auth.getUser(uid);

        // Filter out the claims for the deleted provider
        const updatedClaims = userRecord.customClaims || {};
        updatedClaims.providers = (updatedClaims.providers || []).filter(
          (org: { id: string; }) => org.id !== providerId
        );

        // Update the user's custom claims in Firebase Authentication
        await auth.setCustomUserClaims(uid, updatedClaims);

        // Extract relevant fields
        const email = userRecord.email || "N/A";
        const fullName = userRecord.displayName || "N/A";

        // Log the event to /providers/${providerId}/logs/users/{timestamp}
        await database.ref(`/providers/${providerId}/logs/users/${timestamp}`).set({
          event: "providerProfileDeleted",
          providerId: providerId,
          uid: uid,
          emailId: email,
          fullName: fullName,
          deletedProvider: providerId,
          oldProfile: JSON.stringify(snapshot.val() || {}) || "",
          newProfile: JSON.stringify({} || {}) || "",
          oldClaims: JSON.stringify(userRecord.customClaims) || "",
          newClaims: JSON.stringify(updatedClaims) || "",
        });
      };

      // Now delete the claims in both database and firebase admin in a single go
      try {
        // Use the performOperation method to execute the operation
        await lock.performOperation(deleteProfile);
        console.log(`Claims for user [${uid}] deleted after the user data deleted by the provider [${providerId}].`);
      } catch (error) {
        console.log(`Failed to delete claims for user [${uid}] after the user data deleted by the provider [${providerId}].`);
        const timestamp = Date.now(); // Current timestamp in milliseconds
        await database.ref(`/global/logs/errors/${timestamp}/`).set({
          event: "providerProfileDeletionFailed",
          providerIdUpdated: providerId,
          uid: uid,
          providerId: providerId,
          oldProfile: JSON.stringify(snapshot.val() || {}) || "",
          newProfile: JSON.stringify({} || {}) || "",
          error: (error as Error).message,
        });
        throw new Error( (error as Error).message);
      }
    } catch (error) {
      console.error(`Error updating user claims and logging event for UID: ${uid}`, error);
    }
  });*/
