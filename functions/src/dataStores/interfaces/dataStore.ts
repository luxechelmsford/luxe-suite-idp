/**
 * Interface defining methods for interacting with data in a storage system.
 */
export interface IDataStore {
  /**
   * Creates a new record with a unique ID and stores the provided data.
   *
   * @param {unknown} data - The data to be stored in the new record.
   * @return {Promise<unknown>} - A promise that resolves with the unique ID of the newly createdAt record.
   *
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_CREATE_FAILED` if the record creation fails.
   */
  create(data: unknown): Promise<unknown>;

  /**
   * Creates a new record with a unique ID based on a base ID and stores the provided data.
   *
   * @param {string} baseId - The base ID used to generate a unique ID.
   * @param {unknown} data - The data to be stored in the new record.
   * @return {Promise<unknown>} - A promise that resolves with the unique ID of the newly createdAt record.
   *
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_CREATE_FAILED` if the record creation fails after 100 attempts.
   */
  createWithId(baseId: string, data: unknown, ): Promise<unknown>;

  /**
   * Updates a record with the specified ID if it exists.
   *
   * @param {string} id - The unique identifier of the record to be updated.
   * @param {unknown} data - The new data to update the record with.
   * @return {Promise<unknown>} - A promise that resolves with the previous data of the record.
   *
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_NOT_FOUND` if the record does not exist.
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_UPDATE_FAILED` if the update operation fails.
   */
  update(id: string, data: unknown): Promise<unknown>;

  /**
   * Updates a record with the specified ID and returns the previous state of the record before the update.
   *
   * @param {string} id - The unique identifier of the record to be updated.
   * @param {unknown} data - The new data to update the record with.
   * @return {Promise<unknown>} - A promise that resolves with the previous state of the record before the update.
   *
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_NOT_FOUND` if the record does not exist.
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_UPDATE_FAILED` if the update fails.
   */
  transactionalUpdate(id: string, data: unknown): Promise<unknown>;

  /**
   * Reads a record by its ID.
   *
   * @param {string} id - The unique identifier of the record to be read.
   * @return {Promise<unknown>} - A promise that resolves with the record's data if it exists.
   *
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_NOT_FOUND` if the record does not exist.
   */
  read(id: string): Promise<unknown>;

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
  query(filter: string, sort: string, range: string, pageInfo: string): Promise<{totalCount: number, rangeStart: number, rangeEnd: number, data: unknown[]}>;

  /**
   * Deletes a record by its ID.
   *
   * @param {string} id - The ID for the record.
   * @return {Promise<unknown>} - A promise that resolves with the previous state of the record before deletion.
   *
   * @throws {ErrorEx} - Throws an `ErrorEx` with `ErrorCodes.RECORD_DELETE_FAILED` if the record deletion fails.
   */
  delete(id: string): Promise<unknown>;
}
