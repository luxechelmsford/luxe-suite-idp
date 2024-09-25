import {RealtimeDbPathBuilder} from "../../models/realtimeDbPathBuilder";
import {RealtimeDbDataStore} from "../../models/realtimeDbDataStore";
import {RealtimeDbDataStoreOptions} from "../../models/realtimeDbDataStoreOptions";
import {RealtimeDbValueFieldType} from "../../types/realtimeDbValeFieldType";
import {FirebaseDataStoreOptions} from "../../models/firebaseDataStoreOptions";

/**
 * Class representing a data store for managing provider user in the Realtime Database.
 * Inherits from RealtimeDbObjectArrayDataStore and uses specific path templates and parameters
 * for provider user data.
 */
export class RealtimeDbUserDataStore extends RealtimeDbDataStore {
  /**
   * Creates an instance of RealtimeDbUserDataStore.
   *
   * @param {string} providerId - The provider id, to which this user profile belongs
   * @param {FirebaseDataStoreOptions} options - The provider id, to which this user profile belongs
   * @throws {ErrorEx} Throws an error if the userId is invalid (null or undefined).
   */
  constructor(providerId: string, options: FirebaseDataStoreOptions) {
    // Call the parent constructor with the path parameter for user
    super(
      RealtimeDbPathBuilder.users(providerId),
      new RealtimeDbDataStoreOptions({
        ...options,
        realtimeDbValueFieldType: RealtimeDbValueFieldType.Object,
      }),
    );
  }

  /**
   * Converts a single record from an internal format to a store format.
   *
   * @param {unknown} applicationData - The application data record to be converted from application format to store format.
   * @return {unknown} - The converted single record data in store format.
   */
  toStoreTransform(applicationData: unknown): unknown {
    // No transformation required for user class
    return applicationData;
  }


  /**
   * Converts a single record from the store format to an internal format.
   *
   * @param {unknown} storeData - The store data to be converted from store format to application format.
   * @return {unknown} - The converted single record data in internal format.
   */
  fromStoreTransform(storeData: unknown): unknown {
    // No transformation required for user class
    return storeData;
  }
}
