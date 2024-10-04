/**
 * Enum representing the different types of user sessions.
 *
 * @enum {string}
 */
export enum SessionType {
  /** Represents a session fully owned by an individual user */
  personal = "Personal",

  /** Represents a shared session associated with a store login */
  store = "Store",
}

/**
 * Interface representing a store user.
 */
export interface AssignedUser {
  uid: string;
  displayName: string;
}


// Define the structure of the provider claims
export interface IProviderClaim {
  id: string; // providerId this custom claims belong to
  roles: string[];
  accessLevel: number;
  sessionType: SessionType;
  /**
   * Indicates the assigned users based on the session type.
   * If the sessionType is 'store', assignedUsers represent users who can be assigned
   * to the store login session (sessionType = user).
   * If the sessionType is 'user', assignedUsers is null.
   */
  assignedUsers: AssignedUser[] | null;
}


// Define the structure of custom claims
export interface ICustomClaims {
  providers?: IProviderClaim[];
  superAdmin?: boolean;
}

