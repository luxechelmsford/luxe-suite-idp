// import firebase fucntions must be before the app initialisation
import * as functions from "firebase-functions";
// then import fireabse.ts which has app initalisations etc
import {auth, database} from "../configs/firebase";
//
// then import anythign else

// Set region for functions
const region = "europe-west2";

const onUserRegistered = functions.region(region).auth.user().onCreate(async (user) => {
  functions.logger.log("functions.auth.user().onCreate triggered");

  const dbUserRef = database.ref(`users/${user.uid}`);
  const timestamp = new Date().getTime();

  try {
    await dbUserRef.set({
      emailId: user.email || "",
      fullName: user.displayName || "",
      profilePhoto: user.photoURL || "",
      roles: "[]",
      accessLevel: 0,
      organisations: "[]",
      created: timestamp,
      lastUpdated: timestamp,
    });
    functions.logger.log(`User profile created for [${user.uid}, ${user.displayName}, ${user.email}]`);

    // lets store the changes in the database log
    const dbLogRef = database.ref(`logs/${timestamp}`);
    functions.logger.log(`Logging created user data ${user.uid}, ${user} in the relatime database`);
    await dbLogRef.set({
      uid: user.uid,
      eventType: "userRegistered",
      fullName: (user.displayName ? user.displayName : ""),
      emailId: user.email ? user.email : "",
      oldRole: null,
      oldAccessLevel: null,
      oldOrganisations: null,
      newRole: "[]",
      newAccessLevel: 0,
      newOrganisations: "[]",
    });
  } catch (error ) {
    functions.logger.log(
      `Failed to create user [${user.uid}, ${user.displayName}}, ${user.email}}].\nLast Error: ${(error as Error).message}`
    );
  }
});


const onRealtimeDbUserCreated = functions.region(region).database.ref("/users/{uid}")
  .onCreate(async (snapshot, context) => {
    functions.logger.log("createCustomClaims triggered");
    const uid = context.params.uid;
    const user = snapshot.val() ? snapshot.val() : null;
    if (user) {
      try {
        const roles = jsonString2StringArray(user.roles);
        const organisations = jsonString2StringArray(user.organisations);
        const isAdmin = roles.some((role: string) => role.toLowerCase() === "admin");
        const isSuperAdmin = isAdmin && organisations.length === 1 && organisations[0] === "*";
        await auth.setCustomUserClaims(uid, {
          superAdmin: isSuperAdmin,
          admin: isAdmin,
          roles: roles,
          accessLevel: user.accessLevel === undefined ? 0 : user.accessLevel,
          organisations: organisations,
        });
        functions.logger.log(`The custom claims for user: [${uid}, ${user.fullName}, ${user.emailId}] ` +
        `set with isAdmin: [${isAdmin}], isSuperAdmin: [${isSuperAdmin}], roles: [${roles}], accesslevel: [${user.accessLevel}] & organsiations: [${organisations}]`
        );

        // lets store the changes in the database log
        const timestamp = new Date().getTime();

        const dbLogRef = database.ref(`logs/${timestamp}`);
        functions.logger.log(`Logging created user data ${uid}, ${user} in the relatime database`);
        await dbLogRef.set({
          uid: uid,
          eventType: "userCreated",
          fullName: (user.fullName ? user.fullName : ""),
          emailId: user.emailId ? user.emailId : "",
          oldRole: null,
          oldAccessLevel: null,
          oldOrganisations: null,
          newRole: user.roles ? user.roles : "[]",
          newAccessLevel: user.accessLevel > 0 ? user.accessLevel : 0,
          newOrganisations: user.organisations ? user.organisations : "[]",
        });
      } catch (error) {
        functions.logger.error(
          `Failed to create custom claims for user: [${uid}, ${user.fullName}, ${user.emailId}] ` +
          `set with roles: [${user.roles}], accesslevel: [${user.accessLevel}] & organsiations: [${user.organisations}]`
        );
        functions.logger.error(`Last Error [${(error as Error).message}]`);
      }
    }
  });

