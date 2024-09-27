import {FirebaseUser} from "./firebaseUser";
import {ErrorCodes, ErrorEx} from "../../../types/errorEx";
import {auth} from "../../../configs/firebase";
import {sendResetPasswordLink} from "../../../utils/email";
import {CustomClaims} from "../../../middlewares/customClaims";
import {UserRecord} from "firebase-admin/auth";

/**
 * Handles firebase user-related operations.
 */
export class FirebaseUserController {
  /**
 * Defines the root path for provider based user-related operations.
 *
 * @param {Request} req - The HTTP request object.
 * @return {string} The root path for provider based users, based on the provider ID from the request.
 */
  // private getUserHistoryRootPath(req: Request): string {
  //  return DatabasePaths.provider based userHistories(req.provider?.id as string);
  // }


  /**
   * Creates a new provider based user.
   * @param {object} data - {[key: string]: unknown} - The user data to create the user in firebase uagthentication sdk
   * @param {string} data.superAdmin - Flag indicatiing if the user has super admin access, defaults to false if not defined
   * @param {string} redirectUrl - The redirect url where the user is redirecetd after resetting the password
   * @return {object} - The created object with id included in the format [key: string]: unknown
   * return {Promise<void>}
  */
  public async create(data: {[key: string]: unknown}, redirectUrl: string): Promise<{[key: string]: unknown}> {
    let userJson: {[key: string]: unknown} = {};

    // Check if the 'data' node exists
    if (!data) {
      throw new ErrorEx(ErrorCodes.INVALID_PARAMETERS, `Data |${data}| is required.`);
    }

    if (!(data as {id: string}).id && !(data as {emailId: string}).emailId) {
      throw new ErrorEx(ErrorCodes.INVALID_PARAMETERS, `Id |${data.id}| or Email |${data.emailId}| is required.`);
    }

    try {
      // generate a random password
      const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
      let password = "";
      for (let i = 0; i < 16; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
      }

      // Create the firebase user object and let the constructor validates the data
      const newFirebaseUser = new FirebaseUser(data);

      // add uid and password and create user in the firebase authwentication sdk
      const userRecord: UserRecord = await auth.createUser({...newFirebaseUser.dbJSON(), uid: newFirebaseUser.id, password});
      const createdFirebaseUser = new FirebaseUser(userRecord as unknown as {[key: string]: unknown});

      console.debug(`Firebase user record created with |${JSON.stringify(userRecord)}|`);

      // let send a password reset link
      const resetLink = await auth.generatePasswordResetLink(createdFirebaseUser.emailId,
        {url: redirectUrl}
      );

      const success = await sendResetPasswordLink(
        `${createdFirebaseUser.firstName} ${createdFirebaseUser.lastName}`,
        createdFirebaseUser.emailId, resetLink
      );
      console.debug(`Password reset emailId sent to ${newFirebaseUser.emailId}. Result: ${success ? "Success" : "Failed"}`);

      const customClaims = new CustomClaims(createdFirebaseUser.id, data, userRecord?.customClaims || null);
      const claims = customClaims.setClaims();
      console.debug(`Custom claims updated from |${JSON.stringify(userRecord?.customClaims)}| to |${JSON.stringify(claims)}|`);

      userJson = createdFirebaseUser.toJSON();
    } catch (error) {
      console.error(error);
      throw new ErrorEx(ErrorCodes.UNKNOWN_ERROR, `Error creating provider based user |${data.firstName} |${data.lastName}|. Last Error |${(error as Error).message}|`);
    }

    // Return the provider-based user JSON data
    return userJson;
  }


