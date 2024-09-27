import {firestore} from "../../configs/firebase";
import * as admin from "firebase-admin";
import {ErrorCodes, ErrorEx} from "../../types/errorEx";
import {IDataStore} from "../interfaces/dataStore";
import {DocumentData, OrderByDirection, Query, WithFieldValue} from "firebase-admin/firestore";
import {FirebaseDataStoreOptions} from "./firebaseDataStoreOptions";
import {CreateIdOption} from "../types/createIdOption";


/**
 * FirestoreDataStore Class provides a base for interacting with Firestore,
 * implementing the IDataStore interface. This class encapsulates fundamental data operations such as
 * creation, retrieval, update, deletion, and querying of records within Firestore.
 *
 * The design intent is to offer a flexible and extensible foundation for managing data by handling the
 * direct interactions with Firestore. It abstracts the complexities of Firestore operations,
 * allowing derived classes to focus on specific data transformation and mapping needs. Derived classes are
 * responsible for defining how data is converted between the application's internal format and the storage
 * format used by Firestore.
 *
 * By encapsulating Firestore-specific data operations, this class ensures that the underlying database
 * interactions are handled consistently, making it easier to maintain and extend the data management
 * functionalities across various implementations.
 */
export class FirestoreDataStore implements IDataStore {
  #collRef: admin.firestore.CollectionReference;
  #options: FirebaseDataStoreOptions;

  /**
   * Creates an instance of FirestoreDataStore.
   *
   * This constructor initializes the FirestoreDataStore with a specific path and options.
   * Depending on the `databaseInstanceType`, it selects the appropriate Firestore instance
   * to manage records.
   *
   * @param {string} path - The path in Firestore where records will be managed. This path
   *                         specifies the collection or document location in Firestore.
   * @param {FirebaseDataStoreOptions} [options=new FirebaseDataStoreOptions()] - The options for configuring
   *                         the data store. This includes settings related to the Firestore
   *                         instance and other operational parameters. If not provided,
   *                         default options will be used.
   *
   * @throws {Error} Throws an error if the `databaseInstanceType` in the options is not recognized.
   */
  constructor(
    path: string,
    options: FirebaseDataStoreOptions = new FirebaseDataStoreOptions()
  ) {
    this.#options = options;
    this.#collRef = firestore.collection(path);
  }

  /**
   * Validates and transforms the value field (the JSON object to be stored at the document ID path) according to specific rules.
   *
   * **Data Validation for Value Field:**
   *   1. Ensures that the value is not `null` or `undefined` unless `options.allowNullOrUndefined` is set.
   *   2. Ensures that the value field is a non-array object, throwing an error if not.
   *   3. Ensures that the object does not contain a property named `id`, throwing an error if found.
   *
   * **Data Transformation:**
   *   1. For Firestore, converts all `Date` objects to Firestore `Timestamp`.
   *   2. Preserves fields explicitly set to `firestore.FieldValue.serverTimestamp()`.
   *
   * @private
   * @param {unknown} applicationValueField - The value field (the JSON object to be stored at the document ID path).
   * @return {object} - The object with `Date` fields converted to Firestore `Timestamp`,
   *                     `firestore.FieldValue.serverTimestamp()` fields preserved, and with no `id` property.
   * @throws {Error} - Throws an error if the object contains an `id` property, is `null`/`undefined` without appropriate configuration,
   *                   or is not a non-array object.
   */
  private toStoreValueField(applicationValueField: unknown): object {
    // Handle null or undefined data
    if (applicationValueField == null && !this.#options.allowNullOrUndefined) {
      throw new ErrorEx(
        ErrorCodes.INVALID_DATA,
        `Data cannot be null or undefined when allowNullOrUndefined option is not set. Provided data: |${JSON.stringify(applicationValueField)}|.`
      );
    }

    // Ensure that data is an non array object
    if (typeof applicationValueField !== "object" || Array.isArray(applicationValueField)) {
      throw new ErrorEx(
        ErrorCodes.INVALID_DATA,
        `Failed to create record. Data must be a non array object. Provided type: |${typeof applicationValueField}| and provider Data |${JSON.stringify(applicationValueField)}|.`
      );
    }

    // Enusre value field does not have id property
    if ("id" in (applicationValueField || {})) {
      throw new ErrorEx(
        ErrorCodes.INVALID_DATA,
        `Invalid data. The application value field |${JSON.stringify(applicationValueField)}| contains an id property , which is not excpeted.`
      );
    }

    /**
     * Recursively traverses an object and converts all `Date` fields to Firestore `Timestamp`.
     * Additionally, it preserves fields explicitly set to `firestore.FieldValue.serverTimestamp()`.
     * It handles nested objects and arrays by recursing into them.
     *
     * @param {object} data - The object to traverse and transform. Defaults to an empty object.
     * @return {object} - The transformed object with `Date` fields converted to Firestore `Timestamp`
     *                    and `firestore.FieldValue.serverTimestamp()` fields preserved.
     */
    function transformDateField(data: object): object {
      // handle array first
      if (Array.isArray(data)) {
        const result = [];
        for (const item of data) {
          if (item instanceof Date) {
            // Convert Date to Firestore Timestamp
            result.push(admin.firestore.Timestamp.fromDate(item));
          } else if (item === admin.firestore.FieldValue.serverTimestamp()) {
            // Preserve Firestore serverTimestamp fields
            result.push(item);
          } else if (typeof item === "object" && item != null) {
            // call recursively if we get an array or object
            result.push(transformDateField(item));
          } else {
            // Copy other values as they are
            result.push(item);
          }
        }
        return result;
      }

      // reacher here means its a non-array object
      const result: {[key: string]: unknown} = {};
      for (const key of Object.keys(data)) {
        const value = (data as {[key: string]: unknown})[key];

        if (value instanceof Date) {
          // Convert Date to Firestore Timestamp
          result[key] = admin.firestore.Timestamp.fromDate(value);
        } else if (value === admin.firestore.FieldValue.serverTimestamp()) {
          // Preserve Firestore serverTimestamp fields
          result[key] = value;
        } else if (typeof value === "object" && value != null) {
          // call recursively if we get an array or object
          result[key] = transformDateField(value as object);
        } else {
          // Copy other values as they are
          result[key] = value;
        }
      }
      return result;
    }

    // Ctransform the date field for firestore
    const result: object = transformDateField(applicationValueField || {}) || {};
    return result;
  }


