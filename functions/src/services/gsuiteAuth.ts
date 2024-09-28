import {JWT} from "google-auth-library";
import {ErrorCodes, ErrorEx} from "../types/errorEx";
import {gsuiteServiceAccountEmail, gsuiteServiceAccountPrivateKey} from "../configs/firebase";


/**
 * A client for authenticating with G Suite APIs using a service account.
 *
 * This class configures a JWT client to allow the service account
 * to impersonate a specified user for G Suite API access. The user
 * must have granted the service account permission to act on their
 * behalf via domain-wide delegation.
 */
export class GSuiteAuth {
  #jwt: JWT;
  #globalScopes: string[] = [
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/contacts",
    "https://www.googleapis.com/auth/drive.file",
  ];

  /**
   * Initializes a new instance of the JwtClient class.
   *
   * @param {string} subject - The email address of the user to impersonate.
   *                           This user must have granted the service account
   *                           permission to act on their behalf (via
   *                           domain-wide delegation).
   * @param {string[]} scopes - An array of OAuth 2.0 scopes that specify the
   *                            level of access the client will request.
   *
   * @throws {Error} - Throws an error if the subject is not provided,
   *                   if no scopes are provided, or if any of the provided
   *                   scopes are not in the allowed global scopes list.
   */
  constructor(subject: string, scopes: string[]) {
    if (!subject) {
      console.error("No subject passed:");
      throw new ErrorEx(
        ErrorCodes.INVALID_PARAMETERS,
        `Subject |${subject}| is required`
      );
    }

    if (scopes.length === 0) {
      console.error("No scope passed:");
      throw new ErrorEx(
        ErrorCodes.INVALID_PARAMETERS,
        `Must pass at least one scope |${JSON.stringify(scopes)}|`
      );
    }

    const invalidScopes = scopes.filter(
      (scope) => !this.#globalScopes.includes(scope)
    );

    if (invalidScopes.length > 0) {
      console.error("The following scopes are not valid:", invalidScopes);
      throw new ErrorEx(
        ErrorCodes.INVALID_PARAMETERS,
        `The default service account does not include scopes |${JSON.stringify(
          invalidScopes
        )}|`
      );
    }

    this.#jwt = new JWT({
      email: gsuiteServiceAccountEmail,
      key: gsuiteServiceAccountPrivateKey,
      scopes: scopes,
      subject: subject, // Impersonating the user
    });
  }

  /**
   * Retrieves the list of allowed global OAuth 2.0 scopes for the G Suite client.
   *
   * @return {string[]} The list of allowed global scopes.
   */
  get allowedGlobalScopes(): string[] {
    return this.#globalScopes;
  }

  /**
   * Retrieves the configured JWT client instance.
   *
   * @return {JWT} The JWT client instance configured for G Suite API access.
   */
  get jwt(): JWT {
    return this.#jwt;
  }
}
