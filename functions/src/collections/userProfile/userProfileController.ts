import {Request, Response} from "express";
import {User} from "../user/user";
import {UserDataStore} from "../../dataStores/collections/userDataStore";
import {ErrorCodes, ErrorEx} from "../../types/errorEx";
import {Auth} from "../../middlewares/common/auth";
import {FirebaseUserController} from "../user/firebaseUser/firebaseUserController";

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
   * Creates a new user profile.
   * @param {Request} req - The HTTP request object.
   * @param {Response} res - The HTTP response object.
   * return {Promise<void>}
   */
  /*
  @Auth.requiresRoleOrAccessLevel(null, 2, [])
  public async create(req: Request, res: Response): Promise<void> {
    let userProfileJson: {[key: string]: unknown} = {};

    const {forced, data} = req.body;

    // todo handle forced flag
    console.log(`Forced flag: |${forced}|`);

    // Check if the 'data' node exists
    if (!data) {
      res.status(400).json({
        status: "Failed",
        message: `Data |${req.body.data}| is required.`,
        code: ErrorCodes.INVALID_PARAMETERS,
      });
      return;
    }

    try {
      // profile creation would require the id
      if (data.id != req.extendedDecodedIdToken?.uid) {
        res.status(401).json({
          status: "Failed",
          message: "Unauthorised!! User can only update its own profile",
          code: ErrorCodes.AUTH_FAILURE,
        });
        return;
      }

      // Create an instance of User to handle validation and unique ID
      const before = new User(data);

      // Create an instance of UserDataStore to handle the create operation
      const dataStore = new UserDataStore(req.provider?.id as string);

      // Perform the create operation with the provided ID and data
      const result = await dataStore.createWithId(before.id, before.dbJson());

      if (!result) {
        throw new ErrorEx(
          ErrorCodes.RECORD_CREATE_FAILED,
          `Failed to create user profile |${before.id}|`
        );
      }

      console.debug(`User profile created ***** |${JSON.stringify(result)}|`);

      // Create a new instance of User with the returned data
      const after = new User(result as {[key: string]: unknown});

      console.debug(`After created ***** |${JSON.stringify(after)}|`);

      // Convert the final user 'profile data to JSON format for the response
      userProfileJson = after.toJson() || {};
      console.log(`User created with data |${JSON.stringify(after)}|`);
    } catch (error) {
      console.error(error);
      res.status(400).json({
        status: "Failed",
        message: `Error creating user profile |${data.firstName} |${data.lastName}|. Last Error |${(error as Error).message}|`,
        code: ErrorCodes.UNKNOWN_ERROR,
      });
      return; // Ensure that the error response terminates the function
    }

    // Send success response with the user profile JSON data
    res.status(200).json({
      status: "Success",
      message: "User created successfully",
      data: userProfileJson,
    });
  }*/


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
      const {data} = req.body;
      if (!data) {
        res.status(400).json({
          status: "Failed",
          message: `Data |${req.body.data}| is required.`,
          code: ErrorCodes.INVALID_PARAMETERS,
        });
        return;
      }

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

      const after = new User(data);

      const dataStore = new UserDataStore(req.provider?.id as string);
      const result = await dataStore.transactionalUpdate(after.id, after.dbJson());

      if (!result) {
        throw new ErrorEx(
          ErrorCodes.RECORD_UPDATE_FAILED,
          `Failed to update user profile |${after.id}|`
        );
      }

      console.debug(`Creating user profile history record for |${JSON.stringify(result)}|`);
      const before = new User(result as {[key: string]: unknown});

      console.debug(`User profile updated from |${JSON.stringify(before)}| to |${JSON.stringify(after)}|`);

      /*
      if (before.historyRequired(after.toJson())) {
        console.debug("About to create an instance of the user profile history record");
        const history = new HistoryImpl(
          "",
          before.toJson(),
          "update",
          new Date(),
          req.extendedDecodedIdToken?.uid || ""
        );

        console.debug("About to create an instance of the user profile history store");
        const dataStoreHistory = new HistoryDataStore(req.provider?.id as string, HistoryType.User);

        console.debug("About to add a user profile history record to firestore");
        const resultHistory = await dataStoreHistory.create(history.dbJson());
        console.debug(`User Profile History |${resultHistory}| for user profile |${after.id}| created ` +
          `successfully after user profile updates`);
      }*/

      userProfileJson = after.toJson() || {};
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

      const dataStore = new UserDataStore(req.provider?.id as string);
      const result = await dataStore.read(userId);

      const after = new User(result as {[key: string]: unknown});
      userProfileJson = after.toJson() || {};
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

  /**
   * Handles querying for a list of user profiles based on filters, sorting, and range.
   * @param {Request} req - The HTTP request object containing query parameters.
   * @param {Response} res - The HTTP response object to send the result.
   * @return {Promise<void>}
   */
  /*
  @Auth.requiresRoleOrAccessLevel(null, 0, [])
  public async query(req: Request, res: Response): Promise<void> {
    let userProfileJsons: {[key: string]: unknown}[] = [];
    try {
      const {filter, sort, range, pageInfo} = req.query;

      console.log(`In getList with filter: |${filter}|, sort: |${sort}|, range: |${range}| & pageInfo |${pageInfo}|`);

      const dataStore = new UserDataStore(req.provider?.id as string);
      const result = await dataStore.query(filter as string, sort as string, range as string, pageInfo as string);

      if (!result) {
        throw new ErrorEx(
          ErrorCodes.RECORD_QUERY_FAILED,
          "Failed to query user profile records"
        );
      }

      userProfileJsons = (result.data || []).map((item) => {
        const after = new User(item as {[key: string]: unknown});
        return after.toJson();
      }) || [];

      res.setHeader("X-Content-Range", `items ${result.rangeStart}-${result.rangeEnd}/${result.totalCount}`);
    } catch (error) {
      console.error(error);
      res.status(400).json({
        status: "Failed",
        message: `Error retrieving user profile list: |${(error as Error).message}|`,
        code: ErrorCodes.UNKNOWN_ERROR,
      });
    }

    // console.debug(`Query executed successfully with data |${JSON.stringify(user profileJsons)}|`);

    res.status(200).json({
      status: "Success",
      message: "user profiles retrieved successfully",
      data: userProfileJsons,
    });
  }*/

  /**
   * Deletes a user profile by ID.
   * @param {Request} req - The HTTP request object.
   * @param {Response} res - The HTTP response object.
   * return {Promise<void>}
   */
  /*
  @Auth.requiresRoleOrAccessLevel(null, 1, [])
  public async delete(req: Request, res: Response): Promise<void> {
    let userProfileJson: {[key: string]: unknown} = {};
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

      // Create an instance of user profile data store
      const dataStore = new UserDataStore(req.provider?.id as string);

      // Delete the record
      const result = await dataStore.delete(userId);
      const before = new User(result as {[key: string]: unknown});
      userProfileJson = before.toJson();

      console.debug(`User profile History for user profile with ID |${before.id}| deleted successfully`);

      // // Create a history record for the user profile deletion
      // const history = new HistoryImpl(
      //   "", // Assuming ID will be auto-generated
      //   before.toJson(),
      //   "update", // Action type
      //   new Date(),
      //  req.extendedDecodedIdToken?.uid || ""
      // );

      // // Create an instance of history data store
      // const dataStoreHistory = new HistoryDataStore(req.provider?.id as string, HistoryType.User);

      // // Record the deletion in history
      // const resultHistory = await dataStoreHistory.create(history.dbJson());
      // console.debug(`User profile History |${resultHistory}| for user profile |${before.id}| ` +
        `created successfully after user profile deletion`);
    } catch (error) {
      console.error(error);
      res.status(400).json({
        status: "Failed",
        message: `Error deleting user profile |${req.params.id}|. Last Error |${(error as Error).message}|`,
        code: ErrorCodes.UNKNOWN_ERROR,
      });
      return;
    }

    res.status(200).json({
      status: "Success",
      message: "User profile deleted successfully",
      data: userProfileJson,
    });
  }*/
}