  /**
   * Validates and transforms the value field (the JSON object retreived from the firesotre at the document ID path) according to specific rules.
   *
   * **Data Validation for Value Field:**
   *   1. ensure that id is not null, undefiend or empty and of tyope string or number., throw error otjerwise
   *   2. Ensures that the value is not `null` or `undefined` unless `options.allowNullOrUndefined` is set.
   *   3. Ensures that the value field is a non-array object, throwing an error if not.
   *         This is because When querying a single document in Firestore, the data should be an object, null, or undefined.
   *          For query firestore and expecting multiple documents,
   *          the expected results would be null, undefined or an aray, call this method for each element
   *   4. Ensures that the object does not contain a property named `id`, throwing an error if found.
   *
   * **Data Transformation:**
   *   1. For Firestore, converts all Firestore `Timestamp` objects to javascript `Date`.
   *
   * @param {string} id - The identifier to be used as a key in the resulting object or as a value if `data` is primitive.
   * @param {unknown} storeValueField - The value field (the JSON object retreved at the document ID path).
   *
   * @return {object} The processed data formatted as an object where:
   * - If `data` is an object, it is updated to include the `id`.
   * - If `data` is null or undefined, it is replaced with `{ id }` if `allowNullorUndefined` is true.
   * - Throws an error if `data` is not an object or if `data` is an unexpected type and `allowNullorUndefined` is false.
   *
   * @throws {Error} - Throws an error if the object contains an `id` property, is `null`/`undefined` without appropriate configuration,
   *                   or is not a non-array object.
   */
  private fromStoreValueField(id: string, storeValueField: unknown): object {
    // console.debug(`in appendIdFromStoreSingle with data |${JSON.stringify(storeValueField)}|`);
    // check for valid id values
    if (typeof id !== "string" || !id?.trim()) {
      throw new ErrorEx(ErrorCodes.INVALID_PARAMETERS, `Invalid ID |${id}| or its type |${typeof id}|. It must be an non empty string`);
    }

    // Handle null or undefined data
    if (storeValueField == null && !this.#options.allowNullOrUndefined) {
      throw new ErrorEx(
        ErrorCodes.DATABASE_CONSISTENCY_ERROR,
        `Data cannot be null or undefined when allowNullOrUndefined option is not set. Provided data: |${JSON.stringify(storeValueField)}|.`
      );
    }

    // Ensure that data is an non array object
    if (typeof storeValueField !== "object" || Array.isArray(storeValueField)) {
      throw new ErrorEx(
        ErrorCodes.DATABASE_CONSISTENCY_ERROR,
        `Failed to create record. Data must be a non array object. Provided type: |${typeof storeValueField}| and provider Data |${JSON.stringify(storeValueField)}|.`
      );
    }

    // Enusre value field does not have id property
    if ("id" in (storeValueField || {})) {
      throw new ErrorEx(ErrorCodes.DATABASE_CONSISTENCY_ERROR, `Invalid data. The application value field |${storeValueField}| contains an id property , which is not excpeted.`);
    }

    /**
     * Recursively traverses an object and converts all Firestore `Timestamp` fields to Javascript `Date`.
     * It handles nested objects and arrays by recursing into them.
     *
     * @param {object} data - The object to traverse and transform. Defaults to an empty object.
     * @return {object} - The transformed object with Firestore `Timestamp` fields converted to Javascript `Date`
     */
    function transformDateField(data: object): object {
      // handle array first
      if (Array.isArray(data)) {
        const result = [];
        for (const item of data) {
          if (item instanceof admin.firestore.Timestamp) {
            // Convert Firestore Timestamp to Date
            result.push(item.toDate());
          } else if (item === admin.firestore.FieldValue.serverTimestamp()) {
            // Preserve Firestore serverTimestamp fields
            result.push(item);
          } else if (typeof item === "object" && item != null) {
            // call recursively if we get an array or object
            result.push(transformDateField(item));
          } else {
            // Copy other values as they are
            result.push(item);
          }
        }
        return result;
      }

      // reacher here means its a non-array object
      const result: {[key: string]: unknown} = {};
      for (const key of Object.keys(data)) {
        const value = (data as {[key: string]: unknown})[key];

        if (value instanceof admin.firestore.Timestamp) {
          // Convert Firestore Timestamp to Date
          result[key] = value.toDate();
        } else if (value === admin.firestore.FieldValue.serverTimestamp()) {
          // Preserve Firestore serverTimestamp fields
          result[key] = value;
        } else if (typeof value === "object" && value != null) {
          // call recursively if we get an array or object
          result[key] = transformDateField(value);
        } else {
          // Copy other values as they are
          result[key] = value;
        }
      }

      return result;
    }

    // Transform the firestore timestamp field to date
    const result: object = transformDateField(storeValueField || {}) || {};

    // Append id to the storage data field
    // console.debug(`adding id |${id}| to data `);
    const applicationData = {id, ...(result || {})};
    // console.debug(`++++Data after id |${id}| added |${JSON.stringify(applicationData)}|`);
    return applicationData;
  }


