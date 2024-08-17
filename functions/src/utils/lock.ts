import {database} from "../configs/firebase";
import admin from "firebase-admin";
/**
 * Class to handle a locking mechanism using Firebase Realtime Database.
 */
class Lock {
  private uid: string;
  private lockRef: admin.database.Reference;
  private duration: number;
  private checkInterval: number;
  private lockAcquired: boolean;
  /**
     * Creates an instance of the Lock class.
     *
     * @param {string} uid - The unique identifier for the lock (usually user ID).
     * @param {number} [duration=180000] - The duration to hold the lock in milliseconds (default is 3 minutes).
     * @param {number} [checkInterval=500] - The interval to check the lock status in milliseconds (default is 500ms).
     */
  constructor(uid: string, duration = 60 * 1000, checkInterval = 500) {
    /**
         * @type {string}
         * @private
         */
    this.uid = uid;

    /**
         * @type {Object}
         * @private
         */
    this.lockRef = database.ref(`/global/locks/${uid}`);

    /**
         * @type {number}
         * @private
         */
    this.duration = duration;

    /**
         * @type {number}
         * @private
         */
    this.checkInterval = checkInterval;

    /**
         * @type {Promise}
         * @private
         */
    this.lockAcquired = false;
  }

  /**
     * Acquires the lock by setting a timestamp in the database.
     * Continues retrying if the lock is currently held by someone else.
     *
     * @return {Promise<void>} - Resolves when the lock is successfully acquired.
     * @throws {Error} - Throws an error if there is a problem acquiring the lock.
     */
  async acquire() {
    const startTime = Date.now();

    while (Date.now() - startTime < this.duration) {
      try {
        // Try to set a lock with a timestamp
        const lockTimestamp = Date.now();
        await this.lockRef.set(lockTimestamp);
        this.lockAcquired = true;
        console.log(`Lock acquired for ${this.uid} at ${lockTimestamp}`);
        return; // Lock acquired, exit method
      } catch (error) {
        // If lock acquisition fails, wait and retry
        console.warn(`Failed to acquire lock for ${this.uid}, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, this.checkInterval));
      }
    }

    throw new Error(`Failed to acquire lock for ${this.uid} after ${this.duration}ms`);
  }

  /**
     * Releases the lock by removing the lock node from the database.
     *
     * @return {Promise<void>} - Resolves when the lock is successfully released.
     * @throws {Error} - Throws an error if there is a problem releasing the lock.
     */
  async release() {
    try {
      await this.lockRef.remove();
      this.lockAcquired = false;
      console.log(`Lock released for ${this.uid}`);
    } catch (error) {
      console.error(`Failed to release lock for ${this.uid}`, error);
      throw new Error(`Failed to release lock for ${this.uid}`);
    }
  }

  /**
     * Acquires the lock, performs a specified operation, and then releases the lock.
     *
     * @param {Function} operation - The operation to perform while the lock is held.
     *                               It should be a function that returns a promise.
     * @return {Promise<void>} - Resolves when the operation is complete and the lock is released.
     * @throws {Error} - Throws an error if there is a problem with the lock or operation.
     */
  async performOperation( operation: () => Promise<void>) {
    if (typeof operation !== "function") {
      throw new TypeError("Operation must be a function");
    }

    await this.acquire();
    try {
      await operation();
    } finally {
      await this.release();
    }
  }
}

export default Lock;
