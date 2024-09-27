/**
 * Utility class for constructing Firestore paths based on predefined templates.
 * This class provides static methods for each path template, allowing you to build
 * paths with the required parameters.
 */
export class FirestorePathBuilder {
  /**
   * Constructs the path for providers.
   *
   * @return {string} The path for users.
   */
  static users(): string {
    return "/users";
  }
}
