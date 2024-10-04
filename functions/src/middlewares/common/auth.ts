import {Request, Response, NextFunction} from "express";
import {IExtendedDecodedIdToken} from "../../types/extendedTypes";
import {auth, csrfSecret, SessionCookieOnlyMode} from "../../configs/firebase";
import {ErrorCodes, ErrorEx} from "../../types/errorEx";
import {FirebaseError} from "firebase-admin";
import {SessionCookie} from "./sessionCookie";
import {Fqdn} from "../../utils/fqdn";
import {doubleCsrf} from "csrf-csrf";
import {Provider} from "../provider";
import {SessionType} from "../../types/customClaimsInterface";

/**
 * @class Auth
 * @classdesc Handles user login and logout using longlived cookies
 */
export class Auth {
  /**
   * Generates a CSRF token using the `csurf` middleware.
   *
   * @param {Request} req - The Express request object. Expects the ID token to be provided in the `Authorization` header in the format 'Bearer <token>'.
   * @param {Response} res - The Express response object. Sends a response with status and message based on token verification outcome.
   * @return {Object} A JSON response object.
   * @return {string} The generated CSRF token.
   * @return {void}
   */
  static async generateCsrfToken(req: Request, res: Response) {
    console.debug("generateCsrfToken");
    let csrfToken;
    try {
      // Extract the ID token from the request, which would have been appended by the middleware call to 'verifyIdToken'
      const idToken = req?.headers?.authorization?.split("Bearer ")[1] || "";
      if (!idToken) {
        res.status(401).json({
          status: "Failed",
          code: ErrorCodes.ID_TOKEN_MISSING_TOKEN,
          message: "Must sent a token in the authorization header in the format Bearer <token>",
        });
        return; // Ensure no further processing
      }

      if (!req?.extendedDecodedIdToken || !req?.extendedDecodedIdToken?.auth_time || !req?.extendedDecodedIdToken?.uid ) {
        console.debug(`Middleware failed to atatch extended decoded idtoken |${JSON.stringify(req?.extendedDecodedIdToken)}| to the request`);
        res.status(401).json({
          status: "Failed",
          code: ErrorCodes.AUTH_FAILURE,
          message: `Middleware failed to atatch extended decoded idtoken |${JSON.stringify(req?.extendedDecodedIdToken)}| to the request`,
        });
        return; // Ensure no further processing
      }

      const {generateToken} = doubleCsrf({
        getSecret: (): string => {
          return csrfSecret;
        },
        cookieName: "__csrfCookie",
        cookieOptions: new SessionCookie({}).cookieOptions(new Fqdn(req).root),
        getTokenFromRequest: (req: Request) => {
          const csrfTokenFromHeader = req.headers["X-CSRF-Token"] || req.headers["x-csrf-token"];
          return Array.isArray(csrfTokenFromHeader) ? csrfTokenFromHeader[0] : csrfTokenFromHeader;
        },
      });

      const csrfToken = generateToken(req, res, false, false);

      // read the csrf cookie, as that contains both the token and its hash
      const cookies = res.getHeaders()["set-cookie"];
      if (!cookies) {
        res.status(403).json({
          status: "Failed",
          message: "Failed to read cookies set by the library",
          code: ErrorCodes.CSFR_TOKEN_INVALID,
        });
        return;
      }

      // Extract the value of the specific cookie
      const csrfTokenCookie = (Array.isArray(cookies) ? cookies : [cookies])
        .find((cookie) => cookie.startsWith("__csrfCookie="));

      if (!csrfTokenCookie) {
        res.status(403).json({
          status: "Failed",
          message: "Failed to read csrf cookie from the cookies set by the library",
          code: ErrorCodes.CSFR_TOKEN_INVALID,
        });
        return;
      }

      // Parse the cookie value
      const encodedCsrfCookie = csrfTokenCookie.split(";")[0].split("=")[1];
      const csrfCookie = encodedCsrfCookie ? decodeURIComponent(encodedCsrfCookie) : "";
      console.debug(`Encoded CSRF Cookie: |${encodedCsrfCookie}|`);
      console.debug(`CSRF Cookie: |${csrfCookie}|`);

      if (!csrfCookie) {
        res.status(403).json({
          status: "Failed",
          message: "Failed to generate csrf cookie",
          code: ErrorCodes.CSFR_TOKEN_INVALID,
        });
        return;
      }

      console.debug(`csrfToken: |${csrfToken}| & csrfCookie: |${csrfCookie}|`);

      // As the cloud functions is stateless, lets follow the double cookie pattern
      // where csrf is stored in the cookies and sent back to the client in the header
      // and then client includes it back in the header in all future requests
      // the server then takes the vlaues from the header and the cokkies and comapre to detect csrf atatcks

      // Step-1: include the csrf token in the header
      res.set("X-CSRF-Token", csrfToken);

      // Step-2: store the csrf in the __session cookie
      // This is beacsue
      // the only one cookie with the name "__session" is passed through cloud fucntions scross subdomains
      // so we store all the session related information in the session cookie as json object

      // lets read any existing session cookie
      const __sessionString = (req?.cookies && req?.cookies["__session"]) || "";
      const __session = new SessionCookie({...SessionCookie.parse(__sessionString), csrfCookie});

      console.debug("New session: |", {...SessionCookie.parse(__sessionString), csrfCookie}, "|");
      // only one cookie with the name "__session" is passed through cloud fucntions
      // so we store all the session related information in the session cookie as json object
      const fqdn = new Fqdn(req);
      console.log(`__session: |${__session.toJSON()}, maxAge: |${__session.maxAge}|, root domain: |.${fqdn.root} & subdomain: |${fqdn.domain}|`);

      // Create the session cookie
      res.cookie("__session", __session.toJSON(), __session.cookieOptions(`.${fqdn.root}`));

      console.debug(`Session Cookie set: |${__session.toJSON()}|`);

      // cleanup
      // The double csrf also create a cookie called __csrfCookie
      // lets delete it
      res.cookie("__csrfCookie", "", {...__session.cookieOptions(`.${fqdn.root}`), maxAge: -1});
    } catch (error) {
      console.error("Error creating csrf token:", error);
      res.status(401).json({
        status: "Failed",
        code: (error as FirebaseError).code,
        message: `Failed to createcsrf token! Last error: |${(error as FirebaseError).message}|`,
      });
      return;
    }

    res.status(200).json({
      status: "Success",
      code: "auth/success",
      message: "CSRF generted successful!",
      data: {csrfToken},
    });
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
   * @return {Promise<void>}
   * @throws {Error} If an error occurs during token verification, sends a 401 or 500 response with the error message.
   */
  static async verifyIdToken(req: Request, res: Response, next: NextFunction) {
    // console.debug(`In verifyIdToken with headers |${JSON.stringify(req?.headers)}|`);

    let extendedDecodedIdToken: IExtendedDecodedIdToken | undefined = undefined;
    // console.debug("In verifyIdToken");

    // Check if Authorization header is present and properly formatted
    if (!SessionCookieOnlyMode && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      console.log("Found Authorization header");

      // Extract the ID Token from the Authorization header
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
        console.log(`Decoding id token: |${idToken}|`);
        extendedDecodedIdToken = await auth.verifyIdToken(idToken) as IExtendedDecodedIdToken;
        console.log("ID Token correctly decoded", extendedDecodedIdToken);
      } catch (error) {
        console.error("Error while verifying Firebase ID token from Authorization header:", error);
        res.status((error as FirebaseError).code === "auth/id-token-expired" ? 401 : 500).json({
          status: "Failed",
          code: (error as FirebaseError).code || ErrorCodes.ID_TOKEN_FAILED_DECODE,
          message: `Invalid JWT token from Authorization header. Error: ${(error as Error).message}`,
        });
        return;
      }
    } else if (req.cookies && req.cookies["__session"]) {
      // lets read any existing session cookie
      const __sessionString = (req?.cookies && req?.cookies["__session"]) || "";
      const __session = new SessionCookie(SessionCookie.parse(__sessionString));

      // console.debug(`Session Cookie found: |${__sessionString}|`);

      if (!__session?.currentUid) {
        // Handle missing UID in session cookie
        console.error("No current UID set in the __session cookie");
        res.status(403).json({
          status: "Failed",
          message: `No current user |${__session?.currentUid}|set in the session cookie`,
          code: ErrorCodes.SESSION_COOKIE_MISSING_CURRENT_UID,
        });
        return;
      }

      const idTokenCookie = __session?.idTokenCookie;
      if (!idTokenCookie) {
        // Handle missing token in session cookie
        console.error(`No Firebase token found in the logged in user property |${JSON.stringify(__session?.idTokenCookie)}| of the Session cookie`);
        res.status(403).json({
          status: "Failed",
          message: `Logged in user |${__session?.currentUid}| missing in logged in user property of the |${__session?.idTokenCookie}| of the session cookie`,
          code: ErrorCodes.SESSION_COOKIE_MISSING_LOGGED_IN_USER,
        });
        return;
      }

      // console.log(`Found ID token cookie |${idTokenCookie}|`);
      // console.log(`Found CSRF cookie |${__session?.csrfCookie}|`);

      try {
        // Verify the session cookie
        extendedDecodedIdToken = await auth.verifySessionCookie(idTokenCookie, true /** checkRevoked */) as IExtendedDecodedIdToken;
        // console.log("ID token correctly decoded", extendedDecodedIdToken);
      } catch (error) {
        console.error("Error while verifying Firebase session cookie:", error);
        res.status((error as FirebaseError).code === "auth/id-token-expired" ? 401 : 500).json({
          status: "Failed",
          message: `Invalid session cookie. Error: ${(error as Error).message}`,
          code: (error as FirebaseError).code || ErrorCodes.SESSON_COOKIE_FAILED_VERIFY,
        });
        return;
      }
    } else {
      // No valid token found
      const errorString = `Credentials [${SessionCookieOnlyMode ? "Session Cookie": "ID token or Session Cookie"}] missing`;
      console.error(errorString);
      res.status(403).json({
        status: "Failed",
        message: errorString,
        code: ErrorCodes.AUTH_MISSING_CREDENTIALS,
      });
      return;
    }

    // Ensure that a valid ID token or session cookie was used
    if (!extendedDecodedIdToken) {
      const errorString = `Failed to decode ${SessionCookieOnlyMode ? "Session Cookie": "ID token or Session Cookie"}`;
      console.error(errorString);
      res.status(403).json({
        status: "Failed",
        message: errorString,
        code: ErrorCodes.AUTH_FAILURE,
      });
      return;
    }

    // Attach the decoded token to the request
    req.extendedDecodedIdToken = extendedDecodedIdToken;
    // console.debug(`Decoded ID Token |${JSON.stringify(req.extendedDecodedIdToken)}| attached to the request`);

    // Proceed to the next middleware
    next();
  }

