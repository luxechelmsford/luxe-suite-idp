import * as admin from "firebase-admin";
import {Query} from "firebase-admin/database";
import {database} from "../../configs/firebase";
import {ErrorCodes, ErrorEx} from "../../types/errorEx";
import {IDataStore} from "../interfaces/dataStore";
import {RealtimeDbDataStoreOptions} from "./realtimeDbDataStoreOptions";
import {RealtimeDbValueFieldType} from "../types/realtimeDbValeFieldType";
import {CreateIdOption} from "../types/createIdOption";
import {OrderByDirection} from "firebase-admin/firestore";


/**
 * RealtimeDbDataStore Class serves as an abstract base for interacting with the Firebase Realtime Database,
 * implementing the IDataStore interface. This class encapsulates fundamental data operations such as
 * creation, retrieval, update, deletion, and querying of records within the Firebase Realtime Database.
 *
 * The design intent is to provide a flexible and extensible foundation for managing data by handling the
 * direct interactions with Firebase Realtime Database. It abstracts the complexities of Firebase operations,
 * allowing derived classes to focus on specific data transformation and mapping needs. Derived classes are
 * responsible for defining how data is converted between the application's internal format and the storage
 * format used by Firebase.
 *
 * By encapsulating Firebase-specific data operations, this class ensures that the underlying database
 * interactions are handled consistently, making it easier to maintain and extend the data management
 * functionalities across various implementations.
 */
export abstract class RealtimeDbDataStore implements IDataStore {
  #collRef: admin.database.Reference;
  #options: RealtimeDbDataStoreOptions;

  /**
   * Creates an instance of RealtimeDatabaseEx.
   * @param {string} path - The path in the Firebase Realtime Database where records will be managed.
   * @param {FirebaseDataStoreOptions} [options=new RealtimeDbDataStoreOptions()] - The options for configuring
   *                         the data store. This includes settings related to the realtime database
   *                         instance and other operational parameters. If not provided,
   *                         default options will be used.
   */
  constructor(path: string, options = new RealtimeDbDataStoreOptions()) {
    this.#options = options;
    console.debug(`this.#collRef path set to |${path}|`);
    this.#collRef = database.ref(path);
  }

  /**
   * Converts a single record from an internal format to a store format.
   *
   * @param {unknown} applicationData - The application data record to be converted from application format to store format.
   * @return {unknown} - The converted single record data in store format.
   */
  abstract toStoreTransform(applicationData: unknown): unknown;


  /**
   * Converts a single record from the store format to an internal format.
   *
   * @param {unknown} storeData - The store data to be converted from store format to application format.
   * @return {unknown} - The converted single record data in internal format.
   */
  abstract fromStoreTransform(storeData: unknown): unknown;