  /**
   * Creates a new record with a unique ID and stores the provided application data.
   *
   * This method uses auto-generated IDs for new records. If `createIdOption` is set to
   * `ManualAllowIdConflicts` or `ManualRejectIdConflicts`, use the `createWithId` method instead.
   *
   * @param {unknown} applicationValueField - The application data to be stored in the new record. The data should be serializable.
   * @return {Promise<unknown>} - A promise that resolves with the unique ID of the newly createdAt record.
   *
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.INVALID_DATA` if
   *                          data is either null or undefined data annd`allowNullOrUndefined` is not set.
   *                          OR data is not of type onbject
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.INVALID_METHOD` if `createIdOption` is not `AutoGeneratedId`.
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_CREATE_FAILED` if record creation fails.
   */
  async create(applicationValueField: object): Promise<unknown> {
    // Check if the ID creation option is valid
    if (this.#options.createIdOption !== CreateIdOption.AutoGeneratedId) {
      throw new ErrorEx(
        ErrorCodes.INVALID_METHOD,
        `Failed to create record. Invalid createIdOption |${this.#options.createIdOption}| for data |${JSON.stringify(applicationValueField)}|. Use createWithId() for this option.`
      );
    }

    // transform to store format
    const storeValueField = this.toStoreValueField(applicationValueField);

    let uniqueId;
    try {
      // get a unique id form the firestore at the refence path
      const docRef = await this.#collRef.add(storeValueField as WithFieldValue<DocumentData>);
      uniqueId = docRef.id;

      if (!uniqueId) {
        throw new ErrorEx(ErrorCodes.RECORD_CREATE_FAILED, `Failed to get an id for data |${JSON.stringify(applicationValueField)}|`);
      }
    } catch (error) {
      console.error(`Failed to create record for data |${JSON.stringify(applicationValueField)}|. Error: |${(error as Error).message}|`);
      throw new ErrorEx(
        (error as ErrorEx).code || ErrorCodes.RECORD_CREATE_FAILED,
        `Failed to create record for data |${JSON.stringify(applicationValueField)}|. Error: |${(error as Error).message}|`
      );
    }

    // Validate and transform the store data to application data by claling the member function
    // The method will validate the data and thow appropriate error before appneding the id to the curenntly retreived data
    const applicationData = this.fromStoreValueField(uniqueId, storeValueField);

    console.debug(`Record createdAt with id |${uniqueId}| for data |${JSON.stringify(applicationData)}|`);
    return applicationData;
  }


