import {Request} from "express";

/**
 * Utility class for extracting protocol, domain and root domian (generally one level down by removeing the subdomain form the domian name)
 * from the various headers (origin, x-forwarded-proto, x-forwarded-host etc.)
 *
 * This class provides static methods to parse the host header in HTTP requests
 * and extract the protocol, domain and root domain. It handles common multi-level domains
 * (e.g., ".co.uk") correctly and can differentiate between domains and root domains.
 */
export class Fqdn {
  // List of common second-level domains
  private static common2ndLevelDomains: string[] = [
    ".co.uk", ".org.uk", ".gov.uk", ".ac.uk", ".com.au", ".net.au",
    ".org.au", ".edu.au", ".com.ca", ".org.ca", ".edu.ca", ".gov.ca",
  ];

  #protocol: string;
  #domain: string;
  #root : string;

  /**
   * Constructs an instance of the class, extracting and processing domain information from the provided request.
   *
   * @param {Request} req - The HTTP request object. This object should include headers that contain domain information.
   *
   * @property {string} #protocol - The protocol extracted from the headers
   * @property {string} #domain - The domain extracted from the headers
   * @property {string} #root - The root domain derived from the domain, excluding common second-level domains if applicable.
   *
   * @example
   * const req = {
   *   headers: {
   *     'x-forwarded-host': 'http://backoffice.localhost.com'
   *   }
   * };
   *
   * const instance = new YourClass(req);
   * console.log(instance.#protocol); // Outputs: 'http'
   * console.log(instance.#domain); // Outputs: 'backoffice.localhost.com'
   * console.log(instance.#root); // Outputs: '.localhost.com'
   */
  constructor(req: Request) {
    // read headers
    const origin = Array.isArray(req?.headers?.["origin"]) ?
      req?.headers?.["origin"][0] : req?.headers?.["origin"];
    const xForwardedProto = Array.isArray(req?.headers?.["x-forwarded-proto"]) ?
      req?.headers?.["x-forwarded-proto"][0] : req?.headers?.["x-forwarded-proto"];
    const host = Array.isArray(req?.headers?.["x-forwarded-host"]) ?
      req?.headers?.["x-forwarded-host"][0] : req?.headers?.["x-forwarded-host"] || "backoffice.theluxestudio.co.uk";

    console.debug(`origin: |${origin}|, xForwardedProto: |${xForwardedProto}| & host: |${host}|`);

    // now lets set the protocol
    const protocolFromOrigin = origin?.split("://")[0] || "";
    this.#protocol = protocolFromOrigin && (protocolFromOrigin.toLowerCase() === "http" || protocolFromOrigin.toLowerCase() === "https") ?
      protocolFromOrigin : (xForwardedProto || "https");

    console.debug(`protocol set: |${this.#protocol}|`);

    // let set the domain
    const domainFromOrigin = origin?.replace(/^(https?:\/\/)/, "").replace(/(:\d+)?$/, ""); // strip the protocol and ports
    const domainFromHost = host?.replace(/^(https?:\/\/)/, "").replace(/(:\d+)?$/, ""); // strip the protocol and ports
    this.#domain = domainFromOrigin || domainFromHost || "";

    console.debug(`Domain set: |${this.#domain}|`);

    // now get the root
    const domainParts = this.#domain.split("."); // now split the domain into parts

    // now let's get the root domain
    // Remove the first part (suddomain)
    domainParts.shift();

    // Join remaining parts and check if it's a common 2nd level domain
    this.#root = domainParts.length > 1 && !Fqdn.common2ndLevelDomains.includes(`.${domainParts.join(".")}`) ?
      domainParts.join(".") : this.#domain;

    console.debug(`Root domain found: |${this.#root}|`);
  }

  /**
   * Gets the protocol (http or https) extracted from the request.
   *
   * @return {string} The protocol extracted from the `x-forwarded-host` header or from the `"https://backoffice.theluxestudio.co.uk"`.
   *
   * @example
   * const instance = new YourClass(req);
   * console.log(instance.protocol); // Outputs: 'https'
   */
  get protocol() {
    return this.#protocol;
  }

  /**
   * Gets the domain extracted from the various headres of the request.
   *
   * @return {string} The domain extracted from the `x-forwarded-host` header or defaulted to `"backoffice.theluxestudio.co.uk"`, with protocol and port stripped.
   *
   * @example
   * const instance = new YourClass(req);
   * console.log(instance.domain); // Outputs: 'bacloffice.localhost.com'
   */
  get domain() {
    return this.#domain;
  }

  /**
   * Gets the root domain derived from the domain (by just removing the subdomain).
   *
   * The root domain is determined by removing the subdomain and checking against common second-level domains.
   * If the resulting domain is not a common second-level domain, it is returned with a leading dot (`.`).
   * Otherwise, the original domain is returned.
   *
   * @return {string} The root domain, or the original domain if the root domain is a common second-level domain.
   *
   * @example
   * const instance = new YourClass(req);
   * console.log(instance.root); // Outputs: '.localhost.com' or 'backoffice.localhost.com'
   */
  get root() {
    return this.#root;
  }
}
