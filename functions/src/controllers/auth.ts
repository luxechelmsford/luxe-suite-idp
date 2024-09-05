import {Request, Response, NextFunction} from "express";
import {ExtendedDecodedIdToken} from "../types/extendedTypes";
import {idpAuth} from "../configs/firebase";
import {ErrorCodes} from "../types/errorEx";
import {FirebaseError} from "firebase-admin";

/**
 * @class Auth
 * @classdesc Handles user login and logout using longlived cookies
 */
export class Auth {
  /**
   * Middleware to protect routes from CSRF attacks.
   * This function checks the CSRF token provided in the request header against
   * the token stored in the `csrf-token` cookie.
   *
   * If the CSRF tokens match, the request proceeds to the next middleware or
   * route handler. If the tokens do not match or if the token is missing, it
   * responds with an error message and appropriate HTTP status code.
   *
   * @static
   * @param {Request} req - The Express request object. Expected to contain the
   *                         CSRF token in the `X-CSRF-Token` header and the
   *                         CSRF token in the `csrf-token` cookie.
   * @param {Response} res - The Express response object used to send a response
   *                          back to the client if the CSRF token is missing or invalid.
   * @param {NextFunction} next - The next middleware function to call if the
   *                               CSRF token is valid.
   * @return {void} This function does not return a value. Instead, it either
   *                  calls `next()` to proceed to the next middleware/handler or
   *                  sends a response with an appropriate HTTP status code and error message.
   */
  static applyCsrfProtection(req: Request, res: Response, next: NextFunction) {
    // Retrieve CSRF token from request headers and cookies
    const csrfHeaderToken = req.headers["X-CSRF-Token"] as string | undefined;
    const csrfCookieToken = req.cookies["csrf-token"];

    console.debug(`CSFR Token in Header |${csrfHeaderToken}|`);
    console.debug(`CSFR Token in Cookie |${csrfCookieToken}|`);

    // Check if both tokens are present
    if (!csrfHeaderToken || !csrfCookieToken) {
      console.debug(`CSRF protection missing. CSRF header |${csrfHeaderToken}| && CSRF Cookie |${csrfCookieToken}|`);
      res.status(401).json({
        status: "Failed",
        code: ErrorCodes.CSFR_TOKEN_MISSNG,
        message: "CSRF token is missing",
      });
      return; // Ensure no further processing
    }

    // Compare tokens
    if (csrfHeaderToken !== csrfCookieToken) {
      console.debug(`CSRF protection failed. CSRF header |${csrfHeaderToken}| && CSRF Cookie |${csrfCookieToken}|`);
      res.status(403).json({
        status: "Failed",
        code: ErrorCodes.CSFR_TOKEN_INVALID,
        message: "Invalid CSRF token",
      });
      return; // Ensure no further processing
    }

    console.debug(`CSRF protection |${csrfHeaderToken}| applied successfully`);
    next();
  }