  /**
   * Creates a new record with a unique ID based on a base ID and stores the provided data.
   *
   * This method tries to create a new record using the provided Id.
   * If a document with the base ID already exists, and the createIdOption is set to CreateIdOption.ManualAllowIdConflicts
   *              a retry attempt is made by adding a postfix `-sequenceNo` to the provide id,
   *              stating at 2 and incrementing until it reaches 100, when an error is thrown
   * If a document with the base ID already exists, and the createIdOption is set to CreateIdOption.ManualRejectIdConflicts, an error is thrown
   * If `createIdOption` is set to `AutoGeneratedId`, use the `create` method instead.
   *
   * @param {string} id - The base ID used to generate a unique ID.
   * @param {unknown} applicationValueField - The data to be stored in the new record. The data should be serializable.
   * @param {function} callback - Optional callback function to execute during the transaction.
  * @return {Promise<unknown>} - A promise that resolves with the createdAt record along with the id used to ceate the record
   *
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_CREATE_FAILED` if record creation fails after all retries.
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.INVALID_METHOD` if `createIdOption` is `AutoGeneratedId`.
   */
  async createWithId(
    id: string, applicationValueField: unknown,
    callback?: (id: string, applicationValueField: unknown) => Promise<void>): Promise<unknown> {
    if (typeof id !== "string" || !id?.trim()) {
      throw new ErrorEx(ErrorCodes.INVALID_PARAMETERS, `Invalid ID |${id}| or its type |${typeof id}|. It must be an non empty string`);
    }

    // Check if the ID creation option is valid
    if (this.#options.createIdOption === CreateIdOption.AutoGeneratedId) {
      throw new ErrorEx(
        ErrorCodes.INVALID_METHOD,
        `Failed to create record. Invalid createIdOption |${this.#options.createIdOption}| for data |${JSON.stringify(applicationValueField)}|. Use create() for this option.`
      );
    }

    // transform to store format
    const storeValueField = this.toStoreValueField(applicationValueField);

    // If base ID exists, attempt to create a unique ID by appending a sequence number
    // adjust the max seq number allowed based on CreateIdOption
    const maxSequenceNo = (this.#options.createIdOption === CreateIdOption.ManualRejectIdConflicts) ? 1 : 100;

    let uniqueId = "";
    let recordCreated = false;
    for (let sequenceNo = 1; sequenceNo <= maxSequenceNo && !recordCreated; sequenceNo++) {
      uniqueId = `${id}${sequenceNo > 1 ? `-${sequenceNo}` : ""}`;
      const ref = this.#collRef.doc(uniqueId);
      try {
        await firestore.runTransaction(async (transaction) => {
          console.debug(`Attempting retry |${sequenceNo}| to create a record with ID |${uniqueId}| for data |${JSON.stringify(applicationValueField)}|.`);

          // Read the document within the transaction
          const snapshot = await transaction.get(ref);

          if (snapshot.exists) {
            // continue the loop and let the loop handle it, e.g. if it wants to exit or try with a different id
            return;
          }

          // Document does not exist, so we create it
          transaction.set(ref, storeValueField);

          // If a callback is provided, execute it during the transaction
          if (callback) {
            try {
              await callback(uniqueId, applicationValueField);
            } catch (callbackError) {
              console.error("Callback failed:", callbackError);
              // Throwing an error will cause the transaction to roll back
              throw new Error("Callback execution failed, rolling back transaction.");
            }
          }

          // we are done, set the recordCreated to treun and break
          recordCreated = true;
          return; // beak the loop
        });
      } catch (error) {
        console.error(`Failed to create record with data |${JSON.stringify(applicationValueField)}|. Error: |${(error as Error).message}|`);
        throw new ErrorEx(
          (error as ErrorEx).code || ErrorCodes.RECORD_CREATE_FAILED,
          `Failed to create record with data |${JSON.stringify(applicationValueField)}|. Error: |${(error as Error).message}|`
        );
      }
    }

    // now check if we managed to create the reccord
    if (!recordCreated) {
      const erroMsg = this.#options.createIdOption === CreateIdOption.ManualRejectIdConflicts ?
        `A record with id |${id}| already exists` :
        `Failed to retrieve the new record ID. 100 records already exists with starting with the Id |${id}|`;
      throw new ErrorEx(
        ErrorCodes.RECORD_CREATE_FAILED,
        `Failed to create record with data |${JSON.stringify(applicationValueField)}|. Error: |${erroMsg}|`
      );
    }

    // Validate and transform the store data to application data by claling the member function
    // The method will validate the data and thow appropriate error before appneding the id to the curenntly retreived data
    const applicationData = this.fromStoreValueField(uniqueId, storeValueField);

    console.debug(`++++++Record createdAt with id |${uniqueId}| for data |${JSON.stringify(applicationData)}|`);
    return applicationData;
  }

  /**
   * Updates a record with the specified ID and returns the previous state of the record before the update.
   *
   * @param {string} id - The unique identifier of the record to be updated.
   * @param {unknown} applicationValueField - The new data to update the record with.
   * @return {Promise<unknown>} - A promise that resolves with the previous data of the record.
   *
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_NOT_FOUND` if the record does not exist.
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_UPDATE_FAILED` if the update operation fails.
   */
  async update(id: string, applicationValueField: unknown): Promise<unknown> {
    // check that a valid id is passed
    if (typeof id !== "string" || !id?.trim()) {
      throw new ErrorEx(ErrorCodes.INVALID_PARAMETERS, `Invalid ID |${id}| or its type |${typeof id}|. It must be an non empty string`);
    }

    // Check if the right method is called based on options
    if (this.#options.requireTransaction) {
      throw new ErrorEx(
        ErrorCodes.INVALID_METHOD,
        "Failed to update record. With requiresTransactionalUpdates option set to false, please use transactionalUpdate() method"
      );
    }

    // transform to store format
    const storeValueField = this.toStoreValueField(applicationValueField);

    let currentApplicationData;
    try {
      const docRef = this.#collRef.doc(id);

      const snapshot = await docRef.get();

      if (!snapshot.exists && !this.#options.createIfNotExists) {
        throw new ErrorEx(
          ErrorCodes.RECORD_NOT_FOUND,
          `Failed to update record with data |${JSON.stringify(storeValueField)}|. A record with id |${id}| does not exist`
        );
      }

      // Keep a copy of the current data
      const currentStoreValueField = snapshot.exists ? snapshot.data() : {};
      currentApplicationData = {};

      if (snapshot.exists) {
        // Validate and transform the store data to application data by claling the member function
        // The method will validate the data and thow appropriate error before appneding the id to the curenntly retreived data
        currentApplicationData = this.fromStoreValueField(id, currentStoreValueField);
      }

      // If readonly fields defined, esure they aren't changing
      for (const readOnlyField of this.#options.readOnlyFields) {
        const currentValue = (currentApplicationData as {[key: string]: unknown })[readOnlyField];
        const newValue = (applicationValueField as {[key: string]: unknown })[readOnlyField];
        if (currentValue != newValue) {
          throw new ErrorEx(
            ErrorCodes.INVALID_DATA,
            `Field |${readOnlyField}| is readonly and the new value |${newValue}| must match the current value |${currentValue}|`,
          );
        }
      }

      // Update the document with new data. the mrege option is turned on ny efault, so non-overlapping existing properties are preserved
      await docRef.update(storeValueField as WithFieldValue<DocumentData>);
    } catch (error) {
      console.error(`Failed to update record with ID |${id}| & data |${JSON.stringify(applicationValueField)}|. Error: |${(error as Error).message}|`);
      throw new ErrorEx(
        (error as ErrorEx).code || ErrorCodes.RECORD_UPDATE_FAILED,
        `Failed to update record with ID |${id}| & data |${JSON.stringify(applicationValueField)}|. Error: |${(error as Error).message}|`
      );
    }

    console.debug(`Record update for id |${id}| with data |${JSON.stringify(applicationValueField)}|`);
    return currentApplicationData; // it was current data when read but now histocial after the update
  }


  /**
   * Updates a record with the specified ID within a transcation and returns the previous state of the record before the update.
   *
   * @param {string} id - The unique identifier of the record to be updated.
   * @param {unknown} applicationValueField - The new data to update the record with.
   * @param {function} callback - Optional callback function to execute during the transaction.
   * @return {Promise<unknown>} - A promise that resolves with the previous data of the record.
   *
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_NOT_FOUND` if the record does not exist.
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_UPDATE_FAILED` if the update operation fails.
   */
  async transactionalUpdate(
    id: string, applicationValueField: unknown,
    callback?: (id: string, applicationValueField: unknown) => Promise<void>): Promise<unknown> {
    if (typeof id !== "string" || !id?.trim()) {
      throw new ErrorEx(ErrorCodes.INVALID_PARAMETERS, `Invalid ID |${id}| or its type |${typeof id}|. It must be an non empty string`);
    }

    // Check if the right method is called based on options
    if (!this.#options.requireTransaction) {
      throw new ErrorEx(
        ErrorCodes.INVALID_METHOD,
        "With requiresTransactionalUpdates option set to false, please use update() method"
      );
    }

    // transform to store format
    const storeValueField = this.toStoreValueField(applicationValueField);

    let currentApplicationData;
    try {
      const ref = this.#collRef.doc(id);
      await firestore.runTransaction(async (transaction) => {
        // Read the document within the transaction
        const snapshot = await transaction.get(ref);

        if (!snapshot.exists && !this.#options.createIfNotExists) {
          throw new ErrorEx(ErrorCodes.RECORD_NOT_FOUND, `Failed to update record with ID |${id}|. Record not found.`);
        }

        currentApplicationData = {}; // defalt to {}, incase the reciord deosn't exist
        if (snapshot.exists) {
          // Validate and transform the store data to application data by claling the member function
          // The method will validate the data and thow appropriate error before appneding the id to the curenntly retreived data
          // Keep a copy of the current data
          const currentStoreValueField = snapshot.data();
          currentApplicationData = this.fromStoreValueField(id, currentStoreValueField);
        }

        // If readonly fields defined, esure they aren't changing
        for (const readOnlyField of this.#options.readOnlyFields) {
          const currentValue = (currentApplicationData as {[key: string]: unknown })[readOnlyField];
          const newValue = (applicationValueField as {[key: string]: unknown })[readOnlyField];
          if (currentValue != newValue) {
            throw new ErrorEx(
              ErrorCodes.INVALID_DATA,
              `Field |${readOnlyField}| is readonly and the new value |${newValue}| must match the current value |${currentValue}|`,
            );
          }
        }

        // Update the document with new data with merge option so non-overlapping existing properties are preserved
        transaction.set(ref, storeValueField, {merge: true});

        // If a callback is provided, execute it during the transaction
        if (callback) {
          try {
            await callback(id, applicationValueField);
          } catch (callbackError) {
            console.error("Callback failed:", callbackError);
            // Throwing an error will cause the transaction to roll back
            throw new Error("Callback execution failed, rolling back transaction.");
          }
        }

        // we are done, return
        return;
      });
    } catch (error) {
      console.error(`Failed to update record with data |${JSON.stringify(applicationValueField)}|. Error: |${(error as Error).message}|`);
      throw new ErrorEx(
        (error as ErrorEx).code || ErrorCodes.RECORD_UPDATE_FAILED,
        `Failed to update record with data |${JSON.stringify(applicationValueField)}|. Error: |${(error as Error).message}|`
      );
    }

    console.debug(`Record updated for id |${id}| with data |${JSON.stringify(applicationValueField)}|`);
    return currentApplicationData; // it was current data when read but now histocial after the update
  }


  /**
   * Reads a record by its ID.
   *
   * @param {string} id - The unique identifier of the record to be read.
   * @return {Promise<unknown>} - A promise that resolves with the record's data if it exists.
   *
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_NOT_FOUND` if the record does not exist.
   */
  async read(id: string): Promise<unknown> {
    if (typeof id !== "string" || !id?.trim()) {
      throw new ErrorEx(ErrorCodes.INVALID_PARAMETERS, `Invalid ID |${id}| or its type |${typeof id}|. It must be an non empty string`);
    }

    let currentApplicationData;
    try {
      const docRef = this.#collRef.doc(id);
      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        throw new ErrorEx(
          ErrorCodes.RECORD_NOT_FOUND, `Failed to read record with Id |${id}|. No record exists`);
      }

      // Get a copy of the current data
      const currentStoreValueField = snapshot.data();

      // Validate and transform the store data to application data by claling the member function
      // The method will validate the data and thow appropriate error before appneding the id to the curenntly retreived data
      currentApplicationData = this.fromStoreValueField(id, currentStoreValueField);
    } catch (error) {
      console.error(`Failed to read record for ID |${id}|. Error: |${(error as Error).message}`);
      throw new ErrorEx(
        (error as ErrorEx).code || ErrorCodes.RECORD_READ_FAILED,
        `Failed to read record for ID |${id}|. Error: |${(error as Error).message}|`
      );
    }

    // console.debug(`Record for id |${id}| read succesfully with data |${JSON.stringify(currentApplicationData)}|`);
    return currentApplicationData;
  }


