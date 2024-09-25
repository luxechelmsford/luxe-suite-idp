import {auth} from "../../configs/firebase";
import {CookieOptions} from "express";
import {ErrorCodes, ErrorEx} from "../../types/errorEx";


/**
 * Type defining the structure of session cookie options.
 */
export type SessionCookieOptions = {
  currentUid?: string; // Optional, defaults to blank
  csrfCookie?: string; // Optional, defaults to blank
  issueTimestamp?: number; // Optional, default to current timestamp if not provided
  loggedInUser?: {
    uid: string;
    idTokenCookie: string;
  }; // Optional, default to empty array if not provided
  maxAge?: number; // Optional, default to default expiration time if not provided
};

/**
 * Class representing a session cookie implementation.
 */
export class SessionCookie {
  #currentUid: string;
  #csrfCookie: string;
  #issueTimestamp: number;
  #maxAge: number;
  #loggedInUser: {
    uid: string;
    idTokenCookie: string;
  };

  // Define constants
  static DEFAULT_MAX_AGE = 60 * 60 * 24 * 5 * 1000; // 5 days in milliseconds
  static DEFAULT_TIMESTAMP = new Date().getTime(); // Default timestamp

  /**
   * Creates an instance of the `SessionCookieImpl` class.
   *
   * @param {SessionCookieOptions} options - The session cookie data used to initialize the instance.
   * @param {number} [expiresIn=DEFAULT_MAX_AGE] - The expiration time for session cookies in milliseconds. If not provided, defaults to 5 days.
   */
  constructor(options: SessionCookieOptions) {
    this.#currentUid = options.currentUid || ""; // Mandatory
    this.#csrfCookie = options.csrfCookie || ""; // Mandatory
    this.#issueTimestamp = /* options.issueTimestamp ?? */ SessionCookie.DEFAULT_TIMESTAMP; // Default to now
    this.#maxAge = options.maxAge ?? SessionCookie.DEFAULT_MAX_AGE; // Default expiration time if not provided
    this.#loggedInUser = options.loggedInUser ?? {uid: "", idTokenCookie: ""}; // Default to empty array if not provided
  }

  /** Gets the current UID from the session cookie.
   * @return {string} The current UID extracted from the session cookie.
   */
  get currentUid(): string {
    return this.#currentUid;
  }

  /**
   * Gets the CSRF token from the session cookie.
   * @return {string} The CSRF token.
   */
  get csrfCookie(): string {
    return this.#csrfCookie;
  }

  /**
   * Gets the issue timestamp from the session cookie.
   * @return {number} The issue timestamp.
   */
  get issueTimestamp(): number {
    return this.#issueTimestamp;
  }

  /**
   * Gets the logged-in users from the session cookie.
   * @return {number} A read-only array of logged-in users.
   */
  get maxAge(): number {
    return this.#maxAge;
  }

  /**
   * Gets the logged-in users from the session cookie.
   * @return {string} A read-only array of logged-in users.
   */
  get loggedInUser(): {uid: string, idTokenCookie: string} {
    return this.#loggedInUser;
  }

  /**
   * Serializes the instance to a JSON string.
   * @return {string} A JSON string representing the instance.
   */
  toJSON(): string {
    return JSON.stringify({
      currentUid: this.#currentUid,
      csrfCookie: this.#csrfCookie,
      issueTimestamp: this.#issueTimestamp,
      maxAge: this.#maxAge,
      loggedInUser: this.#loggedInUser,
    });
  }

  /**
   * Creates an instance of the SessionCookieImpl class from a JSON string.
   * @param {string} jsonString - A JSON-formatted string representing the session cookie.
   * @return {SessionCookieImpl} An instance of the `SessionCookieImpl` class.
   */
  static parse(jsonString: string): SessionCookieOptions {
    // Parse the JSON string into an object
    const parsed = jsonString ? JSON.parse(jsonString): {};

    // Create and return a new instance of SessionCookie
    return {
      currentUid: parsed.currentUid || "",
      csrfCookie: parsed.csrfCookie || "",
      issueTimestamp: parsed.issueTimestamp || new Date().getTime(),
      loggedInUser: parsed.loggedInUser || {uid: "", idTokenCookie: ""},
      maxAge: parsed.maxAge || SessionCookie.DEFAULT_MAX_AGE,
    };
  }

  /**
   * Generates cookie options with the specified domain.
   *
   * This method returns an object containing cookie options, including the domain to be set for the cookie.
   * The options include security settings like `httpOnly`, `secure`, and `sameSite`, as well as `maxAge`, `domain`, and `path`.
   *
   * @param {string} domain - The domain for which the cookie is valid. This specifies where the cookie should be sent.
   * @return {CookieOptions} An object containing the cookie options.
   * @return {boolean} return.httpOnly - Indicates that the cookie is accessible only by the web server.
   * @return {boolean} return.secure - Indicates that the cookie is only sent over HTTPS when `NODE_ENV` is "production".
   * @return {string} return.sameSite - Restricts the cookie to be sent only in a first-party context (value: "strict").
   * @return {number} return.maxAge - The maximum age of the cookie in milliseconds, used for expiration.
   * @return {string} return.domain - The domain for which the cookie is valid.
   * @return {string} return.path - The path within the domain where the cookie is accessible (value: "/").
   */
  cookieOptions(domain: string) : CookieOptions {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Secure flag for production
      sameSite: "strict",
      maxAge: this.#maxAge,
      domain: domain,
      path: "/",
    };
  }
  /**
   * Switches the current user to a new user identified by the given UID.
   *
   * This method checks if the user with the specified UID exists in the `loggedInUsers` list.
   * If the user exists, it sets the `currentUid` to this UID. If the user does not exist, an error is thrown.
   *
   * @param {string} uid - The UID of the user to switch to.
   * @return {void}
   * @throws {Error} Throws an error if the UID is not present in the `loggedInUsers` list.
   */
  async switchCurrentUid(uid: string): Promise<void> {
    // Retrieve the ID token associated with the UID
    if (!this.#loggedInUser.idTokenCookie) {
      throw new ErrorEx(
        ErrorCodes.SESSION_COOKIE_MISSING_CURRENT_UID,
        `Id Token Cookie missing from the logged in user |${JSON.stringify(this.#loggedInUser)}|.`,
      );
    }

    // Verify the token
    try {
      await auth.verifyIdToken(this.#loggedInUser.idTokenCookie);
    } catch (error) {
      throw new ErrorEx(
        ErrorCodes.SESSON_COOKIE_FAILED_VERIFY,
        `Failed to verify session cookie for the currently logged in user |${JSON.stringify(this.#loggedInUser)}|. Please re-authenticate.`,
      );
    }

    this.#currentUid = uid;

    // adjust maxAge
    const currentTimestamp = new Date().getTime();
    this.#maxAge = this.#issueTimestamp ? (5 * 24 * 60 * 60 * 1000 - (currentTimestamp - this.#issueTimestamp)) : this.#maxAge;
  }

  /**
   * Adds or updates a logged-in user by creating or updating their session cookie.
   *
   * This method first creates a session cookie using the provided `idToken` and then updates the list of logged-in users.
   * If a user with the given UID already exists, their session cookie is updated; otherwise, the user is added to the list.
   *
   * @param {string} uid - The UID of the user to add or update.
   * @param {string} idToken - The ID token used to create the session cookie.
   * @return {Promise<void>} A promise that resolves when the operation is complete.
   * @throws {Error} Throws an error if creating the session cookie fails.
   */
  /*
  async addOrUpdateLoggedInUser(uid: string, idToken: string): Promise<void> {
    console.debug(`In addOrUpdateLoggedInUser: |${uid}| & |${idToken}|`);
    try {
      const idTokenCookie = await auth.createSessionCookie(idToken, {expiresIn: this.maxAge});
      console.debug(`In idTokenCookie: |${idTokenCookie}|`);

      // Check if user already exists
      const index = this.loggedInUsers.findIndex((user) => user.uid === uid);
      console.debug(`In index: |${index}|`);

      if (index !== -1) {
      // User exists, update their idTokenCookie
        console.debug(`updating users: |${index}|`);
        this.#loggedInUsers[index] = {uid, idTokenCookie};
        console.debug("loggedInUsers: |", this.#loggedInUsers, "|");
      } else {
        // User does not exist, add them to the list
        console.debug(`Adding users: |${index}|`);
        this.#loggedInUsers.push({uid, idTokenCookie});
        console.debug("loggedInUsers: |", this.#loggedInUsers, "|");
      }

      // set the currentUId to the passed user
      this.#currentUid = uid;
    } catch (error) {
      console.error("Failed to create session cookie:", error);
    }
  }*/

  /**
   * Switches the current user to a new user identified by the given UID.
   *
   * This method checks if the user with the specified UID exists in the `loggedInUsers` list.
   * If the user exists, it sets the `currentUid` to this UID. If the user does not exist, an error is thrown.
   *
   * @param {string} uid - The UID of the user to switch to.
   * @return {void}
   * @throws {Error} Throws an error if the UID is not present in the `loggedInUsers` list.
   */
  /*
  async switchLoggedInUser(uid: string): Promise<void> {
    // Retrieve the ID token associated with the UID
    const idTokenCookie = this.#loggedInUsers.find((item: {uid: string, idTokenCookie: string}) => item.uid === uid)?.idTokenCookie || "";
    if (!idTokenCookie) {
      throw new ErrorEx(
        ErrorCodes.SESSION_COOKIE_MISSING_CURRENT_UID,
        `Session cookie missing for the provided UID |${uid}|.`,
      );
    }

    // Verify the token
    try {
      await auth.verifyIdToken(idTokenCookie);
    } catch (error) {
      throw new ErrorEx(
        ErrorCodes.SESSON_COOKIE_FAILED_VERIFY,
        `Failed to verify session cookie for the provided UID |${uid}|. Please re-authenticate.`,
      );
    }

    this.#currentUid = uid;

    // adjust maxAge
    const currentTimestamp = new Date().getTime();
    this.#maxAge = this.#issueTimestamp ? (5 * 24 * 60 * 60 * 1000 - (currentTimestamp - this.#issueTimestamp)) : this.#maxAge;
  }*/

  /**
   * Removes a logged-in user by their UID.
   *
   * This method filters out the user with the specified UID from the list of logged-in users.
   * The user will no longer be part of the session data.
   *
   * @param {string} uid - The UID of the user to remove.
   * @return {void}
   */
  /*
  async removeLoggedInUser(uid: string) {
    if (this.#currentUid != uid) {
      throw new ErrorEx(
        ErrorCodes.INVALID_PARAMETERS,
        `The passed UID |${uid}| does not matches to the current logged in usr's uid |${this.#currentUid}|`
      );
    }

    this.#loggedInUsers = this.loggedInUsers.filter((user) => user.uid !== uid);
    this.#currentUid = "";

    if (this.#loggedInUsers.length === 0) {
      this.#maxAge = -1;
    }
  }*/
}
