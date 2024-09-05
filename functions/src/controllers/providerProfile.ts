import {Request, Response} from "express";
import {idpAuth, idpDatabase} from "../configs/firebase"; // Adjust the import path
import {jsonString2Array} from "../utils/helper";
import {findProviderIdBySubdomain} from "./provider";
import Lock from "../utils/lock";
import {ErrorCodes} from "../types/errorEx";
import {FirebaseError} from "firebase-admin";


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
    // Extract the decoded token from the request, which would have been appended by the middleware call to 'verifyIdToken'
    const uid = req.extendedDecodedIdToken?.uid; // Extract user ID from the authenticated user
    if (!uid) {
      res.status(403).json({
        status: "Failed",
        code: ErrorCodes.AUTH_MISSING_CREDENTIALS,
        message: "No credential found atatched to the request.",
      });
      return;
    }

    // Read providerId from the Host header
    let providerId = "";

    // Extract the first subdomain form the headers
    const hostHeader = req.headers.host || req.headers["Host"] || "";
    const subdomaInHostHeader = (Array.isArray(hostHeader) ? hostHeader[0] : (hostHeader)).split(".")[0] || "";
    const xSubdomainHeader = req.headers["X-Subdomain"] || req.headers["x-subdomain"] || "";
    const xSubdomainInSubdomainHeader = (Array.isArray(xSubdomainHeader) ? xSubdomainHeader[0] : xSubdomainHeader) || "";

    // first try from the header
    if (hostHeader) {
      // Extract the first subdomain as the providerId
      // find the provider id from the idpDatabase using subdomain
      providerId = await findProviderIdBySubdomain(subdomaInHostHeader);
    }

    // if we haven't found a valid providerId
    if (!providerId) {
      // Fallback to providerId in the request header
      // find the provider id from the idpDatabase using subdomain
      providerId = await findProviderIdBySubdomain(xSubdomainInSubdomainHeader);
    }

    if (!providerId) {
      res.status(403).json({
        status: "Failed",
        code: ErrorCodes.PROVIDER_ID_FAILURE,
        message: `No provider ids in the host |${hostHeader}| and subdomain |${xSubdomainHeader}| headers  found in the request.`,
      });
      return;
    }

    // Validate providerId against the Realtime Database
    const orgRef = idpDatabase.ref(`/global/providers/${providerId}`);
    const orgSnapshot = await orgRef.once("value");

    if (!orgSnapshot.exists()) {
      res.status(400).json({
        status: "Failed",
        code: ErrorCodes.PROVIDER_ID_FAILURE,
        message: "Invalid providerId.",
      });
      return;
    }

    // Create an instance of the Lock class
    const lock = new Lock(`users-${uid}`);

    // define our create profile fucntion
    const createProfile = async () => {
      // Create the user profile in the Realtime Database
      const userRef = idpDatabase.ref(`/providers/${providerId}/users/${uid}`);

      try {
        // Fetch the current user data
        const snapshot = await userRef.once("value");
        const currentData = snapshot.val() || {};

        // Check if attributes exist and update them if not
        const updatedData = {
          fullName: currentData.fullName || req.extendedDecodedIdToken?.name || "", // preserve full name or propogate from token
          emailId: currentData.emailId || req.extendedDecodedIdToken?.email || "", // preserve email or propogate from token
          roles: currentData.roles || "[]", // preserve roles
          accessLevel: currentData.accessLevel || 0, // preserve access level
          profileURL: req.extendedDecodedIdToken?.picture || currentData.profileURL || "", // refresh profile URL
        };

        // Update the user data in the idpDatabase
        await userRef.update(updatedData);

        // Now fetch user and update their custom claims
        const user = await idpAuth.getUser(uid);
        const updatedClaims = {
          ...user.customClaims, // Spread any existing custom claims
          providers: user.customClaims?.providers || [], // Set providers to an empty array if not defined
        };

        console.debug(`Custom cliams read" |${JSON.stringify(updatedClaims)}|`);

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
        await idpAuth.setCustomUserClaims(uid, updatedClaims);

        // Log the event to /providers/{providerId}/logs/users/{timestamp}
        const timestamp = Date.now(); // Current timestamp in milliseconds
        await idpDatabase.ref(`/providers/${providerId}/logs/users/${timestamp}`).set({
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

        res.status(200).json({
          status: "Success",
          code: "auth/success",
          message: "User data updated successfully.",
        });
        return;
      } catch (error) {
        console.error("Error updating user data:", error);
        res.status(500).json({
          status: "Failed",
          code: (error as FirebaseError).code || ErrorCodes.SERVER_ERROR,
          message: `Internal server error. Last Error |${(error as FirebaseError).message}|`,
        });
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
      await idpDatabase.ref(`/global/logs/errors/${timestamp}/`).set({
        event: "userProfileCreationFailed",
        uid: uid,
        providerId: providerId,
        error: (error as Error).message,
      });
      throw new Error( (error as Error).message);
    }
  } catch (error) {
    console.error("Error updating provider user profile", error);
    res.status(500).json({
      status: "Failed",
      code: (error as FirebaseError).code || ErrorCodes.SERVER_ERROR,
      message: `Unable to update provider user profile.. Last Error |${(error as FirebaseError).message}|`,
    });
    return;
  }
};
