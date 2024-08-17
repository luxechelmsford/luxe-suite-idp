import {Response, NextFunction} from "express";
import {auth} from "../configs/firebase";
import {ExtendedDecodedIdToken, Request} from "../definitions/extendedTypes";

/**
 * Middleware function to verify Firebase ID token from the request headers.
 * If the token is valid, it attaches the decoded token to the request object.
 *
 * @param {Request} req - The request object with potentially an Authorization header containing the ID token.
 * @param {Response} res - The response object used to send an error status if the token is invalid.
 * @param {NextFunction} next - The next middleware function to proceed if the token is valid.
 * @return {Promise<void>} A promise that resolves when the middleware function completes.
 */
export async function verifyIdToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract the ID token from the Authorization header
    const idToken = req.headers.authorization?.split("Bearer ")[1];
    if (!idToken) {
      res.status(401).send("Must sent a token in the authorization header in the format Bearer <token>");
      return; // Ensure no further processing
    }

    // Verify the ID token using Firebase Admin SDK
    const decodedToken: ExtendedDecodedIdToken = await auth.verifyIdToken(idToken);

    // Attach the decoded token to the request object
    req.currentDecodedToken = decodedToken;

    // Proceed to the next middleware
    next();
  } catch (error) {
    console.error("Error verifying ID token:", error);
    res.status(401).send("Unauthorized:  " + (error as Error).message);
  }
}


// GET Token Claims
export const getTokenClaims = async (req: Request, res: Response) => {
  try {
    // Access token claims from the middleware
    const tokenClaims = req.currentDecodedToken;

    res.status(200).send({
      status: "Success",
      currentDecodedToken: req.currentDecodedToken,
      tokenClaims: tokenClaims,
      tokenJSON: JSON.stringify(tokenClaims),
      host: req.headers.host,
    });
  } catch (error) {
    res.status(500).send({
      status: "Failed",
      tokenClaims: {},
      message: (error as Error).message,
    });
  }
};
