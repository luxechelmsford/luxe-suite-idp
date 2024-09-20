// import {RelatedEntities} from "./relatedEntities";


/**
 * Represents a user with personal and consent information.
 */
export interface IUser {
  /**
   * The user's id, which is the UID assigned by Firebase Authentication service.
   *
   * @type {string}
   */
  id: string;

  /**
   * The user's email address.
   *
   * @type {string}
   */
  email: string;

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
   * determine if the user has supper admin privileges
   *
   * @type {boolean}
   */
  superAdmin: boolean;

  /**
   * The hash of the user's pin and id
   *
   * @type {string}
   */
  hashedPin?: string;

  /**
   * The url of the profile photo of the user, typically caoptuerd through social login
   *
   * @type {string | null}
   */
  profileUrl?: string | null;

  /**
   * The color used for the skin and other user interface
   *
   * @type {string | null}
   */
  profileColour?: string | null;

  /**
   * The user's phone number, if available. This field is optional and can be null.
   *
   * @type {string | null}
   */
  phoneNumber?: string | null;

  /**
   * The user's address, represented by a reference ID.
   *
   * @type {string}
   */
  addressId?: string | null;

  /**
   * The user's date of birth, if available. This field is optional and can be null.
   *
   * @type {Date | null}
   */
  dob?: Date | null;

  /**
   * The date and time when the user was createdAt.
   *
   * @type {Date}
   */
  createdAt: Date;

  /**
   * The identifier of the user or system that createdAt the user record.
   *
   * @type {string}
   */
  createdBy: string;

  /**
   * The date and time when the user record was last updated.
   *
   * @type {Date}
   */
  lastUpdatedAt: Date;

  /**
   * The identifier of the user or system that last updated the user record.
   *
   * @type {string}
   */
  lastUpdatedBy: string;

  /**
   * Gets the JSON representation of the object with all properties.
   * This method serializes the entire object, including all its properties, into a JSON format.
   * For this function to enumerate all getters, it is important that this function is never converted into a getter;
   * otherwise, it will result in stack overflow issues due to recursive calls.
   *
   * @return {Record<string, unknown>} A JSON object representing all properties of the instance,
   * including private and protected fields if accessible.
   */
  toJson() : Record<string, unknown>;

  /**
   * Gets the JSON representation of the object suitable for database storage,
   * excluding the `id` field.
   *
   * This method generates a JSON object with all properties of the instance except for
   * the `id` field, which is typically not needed or should be excluded from the
   * database representation.
   *
   * @return {Record<string, unknown>} A JSON object representing the properties of the instance, excluding the `id` field.
   */
  dbJson(): Record<string, unknown>;

  /**
   * Determines whether the key properties of a user object has been modified compared to a previous state.
   * forcing to save a historty of the current record
   * @param {Record<string, unknown>} after - The previous state of the user object to compare against.
   * @return {boolean} - Returns true if the user object has changes; otherwise, false.
   */
  historyRequired(after: Record<string, unknown>): boolean;
  }
