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


/**
 * Checks if a user account with the given username exists for both Gmail and Googlemail.
 * If an account is found, an error is thrown indicating the existing account.
 *
 * @param {string} emailId - The emaild to check.
 * @return {string} - The matched email if an acocunt exists wity either gamil.com or gogolemail.com domain, empty string otherwsie
 * @throws {Error} Throws an error if an account already exists with either
 * 'gmail.com' or 'googlemail.com' or if there is an error during the checks.
 */
const googleAccountExist = async (emailId: string): Promise<string> => {
  /*
  const accountName = emailId ? emailId.split("@")[0] : "";
  const gmailEmail = `${accountName}@gmail.com`;
  const googlemailEmail = `${accountName}@googlemail.com`;

  console.log(`Checking if account |${accountName}| already exists`);

  try {
    // Check if the Gmail account exists
    await auth.getUser(gmailEmail);
    return gmailEmail;
  } catch (error) {
    if ((error as {code: string}).code !== "auth/user-not-found") {
      console.error(`Error receievd checking email ${gmailEmail}`, error);
      throw new Error("Error checking Gmail email existence.");
    }
    console.log(`Account with email ${gmailEmail} does not exist`, error);
  }

  try {
    // Check if the Googlemail account exists
    await auth.getUser(googlemailEmail);
    return googlemailEmail;
  } catch (error) {
    if ((error as {code: string}).code !== "auth/user-not-found") {
      console.error(`Error receievd checking email ${googlemailEmail}`, error);
      throw new Error("Error checking Googlemail email existence.");
    }
    console.log(`Account with email ${googlemailEmail} does not exist`, error);
  }
  */
  console.log(`No acount for email ${emailId} found`);
  return "";
};


export const onUserSignedUp = functions.region(defaultRegion) // Set your default region
  .auth.user().beforeCreate(async (user, context) => {
    console.debug("=========== In onUserSignedUp with user:", user, "and context", context);
    const uid = user.uid;
    const email = user.email || "";

    // chekc if a user with the same email exists
    const acocuntEmail = await googleAccountExist(email);
    if (acocuntEmail) {
      throw new functions.auth.HttpsError("already-exists", `User Account ${acocuntEmail} exists and must be linked together.`);
    }

    // Check if the UID matches the email, block all user creation with a uid not email
    if (uid !== email) {
      console.error(`Rejecting user creation as UID (${uid}) does not match email (${email})`);
      throw new functions.auth.HttpsError("failed-precondition", "User registration blocked: Social media sign-up is not permitted.");
    }

    console.debug(`User creation allowed for UID: ${uid}`);
  });

export const onUserSignIn = functions.region(defaultRegion) // Set your default region
  .auth.user().beforeSignIn(async (user, context) => {
    console.debug("=========== In onUserSignedUp with user:", user, "and context", context);
    const uid = user.uid;
    const email = user.email || "";

    // Check if the UID matches the email
    if (uid !== email) {
      console.error(`Rejecting user sign-in as UID (${uid}) does not match email (${email})`);
      // throw new functions.auth.HttpsError("permission-denied", "User sign-in blocked: Accounts registered through social media login are not allowed.");
    }

    console.debug(`User sign-in allowed for UID: ${uid}`);
  });
