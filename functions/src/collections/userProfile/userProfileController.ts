import {Request, Response} from "express";
import {User} from "../user/user";
import {UserDataStore} from "../../dataStores/collections/userDataStore";
import {ErrorCodes, ErrorEx} from "../../types/errorEx";
import {Auth} from "../../middlewares/common/auth";
import {FirebaseUserController} from "../user/firebaseUser/firebaseUserController";
import {UserPin} from "../user/userPin";

/**
 * Handles user profile related operations.
 */
export class UserProfileController {
  /**
 * Defines the root path for user profile related  operations.
 *
 * @param {Request} req - The HTTP request object.
 * @return {string} The root path for user profiles, based on the provider ID from the request.
 */
  // private getuserProfileHistoryRootPath(req: Request): string {
  //  return DatabasePaths.userProfileHistories(req.provider?.id as string);
  // }


  /**
   * Updates an existing user profile by ID.
   * @param {Request} req - The HTTP request object.
   * @param {Response} res - The HTTP response object.
   * return {Promise<void>}
   */
  @Auth.requiresRoleOrAccessLevel(null, 0, [])
  public async update(req: Request, res: Response): Promise<void> {
    let userProfileJson: {[key: string]: unknown} = {};

    try {
      const userId = req.params.id;
      if (!userId || userId.trim().length === 0) {
        res.status(400).json({
          status: "Failed",
          message: `User id |${userId}| must be passed`,
          code: ErrorCodes.INVALID_PARAMETERS,
        });
        return;
      }

      if (userId != req.extendedDecodedIdToken?.uid) {
        res.status(401).json({
          status: "Failed",
          message: "Unauthorised!! User can only update its own profile",
          code: ErrorCodes.AUTH_FAILURE,
        });
        return;
      }

      // Check if the 'data' node exists
      let {data} = req.body;
      if (!data) {
        res.status(400).json({
          status: "Failed",
          message: `Data |${req.body.data}| is required.`,
          code: ErrorCodes.INVALID_PARAMETERS,
        });
        return;
      }

      // add lastUpdatedBy to data node
      data = {...data, lastUpdatedBy: req?.currentUid};

      // Create the provider user object and let the constructor validates the data
      const newUser = new User(data);

      if ((data as {emailId: string}).emailId != req.extendedDecodedIdToken?.emailId) {
        res.status(401).json({
          status: "Failed",
          message: `Email is readonly and the new value |${data.emailId}| must match the current value |${req.extendedDecodedIdToken?.emailId}|`,
          code: ErrorCodes.INVALID_DATA,
        });
        return;
      }

      const firebaseUserControlller = new FirebaseUserController();
      const firebaseUser = await firebaseUserControlller.read(userId);

      if ((data as {id: string}).id !== (firebaseUser as {id: string}).id) {
        throw new ErrorEx(
          ErrorCodes.INVALID_DATA,
          `Id |${firebaseUser.id}| is a readonly property and cannot be changed to |${data.id}|`
        );
      }

      if ((data as {emailId: string}).emailId !== (firebaseUser as {emailId: string}).emailId) {
        throw new ErrorEx(
          ErrorCodes.INVALID_DATA,
          `Email |${firebaseUser.emailId}| is a readonly property and cannot be changed to |${data.emailId}|`
        );
      }

      // Create an instance of UserDataStore to handle the update operation
      // And perform the update operation with the provided ID and data
      // Append hashed pin if provided in the data
      const dataStore = new UserDataStore();
      const result = await dataStore.transactionalUpdate(userId,
        {...newUser.dbJSON(), hashedPin: new UserPin(data).hashedPin}
      );

      if (!result) {
        throw new ErrorEx(
          ErrorCodes.RECORD_UPDATE_FAILED,
          `Failed to update user profile |${userId}|`
        );
      }

      console.debug(`Creating user profile history record for |${JSON.stringify(result)}|`);
      const before = new User(result as {[key: string]: unknown});

      console.debug(`User profile updated from |${JSON.stringify(before)}| to |${JSON.stringify(newUser)}|`);

      /*
      if (before.historyRequired(after.toJSON())) {
        console.debug("About to create an instance of the user profile history record");
        const history = new HistoryImpl(
          "",
          before.toJSON(),
          "update",
          new Date(),
          req.extendedDecodedIdToken?.uid || ""
        );

        console.debug("About to create an instance of the user profile history store");
        const dataStoreHistory = new HistoryDataStore(req.provider?.id as string, HistoryType.User);

        console.debug("About to add a user profile history record to firestore");
        const resultHistory = await dataStoreHistory.create(history.dbJSON());
        console.debug(`User Profile History |${resultHistory}| for user profile |${after.id}| created ` +
          `successfully after user profile updates`);
      }*/

      userProfileJson = newUser.toJSON() || {};
    } catch (error) {
      console.error(error);
      res.status(400).json({
        status: "Failed",
        message: `Error updating user profile |${req.params.id}|. Last Error |${(error as Error).message}|`,
        code: ErrorCodes.UNKNOWN_ERROR,
      });
      return;
    }

    res.status(200).json({
      status: "Success",
      message: "User profile updated successfully",
      data: userProfileJson,
    });
  }


  /**
   * Retrieves a single user profile by ID.
   * @param {Request} req - The HTTP request object.
   * @param {Response} res - The HTTP response object.
   * return {Promise<void>}
   */
  @Auth.requiresRoleOrAccessLevel(null, 0, [])
  public async read(req: Request, res: Response): Promise<void> {
    let userProfileJson = {};
    try {
      const userId = req.params.id;
      if (!userId || userId.trim().length === 0) {
        res.status(400).json({
          status: "Failed",
          message: "User profile id must be passed",
          code: ErrorCodes.INVALID_PARAMETERS,
        });
        return;
      }

      if (userId != req.extendedDecodedIdToken?.uid) {
        res.status(401).json({
          status: "Failed",
          message: "Unauthorised!! User can only retreive its own profile",
          code: ErrorCodes.AUTH_FAILURE,
        });
        return;
      }

      const dataStore = new UserDataStore();
      const result = await dataStore.read(userId);

      const after = new User(result as {[key: string]: unknown});
      userProfileJson = after.toJSON() || {};
    } catch (error) {
      console.error(error);
      res.status(400).json({
        status: "Failed",
        message: `Error retrieving user profile |${req.params.id}|. Last Error |${(error as Error).message}|`,
        code: ErrorCodes.UNKNOWN_ERROR,
      });
    }
    res.status(200).json({
      status: "Success",
      message: "User profile retrieved successfully",
      data: userProfileJson,
    });
  }
}