  /**
   * Middleware to protect routes from CSRF attacks.
   * This function checks the CSRF token provided in the request header against
   * the cookie stored in the `__csrfCookie` cookie.
   *
   * If the CSRF tokens match, the request proceeds to the next middleware or
   * route handler. If the tokens do not match or if the token is missing, it
   * responds with an error message and appropriate HTTP status code.
   *
   * @static
   * @param {Request} req - The Express request object. Expected to contain the
   *                         CSRF token in the `X-CSRF-Token` header and the
   *                         CSRF token in the `__csrfCookie` cookie.
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
    const csrfHeaderToken = req.headers["X-CSRF-Token"] || req.headers["x-csrf-token"];

    // lets read any existing session cookie
    const __sessionString = (req?.cookies && req?.cookies["__session"]) || "";
    const __session = new SessionCookie(SessionCookie.parse(__sessionString));

    // console.debug(`Session cookie |${__sessionString}|`);
    // console.debug(`CSFR cookie in session cookie |${__session.csrfCookie}|`);
    // console.debug(`CSFR Token in Header |${csrfHeaderToken}|`);

    // Check if both csrf fields are present
    if (!csrfHeaderToken || !__session.csrfCookie) {
      console.debug(`CSRF protection missing. CSRF header |${csrfHeaderToken}| && CSRF Cookie |${__session.csrfCookie}|`);
      res.status(401).json({
        status: "Failed",
        code: ErrorCodes.CSFR_TOKEN_MISSNG,
        message: "CSRF token is missing",
      });
      return; // Ensure no further processing
    }

    // a bit of a hack
    // the double csrf library reads the csrf from a cookie and the entire context is considered as csrf token and its hash
    // due to the cross domian cookie limitations of firebase funcctions (only one cooke with the name __session can be passed through)
    // we create a fake request object and set two properties cookeis and headers
    const dummyRequest: Partial<Request> = {
      headers: {"x-csrf-token": Array.isArray(csrfHeaderToken) ? csrfHeaderToken[0] : csrfHeaderToken},
      cookies: {"__csrfCookie": __session.csrfCookie},
      signedCookies: {"__csrfCookie": __session.csrfCookie},
    };

    // define the double csrf options
    const fqdn = new Fqdn(req);
    const {validateRequest} = doubleCsrf({
      getSecret: (): string => {
        return csrfSecret;
      },
      cookieName: "__csrfCookie",
      cookieOptions: new SessionCookie({}).cookieOptions(`.${fqdn.root}`),
      getTokenFromRequest: (req: Request) => {
        const csrfTokenFromHeader = req.headers["X-CSRF-Token"] || req.headers["x-csrf-token"];
        return Array.isArray(csrfTokenFromHeader) ? csrfTokenFromHeader[0] : csrfTokenFromHeader;
      },
    });

    if (!validateRequest(dummyRequest as unknown as Request)) {
      console.debug(`CSRF protection failed. CSRF header |${csrfHeaderToken}| && CSRF Cookie |${__session.csrfCookie}|`);
      res.status(403).json({
        status: "Failed",
        code: ErrorCodes.SESSON_COOKIE_FAILED_VERIFY,
        message: "CSRF token failed validation agains the csrf session cookie",
      });
      return; // Ensure no further processing
    }

    console.debug(`CSRF protection |${csrfHeaderToken}| applied successfully`);
    next();
  }


  /**
   * Middleware to validate the provider ID from the request header or body.
   * When valiatinng successfully, the providerId Token content will be added as `req.provider?.id`.
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The Express next function.
   */
  static async validateProviderId(req: Request, res: Response, next: NextFunction) {
    let provider;
    try {
      const providerId = await Provider.findBySubdomain(req) || "";
      if (!providerId) {
        res.status(400).json({
          status: "Failed",
          code: ErrorCodes.PROVIDER_ID_FAILURE,
          message: `The Host |${req.headers.host}| or X-Subdomain header |${req.headers["X-Subdomain"] || req.headers["x-subdomain"]}| cannnot be resolved to a provider id.`,
        });
        return;
      }

      // now check that this users has this providerId in its cusotm claims
      provider = (req.extendedDecodedIdToken?.providers || []).find(
        (item: {id: string}) => item.id === providerId
      );

      // console.debug(`searched for provider: !${JSON.stringify(req.extendedDecodedIdToken)})`);

      if (!provider) {
        // it could be thatb we are trying to create the provider profile,
        // lets give a default provcider profile with no role or accesslevel and let ot create the profile
        provider = {
          id: providerId,
          roles: [],
          accessLevel: 0,
          sessionType: SessionType.personal,
          assignedUsers: [],
        };
        /*
        console.debug(`User does not have access to resources of this provider |${providerId}|`),
        res.status(403).json({
          status: "Failed",
          code: ErrorCodes.PROVIDER_ID_FAILURE,
          message: `User does not have access to resources of this provider |${providerId}|`,
        });
        return;
        */
      }
    } catch (error) {
      console.error(`Failed to validate provider id. Last Error: |${(error as Error).message}|`);
      res.status(400).json({
        status: "Failed",
        message: `Failed to validate provider id. Last Error: |${(error as Error).message}|`,
        code: ErrorCodes.PROVIDER_ID_FAILURE,
      });
      return;
    }

    // attach the found provider to the request object
    req.provider = provider;
    console.debug(`Provider |${JSON.stringify(req.provider)}| attached to the request at validateProviderId`);
    next();
  }


