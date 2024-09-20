/**
 * Utility class for constructing Realtime Database paths based on predefined templates.
 * This class provides static methods for each path template, allowing you to build
 * paths with the required parameters.
 */
export class RealtimeDbPathBuilder {
  // Define path templates as constants
  private static readonly PROVIDERS_PATH = "/global/providers";
  private static readonly USERS_PATH = "/providers/{providerId}/userprofiles";
  private static readonly USERPROFILES_PATH = "/providers/{providerId}/userprofiles";

  /**
   * Constructs the path for providers.
   *
   * @return {string} The path for providers.
   */
  static providers(): string {
    return this.PROVIDERS_PATH;
  }

  /**
   * Constructs the path for users.
   *
   * @param {string} providerId - The ID of the provider.
   * @return {string} The path for users with the specified provider ID.
   * @throws {Error} Throws an error if the providerId is not provided.
   */
  static users(providerId: string): string {
    if (!providerId) {
      throw new Error("Missing required parameter: providerId");
    }
    return this.USERS_PATH.replace("{providerId}", providerId);
  }

  /**
   * Constructs the path for user profiles.
   *
   * @param {string} providerId - The ID of the provider.
   * @return {string} The path for user profiles with the specified provider ID.
   * @throws {Error} Throws an error if the providerId is not provided.
   */
  static userprofiles(providerId: string): string {
    if (!providerId) {
      throw new Error("Missing required parameter: providerId");
    }
    return this.USERPROFILES_PATH.replace("{providerId}", providerId);
  }
}
