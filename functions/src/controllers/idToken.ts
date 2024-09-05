import {Response} from "express";
import {Request} from "../types/extendedTypes";

/**
 * @class Auth
 * @classdesc Handles user login and logout using longlived cookies
 */
export class IdToken {
  /**
   * Retrieves and returns the claims from the currently decoded token.
   * This method is intended to be used after the token has been decoded and
   * stored in the `req.extendedDecodedIdToken` property by middleware.
   *
   * The response includes:
   * - The raw decoded token claims.
   * - The claims formatted as a JSON string.
   * - The host from the request headers.
   *
   * In case of an error, a 500 status code is returned with an error message.
   *
   * @static
   * @async
   * @param {Request} req - The Express request object. Expects `req.extendedDecodedIdToken` to be set by middleware.
   * @param {Response} res - The Express response object.
   * @return {void}
   * @throws {Error} If an error occurs, sends a 500 response with the error message.
   */
  static async getClaims(req: Request, res: Response) {
    try {
      console.debug("in getTokenClaims");
      // Access token claims from the middleware
      const tokenClaims = req.extendedDecodedIdToken;

      res.status(200).send({
        status: "Success",
        data: {
          tokenClaims: tokenClaims,
          extendedDecodedIdToken: req.extendedDecodedIdToken,
          tokenJSON: JSON.stringify(tokenClaims),
          host: req.headers.host,
        },
        code: "auth/success",
        message: "Token decoded successfully!",
      });
    } catch (error) {
      res.status(500).send({
        status: "Failed",
        data: {},
        message: (error as Error).message,
      });
    }
  }
}
