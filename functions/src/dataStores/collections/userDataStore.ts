// Import necessary types and data store implementations
import {FirestoreDataStore} from "../models/firestoreDataStore";
import {CreateIdOption} from "../types/createIdOption";
import {FirebaseDataStoreOptions} from "../models/firebaseDataStoreOptions";
import {FirestorePathBuilder} from "../models/firestorePathBuilder";

/**
 * UserDataStore class representing a provider user data store that abstracts the underlying data store.
 * The design ensures complete abstraction from the consumers in terms of what data
 * is stored and managed, allowing the data provider to be changed seamlessly.
 * It wraps around FirestoreDataStore to provide an interface for user-specific data operations.
 * This class delegates all operations to an instance of FirestoreDataStore.
 */
export class UserDataStore {
  private dataStore: FirestoreDataStore;

  /**
   * Creates an instance of UserDataStore.
   *
   * @param {FirestoreDataStoreOptions} [options=new FirestoreDataStoreOptions()] - The options for configuring
   *                         the data store. This includes settings related to the realtime database
   *                         instance and other operational parameters. If not provided,
   *                         default options will be used.
   */
  constructor() {
    this.dataStore = new FirestoreDataStore(
      FirestorePathBuilder.users(),
      new FirebaseDataStoreOptions({
        createIdOption: CreateIdOption.ManualRejectIdConflicts,
        requireTransaction: true,
        readOnlyFields: ["emailId"],
      }),
    );
  }

  /**
   * Creates a new record in the data store.
   * @param {unknown} data - The data to be stored in the new record.
   * @return {Promise<unknown>} - A promise that resolves with the unique ID of the newly createdAt record.
   * @throws {ErrorEx} - Throws an ErrorEx if the record creation fails.
   */
  // We always use createWithId and never create for this type of data
  // async create(data: unknown): Promise<unknown> {
  //  return this.dataStore.create(data);
  // }

  /**
   * Creates a new record with a unique ID and stores the provided data.
   * @param {string} id - The id used to generate a unique ID.
   * @param {unkn} data - The data to be stored in the new record.
   * @return {Promise<string>} - A promise that resolves with the unique ID of the newly createdAt record.
   * @throws {ErrorEx} - Throws an ErrorEx if the record creation fails after 100 attempts.
   */
  async createWithId(id: string, data: unknown): Promise<unknown> {
    return this.dataStore.createWithId(id, data);
  }

  /**
   * Updates an existing record in the data store.
   * @param {string} id - The unique identifier of the record to be updated.
   * @param {unknown} data - The new data to update the record with.
   * @return {Promise<unknown>} - A promise that resolves with the previous data of the record.
   * @throws {ErrorEx} - Throws an ErrorEx if the update operation fails.
   */
  // We always use transactionalUpdate and never update for this type of data
  // async update(id: string, data: unknown): Promise<unknown> {
  //  return this.dataStore.update(id, data);
  // }

  /**
   * Updates an existing record in the data store transactionally.
   * @param {string} id - The unique identifier of the record to be updated.
   * @param {unknown} data - The new data to update the record with.
   * @return {Promise<unknown>} - A promise that resolves with the previous state of the record before the update.
   * @throws {ErrorEx} - Throws an ErrorEx if the update fails.
   */
  async transactionalUpdate(id: string, data: unknown): Promise<unknown> {
    return this.dataStore.transactionalUpdate(id, data);
  }

  /**
   * Reads a record by its ID from the data store.
   * @param {string} id - The unique identifier of the record to be read.
   * @return {Promise<unknown>} - A promise that resolves with the record's data if it exists.
   * @throws {ErrorEx} - Throws an ErrorEx if the record does not exist or the read operation fails.
   */
  async read(id: string): Promise<unknown> {
    return this.dataStore.read(id);
  }

  /**
   * Queries the data store with sorting, filtering, and pagination.
   * @param {string} filter - The filter conditions as a JSON string.
   * @param {string} sort - The sort order, which can be "ASC" (ascending) or "DESC" (descending).
   * @param {string} range - The range for pagination, formatted as a JSON string `[start: number, end: number]`.
   * @param {string} pageInfo - The pagination state of last query to scroll backward or firwards, default to {}
   *                                  Formatted as a JSON string `{
   *                                    firstVisible: {position: number, id: string}, -- the position and id of the first elemnt of previous query
   *                                    lastVisible: {position: number, id: string}, -- the position and id of the last elemnt of previous query
   *                                  }
   * @return {Promise<{totalCount: number, rangeStart: number, rangeEnd: number, data: unknown[]}>} -
   *         A promise that resolves to an object containing:
   *         - `totalCount` (number): The total number of records before the specified range.
   *         - `rangeStart` (number): The range start of the returned data.
   *         - `rangeEnd` (number): The range end of the returned data.
   *         - `data` (unknown[]): An array of records where each record includes an `id` and its associated properties.
   * @throws {ErrorEx} - Throws an ErrorEx if the query operation fails.
   */
  async query(filter: string, sort: string, range: string, pageInfo: string): Promise<{ totalCount: number; rangeStart: number; rangeEnd: number; data: unknown[] }> {
    return this.dataStore.query(filter, sort, range, pageInfo);
  }

  /**
   * Deletes a record by its ID from the data store.
   * @param {string} id - The ID of the record to be deleted.
   * @return {Promise<unknown>} - A promise that resolves with the previous state of the record before deletion.
   * @throws {ErrorEx} - Throws an ErrorEx if the deletion fails.
   */
  async delete(id: string): Promise<unknown> {
    return this.dataStore.delete(id);
  }
}
