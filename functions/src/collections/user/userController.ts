import {Request, Response} from "express";
import {User} from "./user";
import {UserDataStore} from "../../dataStores/collections/userDataStore";
import {ErrorCodes, ErrorEx} from "../../types/errorEx";
import {Auth} from "../../middlewares/auth";

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
    let userJson: Record<string, unknown> = {};

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

    // todo, check that email is not changing

    try {
      // Create an instance of user to handle validation and unique ID
      const before = new User(data);

      // Create an instance of UserDataStore to handle the create operation
      const dataStore = new UserDataStore(req.provider?.id as string);

      // Perform the create operation with the provided ID and data
      const result = await dataStore.createWithId(before.id, before.dbJson());

      if (!result) {
        throw new ErrorEx(
          ErrorCodes.RECORD_CREATE_FAILED,
          `Failed to create user |${before.id}|`
        );
      }

      console.debug(`User created ***** |${JSON.stringify(result)}|`);

      // Create a new instance of user with the returned data
      const after = new User(result as Record<string, unknown>);

      console.debug(`After created ***** |${JSON.stringify(after)}|`);

      // Convert the final user data to JSON format for the response
      userJson = after.toJson() || {};
      console.log(`User created with data |${JSON.stringify(after)}|`);
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
    let userJson: Record<string, unknown> = {};

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
      const {data} = req.body;
      if (!data) {
        res.status(400).json({
          status: "Failed",
          message: `Data |${req.body.data}| is required.`,
          code: ErrorCodes.INVALID_PARAMETERS,
        });
        return;
      }

      const after = new User(data);

      const dataStore = new UserDataStore(req.provider?.id as string);
      const result = await dataStore.transactionalUpdate(after.id, after.dbJson());

      if (!result) {
        throw new ErrorEx(
          ErrorCodes.RECORD_UPDATE_FAILED,
          `Failed to update user |${after.id}|`
        );
      }

      console.debug(`Creating user history record for |${JSON.stringify(result)}|`);
      const before = new User(result as Record<string, unknown>);

      console.debug(`User updated from |${JSON.stringify(before)}| to |${JSON.stringify(after)}|`);

      /*
      if (before.historyRequired(after.toJson())) {
        console.debug("About to create an instance of the user history record");
        const history = new HistoryImpl(
          "",
          before.toJson(),
          "update",
          new Date(),
          req.extendedDecodedIdToken?.uid || ""
        );

        console.debug("About to create an instance of the user history store");
        const dataStoreHistory = new HistoryDataStore(req.provider?.id as string, HistoryType.user);

        console.debug("About to add a user history record to firestore");
        const resultHistory = await dataStoreHistory.create(history.dbJson());
        console.debug(`User History |${resultHistory}| for user |${after.id}| created successfully after user updates`);
      }*/

      userJson = after.toJson() || {};
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

      const dataStore = new UserDataStore(req.provider?.id as string);
      const result = await dataStore.read(userId);

      const after = new User(result as Record<string, unknown>);
      userJson = after.toJson() || {};
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
    let userJsons: Record<string, unknown>[] = [];
    try {
      const {filter, sort, range, pageInfo} = req.query;

      console.log(`In getList with filter: |${filter}|, sort: |${sort}|, range: |${range}| & pageInfo |${pageInfo}|`);

      const dataStore = new UserDataStore(req.provider?.id as string);
      const result = await dataStore.query(filter as string, sort as string, range as string, pageInfo as string);

      if (!result) {
        throw new ErrorEx(
          ErrorCodes.RECORD_QUERY_FAILED,
          "Failed to query user records"
        );
      }

      userJsons = (result.data || []).map((item) => {
        const after = new User(item as Record<string, unknown>);
        return after.toJson();
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
    let userJson: Record<string, unknown> = {};
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

      // Create an instance of user data store
      const dataStore = new UserDataStore(req.provider?.id as string);

      // Delete the record
      const result = await dataStore.delete(userId);
      const before = new User(result as Record<string, unknown>);
      userJson = before.toJson();

      console.debug(`User History for user with ID |${before.id}| deleted successfully`);

      /*
      // Create a history record for the user deletion
      const history = new HistoryImpl(
        "", // Assuming ID will be auto-generated
        before.toJson(),
        "update", // Action type
        new Date(),
        req.extendedDecodedIdToken?.uid || ""
      );

      // Create an instance of history data store
      const dataStoreHistory = new HistoryDataStore(req.provider?.id as string, HistoryType.user);

      // Record the deletion in history
      const resultHistory = await dataStoreHistory.create(history.dbJson());
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
