import {Request, Response} from "express";
import {auth, database} from "../configs/firebase"; // Adjust the import path
import {jsonString2Array} from "../definitions/helper";
import {findProviderIdBySubdomain} from "./provider";
import Lock from "../utils/lock";


/**
 * HTTP function to create or update an provider-level profile for a user.
 * The provider ID is first looked up in the Host header. If not found,
 * it is then checked in the request body.
 *
 * This fucntions must be called by the client web app after successful login and
 * if providerId is not found in the custom claims of the decoded idToken
 *
 * @param {Request} req - The HTTP request object containing headers and body.
 * @param {Response} res - The HTTP response object to send the response.
 * @return {Promise<void>} - A promise that resolves when the function completes.
 */
export const createProviderProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.currentDecodedToken?.uid; // Extract user ID from the authenticated user
    if (!uid) {
      res.status(400).json({result: "failed", message: "No loggedin user detected."});
      return;
    }

    // Read providerId from the Host header
    const hostHeader = req.headers.host;
    let providerId = "";

    // first try from the header
    if (hostHeader) {
      // Extract the first subdomain as the providerId
      const subDomain = hostHeader.split(".")[0];

      // find the provider id from the database using subdomain
      providerId = await findProviderIdBySubdomain(subDomain);
    }

    // if we haven't found a valid providerId
    if (!providerId) {
      // Fallback to providerId in the request body
      providerId = req.body.providerId;

      // Validate providerId against the Realtime Database
      const orgRef = database.ref(`/global/providers/${providerId}`);
      const orgSnapshot = await orgRef.once("value");

      if (!orgSnapshot.exists()) {
        res.status(400).json({result: "failed", message: "Invalid providerId."});
        return;
      }
    }

    // Create an instance of the Lock class
    const lock = new Lock(`users-${uid}`);

    // define our create profile fucntion
    const createProfile = async () => {
      // Create the user profile in the Realtime Database
      const userRef = database.ref(`/providers/${providerId}/users/${uid}`);

      try {
        // Fetch the current user data
        const snapshot = await userRef.once("value");
        const currentData = snapshot.val() || {};

        // Check if attributes exist and update them if not
        const updatedData = {
          fullName: currentData.fullName || req.currentDecodedToken?.name || "", // preserve full name or propogate from token
          emailId: currentData.emailId || req.currentDecodedToken?.email || "", // preserve email or propogate from token
          roles: currentData.roles || "[]", // preserve roles
          accessLevel: currentData.accessLevel || 0, // preserve access level
          profileURL: req.currentDecodedToken?.picture || currentData.profileURL || "", // refresh profile URL
        };

        // Update the user data in the database
        await userRef.update(updatedData);

        // Now fetch user and update their custom claims
        const user = await auth.getUser(uid);
        const updatedClaims = user.customClaims || {providers: []};

        // find provider in the currentClaim with the same providerId
        //
        const index = updatedClaims.providers.findIndex((org: {id: string;}) => org.id === providerId);
        if (index != -1) {
          updatedClaims.providers[index].admin =
            (jsonString2Array(updatedData.roles) || []).includes("admin") || updatedClaims.providers[index].admin || false; // Update admin role
          updatedClaims.providers[index].roles =
            jsonString2Array(updatedData.roles) || updatedClaims.providers[index].roles || [];// Update roles
          updatedClaims.providers[index].accessLevel =
            updatedData.accessLevel || updatedClaims.providers[index].accessLevel || 0; // Update access level
        } else {
          updatedClaims.providers.push({
            id: providerId,
            admin: (jsonString2Array(updatedData.roles) || []).includes("admin") || false, // Use default values if not provided
            roles: jsonString2Array(updatedData.roles || "[]"),
            accessLevel: updatedData.accessLevel || 0,
          });
        }

        // Update the user's custom claims in Firebase Authentication
        await auth.setCustomUserClaims(uid, updatedClaims);

        // Log the event to /providers/{providerId}/logs/users/{timestamp}
        const timestamp = Date.now(); // Current timestamp in milliseconds
        await database.ref(`/providers/${providerId}/logs/users/${timestamp}`).set({
          event: snapshot.exists() ? "providerProfileUpdatedManually" : "providerProfileCreated",
          providerIdUpdated: providerId,
          uid: uid,
          emailId: updatedData.emailId,
          fullName: updatedData.fullName,
          oldProfile: JSON.stringify(currentData || {}) || "",
          newProfile: JSON.stringify(updatedData || {}) || "",
          oldClaims: JSON.stringify(user.customClaims) || "",
          newClaims: JSON.stringify(updatedClaims) || "",
        });

        res.status(200).json({result: "success", message: "User data updated successfully."});
        return;
      } catch (error) {
        console.error("Error updating user data:", error);
        res.status(500).json({result: "failed", message: "Internal server error. " + (error as Error).message});
        return;
      }
    };

    // Now create the user pfofile and update the claims in the firebase admin in a single go
    try {
      // Use the performOperation method to execute the operation
      await lock.performOperation(createProfile);
      console.log(`User profile for user [${uid}] for provider [${providerId}] created successfully.`);
    } catch (error) {
      console.log(`Failed to create profile for user [${uid}] for provider [${providerId}].`);
      const timestamp = Date.now(); // Current timestamp in milliseconds
      await database.ref(`/global/logs/errors/${timestamp}/`).set({
        event: "userProfileCreationFailed",
        uid: uid,
        providerId: providerId,
        error: (error as Error).message,
      });
      throw new Error( (error as Error).message);
    }
  } catch (error) {
    console.error("Error updating provider user profile", error);
    res.status(500).json({result: "failed", message: "Unable to update provider user profile. " + (error as Error).message});
    return;
  }
};
