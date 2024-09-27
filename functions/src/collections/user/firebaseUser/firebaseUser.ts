import {ErrorCodes, ErrorEx} from "../../../types/errorEx";
import {MultiFactor, IFirebaseUser} from "./firebaseUserInterface";
import {Helper} from "../../../utils/helper";
// import {PhoneMultiFactorGenerator} from "firebase/auth";


/**
 * Implementation of the IUser interface.
 */
export class FirebaseUser implements IFirebaseUser {
  #id: string;
  #emailId: string;
  #firstName: string;
  #lastName: string;
  #phoneNumber: string;

  #multiFactorPhoneNumber: string;

  #profilePhoto: {
    url: string | null;
    displayName: string | null;
  };

  /**
   * Creates an instance of the user class.
   * @param {Object} data {{[key: string]: unknown}} - The user data.
   */
  constructor(data: {[key: string]: unknown}) {
    const isValidE164 = (phoneNumber: string): boolean => {
      const e164Regex = /^\+?[1-9]\d{1,14}$/;
      return e164Regex.test(phoneNumber);
    };

    if (data == null) {
      throw new ErrorEx(ErrorCodes.INVALID_PARAMETERS, `Invalid data |${data}|. Null or undefined data found`);
    }

    // Validate email
    if ((!(data as { emailId: string }).emailId?.trim()) && (!(data as { email: string }).email?.trim())) {
      throw new ErrorEx(
        ErrorCodes.INVALID_PARAMETERS,
        `Email |${data.email}| or EmailId |${data.emailId}| is required in data |${JSON.stringify(data)}|.`,
      );
    }

    // Validate firstName and lastName
    if ((!(data as { firstName: string }).firstName?.trim() || !(data as { lastName: string }).lastName?.trim()) && !((data as { displayName: string }).displayName?.trim())) {
      throw new ErrorEx(
        ErrorCodes.INVALID_PARAMETERS,
        `Either First name |${data.firstName}| and last name |${data.lastName}| or Display name |${data.displayName}| is required`,
      );
    }

    if (!(data as { phoneNumber: string }).phoneNumber?.trim() || !isValidE164((data as { phoneNumber: string }).phoneNumber)) {
      throw new ErrorEx(
        ErrorCodes.INVALID_PARAMETERS,
        `Phone Number |${data.phoneNumber}| is required and must be a E.164 complaint phone number.`,
      );
    }

    const multiFactor = (data as {multiFactor: MultiFactor}).multiFactor;
    const multiFactorPhoneNumber = (data as {multiFactorPhoneNumber: string})?.multiFactorPhoneNumber ||
      multiFactor?.enrollmentFactors[0]?.phoneNumber || (data as {phoneNumber: string})?.phoneNumber;

    if (!multiFactorPhoneNumber) {
      throw new ErrorEx(
        ErrorCodes.INVALID_PARAMETERS,
        `Multi factor phone number is required either in the field multiFactorPhoneNumber |${data.multiFactorPhoneNumber}| ` +
        `or in the filed phoneNumber |${data.phoneNumber}| multiFactor|${JSON.stringify(multiFactor)}|`,
      );
    }

    const record = data;

    this.#id = (record as {id: string}).id || (record as {uid: string}).uid || (record as {emailId: string}).emailId;
    this.#emailId = (record as {emailId: string}).emailId;
    this.#firstName = Helper.capitalizedString(
      (record as {firstName: string}).firstName || Helper.extractFirstName((record as {displayName: string}).displayName)
    );
    this.#lastName = Helper.capitalizedString(
      (record as {lastName: string}).lastName || Helper.extractLastName((record as {displayName: string}).displayName)
    );
    this.#phoneNumber = (record as {phoneNumber: string}).phoneNumber;
    this.#multiFactorPhoneNumber = multiFactorPhoneNumber;

    this.#profilePhoto = {
      url: (record?.profilePhoto as { url?: string })?.url ??
        ((record as {profileURL: string}).profileURL ?? null),
      displayName: ((record?.profilePhoto as { displayName?: string })?.displayName) ??
        (`${record?.firstName || ""} ${record?.lastName || ""}`.trim() || null),
    };
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
   * Gets the first name of the user.
   *
   * @type {string}
   */
  get lastName(): string {
    return this.#lastName;
  }

  /**
   * Gets the phone number used for multi factor autnetication
   * @type {string}
   */
  get phoneNumber(): string {
    return this.#phoneNumber;
  }

  /**
   * Gets the second phone number used as a backup multi factor autnetication option
   * @type {string}
   */
  get multiFactorPhoneNumber(): string {
    return this.#multiFactorPhoneNumber;
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {id, emailId, firstName, lastName, phoneNumber, multiFactorPhoneNumber, profilePhoto} = fullJson;

    const multiFactor = {
      enrollmentFactors: [{
        phoneNumber: multiFactorPhoneNumber || phoneNumber,
        displayName: "Primary phone number",
        factorId: "phone", // PhoneMultiFactorGenerator.FACTOR_ID,
      }],
    };

    const profileURL = (profilePhoto as {url: string})?.url?.trim() || null;

    // Return the JSON object excluding the `id` field
    return {email: emailId, displayName: `${firstName} ${lastName}`, phoneNumber, multiFactor,
      ...(profileURL ? {profileURL} : {}),
    };
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
      this.#emailId !== after.emailId ||
      // this.#firstName !== after.firstName ||
      // this.#lastName !== after.lastName ||
      this.#phoneNumber !== after.phoneNumber ||
      this.#multiFactorPhoneNumber !== after.multiFactorPhoneNumber // ||
      // this.profilePhoto.url !== after.profilePhoto.url ||
      // this.profilePhoto.displayName !== after.profilePhoto.displayName ||
    );
  }
}
