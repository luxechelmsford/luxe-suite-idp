// import {RelatedEntitiesImpl} from "./relatedEntitiesImpl";
// import {RelatedEntities} from "../interfaces/relatedEntities";
import crypto from "crypto";
import {ErrorCodes, ErrorEx} from "../../types/errorEx";
import {IUser} from "./userInterface";


/**
 * Implementation of the IUser interface.
 */
export class User implements IUser {
  #id: string;
  #email: string;
  #superAdmin: boolean;

  #firstName: string;
  #lastName: string;
  #hashedPin?: string | null;

  profileUrl?: string | null;
  profileColour?: string | null;
  phoneNumber?: string | null;
  addressId?: string | null;
  dob?: Date | null;

  createdAt: Date;
  createdBy: string;
  lastUpdatedAt: Date;
  lastUpdatedBy: string;

  /**
   * Creates an instance of the user class.
   * @param {Object} data {Record<string, unknown>} - The user data.
   */
  constructor(data: Record<string, unknown>) {
    if (data == null) {
      throw new ErrorEx(ErrorCodes.INVALID_PARAMETERS, `Invalid data |${data}|. Null or undefined data found`);
    }

    if (!(data as { id: string }).id?.trim()) {
      throw new ErrorEx(
        ErrorCodes.INVALID_PARAMETERS,
        `Email |${data.id}| is required.`,
      );
    }

    if (!(data as { email: string }).email?.trim()) {
      throw new ErrorEx(
        ErrorCodes.INVALID_PARAMETERS,
        `Email |${data.email}| is required.`,
      );
    }

    if (!data.id) {
      throw new ErrorEx(
        ErrorCodes.INVALID_PARAMETERS,
        `Email |${data.email}| is required.`,
      );
    }

    if ((!(data as { firstName: string }).firstName?.trim() || !(data as { lastName: string }).lastName?.trim()) && !((data as { fullName: string }).fullName?.trim())) {
      throw new ErrorEx(
        ErrorCodes.INVALID_PARAMETERS,
        `Either First name |${data.firstName}| and last name |${data.lastName}| or Full name |${data.fullName}| is required`,
      );
    }

    const record = data;

    const capitalizedString = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    const extractFirstName = (str: string): string =>{
      const parts = str ? str.split(" ") : [];
      return parts.length <= 1 ? str : parts.slice(0, -1).join(" ");
    };
    const extractLastName = (str: string): string => {
      const parts = str ? str.split(" ") : [];
      return (parts.length <= 1 ? "" : parts[parts.length-1]);
    };
    const getHashedPin = (str: string): string|null =>{
      return crypto.createHash("sha256").update(str).digest("hex");
    };


    this.#id = (record as {id: string}).id;
    this.#email = (record as {email: string}).email;
    this.#firstName = capitalizedString(((record as {firstName: string}).firstName || extractFirstName(record.fullName as string))) || "";
    this.#lastName = capitalizedString(((record as {lastName: string}).lastName || extractLastName(record.fullName as string))) || "";
    this.#superAdmin = (record as {superAdmin: boolean}).superAdmin || false;

    this.#hashedPin = ((record as {pin: string}).pin) ? getHashedPin(((record as {pin: string}).pin) + this.#id) : null;

    this.profileUrl = (record as { profileUrl?: string | null }).profileUrl || null;
    this.profileColour = (record as { profileColour?: string | null }).profileColour || null;
    this.phoneNumber = (record as { phoneNumber?: string }).phoneNumber || "";
    this.addressId = (record as { addressId?: string }).addressId || "";
    this.dob = (record as { dob?: Date | null }).dob || null;

    this.createdAt = (record as { createdAt?: Date }).createdAt || new Date();
    this.createdBy = (record as { createdBy?: string }).createdBy || ""; // TODO: Get current user
    this.lastUpdatedAt = (record as { lastUpdatedAt?: Date }).lastUpdatedAt || new Date();
    this.lastUpdatedBy = (record as { lastUpdatedBy?: string }).lastUpdatedBy || ""; // TODO: Get current user
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
   * Gets the email of the user.
   *
   * @type {string}
   */
  get email(): string {
    return this.#email;
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
   * Verify the PIN.
   * @param {strung} pin - The PIN to verify
   * @return {boolean} Returns trei if the pin matches or else false
   */
  async verifyPin(pin: string) : Promise<boolean> {
    return ((crypto.createHash("sha256").update(pin + this.#id).digest("hex")) === this.#hashedPin);
  }


  /**
   * Gets the JSON representation of the object with all properties.
   * This method serializes the entire object, including all its properties, into a JSON format.
   * For this function to enumerate all getters, it is important that this function is never converted into a getter;
   * otherwise, it will result in stack overflow issues due to recursive calls.
   *
   * @return {Record<string, unknown>} A JSON object representing all properties of the instance,
   * including private and protected fields if accessible.
   */
  toJson(): Record<string, unknown> {
    // Create a shallow copy of the instance
    const clone: Record<string, unknown> = Object.create(null);

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
   * @return {Record<string, unknown>} A JSON object representing the properties of the instance, excluding the `id` field.
   */
  dbJson(): Record<string, unknown> {
    // Get the full JSON representation of the object
    const fullJson = this.toJson();

    // Destructure the `id` field out and return the rest
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {id, ...rest} = fullJson;

    // Return the JSON object excluding the `id` field
    return rest;
  }

  /**
   * Determines whether the key properties of a user object have been modified compared to a previous state.
   * Forces saving a history of the current record if changes are detected.
   *
   * @param {Record<string, unknown>} after - The previous state of the user object to compare against.
   * @return {boolean} - Returns true if the user object has changes; otherwise, false.
   */
  historyRequired(after: Record<string, unknown>): boolean {
  // Ensure that all keys are checked and compared correctly
    return (
      this.#id !== after.id ||
      this.email !== after.email ||
      this.#firstName !== after.firstName ||
      this.#lastName !== after.lastName ||
      this.#superAdmin !== after.superAdmin ||
      this.#hashedPin !== after.hashedPin // ||
      // this.profileUrl !== after.profileUrl ||
      // this.profileColour !== after.profileColour ||
      // this.phoneNumber !== after.phoneNumber ||
      // this.addressId !== after.addressId ||
      // this.dob !== after.dob ||
      // this.createdAt !== after.createdAt ||
      // this.createdBy != after.createdBy ||
      // this.lastUpdatedAt !== after.lastUpdatedAt ||
      // this.lastUpdatedBy !== after.lastUpdatedBy
    );
  }
}
