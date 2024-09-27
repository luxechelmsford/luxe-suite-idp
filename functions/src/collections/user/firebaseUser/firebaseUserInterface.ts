// import {RelatedEntities} from "./relatedEntities";


export type MultiFactor = {
  enrollmentFactors: [{
    phoneNumber: string, //  E.164 standard compliant identifier string.
    displayName: string,
    factorId: string, // defaults to phone
  }],
};

/**
 * Represents a user with personal and consent information.
 */
export interface IFirebaseUser {
  /**
   * The user's Uid, which is the UID assigned by Firebase Authentication service.
   *
   * @type {string}
   */
  id: string;

  /**
   * The user's emailId address.
   *
   * @type {string}
   */
  emailId: string;

  /**
   * The user's first name.
   *
   * @type {string}
   */
  firstName: string;

  /**
   * The user's last name.
   *
   * @type {string}
   */
  lastName: string;

  /**
   * The user's phone number.
   *
   * @type {string}
   */
  phoneNumber: string;

  /**
   * The user's phone number iused for multi factor authntication, if not defined user';s phone number is used
   *
   * @type {string}
   */
  multiFactorPhoneNumber: string;

  /**
   * The profile photo of the user, typically caoptuerd through social login
   *
   * @type {{url: string | null, displayName: string | null} | null}
   */
  profilePhoto: {
    url: string | null,
    displayName: string | null
  };

  /**
   * Gets the JSON representation of the object with all properties.
   * This method serializes the entire object, including all its properties, into a JSON format.
   * For this function to enumerate all getters, it is important that this function is never converted into a getter;
   * otherwise, it will result in stack overflow issues due to recursive calls.
   *
   * @return {Object.<string, unknown>} A JSON object representing all properties of the instance,
   * including private and protected fields if accessible.
   */
  toJSON() : {[key: string]: unknown};

  /**
   * Gets the JSON representation of the object suitable for database storage,
   * excluding the `id` field.
   *
   * This method generates a JSON object with all properties of the instance except for
   * the `id` field, which is typically not needed or should be excluded from the
   * database representation.
   *
   * @return {Object.<string, unknown>} A JSON object representing the properties of the instance, excluding the `id` field.
   */
  dbJSON(): {[key: string]: unknown};

  /**
   * Determines whether the key properties of a user object has been modified compared to a previous state.
   * forcing to save a historty of the current record
   * @param {{[key: string]: unknown}} after - The previous state of the user object to compare against.
   * @return {boolean} - Returns true if the user object has changes; otherwise, false.
   */
  historyRequired(after: {[key: string]: unknown}): boolean;
  }
