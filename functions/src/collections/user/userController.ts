import {Request, Response} from "express";
import {User} from "./user";
import {UserDataStore} from "../../dataStores/collections/userDataStore";
import {ErrorCodes, ErrorEx} from "../../types/errorEx";
import {Auth} from "../../middlewares/common/auth";
import {FirebaseUserController} from "./firebaseUser/firebaseUserController";
import {FirebaseError} from "firebase-admin";
import {defaultOriginUrl} from "../../configs/firebase";
import {UserPin} from "./userPin";

/**
 * Handles user related operations.
 */
export class UserController {
  /**
 * Defines the root path for user related operations.
 *
 * @param {Request} req - The HTTP request object.
 * @return {string} The root path for users, based on the provider ID from the request.
 */
  // private getuserHistoryRootPath(req: Request): string {
  //  return DatabasePaths.userHistories(req.provider?.id as string);
  // }


  /**
   * Creates a new User.
   * @param {Request} req - The HTTP request object.
   * @param {Response} res - The HTTP response object.
   * return {Promise<void>}
   */
  @Auth.requiresRoleOrAccessLevel(true, 2, [])
  public async create(req: Request, res: Response): Promise<void> {
    let userJson: {[key: string]: unknown} = {};

    let {forced, data} = req.body;

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

    // add createdBy and lastUpdatedBy to data node
    data = {...data, createdBy: req?.currentUid, lastUpdatedBy: req?.currentUid};

    try {
      // Create the provider user object and let the constructor validates the data
      const newUser = new User(data);

      // create the firebase user first
      let firebaseUser;
      const firebaseUserControlller = new FirebaseUserController();
      try {
        firebaseUser = await firebaseUserControlller.create(data, req.headers?.origin || req.headers?.referer || defaultOriginUrl);
      } catch (error) {
        if ((error as FirebaseError).code !== "auth/uid-already-exists") {
          console.error(`Error while retrieving user |${data.email}|. Last error:`, error);
          throw error;
        }
        firebaseUser = await firebaseUserControlller.read(data.id || data.email);
      }

      if ((data as {id: string}).id && (data as {id: string}).id !== (firebaseUser as {id: string}).id) {
        throw new ErrorEx(
          ErrorCodes.INVALID_DATA,
          `Id |${firebaseUser.id}| is a readonly property and cannot be changed to |${data.id}|`
        );
      }

      if ((data as {email: string}).email !== (firebaseUser as {email: string}).email) {
        throw new ErrorEx(
          ErrorCodes.INVALID_DATA,
          `Email |${firebaseUser.email}| is a readonly property and cannot be changed to |${data.email}|`
        );
      }

      // Create an instance of UserDataStore to handle the create operation
      // And perform the create operation with the provided ID and data
      // Append hashed pin if provided in the data
      const dataStore = new UserDataStore();
      const result = await dataStore.createWithId(firebaseUser.id as string,
        {...newUser.dbJSON(), hashedPin: new UserPin(data).hashedPin}
      );

      if (!result) {
        throw new ErrorEx(
          ErrorCodes.RECORD_CREATE_FAILED,
          `Failed to create user |${firebaseUser.id}|`
        );
      }

      console.debug(`User created ***** |${JSON.stringify(result)}|`);

      // Create a new instance of user with the returned data
      const createdUser = new User(result as {[key: string]: unknown});

      console.debug(`After created ***** |${JSON.stringify(createdUser)}|`);

      // Convert the final user data to JSON format for the response
      userJson = createdUser.toJSON() || {};
      console.log(`User created with data |${JSON.stringify(createdUser)}|`);
    } catch (error) {
      console.error(error);
      res.status(400).json({
        status: "Failed",
        message: `Error creating user |${data.firstName} |${data.lastName}|. Last Error |${(error as Error).message}|`,
        code: ErrorCodes.UNKNOWN_ERROR,
      });
      return; // Ensure that the error respone terminates the function
    }

    // Send success response with the user JSON data
    res.status(200).json({
      status: "Success",
      message: "User created successfully",
      data: userJson,
    });
  }


