import {DecodedIdToken} from "firebase-admin/lib/auth/token-verifier";
import {Request} from "express";

// Define the structure of the provider claims
export interface ProviderClaim {
  id: string;
  admin: boolean;
  roles: string[];
  accessLevel: number;
}

// Define the structure of custom claims
export interface CustomClaims {
  providers?: ProviderClaim[];
  superAdmin?: boolean;
}

// Extend the DecodedIdToken interface
export interface ExtendedDecodedIdToken extends DecodedIdToken, CustomClaims {
  // Optional fields are already included in CustomClaims
}

// Extend the Request interface from express
declare module "express-serve-static-core" {
  interface Request {
    idToken?: string; // Attach the id token to the request object
    extendedDecodedIdToken?: ExtendedDecodedIdToken; // Attach the decoded token to the request object
  }
}

export {DecodedIdToken, Request};