  /**
   * Validates the type of the provided `valueField` against the expected type specified by `this.#options.realtimeDbValueFiledType`.
   *
   * **Validation Rules:**
   * - **Array**: `valueField` must be an object and not an array.
   * - **Object**: `valueField` must be an object and not an array.
   * - **String**: `valueField` must be of type string.
   * - **Number**: `valueField` must be of type number.
   * - **Boolean**: `valueField` must be of type boolean.
   * - **Date**: `valueField` must be of type date.
   *
   * **Errors:**
   * - Throws an `ErrorEx` if `valueField` does not match the expected type, with an appropriate error message.
   * - Throws an `ErrorEx` if `this.#options.realtimeDbValueFiledType` is unknown.
   *
   * @param {unknown} valueField - The data to be validated.
   *
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.INVALID_DATA` if `valueField` does not match the expected type.
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.INVALID_DATA` if the type specified in `this.#options.realtimeDbValueFiledType` is unknown.
   */
  private validateValueFieldType(valueField: unknown): void {
    // Handle null or undefined data
    if (valueField == null && !this.#options.allowNullOrUndefined) {
      throw new ErrorEx(
        ErrorCodes.INVALID_DATA,
        `Data cannot be null or undefined when allowNullOrUndefined option is not set. Provided data: |${JSON.stringify(valueField)}|.`
      );
    }

    // Ensure that data is an non array object
    // call this fucntion in a loop to handel ,multiple records
    if (Array.isArray(valueField)) {
      throw new ErrorEx(
        ErrorCodes.INVALID_DATA,
        `Data must be a non array field. Provider Data |${JSON.stringify(valueField)}|.`
      );
    }

    // Enusre value field does not have id property
    if ("id" in ((valueField && typeof valueField === "object") ? valueField : {})) {
      throw new ErrorEx(ErrorCodes.INVALID_DATA, `Invalid data. The application value field |${valueField}| contains an id property , which is not excpeted.`);
    }

    switch (this.#options.realtimeDbValueFiledType) {
    case RealtimeDbValueFieldType.Array: // flow through
    case RealtimeDbValueFieldType.Object:
      if (typeof valueField !== "object") {
        throw new ErrorEx(
          ErrorCodes.INVALID_DATA,
          `Data |${JSON.stringify(valueField)}| must be of type [object], but received |${typeof valueField}|.`
        );
      }
      break;
    case RealtimeDbValueFieldType.String: // flow throw
    case RealtimeDbValueFieldType.Number: // flow throw
    case RealtimeDbValueFieldType.Boolean: // flow through
    case RealtimeDbValueFieldType.Date:
      if (typeof valueField !== this.#options.realtimeDbValueFiledType) {
        throw new ErrorEx(
          ErrorCodes.INVALID_DATA,
          `Data |${JSON.stringify(valueField)}| must be of type |${this.#options.realtimeDbValueFiledType}|, but received |${typeof valueField}|.`
        );
      }
      break;
    default:
      throw new ErrorEx(
        ErrorCodes.INVALID_DATA,
        `Unknown data type |${this.#options.realtimeDbValueFiledType}|.`
      );
    }
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
   *   As the realtime database saves a date as number, array as collection of zero or more objects wrrapped within a object,
   *   data transformation cannot be handled at a generic level, so this funtion will call abstract function toStoreDataTransform
   *   And let the derived class handle it
   *
   * @private
   * @param {unknown} applicationValueField - The value field (the JSON object to be stored at the document ID path).
   * @return {unknown} - The object with validated and any data transformation done by the derived class
   * @throws {Error} - Throws an error if the object contains an `id` property, is `null`/`undefined` without appropriate configuration,
   *                   or is not a non-array object.
   */
  private toStoreValueField(applicationValueField: unknown): unknown {
    let storeValueField: unknown;
    // convert the application value field to an array
    if (this.#options.realtimeDbValueFiledType === RealtimeDbValueFieldType.Array) {
      const storeData: Record<string|number, unknown> = {};

      // Ensure that data is an non array object
      // call this fucntion in a loop to handel ,multiple records
      if (!Array.isArray(applicationValueField)) {
        throw new ErrorEx(
          ErrorCodes.INVALID_DATA,
          `Data must be an array field. Provider Data |${JSON.stringify(applicationValueField)}|.`
        );
      }

      (applicationValueField as unknown[]).forEach((item) => {
        //
        // Enusre value field does have an id property with valid values
        // Type assertion to tell TypeScript that `item` is an object with an `id` property
        const {id, ...valueField} = item as { id: number | string };
        if (typeof id !== "string" || !id?.trim()) {
          throw new ErrorEx(ErrorCodes.INVALID_PARAMETERS, `Invalid ID |${id}| or its type |${typeof id}|. It must be an non empty string`);
        }

        // validate the object as array
        // if any issues, the fucntion will throw errors
        this.validateValueFieldType(valueField);
        // and call the derived class to handle any data transformation
        storeValueField = this.toStoreTransform(valueField);

        // now build store data (combining id and valuefField)
        // Add the `id` as a key in the result object with the rest of the properties as its value
        storeData[id] = valueField;
      });
      storeValueField = storeData;
    } else {
      // validate the value field
      // if any issues, the fucntion will throw errors
      this.validateValueFieldType(applicationValueField);
      // and call the derived class to handle any data transformation
      storeValueField = this.toStoreTransform(applicationValueField);
    }

    return storeValueField;
  }


  /**
   * Validates and transforms the value field (the JSON object retreived from the realtime database at the document ID path) according to specific rules.
   *
   * **Data Validation for Value Field:**
   *   1. ensure that id is not null, undefiend or empty and of tyope string or number., throw error otjerwise
   *   2. Ensures that the value is not `null` or `undefined` unless `options.allowNullOrUndefined` is set.
   *   3. Ensures that the value field is a non-array object, throwing an error if not.
   *         This is because When querying a single document in realtime database, the data should be an object, null, or undefined.
   *          For query realtime database and expecting multiple documents,
   *          the expected results would be null, undefined or an object wraping zero or more objects, call this method for each element
   *   4. Ensures that the object does not contain a property named `id`, throwing an error if found.
   *
   * **Data Transformation:**
   *   As the realtime database saves a date as number, array as collection of zero or more objects wrrapped within a object,
   *   data transformation cannot be handled at a generic level, so this funtion will call abstract function toStoreDataTransform
   *   And let the derived class handle it
   *
   * @param {string} id - The identifier to be used as a key in the resulting object or as a value if `data` is primitive.
   * @param {unknown} storeValueField - The value field (the JSON object retreved at the document ID path).
   *
   * @return {unknown} The processed data formatted as an object where:
   * - If `data` is an object, it is updated to include the `id`.
   * - If `data` is null or undefined, it is replaced with `{ id }` if `allowNullorUndefined` is true.
   * - Throws an error if `data` is not an object or if `data` is an unexpected type and `allowNullorUndefined` is false.
   *
   * @throws {Error} - Throws an error if the object contains an `id` property, is `null`/`undefined` without appropriate configuration,
   *                   or is not a non-array object.
   */
  private fromStoreValueField(id: string, storeValueField: unknown): unknown {
    console.debug(`in fromStoreValueField with data |${JSON.stringify(storeValueField)}|`);

    let applicationData: unknown;
    if (this.#options.realtimeDbValueFiledType === RealtimeDbValueFieldType.Array) {
      // Ensure that data is an non array object
      if (typeof storeValueField != "object" || Array.isArray(storeValueField)) {
        throw new ErrorEx(
          ErrorCodes.INVALID_DATA,
          `Data must be a non-array object field. Provider Data |${JSON.stringify(storeValueField)}|.`
        );
      }

      // Iterate over all objects one by one
      const applicationDataAtrray: unknown[] = [];
      Object.entries((storeValueField || {})).forEach(([itemId, itemValueField]) => {
        // Enusre value field does have an id property with valid values
        if ((itemId == null || (typeof itemId !== "string" && typeof itemId !== "number") ||
            (typeof itemId === "string" && !(itemId as string).trim().length) || (typeof id === "number" && id === 0))) {
          throw new ErrorEx(
            ErrorCodes.INVALID_PARAMETERS,
            `Invalid ID |${itemId}| or its type |${typeof itemId}| in item |${itemValueField}|. It cannot be NULL or empty or of a type other thann strung/number`
          );
        }

        // validate the object as array
        // if any issues, the fucntion will throw errors
        this.validateValueFieldType(itemValueField);
        // and call the derived class to handle any data transformation
        const applicationValueField: object = this.fromStoreTransform(itemValueField) || {};

        // now build application data (combining itemId and itemValuefField)
        // Add the `itemId` as a key in the result object with the rest of the properties as its value
        const applicationData = Object.keys(applicationValueField).length === 0 ? {itemId} : {itemId, ...applicationValueField};
        applicationDataAtrray.push(applicationData);
      });
      applicationData = applicationDataAtrray as unknown;
    } else {
      // Enusre value field does have an id property with valid values
      // Type assertion to tell TypeScript that `item` is an object with an `id` property
      if (typeof id !== "string" || !id?.trim()) {
        throw new ErrorEx(ErrorCodes.INVALID_PARAMETERS, `Invalid ID |${id}| or its type |${typeof id}|. It must be an non empty string`);
      }

      // validate the value field
      // if any issues, the fucntion will throw errors
      this.validateValueFieldType(storeValueField);
      // and call the derived class to handle any data transformation
      const applicationValueField = this.fromStoreTransform(storeValueField);

      // now build application data (combining itemId and itemValuefField)
      // Add the `itemId` as a key in the result object with the rest of the properties as its value
      if (applicationValueField != null && typeof applicationValueField === "object") {
        applicationData = Object.keys(applicationValueField).length === 0 ? {id} : {id, ...applicationValueField};
      } else {
        applicationData = {[id]: applicationValueField};
      }
    }
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
  async create(applicationValueField: unknown): Promise<unknown> {
    // Check if the ID creation option is valid
    if (this.#options.createIdOption !== CreateIdOption.AutoGeneratedId) {
      throw new ErrorEx(
        ErrorCodes.INVALID_METHOD,
        `Failed to create record. Invalid createIdOption |${this.#options.createIdOption}| for data |${JSON.stringify(applicationValueField)}|. Use createWithId() for this option.`
      );
    }

    // transform to store format
    const storeValueField = this.toStoreValueField(applicationValueField);

    let uniqueId = "";
    const newRef = this.#collRef.push(); // Generates a new unique ID
    try {
      await newRef.set(storeValueField); // Sets the data at the generated ID
      uniqueId = newRef.key || "";

      if (!uniqueId) {
        throw new ErrorEx(ErrorCodes.RECORD_CREATE_FAILED, `Failed to get an id for data |${JSON.stringify(applicationValueField)}|`);
      }
    } catch (error) {
      throw new ErrorEx(
        ErrorCodes.RECORD_CREATE_FAILED,
        `Failed to create record with data |${JSON.stringify(applicationValueField)}|. Error: |${(error as Error).message}|`,
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
   * @return {Promise<unknown>} - A promise that resolves with the createdAt record along with the id used to ceate the record
   *
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_CREATE_FAILED` if record creation fails after all retries.
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.INVALID_METHOD` if `createIdOption` is `AutoGeneratedId`.
   */
  async createWithId(id: string, applicationValueField: unknown): Promise<unknown> {
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
    for (let sequenceNo = 1; sequenceNo <= maxSequenceNo; sequenceNo++) {
      uniqueId = `${id}${sequenceNo > 1 ? `-${sequenceNo}` : ""}`;
      const ref = this.#collRef.child(uniqueId);
      try {
        const transactionResult = await ref.transaction((currentFieldValue) => {
          console.debug(`Attempting retry |${sequenceNo}| to create a record for data |${JSON.stringify(applicationValueField)}|.`);

          if (currentFieldValue === null) {
            return storeValueField; // Allow the transaction to complete
          } else {
            return; // Abort the transaction by returning undefined or false
          }
        });
        // check if we aborted thetranscation, and no retry left
        if (transactionResult.committed) {
          // lets break the loop
          break;
        } else if (sequenceNo >= maxSequenceNo) {
          const erroMsg = this.#options.createIdOption === CreateIdOption.ManualRejectIdConflicts ?
            `A record with id |${id}| already exists` :
            `Failed to retrieve the new record ID. 100 records already exists with starting with the Id |${id}|`;
          throw new ErrorEx(
            ErrorCodes.RECORD_CREATE_FAILED,
            `Failed to create record with data |${JSON.stringify(applicationValueField)}|. Error: |${erroMsg}|`
          );
        }
      } catch (error) {
        uniqueId = "";
        throw new ErrorEx(
          ErrorCodes.RECORD_CREATE_FAILED, `Failed to create record with data |${JSON.stringify(applicationValueField)}|. Error: |${(error as Error).message}|`);
      }
    }

    // Validate and transform the store data to application data by claling the member function
    // The method will validate the data and thow appropriate error before appneding the id to the curenntly retreived data
    const applicationData = this.fromStoreValueField(uniqueId, storeValueField);

    console.debug(`Record createdAt with id |${id}| for data |${JSON.stringify(applicationData)}|`);
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
      const ref = this.#collRef.child(id);
      const snapshot = await ref.once("value");

      if (!snapshot.exists()) {
        throw new ErrorEx(
          ErrorCodes.RECORD_NOT_FOUND,
          `Failed to update record with data |${JSON.stringify(storeValueField)}|. A record with id |${id}| does not exist`
        );
      }

      // Keep a copy of the current data
      const currentStoreValueField = snapshot.val();

      // Validate and transform the store data to application data by claling the member function
      // The method will validate the data and thow appropriate error before appneding the id to the curenntly retreived data
      currentApplicationData = this.fromStoreValueField(id, currentStoreValueField);

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

      // Perform the update
      await ref.update(storeValueField as object|string|number|boolean);
    } catch (error) {
      throw new ErrorEx(
        ErrorCodes.RECORD_UPDATE_FAILED,
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
   * @return {Promise<unknown>} - A promise that resolves with the previous data of the record.
   *
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_NOT_FOUND` if the record does not exist.
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_UPDATE_FAILED` if the update operation fails.
   */
  async transactionalUpdate(id: string, applicationValueField: unknown): Promise<unknown> {
    // check that a valid id is passed
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
      const ref = this.#collRef.child(id);
      const transactionResult = await ref.transaction((currentFieldValue: unknown) => {
        // Keep a copy of the current data
        const currentStoreValueField =currentFieldValue;

        // Validate and transform the store data to application data by claling the member function
        // The method will validate the data and thow appropriate error before appneding the id to the curenntly retreived data
        currentApplicationData = this.fromStoreValueField(id, currentStoreValueField);

        // Ensure currentData is properly handled
        if (currentStoreValueField == null) {
          if (!this.#options.createIfNotExists) {
            new ErrorEx(ErrorCodes.RECORD_NOT_FOUND, `Failed to update record with ID |${id}|. Record not found.`);
          }
          return currentStoreValueField; // Handles null or undefined
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

        // Perform the update
        // if both are objects/null/undefined, accept new properties but retain any non-overlapping existing properties
        if (typeof (currentStoreValueField || {}) !== typeof (storeValueField || {})) {
          throw new ErrorEx(
            ErrorCodes.DATABASE_CONSISTENCY_ERROR,
            `Mismatch found in database value type |${typeof (currentStoreValueField || {})}| and application value type |${typeof (storeValueField || {})}|`
          );
        }
        return (typeof (currentStoreValueField || {}) === "object" && typeof (storeValueField || {}) === "object") ?
          {...(currentStoreValueField || {}), ...(storeValueField || {})} : storeValueField;
      });

      if (!transactionResult.committed) {
        throw new ErrorEx(
          ErrorCodes.RECORD_UPDATE_FAILED,
          `Record with ID |${id}| failed to be updated. Last Error: [Failed to commit transaction]`,
        );
      }
    } catch (error) {
      throw new ErrorEx(
        ErrorCodes.RECORD_UPDATE_FAILED,
        `Failed to update record with ID |${id}|. Error: |${(error as Error).message}|`,
      );
    }

    console.debug(`Record update for id |${id}| with data |${JSON.stringify(applicationValueField)}|`);
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
      const ref = this.#collRef.child(id);
      const snapshot = await ref.once("value");

      if (!snapshot.exists()) {
        throw new ErrorEx(
          ErrorCodes.RECORD_NOT_FOUND, `Failed to read record with Id |${id}|. No record exists`);
      }

      // Get a copy of the current data
      const currentStoreValueField = snapshot.val();

      // Validate and transform the store data to application data by claling the member function
      // The method will validate the data and thow appropriate error before appneding the id to the curenntly retreived data
      currentApplicationData = this.fromStoreValueField(id, currentStoreValueField);
    } catch (error) {
      throw new ErrorEx(
        ErrorCodes.RECORD_READ_FAILED,
        `Failed to read record with ID |${id}|. Error: |${(error as Error).message}|`,
      );
    }

    console.debug(`Record for id |${id}| read succesfully with data |${JSON.stringify(currentApplicationData)}|`);
    return currentApplicationData;
  }

  /**
   * Queries the database with sorting, filtering, and pagination, and returns the matching records along with the count of records before the range.
   *
   * @param {string} filter - The filter conditions as a JSON string.
   * @param {string} sort - The sort order, which can be "ASC" (ascending) or "DESC" (descending).
   * @param {string} range - The range for pagination, formatted as a JSON string `[start: number, end: number]`.
   * @param {string} pageInfo - The pagination state of last query to scroll backward or firwards, default to {}
   *                                  Formatted as a JSON string `{
   *                                    firstVisible: {position: number, id: string}, -- the position and id of the first elemnt of previous query
   *                                    lastVisible: {position: number, id: string}, -- the position and id of the last elemnt of previous query
   *                                  }
   * @return {Promise<{totalCount: number, rangeStart: number, rangeEnd: number, data: unknown[]}>} -
   *                         A promise that resolves to an object containing:
   *   - `totalCount` (number): The total number of records before the specified range.
   *   - `rangeStart` (number): The range start of the returned data.
   *   - `rangeEnd` (number): The range end of the returned data.
   *   - `data` (unknown[]): An array of records where each record includes an `id` and its associated properties.
   *
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.INVALID_PARAMETERS` if the range or filter parameters are invalid.
   */
  async query(filter: string, sort: string, range: string, pageInfo: string): Promise<{ totalCount: number, rangeStart: number, rangeEnd: number, data: unknown[] }> {
    console.debug(`In Query with filter: |${filter}|, sort |${sort}| , range: |${range}| & pageInfo |${pageInfo}|`);
    let query: admin.database.Query = this.#collRef;

    // Parse and validate sort parameter
    let sortField = "";
    let sortOrder = "";
    if (sort) {
      console.debug(`sort: ${sort}`);
      const sortObj = JSON.parse(sort);
      if (sortObj) {
        sortField = sortObj.field;
        sortOrder = sortObj.order;
      }
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
          `Invalid range parameter |${range}|. Must be in the format [rangeStart, rangeEnd] where both are non-negative numbers and rangeStart is not greater than rangeEnd.`
        );
      }
    }

    console.debug(`Range parsed as - start: |${rangeStart}|, end |${rangeEnd}|`);

    // let finalStoreFieldValue;
    let totalCount = 0;
    let applicationDataArray: {[key: string]: unknown}[] = [];
    try {
      // Step 1: Apply filter
      if (filter) {
        // Step-1a Define the filter map
        // Define a Map to store operators and their corresponding query functions
        // eslint-disable-next-line func-call-spacing
        const operatorsMap = new Map<string, (query: Query, key: string, value: unknown) => Query>([
          // Firebase Realtime Database does not support '==', '!=', 'in', or 'array-contains' for queries.
          ["_eq", (query, key, value) => {
            // Check if the value is a valid type for comparison
            if (value != null && !["string", "number", "boolean"].includes(typeof value)) {
              throw new ErrorEx(
                ErrorCodes.INVALID_PARAMETERS,
                `Firebase Realtime Database does not support value type |${typeof value}| for key: |${key}| with value: |${JSON.stringify(value)}|`
              );
            }
            // Apply the filter with the value
            console.log(`Applying query: key: |${key}|, operator, |eq| & value: |${value}|`);
            return query.orderByChild(key).equalTo(value as string | number | boolean | null);
          }],
          ["_neq", (query, key, value) => {
            console.log(`Applying query: key: |${key}|, operator, |neq| & value: |${value}|`);
            throw new ErrorEx(
              ErrorCodes.INVALID_PARAMETERS,
              `Firebase Realtime Database does not support '_neq' operator for key: |${key}| with value: |${value}|`
            );
          }],
          ["_eq_any", (query, key, value) => {
            console.log(`Applying query: key: |${key}|, operator, |_eq_any| & value: |${value}|`);
            throw new ErrorEx(
              ErrorCodes.INVALID_PARAMETERS,
              `Firebase Realtime Database does not support '_eq_any' operator for key: |${key}| with value: |${value}|`
            );
          }],
          ["_neq_any", (query, key, value) => {
            console.log(`Applying query: key: |${key}|, operator, |_neq_any| & value: |${value}|`);
            throw new ErrorEx(
              ErrorCodes.INVALID_PARAMETERS,
              `Firebase Realtime Database does not support '_neq_any' operator for key: |${key}| with value: |${value}|`
            );
          }],
          ["_inc_any", (query, key, value) => {
            console.log(`Applying query: key: |${key}|, operator, |_neq_any| & value: |${value}|`);
            throw new ErrorEx(
              ErrorCodes.INVALID_PARAMETERS,
              `Firebase Realtime Database does not support '_inc_any' operator for key: |${key}| with value: |${value}|`
            );
          }],
          ["_q", (query, key, value) => {
            console.log(`Applying query: key: |${key}|, operator, |_q| & value: |${value}|`);
            throw new ErrorEx(
              ErrorCodes.INVALID_PARAMETERS,
              `Firebase Realtime Database does not support '_q' operator for key: |${key}| with value: |${value}|`
            );
          }],
          ["_lt", (query, key, value) => {
            // Check if the value is a valid type for comparison
            if (value == null || !["string", "number"].includes(typeof value)) {
              throw new ErrorEx(
                ErrorCodes.INVALID_PARAMETERS,
                `Firebase Realtime Database does not support value type |${typeof value}| for key: |${key}| with value: |${value}|`
              );
            }
            // Apply the filter with the value
            console.log(`Applying query: key: |${key}|, operator, |_lt| & value: |${value}|`);
            return query.orderByChild(key).endBefore(value as string | number);
          }],
          ["_lte", (query, key, value) => {
            // Check if the value is a valid type for comparison
            if (value == null || !["string", "number"].includes(typeof value)) {
              throw new ErrorEx(
                ErrorCodes.INVALID_PARAMETERS,
                `Firebase Realtime Database does not support value type |${typeof value}| for key: |${key}| with value: |${value}|`
              );
            }
            // Apply the filter with the value
            console.log(`Applying query: key: |${key}|, operator, |_lte| & value: |${value}|`);
            return query.orderByChild(key).endAt(value as string|number);
          }],
          ["_gt", (query, key, value) => {
            // Check if the value is a valid type for comparison
            if (value == null || !["string", "number"].includes(typeof value)) {
              throw new ErrorEx(
                ErrorCodes.INVALID_PARAMETERS,
                `Firebase Realtime Database does not support value type |${typeof value}| for key: |${key}| with value: |${value}|`
              );
            }
            console.log(`Applying query: key: |${key}|, operator, |_gt| & value: |${value}|`);
            return query.orderByChild(key).startAfter(value as string|number);
          }],
          ["_gte", (query, key, value) => {
            // Check if the value is a valid type for comparison
            if (value == null || !["string", "number"].includes(typeof value)) {
              throw new ErrorEx(
                ErrorCodes.INVALID_PARAMETERS,
                `Firebase Realtime Database does not support value type |${typeof value}| for key: |${key}| with value: |${value}|`
              );
            }
            console.log(`Applying query: key: |${key}|, operator, |_gte| & value: |${value}|`);
            return query.orderByChild(key).startAt(value as string|number);
          }],
        ]);

        // Step-1b Apply the filter
        const filters = JSON.parse(filter);

        if (Object.keys(filters).length > 1) {
          throw new ErrorEx(
            ErrorCodes.INVALID_PARAMETERS,
            `Firebase Realtime Database does not support multiple fiters: |${JSON.stringify(filters)}|`,
          );
        }

        Object.keys(filters).forEach((key) => {
          let thisKey = key;
          const thisValue = filters[key];
          console.log("Key", thisKey, "Value", thisValue);
          let [thisOperator, thisFunction] = Array.from(operatorsMap.entries())[0];

          // Iterate over the operators array to find if the filterString ends with any operator
          if (thisValue !== undefined && thisValue !== null) {
          // Check if the key ends with any supported operator
            for (const [operator, applyFunction] of operatorsMap.entries()) {
              if (key.endsWith(operator)) {
                thisOperator = operator; // Return the fucntion found
                thisFunction = applyFunction; // Return the fucntion found
                thisKey = key.slice(0, -operator.length);
                break; // No need to check further operators for this key              }
              }
            }

            // Esnure key and sort field aren't different
            // Realtime dataabase cannot support mpre than one orderbyclause
            if (sortField && sortField != thisKey) {
              throw new ErrorEx(
                ErrorCodes.INVALID_PARAMETERS,
                `Firebase Realtime Database does not support different sort field: |${sortField}| and filter key |${thisKey}|`,
              );
            }

            // Apply filter based on the operator
            try {
              query = thisFunction(query, thisKey, thisValue);
            } catch (error) {
              console.error(`Error applying operator |${thisOperator}: |${(error as Error).message}|`);
            }
          }
        });
      }

      // Step-2: Apply sort
      // if a filter defined, it would have either aplied the sort on the filter field
      if (!filter) {
        // As Realtime database does not support descending sort order
        // If the descending order is specified, we will apply it later in JavaScript on the query result
        if (sortField && sortField != "id") {
          // Apply the sort field
          console.debug(`Applying sort for field |${sortField}|`);
          query = query.orderByChild(sortField);
        } else {
          // No sort order specified. Let's sort by key so we get results in some order for the pagination to work
          console.debug("Applying sort for field |id|");
          query = query.orderByKey();
        }
      }

      // Step 3: Execute the query and get the data before the range filter
      console.debug("About to execute the first query");
      const fullSnapshot = await query.once("value");
      const fullData = fullSnapshot.val() || {};
      totalCount = Object.keys(fullData).length;

      console.debug(`FullData after first Query |${JSON.stringify(fullData)}|`);

      // todo use pageInfo
      console.log(`Discarding page info: |${JSON.stringify(pageInfo)}|`);

      // Apply the range filter if we have some query results to filter on and have a defined range filter
      if (totalCount > 0) {
        // Step-4 Apply pagination (in javascript)
        // Step-4a: Define pagination sort order
        // adjust rangeEnd, If no range specified or range greater than totalCounts-1, set it to totalCounts-1
        rangeEnd = (rangeEnd === undefined || rangeEnd > totalCount-1) ? totalCount - 1 : rangeEnd < rangeStart ? rangeStart : rangeEnd < 0 ? 0 : rangeEnd;
        // adjust rangeStart, If no range specified or range les than 0, set ot to 0, if greater than totalCounts-1, set it to totalCounts-1
        rangeStart = (rangeStart === undefined || rangeStart <= 0 ? 0 : (rangeStart > rangeEnd ? rangeEnd : (rangeStart > totalCount-1 ? totalCount - 1 : rangeStart)));

        console.debug(`Range used to query - start: |${rangeStart}|, end |${rangeEnd}|`);
        console.debug(`total count: |${totalCount}|`);

        // lets set pagination sort order based on original order
        const paginationSortOrder: OrderByDirection = sortOrder.toUpperCase() !== "DESC" ? "asc" : "desc";

        // Step 4b: Apply pagination
        // now apply Pagination in javascript
        // const finalData = (paginationSortOrder == "asc") ?
        //   fullData.slice(rangeStart, rangeEnd + 1) :
        //  fullData.slice(totalCount - (rangeEnd-1), totalCount - rangeStart);
        console.log(Object.entries(fullData));
        console.log(Object.entries(fullData).slice(rangeStart, rangeEnd + 1).map(([key, value]) => (typeof value === "object" ? {id: key, ...value} : {key: value})));
        const finalData = (paginationSortOrder === "asc") ?
          Object.entries(fullData)
            .slice(rangeStart, rangeEnd + 1)
            .map(([key, value]) => (typeof value === "object" ? {id: key, ...value} : {key: value})) :
          Object.entries(fullData)
            .slice(totalCount - (rangeEnd+1), totalCount - rangeStart)
            .map(([key, value]) => (typeof value === "object" ? {id: key, ...value} : {key: value}));

        console.debug(`About to process Final data: |${JSON.stringify(finalData)}|`);

        // Do not need to convert to arrtay for realtime db as the data is already converetd to array in step-5
        // // Step-5 Convert to applications data array
        // // Iterate over the keys from rangeStart and transform them
        // const keys = Object.keys(finalData);
        // for (let i = 0; i >= rangeStart && i < keys.length; i++) {
        //   const id = keys[i]; // Get ID (key)
        //   const valueField = finalData[id]; // Retrieve value field
        //   console.debug(`Id |${id}|, value: |${valueField}|`);
        //  applicationDataArray.push(this.fromStoreValueField(id, valueField) as {[key: string]: unknown});
        // }
        applicationDataArray = finalData;
      }
    } catch (error) {
      console.log(error);
    }

    // Step-6
    // Apply descending sort order, if defined
    if (sortOrder && sortOrder.toLowerCase() === "desc") {
      applicationDataArray = applicationDataArray.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        // Handle cases where aValue or bValue might be null or undefined
        if (aValue == null) return bValue == null ? 0 : -1;
        if (bValue == null) return 1;

        if (typeof aValue === "string" && typeof bValue === "string") {
          return aValue.localeCompare(bValue);
        }

        if (typeof aValue === "number" && typeof bValue === "number") {
          return aValue - bValue;
        }

        if (aValue === bValue) return 0;

        return aValue > bValue ? 1 : -1;
      });
    }

    // eslint-disable-next-line max-len
    // console.debug(`Query with filter: |${filter}|, sort |${sort}| , range: |${range}| & pageInfo |${pageInfo}| executed successfully with data |${JSON.stringify(applicationDataArray)}|`);
    return {totalCount: totalCount, rangeStart: 0, rangeEnd: totalCount-1, data: applicationDataArray};
  }


  /**
   * Deletes a record by its ID.
   *
   * @param {string} id - The ID for the record.
   * @return {Promise<unknown>} - A promise that resolves with the previous state of the record before deletion.
   *
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_DELETE_FAILED` if the record deletion fails.
   */
  async delete(id: string): Promise<unknown> {
    if (typeof id !== "string" || !id?.trim()) {
      throw new ErrorEx(ErrorCodes.INVALID_PARAMETERS, `Invalid ID |${id}| or its type |${typeof id}|. It must be an non empty string`);
    }

    let currentApplicationData;
    try {
      const ref = this.#collRef.child(id);
      const snapshot = await ref.once("value");

      if (!snapshot.exists()) {
        throw new ErrorEx(
          ErrorCodes.RECORD_NOT_FOUND,
          `Failed to delete record with id |${id}|. A record with the id does not exist`
        );
      }

      // Get a copy of the current data
      const currentStoreValueField = snapshot.val();

      // Validate and transform the store data to application data by claling the member function
      // The method will validate the data and thow appropriate error before appneding the id to the curenntly retreived data
      currentApplicationData = this.fromStoreValueField(id, currentStoreValueField);

      await ref.remove();
      console.log(`Record with ID |${id}| deleted successfully.`);
    } catch (error) {
      throw new ErrorEx(
        ErrorCodes.RECORD_DELETE_FAILED,
        `Failed to delete record with ID |${id}|. Error: |${(error as Error).message}|`,
      );
    }

    console.debug(`Record with id |${id}| deleted successfully`);
    return currentApplicationData; // it was current data when read but now histocial after the delete
  }
}