  /**
   * Updates an existing user by ID.
   * @param {Request} req - The HTTP request object.
   * @param {Response} res - The HTTP response object.
   * return {Promise<void>}
   */
  @Auth.requiresRoleOrAccessLevel(true, 2, [])
  public async update(req: Request, res: Response): Promise<void> {
    let userJson: {[key: string]: unknown} = {};

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

      let firebaseUser;
      const firebaseUserControlller = new FirebaseUserController();
      try {
        firebaseUser = await firebaseUserControlller.read(userId);
      } catch (error) {
        if ((error as FirebaseError).code !== "auth/user-not-found") {
          console.error(error);
          throw error;
        }
        firebaseUser = await firebaseUserControlller.create(data, req.headers?.origin || req.headers?.referer || defaultOriginUrl);
      }

      if ((data as {id: string}).id !== (firebaseUser as {id: string}).id) {
        throw new ErrorEx(
          ErrorCodes.INVALID_DATA,
          `Id |${firebaseUser.id}| is a readonly property and cannot be changed to |${data.id}|`
        );
      }

      if ((data as {email: string}).email !== (firebaseUser as {email: string}).email) {
        throw new ErrorEx(
          ErrorCodes.INVALID_DATA,
          `Email |${firebaseUser.email}| is a readonly property and cannot be changed to |${data.email}|`
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
          `Failed to update user |${userId}|`
        );
      }

      const before = new User(result as {[key: string]: unknown});
      console.debug(`User updated from |${JSON.stringify(before)}| to |${JSON.stringify(newUser)}|`);

      /*
      console.debug(`Creating user history record for |${JSON.stringify(result)}|`);
      if (before.historyRequired(newUser.toJSON())) {
        console.debug("About to create an instance of the user history record");
        const history = new HistoryImpl(
          "",
          before.toJSON(),
          "update",
          new Date(),
          req.extendedDecodedIdToken?.uid || ""
        );

        console.debug("About to create an instance of the user history store");
        const dataStoreHistory = new HistoryDataStore(req.provider?.id as string, HistoryType.user);

        console.debug("About to add a user history record to firestore");
        const resultHistory = await dataStoreHistory.create(history.dbJSON());
        console.debug(`User History |${resultHistory}| for user |${userId}| created successfully after user updates`);
      }*/

      userJson = newUser.toJSON() || {};
    } catch (error) {
      console.error(error);
      res.status(400).json({
        status: "Failed",
        message: `Error updating user |${req.params.id}|. Last Error |${(error as Error).message}|`,
        code: ErrorCodes.UNKNOWN_ERROR,
      });
      return;
    }

