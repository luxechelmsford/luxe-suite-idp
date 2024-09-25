export const ErrorCodes = {
  ID_TOKEN_EXPIRED: "auth/id-token-expired",
  ID_TOKEN_INVALID: "auth/id-token-invlaid",
  ID_TOKEN_INVALID_CREDENTALS: "auth/id-token-invalid-credentials",
  ID_TOKEN_MISSING_TOKEN: "luxe-suite/id-token-missing-token",
  ID_TOKEN_FAILED_DECODE: "luxe-suite/id-token-failed-decode",
  ID_TOKEN_UNKNOWN_FAILURE: "luxe-suite/id-token-auth-failure",
  SESSION_COOKIE_MISSING_CURRENT_UID: "luxe-suite/session-ccokie-missing-current-uid",
  SESSION_COOKIE_MISSING_LOGGED_IN_USER: "luxe-suite/session-cookie-missing-logged-inuser",
  SESSION_COOKIE_MISSING_CSRF_COOKIE: "luxe-suite/session-cookie-missing-csrf-cookie",
  SESSON_COOKIE_FAILED_VERIFY: "luxe-suite/session-cookie-failed-verify",
  AUTH_FAILURE: "luxe-suite/auth-failure",
  AUTH_UID_EMAIL_MISMATCHED: "luxe-suite/auth-uid-emailId-mismatched",
  AUTH_MISSING_CREDENTIALS: "luxe-suite/auth-missing-credential",
  AUTH_REAUTHENTICATION_REQUIRED: "luxe-suite/auth-reauthentication-required",
  CSRF_TOKEN_FUNCTION_MISSING: "luxe-suite/csfr-token-function-missing",
  CSFR_TOKEN_MISSNG: "luxe-suite/csfr-token-missing",
  CSFR_TOKEN_INVALID: "luxe-suite/csfr-token-invlaid",

  NOT_FOUND: "luxe-suite/not-found",
  INVALID_DATA: "luxe-suite/invalid-data",
  INVALID_METHOD: "luxe-suite/invalid-method",
  INVALID_PARAMETERS: "luxe-suite/invalid-parameters",
  SERVER_ERROR: "luxe-suite/server-error",
  UNKNOWN_ERROR: "luxe-suite/unknwon-error",

  DATABASE_CONSISTENCY_ERROR: "luxe-suite/database-consistency-error",
  RECORD_CREATE_FAILED: "luxe-studio/record-create-failed",
  RECORD_UPDATE_FAILED: "luxe-studio/record-update-failed",
  RECORD_DELETE_FAILED: "luxe-studio/record-delete-failed",
  RECORD_READ_FAILED: "luxe-studio/record-read-failed",
  RECORD_QUERY_FAILED: "luxe-studio/record-query-failed",
  RECORD_ALREADY_EXIST: "luxe-studio/record-already-exist",
  RECORD_NOT_FOUND: "luxe-studio/record-not-found",
  PROVIDER_ID_FAILURE: "luxe-suite/provider-id-failure",
};

/**
* Custom error class that includes an error code and message.
*/
export class ErrorEx extends Error {
  /**
  * The error code.
  * @type {string}
  */
  code: string;

  /**
  * Creates an instance of CustomError.
  * @param {string} code - The error code.
  * @param {string} message - The error message.
  * @param {boolean} consoleLog - Defined if to be logged to the console, defaults to TRUE.
  */
  constructor(code: string, message: string, consoleLog = true) {
    super(message);
    this.code = code;
    this.name = "ErrorEx"; // Custom name for this error type
    // Adjust stack trace to start from this class
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ErrorEx);
    }
    if (consoleLog) {
      console.log(message);
    }
  }
}
