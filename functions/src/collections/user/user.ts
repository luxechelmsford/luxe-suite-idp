import {ErrorCodes, ErrorEx} from "../../types/errorEx";
import {IUser} from "./userInterface";
import {Helper} from "../../utils/helper";


/**
 * Implementation of the IUser interface.
 */
export class User implements IUser {
  #id: string;
  #emailId: string;
  #superAdmin: boolean;

  #firstName: string;
  #lastName: string;

  #profilePhoto: {
    url: string | null;
    displayName: string | null;
  };

  #profileColour: string | null;
  #phoneNumber: string | null;
  #addressId: string | null;
  #dob: Date | null;

  #createdAt: Date;
  #createdBy: string;
  #lastUpdatedAt: Date;
  #lastUpdatedBy: string;

  /**
   * Creates an instance of the user class.
   * @param {Object} data {{[key: string]: unknown}} - The user data.
   */
  constructor(data: {[key: string]: unknown}) {
    if (data == null) {
      throw new ErrorEx(ErrorCodes.INVALID_PARAMETERS, `Invalid data |${data}|. Null or undefined data found`);
    }

    // Validate email
    if (!(data as { emailId: string }).emailId?.trim()) {
      throw new ErrorEx(
        ErrorCodes.INVALID_PARAMETERS,
        `Email |${data.emailId}| is required.`,
      );
    }

    // Validate firstName and lastName
    if ((!(data as { firstName: string }).firstName?.trim() || !(data as { lastName: string }).lastName?.trim()) && !((data as { fullName: string }).fullName?.trim())) {
      throw new ErrorEx(
        ErrorCodes.INVALID_PARAMETERS,
        `Either First name |${data.firstName}| and last name |${data.lastName}| or Full name |${data.fullName}| is required`,
      );
    }

    const record = data;


    this.#id = (record as {id: string}).id;
    this.#emailId = (record as {emailId: string}).emailId;
    this.#firstName = Helper.capitalizedString(((record as {firstName: string}).firstName || Helper.extractFirstName(record.fullName as string))) || "";
    this.#lastName = Helper.capitalizedString(((record as {lastName: string}).lastName || Helper.extractLastName(record.fullName as string))) || "";
    this.#superAdmin = (record as {superAdmin: boolean}).superAdmin || false;

    this.#profilePhoto = {
      url: (record?.profilePhoto as { url?: string })?.url ??
        ((record as {profileURL: string}).profileURL ?? null),
      displayName: ((record?.profilePhoto as { displayName?: string })?.displayName) ??
        (`${record?.firstName || ""} ${record?.lastName || ""}`.trim() || null),
    };

    this.#profileColour = (record as { profileColour?: string | null }).profileColour || null;
    this.#phoneNumber = (record as { phoneNumber?: string }).phoneNumber || "";
    this.#addressId = (record as { addressId?: string }).addressId || "";
    this.#dob = (record as { dob?: Date | null }).dob || null;

    this.#createdAt = (record as { createdAt?: Date }).createdAt || new Date();
    this.#createdBy = (record as { createdBy?: string }).createdBy || ""; // TODO: Get current user
    this.#lastUpdatedAt = (record as { lastUpdatedAt?: Date }).lastUpdatedAt || new Date();
    this.#lastUpdatedBy = (record as { lastUpdatedBy?: string }).lastUpdatedBy || ""; // TODO: Get current user
  }

  /**
   * Gets the UID of the user.
   *
   * @type {string}
   */
  get id(): string {
    return this.#id;
  }

  /**
   * Gets the emailId of the user.
   *
   * @type {string}
   */
  get emailId(): string {
    return this.#emailId;
  }

  /**
   * Gets the first name of the user.
   *
   * @type {string}
   */
  get firstName(): string {
    return this.#firstName;
  }

  /**
   * Gets the last name of the user.
   *
   * @type {string}
   */
  get lastName(): string {
    return this.#lastName;
  }

  /**
   * Gets the superAdmin flag of the user.
   *
   * @type {string}
   */
  get superAdmin(): boolean {
    return this.#superAdmin;
  }

  /**
   * Gets the profile photo of the provider based user.
   *
   * @return {string|null} returns.url The URL of the profile photo, which can be a string or null.
   * @return {string|null} returns.displayName The displayName of the profile photo, which can be a string or null.
   */
  get profilePhoto() {
    return this.#profilePhoto;
  }

  /**
   * Gets the user's profile colour.
   * @return {string | null} The profile colour of the user.
   */
  get profileColour(): string | null {
    return this.#profileColour;
  }

  /**
   * Gets the user's phone number.
   * @return {string | null} The phone number of the user.
   */
  get phoneNumber(): string | null {
    return this.#phoneNumber;
  }

  /**
   * Gets the user's address ID.
   * @return {string | null} The address ID of the user.
   */
  get addressId(): string | null {
    return this.#addressId;
  }

  /**
   * Gets the user's date of birth.
   * @return {Date | null} The date of birth of the user.
   */
  get dob(): Date | null {
    return this.#dob;
  }

  /**
   * Gets the date when the user profile was created.
   * @return {Date} The creation date of the user profile.
   */
  get createdAt(): Date {
    return this.#createdAt;
  }

  /**
   * Gets the ID of the user who created this profile.
   * @return {string} The ID of the creator of the user profile.
   */
  get createdBy(): string {
    return this.#createdBy;
  }

  /**
   * Gets the date when the user profile was last updated.
   * @return {Date} The last updated date of the user profile.
   */
  get lastUpdatedAt(): Date {
    return this.#lastUpdatedAt;
  }

  /**
   * Gets the ID of the user who last updated this profile.
   * @return {string} The ID of the person who last updated the user profile.
   */
  get lastUpdatedBy(): string {
    return this.#lastUpdatedBy;
  }

  /**
   * Gets the JSON representation of the object with all properties.
   * This method serializes the entire object, including all its properties, into a JSON format.
   * For this function to enumerate all getters, it is important that this function is never converted into a getter;
   * otherwise, it will result in stack overflow issues due to recursive calls.
   *
   * @return {Object.<string, unknown>} A JSON object representing all properties of the instance,
   * including private and protected fields if accessible.
   */
  toJSON(): {[key: string]: unknown} {
    // Create a shallow copy of the instance
    const clone: {[key: string]: unknown} = Object.create(null);

    // Assign all own properties of the instance to the clone
    Object.assign(clone, this);

    // now lets add the getters
    const descriptors = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(this));
    Object.keys(descriptors).forEach((key) => {
      const descriptor = descriptors[key];
      if (descriptor && descriptor.get) {
        // Ensure to call the getter method on the current instance
        clone[key] = descriptor.get.call(this);
      }
    });

    return clone;
  }

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
  dbJSON(): {[key: string]: unknown} {
    // Get the full JSON representation of the object
    const fullJson = this.toJSON();

    // Destructure the `id` field out and return the rest
    // remove id as well as firebase user
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {id, firebase, ...rest} = fullJson;

    // Return the JSON object excluding the `id` field
    return rest;
  }

  /**
   * Determines whether the key properties of a user object have been modified compared to a previous state.
   * Forces saving a history of the current record if changes are detected.
   *
   * @param {Object.<string, unknown>} after - The previous state of the fcm token object to compare against.
   * @return {boolean} - Returns true if the user object has changes; otherwise, false.
   */
  historyRequired(after: {[key: string]: unknown}): boolean {
  // Ensure that all keys are checked and compared correctly
    return (
      this.#id !== after.id ||
      this.emailId !== after.emailId ||
      this.#firstName !== after.firstName ||
      this.#lastName !== after.lastName ||
      this.#superAdmin !== after.superAdmin // ||
      // this.profilePhoto.url !== after.profilePhoto.url ||
      // this.profilePhoto.displayName !== after.profilePhoto.displayName ||
      // this.#profileColour !== after.profileColour ||
      // this.phoneNumber !== after.phoneNumber ||
      // this.#addressId !== after.addressId ||
      // this.#dob !== after.dob ||
      // this.#createdAt !== after.createdAt ||
      // this.#createdBy != after.createdBy ||
      // this.#lastUpdatedAt !== after.lastUpdatedAt ||
      // this.#lastUpdatedBy !== after.lastUpdatedBy
    );
  }
}
