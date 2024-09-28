import {ErrorCodes, ErrorEx} from "../../../types/errorEx";
import {MultiFactorSettings, PhoneMultiFactorInfo, IFirebaseUser} from "./firebaseUserInterface";
import {Helper} from "../../../utils/helper";
import {DataSource} from "../../../types/dataSource";

// import {PhoneMultiFactorGenerator} from "firebase/auth";


/**
 * Implementation of the IUser interface.
 */
export class FirebaseUser implements IFirebaseUser {
  #id: string;
  #emailId: string;
  #emailVerified: boolean;
  #firstName: string;
  #lastName: string;
  #phoneNumber: string;

  #multiFactor: MultiFactorSettings;

  #profilePhoto: {
    url: string | null;
    displayName: string | null;
  };

  /**
   * Creates an instance of the user class.
   * @param {Object} data {{[key: string]: unknown}} - The user data.
   * @param {DataSource} dataSource - The data sourced from application or datastore
   *
   */
  constructor(data: {[key: string]: unknown}, dataSource = DataSource.Application) {
    const isValidE164 = (phoneNumber: string): boolean => {
      const e164Regex = /^\+?[1-9]\d{1,14}$/;
      return e164Regex.test(phoneNumber);
    };

    if (data == null) {
      throw new ErrorEx(ErrorCodes.INVALID_PARAMETERS, `Invalid data |${data}|. Null or undefined data found`);
    }

    if (dataSource === DataSource.Application) {
      // Validate email
      if ((!(data as { emailId: string })?.emailId?.trim())) {
        console.error(`Invalid data |${JSON.stringify(data)}|`);
        console.error(` Email id |${data.emailId}| is required.`);
        throw new ErrorEx(
          ErrorCodes.INVALID_PARAMETERS,
          `EmailId |${data.emailId}| is required.`,
        );
      }

      // Validate firstName and lastName
      if ((!(data as { firstName: string })?.firstName?.trim() || !(data as { lastName: string })?.lastName?.trim())) {
        console.error(`Invalid data |${JSON.stringify(data)}|`);
        console.error(`Both first name |${data.firstName}| and last name |${data.lastName}| are required`);
        throw new ErrorEx(
          ErrorCodes.INVALID_PARAMETERS,
          `Both first name |${data.firstName}| and last name |${data.lastName}| are required`,
        );
      }

      // Validate phoneNumber
      if (!(data as { phoneNumber: string })?.phoneNumber?.trim() || !isValidE164((data as { phoneNumber: string })?.phoneNumber)) {
        console.error(`Invalid data |${JSON.stringify(data)}|`);
        console.error(`Phone Number |${data.phoneNumber}| is required and must be a E.164 complaint phone number.`);
        throw new ErrorEx(
          ErrorCodes.INVALID_PARAMETERS,
          `Phone Number |${data.phoneNumber}| is required and must be a E.164 complaint phone number.`,
        );
      }
    } else {
      if (!(data as {uid: string})?.uid?.trim()) {
        console.error(`Invalid data |${JSON.stringify(data)}|`);
        console.error(`Id |${data.uid}| is required`);
        throw new ErrorEx(
          ErrorCodes.INVALID_PARAMETERS,
          `Id |${data.uid}| is required`,
        );
      }
    }

    const record = data;

    this.#id = (dataSource === DataSource.Application) ?
      (record as {id: string})?.id || (record as {emailId: string})?.emailId :
      (record as { uid: string })?.uid;

    this.#emailId = (dataSource === DataSource.Application) ?
      (record as {emailId: string})?.emailId || "":
      (record as {email: string})?.email || "";

    this.#emailVerified = (record as {emailVerified: boolean})?.emailVerified || false;

    this.#firstName = (dataSource === DataSource.Application) ?
      Helper.capitalizedString((record as {firstName: string})?.firstName ) || "" :
      Helper.capitalizedString(Helper.extractFirstName((record as {displayName: string})?.displayName)) || "";

    this.#lastName = (dataSource === DataSource.Application) ?
      Helper.capitalizedString((record as {lastName: string})?.lastName ) || "" :
      Helper.capitalizedString(Helper.extractLastName((record as {displayName: string})?.displayName)) || "";

    this.#phoneNumber = (record as {phoneNumber: string})?.phoneNumber || "";

    const multiFactor = (data as { multiFactor: MultiFactorSettings })?.multiFactor;
    const multiFactorPhoneNumber = (dataSource === DataSource.Application) ?
      (record as {multiFactorPhoneNumber: string})?.multiFactorPhoneNumber || (record as {phoneNumber: string})?.phoneNumber || "" :
      (multiFactor && multiFactor?.enrolledFactors && multiFactor?.enrolledFactors?.length > 0 ?
        multiFactor?.enrolledFactors[0].phoneNumber : "");

    this.#multiFactor = multiFactor && multiFactor?.enrolledFactors && multiFactor?.enrolledFactors?.length > 0 ?
      {...multiFactor,
        enrolledFactors: multiFactor.enrolledFactors.map((factor: PhoneMultiFactorInfo, index: number) =>
          index === 0 ? {...factor, phoneNumber: multiFactorPhoneNumber} : factor
        ),
      } :
      {
        enrolledFactors: [{
          phoneNumber: multiFactorPhoneNumber,
          displayName: "Primary phone number",
          factorId: "phone", // PhoneMultiFactorGenerator.FACTOR_ID
        }],
      };

    this.#profilePhoto = {
      url: (dataSource === DataSource.Application) ?
        (record?.profilePhoto as { url?: string })?.url ?? null:
        (record as {photoURL: string})?.photoURL ?? null,
      displayName: (dataSource === DataSource.Application) ?
        (record?.profilePhoto as { displayName?: string })?.displayName ?? (`${record?.firstName || ""} ${record?.lastName || ""}`.trim() ?? null):
        ((record as { displayName?: string })?.displayName) ?? null,
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
   * Flag indicating if the email is verified
   *
   * @type {boolean}
   */
  get emailVerified(): boolean {
    return this.#emailVerified;
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
   * The user's phone number iused for multi factor authntication, if not defined user';s phone number is used
   *
   * @type {string| null}
   */
  get multiFactorPhoneNumber(): string {
    return (this.#multiFactor?.enrolledFactors && this.#multiFactor?.enrolledFactors.length > 0) ?
      (this.#multiFactor?.enrolledFactors[0] as PhoneMultiFactorInfo).phoneNumber : this.#phoneNumber || "";
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
    const {id, emailId, firstName, lastName, phoneNumber, multiFactorPhoneNumber, profilePhoto, ...rest} = fullJson;

    const multiFactor = this.#multiFactor && this.#multiFactor?.enrolledFactors && this.#multiFactor?.enrolledFactors?.length > 0 ?
      {...this.#multiFactor,
        enrolledFactors: this.#multiFactor.enrolledFactors.map((factor: PhoneMultiFactorInfo, index: number) =>
          index === 0 ? {...factor, phoneNumber: multiFactorPhoneNumber} : factor
        ),
      } :
      {
        enrolledFactors: [{
          phoneNumber: multiFactorPhoneNumber,
          displayName: "Primary phone number",
          factorId: "phone", // PhoneMultiFactorGenerator.FACTOR_ID
        }],
      };

    const profileURL = (profilePhoto as {url: string})?.url?.trim() || null;

    // Return the JSON object excluding the `id` field and rebuildin some other properties
    return {email: emailId, displayName: `${firstName} ${lastName}`, phoneNumber,
      multiFactor, ...rest,
      ...(profileURL ? {profileURL} : {}),
    };
  }

  /**
   * Determines whether the key properties of a user object have been modified compared to a previous state.
   * Forces saving a history of the current record if changes are detected.
   *
   * @param {Object.<string, unknown>} after - The previous state of the user object to compare against.
   * @return {boolean} Returns true if the user object has changes; otherwise, false.
   */
  historyRequired(after: { [key: string]: unknown }): boolean {
    // Ensure that all keys are checked and compared correctly
    return (
      this.#id !== after.id ||
      this.#emailId !== after.emailId ||
      // this.#firstName !== after.firstName ||
      // this.#lastName !== after.lastName ||
      this.#phoneNumber !== after.phoneNumber ||
      this.multiFactorPhoneNumber === after.multiFactorPhoneNumber // ||
      // this.profilePhoto.url !== after.profilePhoto.url ||
      // this.profilePhoto.displayName !== after.profilePhoto.displayName ||
    );
  }
}
