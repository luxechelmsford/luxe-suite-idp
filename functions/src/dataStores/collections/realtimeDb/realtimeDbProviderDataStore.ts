import {RealtimeDbPathBuilder} from "../../models/realtimeDbPathBuilder";
import {RealtimeDbDataStore} from "../../models/realtimeDbDataStore";
import {RealtimeDbDataStoreOptions} from "../../models/realtimeDbDataStoreOptions";
import {RealtimeDbValueFieldType} from "../../types/realtimeDbValeFieldType";
import {FirebaseDataStoreOptions} from "../../models/firebaseDataStoreOptions";

/**
 * Class representing a data store for managing provider in the Realtime Database.
 * Inherits from RealtimeDbObjectArrayDataStore and uses specific path templates and parameters
 * for provider data.
 */
export class RealtimeDbProviderDataStore extends RealtimeDbDataStore {
  /**
   * Creates an instance of RealtimeDbProviderDataStore.
   *
   * @param {FirebaseDataStoreOptions} options - The provider id, to whohc this userprofile belongs
   * @throws {ErrorEx} Throws an error if the providerId is invalid (null or undefined).
   */
  constructor(options: FirebaseDataStoreOptions) {
    // Call the parent constructor with the path parameter for provider
    super(
      RealtimeDbPathBuilder.providers(),
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
    // No transformation required for provider class
    return applicationData;
  }


  /**
   * Converts a single record from the store format to an internal format.
   *
   * @param {unknown} storeData - The store data to be converted from store format to application format.
   * @return {unknown} - The converted single record data in internal format.
   */
  fromStoreTransform(storeData: unknown): unknown {
    // No transformation required for provider class
    return storeData;
  }
}