  /**
   * Verifies the ID token extracted from the `Authorization` header.
   * This method checks if the token is valid and extracts the token claims using Firebase Admin SDK.
   *
   * If the token is missing or invalid, it returns a 401 or 500 response with an appropriate error message.
   * In case of successful verification, it will call `next()` to proceed to the next middleware or route handler.
   *
   * @static
   * @async
   * @param {Request} req - The Express request object. Expects the ID token to be provided in the `Authorization` header in the format 'Bearer <token>'.
   * @param {Response} res - The Express response object. Sends a response with status and message based on token verification outcome.
   * @param {NextFunction} next - The Express next function. Calls the next middleware or route handler if the token is successfully verified.
   * @return {void}
   * @throws {Error} If an error occurs during token verification, sends a 401 or 500 response with the error message.
   */
  static async verifyIdToken(req: Request, res: Response, next: NextFunction) {
    let extendedDecodedIdToken: ExtendedDecodedIdToken | undefined = undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      console.log("Found \"Authorization\" header");
      // Extract the ID Token from the Authorization header.
      const idToken = req.headers.authorization.split("Bearer ")[1];
      if (!idToken) {
        res.status(401).json({
          status: "Failed",
          code: ErrorCodes.ID_TOKEN_MISSING_TOKEN,
          message: "Must sent a token in the authorization header in the format Bearer <token>",
        });
        return; // Ensure no further processing
      }

      try {
        // Verify the ID Token
        extendedDecodedIdToken = await idpAuth.verifyIdToken(idToken) as ExtendedDecodedIdToken;
        console.log("ID Token correctly decoded", extendedDecodedIdToken);
      } catch (error) {
        console.error("Error while verifying Firebase ID token from Authorization header:", error);
        res.status((error as FirebaseError).code === "auth/id-token-expired" ? 401 : 500).json({
          status: "failed",
          code: (error as FirebaseError).code || ErrorCodes.ID_TOKEN_FAILED_DECODE,
          message: `Invalid JWT token from Authorization header. Error: ${(error as Error).message}`,
        });
        return;
      }
    } else if (req.cookies && req.cookies["__session"]) {
      // Retrieve the current session cookie
      // lets read any existing session cookie
      const __sessionString = (req.cookies && req.cookies["__session"]) || "";
      const __session = __sessionString ? JSON.parse(__sessionString) : {idTokenCookies: []};
      console.debug(`Session Cookie found: |${__sessionString}|`);

      if (!__session?.currentUid) {
        // No valid token found
        console.error("No current uid set in the __session cookie");
        res.status(403).json({
          status: "failed",
          message: "Session cookie missing",
          code: ErrorCodes.SESSION_COOKIE_MISSING_CURRENT_UID,
        });
        return;
      }

      const idTokenCookie = __session?.idTokenCookies?.find((item: {uid: string, idTokenCookie: string}) =>
        item.uid === __session?.currentUid
      )?.idTokenCookie || "";

      if (!idTokenCookie) {
        // No valid token found
        console.error("No Firebase token found in the Session cookie");
        res.status(403).json({
          status: "failed",
          message: "Session cookie missing",
          code: ErrorCodes.SESSION_COOKIE_MISSING_ID_TOKEN,
        });
        return;
      }

      console.log(`Found id token cookie |${idTokenCookie}|`);
      console.log(`Found csrf token |${__session?.csrfToken}|`);

      // Decode the ID Token
      try {
        // Verify the session cookie
        extendedDecodedIdToken = await idpAuth.verifySessionCookie(idTokenCookie, true /** checkRevoked */) as ExtendedDecodedIdToken;
        console.log("Id token correctly decoded", extendedDecodedIdToken);
      } catch (error) {
        console.error("Error while verifying Firebase session cookie:", error);
        res.status((error as FirebaseError).code === "auth/id-token-expired" ? 401 : 500).json({
          status: "failed",
          message: `Invalid session cookie. Error: ${(error as Error).message}`,
          code: (error as FirebaseError).code || ErrorCodes.SESSON_COOKIE_FAILED_VERIFY,
        });
        return;
      }
    } else {
      // No valid token found
      console.error("No Firebase token or Session cookie found");
      res.status(403).json({
        status: "failed",
        message: "Session cookie missing",
        code: ErrorCodes.AUTH_MISSING_CREDENTIALS,
      });
      return;
    }

    // Ensure that a valid ID token or session cookie was used
    if (!extendedDecodedIdToken) {
      console.error("Failed to decode ID token or session cookie");
      res.status(403).json({
        status: "failed",
        message: "Invalid or missing id token or session cookie",
        code: ErrorCodes.AUTH_MISSING_CREDENTIALS,
      });
      return;
    }

    // Attach the token and decoded token to the request
    req.extendedDecodedIdToken = extendedDecodedIdToken;

    console.debug(`Decoded Id Token |${JSON.stringify(req.extendedDecodedIdToken)}| attached to the request`);
    next();
  }
}
