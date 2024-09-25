import {RealtimeDbValueFieldType} from "../types/realtimeDbValeFieldType";
import {FirebaseDataStoreOptions} from "./firebaseDataStoreOptions";

/**
 * Class representing options for configuring a Realtime Database data store.
 *
 * This class extends {@link FirebaseDataStoreOptions} and includes additional configuration
 * specific to Realtime Database operations, including the data type to be used.
 *
 * @class
 * @extends FirebaseDataStoreOptions
 */
export class RealtimeDbDataStoreOptions extends FirebaseDataStoreOptions {
  /**
     * The data type used in the Realtime Database.
     *
     * @private
     * @type {RealtimeDbValueFieldType}
     */
  #realtimeDbValueFiledType: RealtimeDbValueFieldType;

  /**
     * Constructs an instance of RealtimeDbDataStoreOptions.
     *
     * @param {object} options - Configuration options for the Realtime Database data store.
     * @param {RealtimeDbValueFieldType} [options.dataStoreDataType=RealtimeDbValueFieldType.Object] - The type of data to be used in the database.
     * @param {any} [options.rest] - Other configuration options to be passed to the base class.
     */
  constructor(options: {[key: string]: unknown} = {}) {
    // Destructure options to extract dataStoreDataType with a default value
    const {realtimeDbValueFiledType, ...rest} = options;

    // Call the base class constructor with the remaining options
    super(rest);

    // Set the private field for dataStoreDataType
    this.#realtimeDbValueFiledType = realtimeDbValueFiledType as RealtimeDbValueFieldType.Object || RealtimeDbValueFieldType.Object;
  }

  /**
     * Gets the data type used in the Realtime Database.
     *
     * @return {RealtimeDbValueFieldType} The data type of the Realtime Database.
     */
  public get realtimeDbValueFiledType(): RealtimeDbValueFieldType {
    return this.#realtimeDbValueFiledType;
  }
}
