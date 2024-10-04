import {ErrorCodes, ErrorEx} from "../types/errorEx";
import {auth} from "../configs/firebase";
import {compareObjects} from "../utils/compare";
import {ICustomClaims} from "../types/customClaimsInterface";


/**
 * CustomClaims class representing user claims.
 */
export class CustomClaims {
  #uid: string;
  #superAdmin: boolean;
  #customClaims: ICustomClaims | null;

  /**
   * Creates an instance of CustomClaims.
   * @param {string} uid - The UID of the user for ewhich this custom claims belong to
   * @param {Object} data - {[key: string]: unknown} - The associated key value pair to create custom Claims for the global part
   * @param {ICustomClaims} customClaims - The associated user record, if not provided the user record will be read
   * @throws {ErrorEx.INVALID_PARAMETERS} Throws an error if uid is invalid.
   */
  constructor(uid: string, data: {[key: string]: unknown}, customClaims: ICustomClaims | null = null) {
    if (!uid || typeof uid !== "string") {
      throw new ErrorEx(
        ErrorCodes.INVALID_PARAMETERS,
        `UID |${uid}| cannot be empty or null or undefined.`,
      );
    }
    this.#uid = uid;
    this.#superAdmin = (data as {superAdmin: boolean})?.superAdmin || false;
    this.#customClaims = customClaims;
  }

  /**
   * Gets the domain extracted from the various headres of the request.
   *
   * @return {string} The uid of the user this custom claims belongs to
   */
  get uid() {
    return this.#uid;
  }

  /**
   * Gets the super admin flag indicating if the user is a superAdmin
   *
   * @return {string} The super admin flag indicating if the user is a superAdmin, defaults to false
   */
  get superAdmin() {
    return this.#superAdmin;
  }

  /**
   * Gets the custom claims exisit in the firebase auth sdk
   *
   * @return {ICustomClaims | null} The custom claims exisit in the firebase auth sdk
   */
  get customClaims() {
    return this.#customClaims;
  }

  /**
   * Updates the claims of the user.
   */
  async setClaims(): Promise<ICustomClaims> {
    try {
      // Fetch the user's current custom claims, if not passed before
      const before = this.#customClaims ?
        this.#customClaims : (await auth.getUser(this.#uid))?.customClaims || {};
      console.debug(`+++======= before: |${JSON.stringify(before)}|`);

      const after = JSON.parse(JSON.stringify(before));
      after.superAdmin = this.#superAdmin || false;
      console.debug(`+++======= after: |${JSON.stringify(after)}|`);

      if (!compareObjects(before, after)) {
        await auth.setCustomUserClaims(this.#uid, after);
        console.log(`Custom claims for user [${this.#uid}] updated. Old values: |${JSON.stringify(before)}. New values: |${JSON.stringify(after)}|`);
      }
      return after;
    } catch (error) {
      const after = {superadmin: this.#superAdmin};
      console.error(`Failed to update the claims for user [${this.#uid}] to: |${JSON.stringify(after)}| Last Error:`, error);
      throw new ErrorEx(
        (error as {code: string}).code || ErrorCodes.UNKNOWN_ERROR,
        `Failed to update the claims for user [${this.#uid}] to: |${after}| Last Error: |${JSON.stringify(error)}|`,
      );
    }
  }

  /**
   * Remove the claims of the user.
   */
  async unsetClaims(): Promise<void> {
    // Fetch the user's current custom claims
    try {
      const before = this.#customClaims ?
        this.#customClaims : (await auth.getUser(this.#uid))?.customClaims || {};

      const after = JSON.parse(JSON.stringify(before));
      after.superAdmin = false;

      if (!compareObjects(before, after)) {
        await auth.setCustomUserClaims(this.#uid, after);
      }
      return after;
    } catch (error) {
      console.error(`Failed to remove the claims for user [${this.#uid}] to: |${JSON.stringify({superAdmin: false})}| Last Error:`, error);
      throw new ErrorEx(
        (error as {code: string}).code || ErrorCodes.UNKNOWN_ERROR,
        `Failed to remove the claims for user [${this.#uid}] to: |{suoperAdmin: this.#superAdmin}| Last Error: |${JSON.stringify(error)}|`,
      );
    }
  }
}
