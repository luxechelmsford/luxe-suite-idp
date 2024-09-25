// import {RelatedEntitiesImpl} from "./relatedEntitiesImpl";
// import {RelatedEntities} from "../interfaces/relatedEntities";
import crypto from "crypto";
import {ErrorCodes, ErrorEx} from "../../types/errorEx";


/**
 * Implementation of the IUser interface.
 */
export class UserPin {
  #id?: string | null;
  #hashedPin: string | null;

  /**
   * Creates an instance of the user class.
   * @param {Object} data {{[key: string]: unknown}} - The user data.
   */
  constructor(data: {[key: string]: unknown}) {
    if (data == null) {
      throw new ErrorEx(ErrorCodes.INVALID_PARAMETERS, `Invalid data |${data}|. Null or undefined data found`);
    }

    if (!(data as { id: string }).id?.trim()) {
      throw new ErrorEx(
        ErrorCodes.INVALID_PARAMETERS,
        `Email |${data.id}| is required.`,
      );
    }

    if (!(data as { emailId: string }).emailId?.trim()) {
      throw new ErrorEx(
        ErrorCodes.INVALID_PARAMETERS,
        `Email |${data.emailId}| is required.`,
      );
    }

    const record = data;

    const getHashedPin = (str: string): string|null =>{
      return crypto.createHash("sha256").update(str).digest("hex");
    };
    this.#id = (record.id || record.emailId) as string;
    this.#hashedPin = record.pin ? getHashedPin(record.pin + (record as {id: string}).id as string) : null;
  }

  /**
   * Gets the hashed PIN.
   * @return {string | null} Returns the hashed pin
   */
  get hashedPin() : string | null {
    return this.#hashedPin;
  }

  /**
   * Verify the PIN.
   * @param {strung} pin - The PIN to verify
   * @return {boolean} Returns trei if the pin matches or else false
   */
  async verifyPin(pin: string) : Promise<boolean> {
    return ((crypto.createHash("sha256").update(pin + this.#id).digest("hex")) === this.#hashedPin);
  }
}