const onRealtimeDbUserUpdated = functions.region(region).database.ref("/users/{uid}")
  .onUpdate(async (change, context) => {
    functions.logger.log("updateCustomClaims triggered");
    const uid = context.params.uid;
    const beforeData = change.before.exists() ? change.before.val() : null;
    const afterData = change.after.exists() ? change.after.val() : null;

    if (afterData) {
      try {
        const roles = jsonString2StringArray(afterData.roles);
        const organisations = jsonString2StringArray(afterData.organisations);
        const isAdmin = roles.some((role: string) => role.toLowerCase() === "admin");
        const isSuperAdmin = isAdmin && organisations.length === 1 && organisations[0] === "*";
        // != checks for both undefined and null
        await auth.setCustomUserClaims(uid, {
          superAdmin: isSuperAdmin,
          admin: isAdmin,
          roles: roles,
          accessLevel: afterData.accessLevel === undefined ? 0 : afterData.accessLevel,
          organisations: organisations,
        });
        functions.logger.log(
          `The custom claims for user: [${uid}, ${afterData.fullName},${afterData.emailId}] ` +
          `set with isAdmin: [${isAdmin}], isSuperAdmin: [${isSuperAdmin}], roles: [${roles}], accesslevel: [${afterData.accessLevel}] & organsiations: [${organisations}]`
        );

        // lets store the changes in the database log
        const timestamp = new Date().getTime();
        const dbLogRef = database.ref(`logs/${timestamp}`);
        functions.logger.log(`Logging updated user data ${uid}, ${beforeData}, ${afterData} in the realtime database`);
        await dbLogRef.set({
          uid: uid,
          eventType: "userUpdated",
          fullName: afterData.fullName ? afterData.fullName: "",
          email: afterData.emailId ? afterData.emailId : "",
          oldRole: beforeData && beforeData.roles ? beforeData.roles : null,
          oldAccessLevel: beforeData && beforeData.accessLevel != null ? beforeData.accessLevel : null,
          oldOrganisations: beforeData && beforeData.organisations ? beforeData.organisations : null,
          newRole: afterData.roles ? afterData.roles : "[]",
          newAccessLevel: afterData.accessLevel > 0 ? afterData.accessLevel : 0,
          newOrganisations: afterData.organisations ? afterData.organisations : "[]",
        });
      } catch (error) {
        functions.logger.error(
          `Failed to update custom claims for user: [${uid}, ${afterData.fullName}, ${afterData.emailId}] ` +
          `set with roles: [${afterData.roles}], accesslevel: [${afterData.accessLevel}] & organsiations: [${afterData.organisations}]`
        );
        functions.logger.error(`Last Error [${(error as Error).message}]`);
      }
    }
  });

const onRealtimeDbUserDeleted = functions.region(region).database.ref("/users/{uid}")
  .onDelete(async (snapshot, context) => {
    functions.logger.log("deleteCustomClaims triggered");
    const uid = context.params.uid;
    const user = snapshot.val() ? snapshot.val() : null;
    if (user) {
      try {
        await auth.setCustomUserClaims(uid, {});
        functions.logger.log(`The custom claims for user: [${uid}, ${user.fullName}, ${user.emailId}] deleted`);

        // lets store the changes in the database log
        const timestamp = new Date().getTime();

        const dbLogRef = database.ref(`logs/${timestamp}`);
        functions.logger.log(`Logging deleted user data ${uid}, ${user} in the relatime database`);
        await dbLogRef.set({
          uid: uid,
          eventType: "userDeleted",
          fullName: (user.fullName ? user.fullName : ""),
          emailId: user.emailId ? user.emailId : "",
          oldRole: user.roles ? user.roles : "[]",
          oldAccessLevel: user.accessLevel ? user.accessLevel : 0,
          oldOrganisations: user.organisations ? user.organisations : "[]",
          newRole: null,
          newAccessLevel: null,
          newOrganisations: null,
        });
      } catch (error) {
        functions.logger.error(
          `Failed to reset custom claims for user: [${uid}, ${user.fullName}, ${user.emailId}]`
        );
        functions.logger.error(`Last Error [${(error as Error).message}]`);
      }
    }
  });

/**
 * Safely parses a JSON string into an array of strings and returns the array or [] if parsing fails.
 *
 * @param {string} jsonString - The JSON string to parse.
 * @return {string[]} - The parsed string array or [] if parsing fails.
 */
function jsonString2StringArray(jsonString: string): string[] {
  try {
    if (jsonString == null || jsonString.length <= 0 ) { // if undefined, null or empty
      return [];
    }
    //
    // Parse the JSON string
    const parsedArray = JSON.parse(jsonString);
    //
    // Check if the parsed result is an array of strings
    return Array.isArray(parsedArray) && parsedArray.every((item) => typeof item === "string") ?
      parsedArray :
      [];
    //
  } catch (error) {
    // Log error if parsing fails
    console.error(`Failed to convert JSON string ${jsonString} into an array of strings. Last Error: ${error}`);
    return [];
  }
}


/**
 * Converts an array into an object where the keys are numeric indices.
 *
 * @param {string[] | null | undefined} data - The array to convert. Can be null or undefined.
 * @return {object} - The converted object with numeric keys.
 */
/* function packArray(data: string[] | null | undefined): object {
  if (data) {
    return data.reduce((obj: { [key: number]: string }, item: string, index: number) => {
      obj[index] = item;
      return obj;
    }, {});
  }
  return {};
}*/


/**
 * Converts an object with numeric keys back into an array.
 *
 * @param {object | null | undefined} data - The object to convert. Can be null or undefined.
 * @return {string[]} - The converted array.
 */
/* function unpackArray(data: object | null | undefined): string[] {
  if (data) {
    return Object.keys(data)
      .map((key) => Number(key)) // Ensure keys are numeric
      .sort((a, b) => a - b) // Sort numerically
      .map((key) => (data as { [key: number]: string })[key]);
  }
  return [];
}*/


// Export the functions to Firebase
export {onUserRegistered, onRealtimeDbUserCreated, onRealtimeDbUserUpdated, onRealtimeDbUserDeleted};