  /**
   * Queries the database with sorting, filtering, and pagination, and returns the matching records along with the count of records before the range.
   *
   * @param {string} filter - The filter conditions as a JSON string.
   * Operators are added to the end of the key with a underscore, value pair
   *     These operators can be used in filter queries to specify the criteria for selecting records.
   *     @property {string} _eq - Checks for equality on simple values.
   *       - Example: `GET /books?filter={"price_eq":20}` // Returns books where the price is equal to 20.
   *     @property {string} _neq - Checks for inequality on simple values.
   *       - Example: `GET /books?filter={"price_neq":20}` // Returns books where the price is not equal to 20.
   *     @property {string} _eq_any - Checks for equality on any of the provided values.
   *       - Example: `GET /books?filter={"price_eq_any":[20, 30]}` // Returns books where the price is equal to 20 or 30.
   *     @property {string} _neq_any - Checks for inequality on any of the provided values.
   *       - Example: `GET /books?filter={"price_neq_any":[20, 30]}` // Returns books where the price is not equal to 20 nor 30.
   *     @property {string} _inc_any - Checks for items that include any of the provided values.
   *       - Example: `GET /books?filter={"authors_inc_any":["William Gibson", "Pat Cadigan"]}`
   *                  // Returns books where authors include either 'William Gibson' or 'Pat Cadigan' or both.
   *     @property {string} _q - Checks for items that contain the provided text.
   *       - Example: `GET /books?filter={"author_q":["Gibson"]}` // Returns books where the author includes 'Gibson'.
   *     @property {string} _lt - Checks for items that have a value lower than the provided value.
   *       - Example: `GET /books?filter={"price_lt":100}` // Returns books that have a price lower than 100.
   *     @property {string} _lte - Checks for items that have a value lower than or equal to the provided value.
   *       - Example: `GET /books?filter={"price_lte":100}` // Returns books that have a price lower than or equal to 100.
   *     @property {string} _gt - Checks for items that have a value greater than the provided value.
   *       - Example: `GET /books?filter={"price_gt":100}` // Returns books that have a price greater than 100.
   *     @property {string} _gte - Checks for items that have a value greater than or equal to the provided value.
   *       - Example: `GET /books?filter={"price_gte":100}` // Returns books that have a price greater than or equal to 100.
   * @param {string} sort - The sort order, which can be "ASC" (ascending) or "DESC" (descending).
   * @param {string} range - The range for pagination, formatted as a JSON string `[start: number, end: number]`.
   * @param {string} pageInfo - The pagination state of last query to scroll backward or firwards, default to {}
   *                                  Formatted as a JSON string `{
   *                                    firstVisible: {position: number, id: string}, -- the position and id of the first elemnt of previous query
   *                                    lastVisible: {position: number, id: string}, -- the position and id of the last elemnt of previous query
   *                                  }
   * @return {Promise<{totalCount: number, rangeStart: number, rangeEnd: number, data: unknown[]}>} - A promise that resolves to an object containing:
   *   - `totalCount` (number): The total number of records before the specified range.
   *   - `rangeStart` (number): The range start of the returned data.
   *   - `rangeEnd` (number): The range end of the returned data.
   *   - `data` (unknown[]): An array of records where each record includes an `id` and its associated properties.
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.INVALID_PARAMETERS` if the range or filter parameters are invalid.
   */
  async query(filter: string, sort: string, range: string, pageInfo: string): Promise<{totalCount: number, rangeStart: number, rangeEnd: number, data: unknown[]}> {
    console.debug(`In Query with filter: |${filter}|, sort |${sort}| , range: |${range}| & pageInfo |${pageInfo}|`);

    let query: Query<DocumentData> = this.#collRef;

    // Parse and validate sort parameter
    // add at least one sort so that the firestore returns data in some order and alloew pagnation to work as expeted
    // createdAt filed should be present in all records, so lets use it
    let sortField = "";
    let sortOrder = "";
    if (sort) {
      [sortField, sortOrder] = JSON.parse(sort);
      if (!sortField || !["asc", "desc"].includes(sortOrder.toLowerCase())) {
        throw new ErrorEx(
          ErrorCodes.INVALID_PARAMETERS,
          `Invalid sort parameter |${sort}|. Must be in the format "|{field: field, order: order}|" where the field is non-empty and order is either 'ASC' or 'DESC'.`
        );
      }
    }

    console.debug(`Sort parsed as - field: |${sortField}| & order: |${sortOrder}|`);

    // Parse and validate range parameter
    let rangeStart = undefined;
    let rangeEnd = undefined;

    if (range) {
      [rangeStart, rangeEnd] = JSON.parse(range).map(Number);
      if (isNaN(rangeStart) || isNaN(rangeEnd) || rangeStart < 0 || rangeEnd < 0 || rangeStart > rangeEnd) {
        throw new ErrorEx(
          ErrorCodes.INVALID_PARAMETERS,
          `Invalid range parameter |${range}|. Must be in the format |rangeStart, rangeEnd| where both are non-negative numbers and rangeStart is not greater than rangeEnd.`
        );
      }
    }

    console.debug(`Range parsed as - start: |${rangeStart}|, end |${rangeEnd}|`);

    let totalCount = 0;
    // let finalStoreFieldValue;
    const applicationDataArray: {[key: string]: unknown}[] = [];
    try {
      // Step 1: Apply filter
      if (filter) {
        // Step-1a Define the filter map
        // Define a Map to store operators and their corresponding query functions
        // eslint-disable-next-line func-call-spacing
        const operatorsMap = new Map<string, (query: Query<DocumentData>, key: string, value: unknown) => Query<DocumentData>>([
          ["_eq", (query, key, value) => query.where(key, "==", value)],
          ["_neq", (query, key, value) => query.where(key, "!=", value)],
          ["_eq_any", (query, key, value) => query.where(key, "in", value)],
          ["_neq_any", (query, key, value) => {
            // Firestore does not support 'not in' queries natively
            throw new ErrorEx(
              ErrorCodes.INVALID_PARAMETERS,
              `Firestore does not support key: |${key}| value: |${value}| operator for non-array fields`,
            );
          }],
          ["_inc_any", (query, key, value) => {
            // Firestore does not support 'array-contains-any' for non-array fields
            throw new ErrorEx(
              ErrorCodes.INVALID_PARAMETERS,
              `Firestore does not support key: |${key}| value: |${value}| operator for non-array fields`,
            );
          }],
          ["_q", (query, key, value) => query.where(key, "array-contains", value)],
          ["_lt", (query, key, value) => query.where(key, "<", value)],
          ["_lte", (query, key, value) => query.where(key, "<=", value)],
          ["_gt", (query, key, value) => query.where(key, ">", value)],
          ["_gte", (query, key, value) => query.where(key, ">=", value)],
        ]);

        // Step-1b Apply the filter
        const filters = JSON.parse(filter);
        Object.keys(filters).forEach((key) => {
          let thisKey = key;
          const thisValue = filters[key];
          let [thisOperator, thisFunction] = Array.from(operatorsMap.entries())[0];

          console.debug(`Applying Filter with key: |${thisKey}|, operator: |${thisOperator}|, function |${thisFunction}| & value: |${thisValue}|`);

          // Iterate over the operators array to find if the filterString ends with any operator
          if (thisValue !== undefined && thisValue !== null) {
          // Check if the key ends with any supported operator
            for (const [operator, applyFunction] of operatorsMap.entries()) {
              if (key.endsWith(operator)) {
                thisOperator = operator; // Return the operator found
                thisFunction = applyFunction; // Return the fucntion found
                thisKey = key.slice(0, -operator.length);
                break; // No need to check further operators for this key              }
              }
            }
            // Apply filter based on the operator
            try {
              query = thisFunction(query, thisKey, thisValue);
            } catch (error) {
              console.error(`Error applying operator |${thisOperator}|: |${(error as Error).message}|`);
            }
          }
        });
      }

      // Not needed for firestore
      // // Step-2: Apply sort
      // // if a filter defined, it would have either aplied the sort on the filter field
      // if (!filter) {
      //   // As Realtime database does not support descending sort order
      //   // If the descending order is specified, we will apply it later in JavaScript on the query result
      //   if (sortField && sortField != "id") {
      //     // Apply the sort field
      //     console.debug(`Applying sort for field |${sortField}|`);
      //     query = query.orderByChild(sortField);
      //   } else {
      //     // No sort order specified. Let's sort by key so we get results in some order for the pagination to work
      //     console.debug("Applying sort for field |id|");
      //     query = query.orderByKey();
      //   }
      // }

      // Step 3: Execute the query and get the count before the range filter
      // Get the total number of records matching the query
      const countSnapshot = await query.count().get();
      totalCount = countSnapshot.data().count;

      console.debug(`Total count |${totalCount}|`);

      // lets set our finalStoreField Value to full date before range
      // finalStoreFieldValue = /* fullData || */ {};

      // Apply the range filter if we have some query results to filter on and have a defined range filter
      if (totalCount > 0) {
        // Step-4 Apply pagination
        // Step-4a: Define pagination sort order
        // adjust rangeEnd, If no range specified or range greater than totalCounts-1, set it to totalCounts-1
        rangeEnd = (rangeEnd === undefined || rangeEnd > totalCount-1) ? totalCount - 1 : rangeEnd < rangeStart ? rangeStart : rangeEnd < 0 ? 0 : rangeEnd;
        // adjust rangeStart, If no range specified or range les than 0, set ot to 0, if greater than totalCounts-1, set it to totalCounts-1
        rangeStart = (rangeStart === undefined || rangeStart <= 0 ? 0 : (rangeStart > rangeEnd ? rangeEnd : (rangeStart > totalCount-1 ? totalCount - 1 : rangeStart)));

        console.debug(`Range used to query - start: |${rangeStart}|, end |${rangeEnd}|`);
        console.debug(`total count: |${totalCount}|`);

        // lets set out starting position to start or end based on which is the nearest
        let snapshotStartAfterForward = null; // null means we are starting from either end
        let snapshotStartAfterReverse = null; // null means we are starting from either end
        let offsetForward = rangeStart;
        let offsetReverse = (totalCount-1)-rangeEnd;
        console.log(`Initial offsetForward: |${offsetForward}| && offsetReverse |${offsetReverse}|`);

        // If not full range defined
        if (rangeStart > 0 || rangeEnd < totalCount - 1) {
          const {firstVisible, lastVisible} = JSON.parse(pageInfo || "{}");

          // if lastVissible is defined
          if ((offsetForward > 0 || offsetReverse > 0) && lastVisible?.id && lastVisible?.position != null) {
            console.log(`Inside lastvisble offsetForward|${offsetForward}|, offsetReverse |${offsetReverse}| ` +
              `lastVisible?.id: |${lastVisible?.id}| & lastVisible?.position: |${lastVisible?.position}|`);

            // calculate the forward offset, including cases we are jumping pages
            const offsetFromLastVisibleForward = (offsetForward > 0 && rangeStart >= (lastVisible?.position+1)) ?
              rangeStart - (lastVisible?.position+1) : Number.MAX_SAFE_INTEGER;

            // calculate the backward offset, including cases we are jumping pages
            const offsetFromLastVisibleReverse = (offsetReverse > 0 && lastVisible?.position >= rangeEnd) ?
              lastVisible?.position - rangeEnd : Number.MAX_SAFE_INTEGER;

            console.log(`offsetForward: |${offsetForward}|, offsetFromLastVisibleForward: |${offsetFromLastVisibleForward}|, ` +
              `offsetReverse: |${offsetReverse}| & offsetFromLastVisibleReverse: |${offsetFromLastVisibleReverse}|`);

            // if any of the offsets are smaller than the current offsets
            if ((offsetFromLastVisibleForward < offsetForward) || (offsetFromLastVisibleReverse < offsetReverse)) {
              // get the snapshot for lastVisible Id
              console.debug(`About to query last visible ID |${lastVisible?.id}|`);
              const snapshotLastVisible = lastVisible?.id ? await query
                .orderBy("__name__").startAt(lastVisible?.id).limit(1).get() : null;

              // if the snapshot still exist in our query
              if (snapshotLastVisible && !snapshotLastVisible.empty) {
                if (offsetFromLastVisibleForward < offsetForward) {
                  offsetForward = offsetFromLastVisibleForward;
                  snapshotStartAfterForward = snapshotLastVisible.docs[0];
                  console.log(`After OffsetFromLastVisible offsetForward |${offsetForward}| & snapshotStartAfterForward.id |${snapshotStartAfterForward.id}|`);
                }

                if (offsetFromLastVisibleReverse < offsetReverse) {
                  offsetReverse = offsetFromLastVisibleReverse;
                  snapshotStartAfterReverse = snapshotLastVisible.docs[0];
                  console.log(`After OffsetFromLastVisible offsetReverse |${offsetReverse}| & snapshotStartAfterReverse.id |${snapshotStartAfterReverse.id}|`);
                }
              } else {
                // Handle case where no document was found
                console.warn(`No documents found in last visible ID |${lastVisible?.id}|`);
              }
            }
          }

          // if firstVisible is defined
          if ((offsetForward > 0 || offsetReverse > 0) && firstVisible?.id && firstVisible?.position != null) {
            console.log(`Inside firstVisible offsetForward|${offsetForward}|, offsetReverse |${offsetReverse}| ` +
              `firstVisible?.id: |${firstVisible?.id}| & firstVisible?.position: |${firstVisible?.position}|`);

            // calculate the forward offset, including cases we are jumping pages
            const offsetFromFirstVisibleForward = (offsetForward > 0 && rangeStart >= (firstVisible?.position)) ?
              rangeStart - (firstVisible?.position) : Number.MAX_SAFE_INTEGER;

            // calculate the backward offset, including cases we are jumping pages
            const offsetFromFirstVisibleReverse = (offsetReverse > 0 && firstVisible?.position >= rangeEnd+1) ?
              firstVisible?.position - (rangeEnd+1) : Number.MAX_SAFE_INTEGER;

            console.log(`offsetForward: |${offsetForward}|, offsetFromFirstVisibleForward: |${offsetFromFirstVisibleForward}|, ` +
              `offsetReverse: |${offsetReverse}| & offsetFromFirstVisibleReverse: |${offsetFromFirstVisibleReverse}|`);

            // if any of the offsets are smaller than the current offsets
            if ((offsetFromFirstVisibleForward < offsetForward) || (offsetFromFirstVisibleReverse < offsetReverse)) {
              // get the snapshot for startAfterId
              console.debug(`About to query first visible ID |${lastVisible?.id}|`);
              const snapshotFirstVisible = firstVisible?.id ? await query
                .orderBy("__name__").startAt(firstVisible?.id).limit(1).get() : null;

              // if the snapshot still exist in our query
              if (snapshotFirstVisible && !snapshotFirstVisible.empty) {
                if (offsetFromFirstVisibleForward < offsetForward) {
                  offsetForward = offsetFromFirstVisibleForward;
                  snapshotStartAfterForward = snapshotFirstVisible.docs[0];
                  console.log(`After OffsetFromLastVisible offsetForward |${offsetForward}| & snapshotStartAfterForward.id |${snapshotStartAfterForward.id}|`);
                }

                if (offsetFromFirstVisibleReverse < offsetReverse) {
                  offsetReverse = offsetFromFirstVisibleReverse;
                  snapshotStartAfterReverse = snapshotFirstVisible.docs[0];
                  console.log(`After OffsetFromLastVisible offsetReverse |${offsetReverse}| & snapshotStartAfterReverse.id |${snapshotStartAfterReverse.id}|`);
                }
              } else {
                // Handle case where no document was found
                console.warn(`No documents found in first visible ID |${firstVisible?.id}|`);
              }
            }
          }
        }

        // adjust to the correct sort field
        sortField = sortField && sortField.toLowerCase() !== "id" ? sortField : "__name__"; /* sort by key */

        // if we donot have a sortfield, we will sort on key, that means only ASC is allowed and that's why rever will be discarded
        const direction = (sortField === "__name__") ?
          (sortOrder.toLowerCase() !== "desc" ? "forward" : "reversed") : (offsetForward <= offsetReverse ? "forward" : "reverse");
        const paginationSortOrder: OrderByDirection = (direction === "forward") ?
          (sortOrder.toLowerCase() !== "desc" ? "asc" : "desc") : (sortOrder.toLowerCase() !== "desc" ? "desc" : "asc");
        const offset = direction === "forward" ? offsetForward : offsetReverse;
        const snapshotStartAfter = direction === "forward" ? snapshotStartAfterForward : snapshotStartAfterReverse;

        console.debug(`+++++++ All references calculated - sortField |${sortField}|, paginationSortOrder: |${paginationSortOrder}|, ` +
          `actualSortOrder: |${sortOrder}|,  direction: |${direction}|, snapshotStartAfter: |${snapshotStartAfter?.id}| & offset |${offset}| ++++++++`);

        // Step 4b: Apply pagination
        // now apply Pagination
        query = query.orderBy(sortField, paginationSortOrder);
        query = snapshotStartAfter ? query.startAfter(snapshotStartAfter) : query;
        query = query.offset(offset).limit(rangeEnd+1-rangeStart);

        // now execute the query
        const querySnapshot = await query.get();

        console.log(`Total |${querySnapshot.size}| records received for Query with filter: |${filter}|, sort: |${sort}| , range: |${range}| & pageInfo |${pageInfo}|.`);

        // Step-5 Convert to applications data array
        // Iterate over the entries in the object
        querySnapshot.forEach((doc) => {
          const id = doc.id; // Get document ID (key)
          const valueField = doc.data(); // Retrieve document data
          // console.debug(`Calling ***** fromStoreValueField id: |${id}| & valueField: |${JSON.stringify(valueField)}|`);
          const applicationData = this.fromStoreValueField(id, valueField) as {[key: string]: unknown};

          // add the  items in the order to match the acutal sort order requested v/s soert order used to paginate
          (direction === "forward") ?
            applicationDataArray.push(applicationData) : // sorted in the correct soreOrder, preserve the order of the items
            applicationDataArray.unshift(applicationData); // sorted in the wrong sortOrder, reverse the order of the items
        });
      }
    } catch (error) {
      console.error(`Failed to query data with filter: |${filter}|, sort: |${sort}| , range: |${range}| & pageInfo |${pageInfo}|. Last Error: |${(error as Error).message}`);
      throw new ErrorEx(
        (error as ErrorEx).code || ErrorCodes.RECORD_QUERY_FAILED,
        `Failed to query data with filter: |${filter}|, sort: |${sort}| , range: |${range}| & pageInfo |${pageInfo}|. Last Error: |${(error as Error).message}|`
      );
    }

    // This step is not needed for Firestore
    // // Step-6
    // // Apply descending sort order, if defined
    // if (sortOrder && sortOrder.toLowerCase() === "desc") {
    //   applicationDataArray = applicationDataArray.sort((a, b) => {
    //     const aValue = a[sortField];
    //     const bValue = b[sortField];

    //     // Handle cases where aValue or bValue might be null or undefined
    //     if (aValue == null) return bValue == null ? 0 : -1;
    //     if (bValue == null) return 1;

    //     if (typeof aValue === "string" && typeof bValue === "string") {
    //       return aValue.localeCompare(bValue);
    //     }

    //     if (typeof aValue === "number" && typeof bValue === "number") {
    //       return aValue - bValue;
    //     }

    //     if (aValue === bValue) return 0;

    //     return aValue > bValue ? 1 : -1;
    //   });
    // }

    // eslint-disable-next-line max-len
    // console.debug(`Query with filter: |${filter}|, sort |${sort}| , range: |${range}| & pageInfo |${pageInfo}| executed successfully ` +with data |${JSON.stringify(applicationDataArray)}|`);
    console.log(`Returning total of |${applicationDataArray.length}| records for Query with filter: |${filter}|, sort: |${sort}| , range: |${range}| & pageInfo |${pageInfo}|.`);
    return {totalCount: totalCount, rangeStart: rangeStart, rangeEnd: rangeStart + totalCount-1, data: applicationDataArray};
  }