  /**
   * Decorator to enforce role-based or access level-based access control on a method.
   *
   * @param {boolean | null} superAdmin
   *   Id superAdmin privileges is required to access this funtion If null, access control will be based on acceslevl is required.
   * @param {number | null} requiredAccessLevel
   *   The access level required to access the method. If null, access control will be based on roles.
   * @param {string[]} requiredRoles
   *   The roles required to access the method, used only if requiredAccessLevel is null.
   * @return {MethodDecorator} A decorator function.
   */
  static requiresRoleOrAccessLevel(superAdmin: boolean | null, requiredAccessLevel: number | null, requiredRoles: string[] | null): MethodDecorator {
    return function(target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor {
      // console.debug(
      //   `In requiresRoleOrAccessLevel for target |${(target as object)?.constructor.name}:: ${propertyKey.toString()}| with ` +
      //   `requiredAccessLevel |${requiredAccessLevel}| & requiredRoles: |${JSON.stringify(requiredRoles)}|`
      // );

      const originalMethod = descriptor.value;

      descriptor.value = function(request: Request, ...args: unknown[]): unknown {
        if (!request?.provider) {
          throw new ErrorEx(
            ErrorCodes.PROVIDER_ID_FAILURE,
            "No provider attahced to request");
        }

        const currentAccessLevel = request?.provider?.accessLevel ?? 0; // Default to 0 if accessLevel is undefined
        const currentUserRoles = request?.provider?.roles ?? []; // Default to empty array if roles are undefined

        console.debug(`Target |${(target as object)?.constructor.name}:: ${propertyKey.toString()}| ` +
          `with currentAccessLevel: |${currentAccessLevel}| & requiredAccessLevel: |${requiredAccessLevel}|`);

        if (superAdmin !== null) {
          if (!superAdmin || request?.extendedDecodedIdToken?.superAdmin) {
            return originalMethod.apply(this, [request, ...args]);
          } else {
            throw new ErrorEx(
              ErrorCodes.AUTH_FAILURE,
              "Access denied: You do not have the required access level to access this function."
            );
          }
        } else if (requiredAccessLevel !== null) {
          if (requiredAccessLevel <= currentAccessLevel) {
            return originalMethod.apply(this, [request, ...args]);
          } else {
            throw new ErrorEx(
              ErrorCodes.AUTH_FAILURE,
              "Access denied: You do not have the required access level to access this function."
            );
          }
        } else {
          if ((!requiredRoles || requiredRoles.length === 0) || (requiredRoles.length > 0 && currentUserRoles.some((role: string) => requiredRoles.includes(role)))) {
            return originalMethod.apply(this, [request, ...args]);
          } else {
            throw new ErrorEx(
              ErrorCodes.AUTH_FAILURE,
              "Access denied: You do not have the required role(s) to access this function."
            );
          }
        }
      };

      return descriptor;
    };
  }
}