    res.status(200).json({
      status: "Success",
      message: "user updated successfully",
      data: userJson,
    });
  }


  /**
   * Retrieves a single user by ID.
   * @param {Request} req - The HTTP request object.
   * @param {Response} res - The HTTP response object.
   * return {Promise<void>}
   */
  @Auth.requiresRoleOrAccessLevel(true, 1, [])
  public async read(req: Request, res: Response): Promise<void> {
    let userJson = {};
    try {
      const userId = req.params.id;
      if (!userId || userId.trim().length === 0) {
        res.status(400).json({
          status: "Failed",
          message: "user id must be passed",
          code: ErrorCodes.INVALID_PARAMETERS,
        });
        return;
      }

      const dataStore = new UserDataStore();
      const result = await dataStore.read(userId);

      const after = new User(result as {[key: string]: unknown});
      userJson = after.toJSON() || {};
    } catch (error) {
      console.error(error);
      res.status(400).json({
        status: "Failed",
        message: `Error retrieving user |${req.params.id}|. Last Error |${(error as Error).message}|`,
        code: ErrorCodes.UNKNOWN_ERROR,
      });
    }
    res.status(200).json({
      status: "Success",
      message: "user retrieved successfully",
      data: userJson,
    });
  }

  /**
   * Handles querying for a list of users based on filters, sorting, and range.
   * @param {Request} req - The HTTP request object containing query parameters.
   * @param {Response} res - The HTTP response object to send the result.
   * @return {Promise<void>}
   */
  @Auth.requiresRoleOrAccessLevel(true, 1, [])
  public async query(req: Request, res: Response): Promise<void> {
    let userJsons: {[key: string]: unknown}[] = [];
    try {
      const {filter, sort, range, pageInfo} = req.query;

      console.log(`In getList with filter: |${filter}|, sort: |${sort}|, range: |${range}| & pageInfo |${pageInfo}|`);

      const dataStore = new UserDataStore();
      const result = await dataStore.query(filter as string, sort as string, range as string, pageInfo as string);

      if (!result) {
        throw new ErrorEx(
          ErrorCodes.RECORD_QUERY_FAILED,
          "Failed to query user records"
        );
      }

      userJsons = (result.data || []).map((item) => {
        const after = new User(item as {[key: string]: unknown});
        return after.toJSON();
      }) || [];

      res.setHeader("X-Content-Range", `items ${result.rangeStart}-${result.rangeEnd}/${result.totalCount}`);
    } catch (error) {
      console.error(error);
      res.status(400).json({
        status: "Failed",
        message: `Error retrieving user list: |${(error as Error).message}|`,
        code: ErrorCodes.UNKNOWN_ERROR,
      });
    }

    // console.debug(`Query executed successfully with data |${JSON.stringify(userJsons)}|`);

    res.status(200).json({
      status: "Success",
      message: "Users retrieved successfully",
      data: userJsons,
    });
  }

  /**
   * Deletes a user by ID.
   * @param {Request} req - The HTTP request object.
   * @param {Response} res - The HTTP response object.
   * return {Promise<void>}
   */
  @Auth.requiresRoleOrAccessLevel(true, 3, [])
  public async delete(req: Request, res: Response): Promise<void> {
    let userJson: {[key: string]: unknown} = {};
    try {
      const userId = req.params.id;

      if (!userId || userId.trim().length === 0) {
        res.status(400).json({
          status: "Failed",
          message: "user id must be passed",
          code: ErrorCodes.INVALID_PARAMETERS,
        });
        return;
      }

      const firebaseUserControlller = new FirebaseUserController();
      try {
        await firebaseUserControlller.delete(userId, {});
        console.debug(`Firebase User with UID |${userId}| deleted successfully`);
      } catch (error) {
        console.error(`Failed to delete Firebase User with UID |${userId}|. last error`, error);
      }

      // Create an instance of user data store
      const dataStore = new UserDataStore();

      // Delete the record
      const result = await dataStore.delete(userId);
      const before = new User(result as {[key: string]: unknown});
      userJson = before.toJSON();

      console.debug(`User History for user with ID |${before.id}| deleted successfully`);

      /*
      // Create a history record for the user deletion
      const history = new HistoryImpl(
        "", // Assuming ID will be auto-generated
        before.toJSON(),
        "update", // Action type
        new Date(),
        req.extendedDecodedIdToken?.uid || ""
      );

      // Create an instance of history data store
      const dataStoreHistory = new HistoryDataStore(req.provider?.id as string, HistoryType.user);

      // Record the deletion in history
      const resultHistory = await dataStoreHistory.create(history.dbJSON());
      console.debug(`User History |${resultHistory}| for user |${before.id}| created successfully after user deletion`);
      */
    } catch (error) {
      console.error(error);
      res.status(400).json({
        status: "Failed",
        message: `Error deleting user |${req.params.id}|. Last Error |${(error as Error).message}|`,
        code: ErrorCodes.UNKNOWN_ERROR,
      });
      return;
    }

    res.status(200).json({
      status: "Success",
      message: "User deleted successfully",
      data: userJson,
    });
  }
}