  /**
   * Deleted a record with the specified ID and returns the previous state of the record before the delete.
   *
   * @param {string} id - The unique identifier of the record to be deleted.
   * @return {Promise<unknown>} - A promise that resolves with the previous data of the record.
   *
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_NOT_FOUND` if the record does not exist.
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_UPDATE_FAILED` if the delete operation fails.
   */
  async delete(id: string): Promise<unknown> {
    if (typeof id !== "string" || !id?.trim()) {
      throw new ErrorEx(ErrorCodes.INVALID_PARAMETERS, `Invalid ID |${id}| or its type |${typeof id}|. It must be an non empty string`);
    }

    let currentApplicationData;
    try {
      const docRef = this.#collRef.doc(id);
      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        throw new ErrorEx(
          ErrorCodes.RECORD_NOT_FOUND,
          `Failed to delete record with id |${id}|. A record with the id does not exist`
        );
      }

      // Get a copy of the current data
      const currentStoreValueField = snapshot.data();

      // Validate and transform the store data to application data by claling the member function
      // The method will validate the data and thow appropriate error before appneding the id to the curenntly retreived data
      currentApplicationData = this.fromStoreValueField(id, currentStoreValueField);

      // Dleted the document with id
      await docRef.delete();
    } catch (error) {
      console.error(`Failed to delete record with ID |${id}|. Error: |${(error as Error).message}|`);
      throw new ErrorEx(
        (error as ErrorEx).code || ErrorCodes.RECORD_DELETE_FAILED,
        `Failed to delete record with ID |${id}|. Error: |${(error as Error).message}|`
      );
    }

    console.debug(`Record with id |${id}| deleted successfully`);
    return currentApplicationData; // it was current data when read but now histocial after the delete
  }
}