  /**
   * Updates an existing provider based user by ID.
   * @param {object} data - {[key: string]: unknown} - The user data to create the user in firebase uagthentication sdk
   * @param {string} data.superAdmin - Flag indicatiing if the user has super admin access, defaults to false if not defined
   * @param {string} redirectUrl - The redirect url where the user is redirecetd after resetting the password
   * @return {object} - The created object with id included in the format [key: string]: unknown
   * return {Promise<void>}
   */
  public async update(data: {[key: string]: unknown}): Promise<{[key: string]: unknown}> {
    let userJson: {[key: string]: unknown} = {};
    try {
      // Check if the 'data' node exists
      if (!data) {
        throw new ErrorEx(ErrorCodes.INVALID_PARAMETERS, `Data |${data}| is required.`);
      }

      const userId = (data as {id: string}).id;
      if (!userId || userId.trim().length === 0) {
        throw new ErrorEx(ErrorCodes.INVALID_PARAMETERS, `FirebaseUser id |${userId}| must be passed`);
      }

      const userRecord: UserRecord = await auth.getUser(userId);
      const existingFirebaseUser = new FirebaseUser(userRecord as unknown as {[key: string]: unknown});

      // Create an instance of FirebaseUser to handle validation and unique ID
      const newFirebaseUser = new FirebaseUser({...existingFirebaseUser.toJSON(), data});

      if (existingFirebaseUser.id !== newFirebaseUser.id) {
        throw new ErrorEx(
          ErrorCodes.INVALID_DATA,
          `Id |${existingFirebaseUser.id}| is a readonly property and cannot be changed to |${newFirebaseUser.id}|`
        );
      }

      // remove uid from the object and update it
      const updatedFirebaseUser = new FirebaseUser(
        await auth.updateUser(newFirebaseUser.id, newFirebaseUser.dbJSON()) as unknown as {[key: string]: unknown}
      );
      console.debug(`Firebase user record updated from |${JSON.stringify(existingFirebaseUser)}| to |${JSON.stringify(userJson)}|`);

      // Set custom claims
      const customClaims = new CustomClaims(userId, data, userRecord?.customClaims || null);
      const claims = customClaims.setClaims();
      console.debug(`Custom claims updated from |${JSON.stringify(userRecord?.customClaims)}| to |${JSON.stringify(claims)}|`);

      /*
      if (before.historyRequired(after.toJSON())) {
        console.debug("About to create an instance of the provider based user history record");
        const history = new HistoryImpl(
          "",
          before.toJSON(),
          "update",
          new Date(),
          req.extendedDecodedIdToken?.uid || ""
        );

        console.debug("About to create an instance of the provider based user history store");
        const dataStoreHistory = new HistoryDataStore(req.provider?.id as string, HistoryType.FirebaseUser);

        console.debug("About to add a provider based user history record to firestore");
        const resultHistory = await dataStoreHistory.create(history.dbJSON());
        console.debug(`FirebaseUser History |${resultHistory}| for provider based user |${after.id}| created successfully after provider based user updates`);
      }*/

      userJson = updatedFirebaseUser.toJSON();
    } catch (error) {
      console.error(error);
      throw new ErrorEx(ErrorCodes.UNKNOWN_ERROR, `Error updating provider based user |${data.id}|. Last Error |${(error as Error).message}|`);
    }

    return userJson;
  }


  /**
   * Retrieves a single provider based user by ID.
   * @param {string} userId - The uid of the user whois to be deleted in thr firebase uagthentication sdk
   * @return {object} - The reyreived object in the format {[key: string]: unknown}
   */
  public async read(userId: string): Promise<{[key: string]: unknown}> {
    let userJson = {};
    try {
      if (!userId || userId.trim().length === 0) {
        throw new ErrorEx(ErrorCodes.INVALID_PARAMETERS, `FirebaseUser id |${userId}| must be passed`);
      }

      const userRecord: UserRecord = await auth.getUser(userId);
      const existingFirebaseUser = new FirebaseUser(userRecord as unknown as {[key: string]: unknown});

      // remove uid from the object and update it
      userJson = existingFirebaseUser.toJSON();
    } catch (error) {
      console.error(error);
      throw new ErrorEx(ErrorCodes.UNKNOWN_ERROR, `Error retrieving provider based user |${userId}|. Last Error |${(error as Error).message}|`);
    }
    return userJson;
  }


  /**
   * Deletes a provider based user by ID.
   * @param {string} userId - The uid of the user whois to be deleted in thr firebase uagthentication sdk
   * @param {object} data - {[key: string]: unknown} - The user data to create the user in firebase uagthentication sdk
   * @param {string} data.superAdmin - Flag indicatiing if the user has super admin access, defaults to false if not defined
   * @return {object} - The deleted object in the format {[key: string]: unknown}
   */
  public async delete(userId: string, data: {[key: string]: unknown}): Promise<{[key: string]: unknown}> {
    let userJson: {[key: string]: unknown} = {};
    try {
      if (!userId || userId.trim().length === 0) {
        throw new ErrorEx(ErrorCodes.INVALID_PARAMETERS, `FirebaseUser id |${userId}| must be passed`);
      }

      const userRecord: UserRecord = await auth.getUser(userId);
      const existingFirebaseUser = new FirebaseUser(userRecord as unknown as {[key: string]: unknown});

      // Delete the record
      await auth.deleteUser(userId);
      console.debug(`Firebase user with ID |${userId}| deleted successfully`);

      // Set custom claims
      const customClaims = new CustomClaims(userId, data, userRecord?.customClaims || null);
      const claims = customClaims.unsetClaims();
      console.debug(`Custom claims updated from |${JSON.stringify(userRecord?.customClaims)}| to |${JSON.stringify(claims)}|`);

      /*
      // Create a history record for the provider based user deletion
      const history = new HistoryImpl(
        "", // Assuming ID will be auto-generated
        before.toJSON(),
        "update", // Action type
        new Date(),
        req.extendedDecodedIdToken?.uid || ""
      );

      // Create an instance of history data store
      const dataStoreHistory = new HistoryDataStore(req.provider?.id as string, HistoryType.FirebaseUser);

      // Record the deletion in history
      const resultHistory = await dataStoreHistory.create(history.dbJSON());
      console.debug(`FirebaseUser History |${resultHistory}| for provider based user |${before.id}| created successfully after provider based user deletion`);
      */

      userJson = existingFirebaseUser.toJSON();
    } catch (error) {
      console.error(error);
      throw new ErrorEx(ErrorCodes.UNKNOWN_ERROR, `Error deleting provider based user |${userId}|. Last Error |${(error as Error).message}|`);
    }
    return userJson;
  }
}
