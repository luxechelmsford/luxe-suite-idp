import {DecodedIdToken} from "firebase-admin/lib/auth/token-verifier";
import {Request} from "express";
import {IProviderClaim, ICustomClaims} from "./customClaimsInterface";


// Extend the DecodedIdToken interface
export interface IExtendedDecodedIdToken extends DecodedIdToken, ICustomClaims {
  // Optional fields are already included in ICustomClaims
}

// Extend the Request interface from express
declare module "express-serve-static-core" {
  interface Request {
    currentUid?: string; // Attach the current UID to the request object
                         // Could be different from the one inside extendedDecodedIdToken for store login session
    provider?: IProviderClaim;
    extendedDecodedIdToken?: IExtendedDecodedIdToken; // Attach the decoded token to the request object
  }
}

export {DecodedIdToken, Request};
