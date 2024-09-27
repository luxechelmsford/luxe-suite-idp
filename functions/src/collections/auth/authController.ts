import {Request, Response} from "express";
import {ErrorCodes} from "../../types/errorEx";

/**
 * @class AuthController
 * @classdesc handles auth related web services end point.
 */
export class AuthController {
  /**
   * Fetches a auth from the Firebase Realtime Database based on either its ID or subdomain.
   *
   * @param {Request} req - The Express request object. Expects `req.extendedDecodedIdToken` to be set by middleware.
   * @param {Response} res - The Express response object.
   * @param {string} authIdOrSubdomain - The auth ID or subdomain to search for.
   * @return {Promise<unknown>} - A promise that resolves to the auth data with the ID field added, or `null` if not found.
   *
   * Dropping the access level to 0 is required to allow newly registered users to get through this
   */
  async decodeToken(req: Request, res: Response): Promise<unknown> {
    console.debug("in decodedToken");

    // Extract the decoded token from the request, which would have been appended by the middleware call to 'verifyIdToken'
    const authId = req?.provider?.id || ""; // Auth object would have been attached to the request at validateAuthId
    if (!authId) {
      console.debug(`No Provider found: |${JSON.stringify(req?.provider)}|`);
      res.status(403).json({
        status: "Failed",
        code: ErrorCodes.PROVIDER_ID_FAILURE,
        message: "No provider found atatched to the request.",
      });
      return;
    }

    console.debug(`Provider Id found: |${authId}|`);

    res.status(200).json({
      status: "Success",
      data: {
        idToken: req?.idToken,
        extendedDecodedIdToken: req?.extendedDecodedIdToken,
      },
      code: "auth/success",
      message: "Token successfully verified and decoded!",
    });
    console.debug(`Rurturning Auth Id: |${authId}|`);
    return;
  }
}
