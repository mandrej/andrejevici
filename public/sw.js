importScripts('/firebase-messaging-sw.js');
"use strict";
(() => {
  // node_modules/workbox-core/_version.js
  try {
    self["workbox:core:7.4.0"] && _();
  } catch (e) {
  }

  // node_modules/workbox-core/_private/logger.js
  var logger = false ? null : (() => {
    if (!("__WB_DISABLE_DEV_LOGS" in globalThis)) {
      self.__WB_DISABLE_DEV_LOGS = false;
    }
    let inGroup = false;
    const methodToColorMap = {
      debug: `#7f8c8d`,
      log: `#2ecc71`,
      warn: `#f39c12`,
      error: `#c0392b`,
      groupCollapsed: `#3498db`,
      groupEnd: null
      // No colored prefix on groupEnd
    };
    const print = function(method, args) {
      if (self.__WB_DISABLE_DEV_LOGS) {
        return;
      }
      if (method === "groupCollapsed") {
        if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
          console[method](...args);
          return;
        }
      }
      const styles = [
        `background: ${methodToColorMap[method]}`,
        `border-radius: 0.5em`,
        `color: white`,
        `font-weight: bold`,
        `padding: 2px 0.5em`
      ];
      const logPrefix = inGroup ? [] : ["%cworkbox", styles.join(";")];
      console[method](...logPrefix, ...args);
      if (method === "groupCollapsed") {
        inGroup = true;
      }
      if (method === "groupEnd") {
        inGroup = false;
      }
    };
    const api = {};
    const loggerMethods = Object.keys(methodToColorMap);
    for (const key of loggerMethods) {
      const method = key;
      api[method] = (...args) => {
        print(method, args);
      };
    }
    return api;
  })();

  // node_modules/workbox-core/models/messages/messages.js
  var messages = {
    "invalid-value": ({ paramName, validValueDescription, value }) => {
      if (!paramName || !validValueDescription) {
        throw new Error(`Unexpected input to 'invalid-value' error.`);
      }
      return `The '${paramName}' parameter was given a value with an unexpected value. ${validValueDescription} Received a value of ${JSON.stringify(value)}.`;
    },
    "not-an-array": ({ moduleName, className, funcName, paramName }) => {
      if (!moduleName || !className || !funcName || !paramName) {
        throw new Error(`Unexpected input to 'not-an-array' error.`);
      }
      return `The parameter '${paramName}' passed into '${moduleName}.${className}.${funcName}()' must be an array.`;
    },
    "incorrect-type": ({ expectedType, paramName, moduleName, className, funcName }) => {
      if (!expectedType || !paramName || !moduleName || !funcName) {
        throw new Error(`Unexpected input to 'incorrect-type' error.`);
      }
      const classNameStr = className ? `${className}.` : "";
      return `The parameter '${paramName}' passed into '${moduleName}.${classNameStr}${funcName}()' must be of type ${expectedType}.`;
    },
    "incorrect-class": ({ expectedClassName, paramName, moduleName, className, funcName, isReturnValueProblem }) => {
      if (!expectedClassName || !moduleName || !funcName) {
        throw new Error(`Unexpected input to 'incorrect-class' error.`);
      }
      const classNameStr = className ? `${className}.` : "";
      if (isReturnValueProblem) {
        return `The return value from '${moduleName}.${classNameStr}${funcName}()' must be an instance of class ${expectedClassName}.`;
      }
      return `The parameter '${paramName}' passed into '${moduleName}.${classNameStr}${funcName}()' must be an instance of class ${expectedClassName}.`;
    },
    "missing-a-method": ({ expectedMethod, paramName, moduleName, className, funcName }) => {
      if (!expectedMethod || !paramName || !moduleName || !className || !funcName) {
        throw new Error(`Unexpected input to 'missing-a-method' error.`);
      }
      return `${moduleName}.${className}.${funcName}() expected the '${paramName}' parameter to expose a '${expectedMethod}' method.`;
    },
    "add-to-cache-list-unexpected-type": ({ entry }) => {
      return `An unexpected entry was passed to 'workbox-precaching.PrecacheController.addToCacheList()' The entry '${JSON.stringify(entry)}' isn't supported. You must supply an array of strings with one or more characters, objects with a url property or Request objects.`;
    },
    "add-to-cache-list-conflicting-entries": ({ firstEntry, secondEntry }) => {
      if (!firstEntry || !secondEntry) {
        throw new Error(`Unexpected input to 'add-to-cache-list-duplicate-entries' error.`);
      }
      return `Two of the entries passed to 'workbox-precaching.PrecacheController.addToCacheList()' had the URL ${firstEntry} but different revision details. Workbox is unable to cache and version the asset correctly. Please remove one of the entries.`;
    },
    "plugin-error-request-will-fetch": ({ thrownErrorMessage }) => {
      if (!thrownErrorMessage) {
        throw new Error(`Unexpected input to 'plugin-error-request-will-fetch', error.`);
      }
      return `An error was thrown by a plugins 'requestWillFetch()' method. The thrown error message was: '${thrownErrorMessage}'.`;
    },
    "invalid-cache-name": ({ cacheNameId, value }) => {
      if (!cacheNameId) {
        throw new Error(`Expected a 'cacheNameId' for error 'invalid-cache-name'`);
      }
      return `You must provide a name containing at least one character for setCacheDetails({${cacheNameId}: '...'}). Received a value of '${JSON.stringify(value)}'`;
    },
    "unregister-route-but-not-found-with-method": ({ method }) => {
      if (!method) {
        throw new Error(`Unexpected input to 'unregister-route-but-not-found-with-method' error.`);
      }
      return `The route you're trying to unregister was not  previously registered for the method type '${method}'.`;
    },
    "unregister-route-route-not-registered": () => {
      return `The route you're trying to unregister was not previously registered.`;
    },
    "queue-replay-failed": ({ name }) => {
      return `Replaying the background sync queue '${name}' failed.`;
    },
    "duplicate-queue-name": ({ name }) => {
      return `The Queue name '${name}' is already being used. All instances of backgroundSync.Queue must be given unique names.`;
    },
    "expired-test-without-max-age": ({ methodName, paramName }) => {
      return `The '${methodName}()' method can only be used when the '${paramName}' is used in the constructor.`;
    },
    "unsupported-route-type": ({ moduleName, className, funcName, paramName }) => {
      return `The supplied '${paramName}' parameter was an unsupported type. Please check the docs for ${moduleName}.${className}.${funcName} for valid input types.`;
    },
    "not-array-of-class": ({ value, expectedClass, moduleName, className, funcName, paramName }) => {
      return `The supplied '${paramName}' parameter must be an array of '${expectedClass}' objects. Received '${JSON.stringify(value)},'. Please check the call to ${moduleName}.${className}.${funcName}() to fix the issue.`;
    },
    "max-entries-or-age-required": ({ moduleName, className, funcName }) => {
      return `You must define either config.maxEntries or config.maxAgeSecondsin ${moduleName}.${className}.${funcName}`;
    },
    "statuses-or-headers-required": ({ moduleName, className, funcName }) => {
      return `You must define either config.statuses or config.headersin ${moduleName}.${className}.${funcName}`;
    },
    "invalid-string": ({ moduleName, funcName, paramName }) => {
      if (!paramName || !moduleName || !funcName) {
        throw new Error(`Unexpected input to 'invalid-string' error.`);
      }
      return `When using strings, the '${paramName}' parameter must start with 'http' (for cross-origin matches) or '/' (for same-origin matches). Please see the docs for ${moduleName}.${funcName}() for more info.`;
    },
    "channel-name-required": () => {
      return `You must provide a channelName to construct a BroadcastCacheUpdate instance.`;
    },
    "invalid-responses-are-same-args": () => {
      return `The arguments passed into responsesAreSame() appear to be invalid. Please ensure valid Responses are used.`;
    },
    "expire-custom-caches-only": () => {
      return `You must provide a 'cacheName' property when using the expiration plugin with a runtime caching strategy.`;
    },
    "unit-must-be-bytes": ({ normalizedRangeHeader }) => {
      if (!normalizedRangeHeader) {
        throw new Error(`Unexpected input to 'unit-must-be-bytes' error.`);
      }
      return `The 'unit' portion of the Range header must be set to 'bytes'. The Range header provided was "${normalizedRangeHeader}"`;
    },
    "single-range-only": ({ normalizedRangeHeader }) => {
      if (!normalizedRangeHeader) {
        throw new Error(`Unexpected input to 'single-range-only' error.`);
      }
      return `Multiple ranges are not supported. Please use a  single start value, and optional end value. The Range header provided was "${normalizedRangeHeader}"`;
    },
    "invalid-range-values": ({ normalizedRangeHeader }) => {
      if (!normalizedRangeHeader) {
        throw new Error(`Unexpected input to 'invalid-range-values' error.`);
      }
      return `The Range header is missing both start and end values. At least one of those values is needed. The Range header provided was "${normalizedRangeHeader}"`;
    },
    "no-range-header": () => {
      return `No Range header was found in the Request provided.`;
    },
    "range-not-satisfiable": ({ size, start, end }) => {
      return `The start (${start}) and end (${end}) values in the Range are not satisfiable by the cached response, which is ${size} bytes.`;
    },
    "attempt-to-cache-non-get-request": ({ url, method }) => {
      return `Unable to cache '${url}' because it is a '${method}' request and only 'GET' requests can be cached.`;
    },
    "cache-put-with-no-response": ({ url }) => {
      return `There was an attempt to cache '${url}' but the response was not defined.`;
    },
    "no-response": ({ url, error }) => {
      let message = `The strategy could not generate a response for '${url}'.`;
      if (error) {
        message += ` The underlying error is ${error}.`;
      }
      return message;
    },
    "bad-precaching-response": ({ url, status }) => {
      return `The precaching request for '${url}' failed` + (status ? ` with an HTTP status of ${status}.` : `.`);
    },
    "non-precached-url": ({ url }) => {
      return `createHandlerBoundToURL('${url}') was called, but that URL is not precached. Please pass in a URL that is precached instead.`;
    },
    "add-to-cache-list-conflicting-integrities": ({ url }) => {
      return `Two of the entries passed to 'workbox-precaching.PrecacheController.addToCacheList()' had the URL ${url} with different integrity values. Please remove one of them.`;
    },
    "missing-precache-entry": ({ cacheName, url }) => {
      return `Unable to find a precached response in ${cacheName} for ${url}.`;
    },
    "cross-origin-copy-response": ({ origin }) => {
      return `workbox-core.copyResponse() can only be used with same-origin responses. It was passed a response with origin ${origin}.`;
    },
    "opaque-streams-source": ({ type }) => {
      const message = `One of the workbox-streams sources resulted in an '${type}' response.`;
      if (type === "opaqueredirect") {
        return `${message} Please do not use a navigation request that results in a redirect as a source.`;
      }
      return `${message} Please ensure your sources are CORS-enabled.`;
    }
  };

  // node_modules/workbox-core/models/messages/messageGenerator.js
  var generatorFunction = (code, details = {}) => {
    const message = messages[code];
    if (!message) {
      throw new Error(`Unable to find message for code '${code}'.`);
    }
    return message(details);
  };
  var messageGenerator = false ? fallback : generatorFunction;

  // node_modules/workbox-core/_private/WorkboxError.js
  var WorkboxError = class extends Error {
    /**
     *
     * @param {string} errorCode The error code that
     * identifies this particular error.
     * @param {Object=} details Any relevant arguments
     * that will help developers identify issues should
     * be added as a key on the context object.
     */
    constructor(errorCode, details) {
      const message = messageGenerator(errorCode, details);
      super(message);
      this.name = errorCode;
      this.details = details;
    }
  };

  // node_modules/workbox-core/_private/assert.js
  var isArray = (value, details) => {
    if (!Array.isArray(value)) {
      throw new WorkboxError("not-an-array", details);
    }
  };
  var hasMethod = (object, expectedMethod, details) => {
    const type = typeof object[expectedMethod];
    if (type !== "function") {
      details["expectedMethod"] = expectedMethod;
      throw new WorkboxError("missing-a-method", details);
    }
  };
  var isType = (object, expectedType, details) => {
    if (typeof object !== expectedType) {
      details["expectedType"] = expectedType;
      throw new WorkboxError("incorrect-type", details);
    }
  };
  var isInstance = (object, expectedClass, details) => {
    if (!(object instanceof expectedClass)) {
      details["expectedClassName"] = expectedClass.name;
      throw new WorkboxError("incorrect-class", details);
    }
  };
  var isOneOf = (value, validValues, details) => {
    if (!validValues.includes(value)) {
      details["validValueDescription"] = `Valid values are ${JSON.stringify(validValues)}.`;
      throw new WorkboxError("invalid-value", details);
    }
  };
  var isArrayOfClass = (value, expectedClass, details) => {
    const error = new WorkboxError("not-array-of-class", details);
    if (!Array.isArray(value)) {
      throw error;
    }
    for (const item of value) {
      if (!(item instanceof expectedClass)) {
        throw error;
      }
    }
  };
  var finalAssertExports = false ? null : {
    hasMethod,
    isArray,
    isInstance,
    isOneOf,
    isType,
    isArrayOfClass
  };

  // node_modules/workbox-core/models/quotaErrorCallbacks.js
  var quotaErrorCallbacks = /* @__PURE__ */ new Set();

  // node_modules/workbox-core/_private/cacheNames.js
  var _cacheNameDetails = {
    googleAnalytics: "googleAnalytics",
    precache: "precache-v2",
    prefix: "workbox",
    runtime: "runtime",
    suffix: typeof registration !== "undefined" ? registration.scope : ""
  };
  var _createCacheName = (cacheName) => {
    return [_cacheNameDetails.prefix, cacheName, _cacheNameDetails.suffix].filter((value) => value && value.length > 0).join("-");
  };
  var eachCacheNameDetail = (fn) => {
    for (const key of Object.keys(_cacheNameDetails)) {
      fn(key);
    }
  };
  var cacheNames = {
    updateDetails: (details) => {
      eachCacheNameDetail((key) => {
        if (typeof details[key] === "string") {
          _cacheNameDetails[key] = details[key];
        }
      });
    },
    getGoogleAnalyticsName: (userCacheName) => {
      return userCacheName || _createCacheName(_cacheNameDetails.googleAnalytics);
    },
    getPrecacheName: (userCacheName) => {
      return userCacheName || _createCacheName(_cacheNameDetails.precache);
    },
    getPrefix: () => {
      return _cacheNameDetails.prefix;
    },
    getRuntimeName: (userCacheName) => {
      return userCacheName || _createCacheName(_cacheNameDetails.runtime);
    },
    getSuffix: () => {
      return _cacheNameDetails.suffix;
    }
  };

  // node_modules/workbox-core/_private/cacheMatchIgnoreParams.js
  function stripParams(fullURL, ignoreParams) {
    const strippedURL = new URL(fullURL);
    for (const param of ignoreParams) {
      strippedURL.searchParams.delete(param);
    }
    return strippedURL.href;
  }
  async function cacheMatchIgnoreParams(cache, request, ignoreParams, matchOptions) {
    const strippedRequestURL = stripParams(request.url, ignoreParams);
    if (request.url === strippedRequestURL) {
      return cache.match(request, matchOptions);
    }
    const keysOptions = Object.assign(Object.assign({}, matchOptions), { ignoreSearch: true });
    const cacheKeys = await cache.keys(request, keysOptions);
    for (const cacheKey of cacheKeys) {
      const strippedCacheKeyURL = stripParams(cacheKey.url, ignoreParams);
      if (strippedRequestURL === strippedCacheKeyURL) {
        return cache.match(cacheKey, matchOptions);
      }
    }
    return;
  }

  // node_modules/workbox-core/_private/canConstructResponseFromBodyStream.js
  var supportStatus;
  function canConstructResponseFromBodyStream() {
    if (supportStatus === void 0) {
      const testResponse = new Response("");
      if ("body" in testResponse) {
        try {
          new Response(testResponse.body);
          supportStatus = true;
        } catch (error) {
          supportStatus = false;
        }
      }
      supportStatus = false;
    }
    return supportStatus;
  }

  // node_modules/workbox-core/_private/Deferred.js
  var Deferred = class {
    /**
     * Creates a promise and exposes its resolve and reject functions as methods.
     */
    constructor() {
      this.promise = new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
    }
  };

  // node_modules/workbox-core/_private/executeQuotaErrorCallbacks.js
  async function executeQuotaErrorCallbacks() {
    if (true) {
      logger.log(`About to run ${quotaErrorCallbacks.size} callbacks to clean up caches.`);
    }
    for (const callback of quotaErrorCallbacks) {
      await callback();
      if (true) {
        logger.log(callback, "is complete.");
      }
    }
    if (true) {
      logger.log("Finished running callbacks.");
    }
  }

  // node_modules/workbox-core/_private/getFriendlyURL.js
  var getFriendlyURL = (url) => {
    const urlObj = new URL(String(url), location.href);
    return urlObj.href.replace(new RegExp(`^${location.origin}`), "");
  };

  // node_modules/workbox-core/_private/timeout.js
  function timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // node_modules/workbox-core/_private/waitUntil.js
  function waitUntil(event, asyncFn) {
    const returnPromise = asyncFn();
    event.waitUntil(returnPromise);
    return returnPromise;
  }

  // node_modules/workbox-core/copyResponse.js
  async function copyResponse(response, modifier) {
    let origin = null;
    if (response.url) {
      const responseURL = new URL(response.url);
      origin = responseURL.origin;
    }
    if (origin !== self.location.origin) {
      throw new WorkboxError("cross-origin-copy-response", { origin });
    }
    const clonedResponse = response.clone();
    const responseInit = {
      headers: new Headers(clonedResponse.headers),
      status: clonedResponse.status,
      statusText: clonedResponse.statusText
    };
    const modifiedResponseInit = modifier ? modifier(responseInit) : responseInit;
    const body = canConstructResponseFromBodyStream() ? clonedResponse.body : await clonedResponse.blob();
    return new Response(body, modifiedResponseInit);
  }

  // node_modules/workbox-core/clientsClaim.js
  function clientsClaim() {
    self.addEventListener("activate", () => self.clients.claim());
  }

  // node_modules/workbox-precaching/_version.js
  try {
    self["workbox:precaching:7.4.0"] && _();
  } catch (e) {
  }

  // node_modules/workbox-precaching/utils/createCacheKey.js
  var REVISION_SEARCH_PARAM = "__WB_REVISION__";
  function createCacheKey(entry) {
    if (!entry) {
      throw new WorkboxError("add-to-cache-list-unexpected-type", { entry });
    }
    if (typeof entry === "string") {
      const urlObject = new URL(entry, location.href);
      return {
        cacheKey: urlObject.href,
        url: urlObject.href
      };
    }
    const { revision, url } = entry;
    if (!url) {
      throw new WorkboxError("add-to-cache-list-unexpected-type", { entry });
    }
    if (!revision) {
      const urlObject = new URL(url, location.href);
      return {
        cacheKey: urlObject.href,
        url: urlObject.href
      };
    }
    const cacheKeyURL = new URL(url, location.href);
    const originalURL = new URL(url, location.href);
    cacheKeyURL.searchParams.set(REVISION_SEARCH_PARAM, revision);
    return {
      cacheKey: cacheKeyURL.href,
      url: originalURL.href
    };
  }

  // node_modules/workbox-precaching/utils/PrecacheInstallReportPlugin.js
  var PrecacheInstallReportPlugin = class {
    constructor() {
      this.updatedURLs = [];
      this.notUpdatedURLs = [];
      this.handlerWillStart = async ({ request, state }) => {
        if (state) {
          state.originalRequest = request;
        }
      };
      this.cachedResponseWillBeUsed = async ({ event, state, cachedResponse }) => {
        if (event.type === "install") {
          if (state && state.originalRequest && state.originalRequest instanceof Request) {
            const url = state.originalRequest.url;
            if (cachedResponse) {
              this.notUpdatedURLs.push(url);
            } else {
              this.updatedURLs.push(url);
            }
          }
        }
        return cachedResponse;
      };
    }
  };

  // node_modules/workbox-precaching/utils/PrecacheCacheKeyPlugin.js
  var PrecacheCacheKeyPlugin = class {
    constructor({ precacheController: precacheController2 }) {
      this.cacheKeyWillBeUsed = async ({ request, params }) => {
        const cacheKey = (params === null || params === void 0 ? void 0 : params.cacheKey) || this._precacheController.getCacheKeyForURL(request.url);
        return cacheKey ? new Request(cacheKey, { headers: request.headers }) : request;
      };
      this._precacheController = precacheController2;
    }
  };

  // node_modules/workbox-precaching/utils/printCleanupDetails.js
  var logGroup = (groupTitle, deletedURLs) => {
    logger.groupCollapsed(groupTitle);
    for (const url of deletedURLs) {
      logger.log(url);
    }
    logger.groupEnd();
  };
  function printCleanupDetails(deletedURLs) {
    const deletionCount = deletedURLs.length;
    if (deletionCount > 0) {
      logger.groupCollapsed(`During precaching cleanup, ${deletionCount} cached request${deletionCount === 1 ? " was" : "s were"} deleted.`);
      logGroup("Deleted Cache Requests", deletedURLs);
      logger.groupEnd();
    }
  }

  // node_modules/workbox-precaching/utils/printInstallDetails.js
  function _nestedGroup(groupTitle, urls) {
    if (urls.length === 0) {
      return;
    }
    logger.groupCollapsed(groupTitle);
    for (const url of urls) {
      logger.log(url);
    }
    logger.groupEnd();
  }
  function printInstallDetails(urlsToPrecache, urlsAlreadyPrecached) {
    const precachedCount = urlsToPrecache.length;
    const alreadyPrecachedCount = urlsAlreadyPrecached.length;
    if (precachedCount || alreadyPrecachedCount) {
      let message = `Precaching ${precachedCount} file${precachedCount === 1 ? "" : "s"}.`;
      if (alreadyPrecachedCount > 0) {
        message += ` ${alreadyPrecachedCount} file${alreadyPrecachedCount === 1 ? " is" : "s are"} already cached.`;
      }
      logger.groupCollapsed(message);
      _nestedGroup(`View newly precached URLs.`, urlsToPrecache);
      _nestedGroup(`View previously precached URLs.`, urlsAlreadyPrecached);
      logger.groupEnd();
    }
  }

  // node_modules/workbox-strategies/_version.js
  try {
    self["workbox:strategies:7.4.0"] && _();
  } catch (e) {
  }

  // node_modules/workbox-strategies/StrategyHandler.js
  function toRequest(input) {
    return typeof input === "string" ? new Request(input) : input;
  }
  var StrategyHandler = class {
    /**
     * Creates a new instance associated with the passed strategy and event
     * that's handling the request.
     *
     * The constructor also initializes the state that will be passed to each of
     * the plugins handling this request.
     *
     * @param {workbox-strategies.Strategy} strategy
     * @param {Object} options
     * @param {Request|string} options.request A request to run this strategy for.
     * @param {ExtendableEvent} options.event The event associated with the
     *     request.
     * @param {URL} [options.url]
     * @param {*} [options.params] The return value from the
     *     {@link workbox-routing~matchCallback} (if applicable).
     */
    constructor(strategy, options) {
      this._cacheKeys = {};
      if (true) {
        finalAssertExports.isInstance(options.event, ExtendableEvent, {
          moduleName: "workbox-strategies",
          className: "StrategyHandler",
          funcName: "constructor",
          paramName: "options.event"
        });
      }
      Object.assign(this, options);
      this.event = options.event;
      this._strategy = strategy;
      this._handlerDeferred = new Deferred();
      this._extendLifetimePromises = [];
      this._plugins = [...strategy.plugins];
      this._pluginStateMap = /* @__PURE__ */ new Map();
      for (const plugin of this._plugins) {
        this._pluginStateMap.set(plugin, {});
      }
      this.event.waitUntil(this._handlerDeferred.promise);
    }
    /**
     * Fetches a given request (and invokes any applicable plugin callback
     * methods) using the `fetchOptions` (for non-navigation requests) and
     * `plugins` defined on the `Strategy` object.
     *
     * The following plugin lifecycle methods are invoked when using this method:
     * - `requestWillFetch()`
     * - `fetchDidSucceed()`
     * - `fetchDidFail()`
     *
     * @param {Request|string} input The URL or request to fetch.
     * @return {Promise<Response>}
     */
    async fetch(input) {
      const { event } = this;
      let request = toRequest(input);
      if (request.mode === "navigate" && event instanceof FetchEvent && event.preloadResponse) {
        const possiblePreloadResponse = await event.preloadResponse;
        if (possiblePreloadResponse) {
          if (true) {
            logger.log(`Using a preloaded navigation response for '${getFriendlyURL(request.url)}'`);
          }
          return possiblePreloadResponse;
        }
      }
      const originalRequest = this.hasCallback("fetchDidFail") ? request.clone() : null;
      try {
        for (const cb of this.iterateCallbacks("requestWillFetch")) {
          request = await cb({ request: request.clone(), event });
        }
      } catch (err) {
        if (err instanceof Error) {
          throw new WorkboxError("plugin-error-request-will-fetch", {
            thrownErrorMessage: err.message
          });
        }
      }
      const pluginFilteredRequest = request.clone();
      try {
        let fetchResponse;
        fetchResponse = await fetch(request, request.mode === "navigate" ? void 0 : this._strategy.fetchOptions);
        if (true) {
          logger.debug(`Network request for '${getFriendlyURL(request.url)}' returned a response with status '${fetchResponse.status}'.`);
        }
        for (const callback of this.iterateCallbacks("fetchDidSucceed")) {
          fetchResponse = await callback({
            event,
            request: pluginFilteredRequest,
            response: fetchResponse
          });
        }
        return fetchResponse;
      } catch (error) {
        if (true) {
          logger.log(`Network request for '${getFriendlyURL(request.url)}' threw an error.`, error);
        }
        if (originalRequest) {
          await this.runCallbacks("fetchDidFail", {
            error,
            event,
            originalRequest: originalRequest.clone(),
            request: pluginFilteredRequest.clone()
          });
        }
        throw error;
      }
    }
    /**
     * Calls `this.fetch()` and (in the background) runs `this.cachePut()` on
     * the response generated by `this.fetch()`.
     *
     * The call to `this.cachePut()` automatically invokes `this.waitUntil()`,
     * so you do not have to manually call `waitUntil()` on the event.
     *
     * @param {Request|string} input The request or URL to fetch and cache.
     * @return {Promise<Response>}
     */
    async fetchAndCachePut(input) {
      const response = await this.fetch(input);
      const responseClone = response.clone();
      void this.waitUntil(this.cachePut(input, responseClone));
      return response;
    }
    /**
     * Matches a request from the cache (and invokes any applicable plugin
     * callback methods) using the `cacheName`, `matchOptions`, and `plugins`
     * defined on the strategy object.
     *
     * The following plugin lifecycle methods are invoked when using this method:
     * - cacheKeyWillBeUsed()
     * - cachedResponseWillBeUsed()
     *
     * @param {Request|string} key The Request or URL to use as the cache key.
     * @return {Promise<Response|undefined>} A matching response, if found.
     */
    async cacheMatch(key) {
      const request = toRequest(key);
      let cachedResponse;
      const { cacheName, matchOptions } = this._strategy;
      const effectiveRequest = await this.getCacheKey(request, "read");
      const multiMatchOptions = Object.assign(Object.assign({}, matchOptions), { cacheName });
      cachedResponse = await caches.match(effectiveRequest, multiMatchOptions);
      if (true) {
        if (cachedResponse) {
          logger.debug(`Found a cached response in '${cacheName}'.`);
        } else {
          logger.debug(`No cached response found in '${cacheName}'.`);
        }
      }
      for (const callback of this.iterateCallbacks("cachedResponseWillBeUsed")) {
        cachedResponse = await callback({
          cacheName,
          matchOptions,
          cachedResponse,
          request: effectiveRequest,
          event: this.event
        }) || void 0;
      }
      return cachedResponse;
    }
    /**
     * Puts a request/response pair in the cache (and invokes any applicable
     * plugin callback methods) using the `cacheName` and `plugins` defined on
     * the strategy object.
     *
     * The following plugin lifecycle methods are invoked when using this method:
     * - cacheKeyWillBeUsed()
     * - cacheWillUpdate()
     * - cacheDidUpdate()
     *
     * @param {Request|string} key The request or URL to use as the cache key.
     * @param {Response} response The response to cache.
     * @return {Promise<boolean>} `false` if a cacheWillUpdate caused the response
     * not be cached, and `true` otherwise.
     */
    async cachePut(key, response) {
      const request = toRequest(key);
      await timeout(0);
      const effectiveRequest = await this.getCacheKey(request, "write");
      if (true) {
        if (effectiveRequest.method && effectiveRequest.method !== "GET") {
          throw new WorkboxError("attempt-to-cache-non-get-request", {
            url: getFriendlyURL(effectiveRequest.url),
            method: effectiveRequest.method
          });
        }
        const vary = response.headers.get("Vary");
        if (vary) {
          logger.debug(`The response for ${getFriendlyURL(effectiveRequest.url)} has a 'Vary: ${vary}' header. Consider setting the {ignoreVary: true} option on your strategy to ensure cache matching and deletion works as expected.`);
        }
      }
      if (!response) {
        if (true) {
          logger.error(`Cannot cache non-existent response for '${getFriendlyURL(effectiveRequest.url)}'.`);
        }
        throw new WorkboxError("cache-put-with-no-response", {
          url: getFriendlyURL(effectiveRequest.url)
        });
      }
      const responseToCache = await this._ensureResponseSafeToCache(response);
      if (!responseToCache) {
        if (true) {
          logger.debug(`Response '${getFriendlyURL(effectiveRequest.url)}' will not be cached.`, responseToCache);
        }
        return false;
      }
      const { cacheName, matchOptions } = this._strategy;
      const cache = await self.caches.open(cacheName);
      const hasCacheUpdateCallback = this.hasCallback("cacheDidUpdate");
      const oldResponse = hasCacheUpdateCallback ? await cacheMatchIgnoreParams(
        // TODO(philipwalton): the `__WB_REVISION__` param is a precaching
        // feature. Consider into ways to only add this behavior if using
        // precaching.
        cache,
        effectiveRequest.clone(),
        ["__WB_REVISION__"],
        matchOptions
      ) : null;
      if (true) {
        logger.debug(`Updating the '${cacheName}' cache with a new Response for ${getFriendlyURL(effectiveRequest.url)}.`);
      }
      try {
        await cache.put(effectiveRequest, hasCacheUpdateCallback ? responseToCache.clone() : responseToCache);
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === "QuotaExceededError") {
            await executeQuotaErrorCallbacks();
          }
          throw error;
        }
      }
      for (const callback of this.iterateCallbacks("cacheDidUpdate")) {
        await callback({
          cacheName,
          oldResponse,
          newResponse: responseToCache.clone(),
          request: effectiveRequest,
          event: this.event
        });
      }
      return true;
    }
    /**
     * Checks the list of plugins for the `cacheKeyWillBeUsed` callback, and
     * executes any of those callbacks found in sequence. The final `Request`
     * object returned by the last plugin is treated as the cache key for cache
     * reads and/or writes. If no `cacheKeyWillBeUsed` plugin callbacks have
     * been registered, the passed request is returned unmodified
     *
     * @param {Request} request
     * @param {string} mode
     * @return {Promise<Request>}
     */
    async getCacheKey(request, mode) {
      const key = `${request.url} | ${mode}`;
      if (!this._cacheKeys[key]) {
        let effectiveRequest = request;
        for (const callback of this.iterateCallbacks("cacheKeyWillBeUsed")) {
          effectiveRequest = toRequest(await callback({
            mode,
            request: effectiveRequest,
            event: this.event,
            // params has a type any can't change right now.
            params: this.params
            // eslint-disable-line
          }));
        }
        this._cacheKeys[key] = effectiveRequest;
      }
      return this._cacheKeys[key];
    }
    /**
     * Returns true if the strategy has at least one plugin with the given
     * callback.
     *
     * @param {string} name The name of the callback to check for.
     * @return {boolean}
     */
    hasCallback(name) {
      for (const plugin of this._strategy.plugins) {
        if (name in plugin) {
          return true;
        }
      }
      return false;
    }
    /**
     * Runs all plugin callbacks matching the given name, in order, passing the
     * given param object (merged ith the current plugin state) as the only
     * argument.
     *
     * Note: since this method runs all plugins, it's not suitable for cases
     * where the return value of a callback needs to be applied prior to calling
     * the next callback. See
     * {@link workbox-strategies.StrategyHandler#iterateCallbacks}
     * below for how to handle that case.
     *
     * @param {string} name The name of the callback to run within each plugin.
     * @param {Object} param The object to pass as the first (and only) param
     *     when executing each callback. This object will be merged with the
     *     current plugin state prior to callback execution.
     */
    async runCallbacks(name, param) {
      for (const callback of this.iterateCallbacks(name)) {
        await callback(param);
      }
    }
    /**
     * Accepts a callback and returns an iterable of matching plugin callbacks,
     * where each callback is wrapped with the current handler state (i.e. when
     * you call each callback, whatever object parameter you pass it will
     * be merged with the plugin's current state).
     *
     * @param {string} name The name fo the callback to run
     * @return {Array<Function>}
     */
    *iterateCallbacks(name) {
      for (const plugin of this._strategy.plugins) {
        if (typeof plugin[name] === "function") {
          const state = this._pluginStateMap.get(plugin);
          const statefulCallback = (param) => {
            const statefulParam = Object.assign(Object.assign({}, param), { state });
            return plugin[name](statefulParam);
          };
          yield statefulCallback;
        }
      }
    }
    /**
     * Adds a promise to the
     * [extend lifetime promises]{@link https://w3c.github.io/ServiceWorker/#extendableevent-extend-lifetime-promises}
     * of the event associated with the request being handled (usually a
     * `FetchEvent`).
     *
     * Note: you can await
     * {@link workbox-strategies.StrategyHandler~doneWaiting}
     * to know when all added promises have settled.
     *
     * @param {Promise} promise A promise to add to the extend lifetime promises
     *     of the event that triggered the request.
     */
    waitUntil(promise) {
      this._extendLifetimePromises.push(promise);
      return promise;
    }
    /**
     * Returns a promise that resolves once all promises passed to
     * {@link workbox-strategies.StrategyHandler~waitUntil}
     * have settled.
     *
     * Note: any work done after `doneWaiting()` settles should be manually
     * passed to an event's `waitUntil()` method (not this handler's
     * `waitUntil()` method), otherwise the service worker thread may be killed
     * prior to your work completing.
     */
    async doneWaiting() {
      while (this._extendLifetimePromises.length) {
        const promises = this._extendLifetimePromises.splice(0);
        const result = await Promise.allSettled(promises);
        const firstRejection = result.find((i) => i.status === "rejected");
        if (firstRejection) {
          throw firstRejection.reason;
        }
      }
    }
    /**
     * Stops running the strategy and immediately resolves any pending
     * `waitUntil()` promises.
     */
    destroy() {
      this._handlerDeferred.resolve(null);
    }
    /**
     * This method will call cacheWillUpdate on the available plugins (or use
     * status === 200) to determine if the Response is safe and valid to cache.
     *
     * @param {Request} options.request
     * @param {Response} options.response
     * @return {Promise<Response|undefined>}
     *
     * @private
     */
    async _ensureResponseSafeToCache(response) {
      let responseToCache = response;
      let pluginsUsed = false;
      for (const callback of this.iterateCallbacks("cacheWillUpdate")) {
        responseToCache = await callback({
          request: this.request,
          response: responseToCache,
          event: this.event
        }) || void 0;
        pluginsUsed = true;
        if (!responseToCache) {
          break;
        }
      }
      if (!pluginsUsed) {
        if (responseToCache && responseToCache.status !== 200) {
          responseToCache = void 0;
        }
        if (true) {
          if (responseToCache) {
            if (responseToCache.status !== 200) {
              if (responseToCache.status === 0) {
                logger.warn(`The response for '${this.request.url}' is an opaque response. The caching strategy that you're using will not cache opaque responses by default.`);
              } else {
                logger.debug(`The response for '${this.request.url}' returned a status code of '${response.status}' and won't be cached as a result.`);
              }
            }
          }
        }
      }
      return responseToCache;
    }
  };

  // node_modules/workbox-strategies/Strategy.js
  var Strategy = class {
    /**
     * Creates a new instance of the strategy and sets all documented option
     * properties as public instance properties.
     *
     * Note: if a custom strategy class extends the base Strategy class and does
     * not need more than these properties, it does not need to define its own
     * constructor.
     *
     * @param {Object} [options]
     * @param {string} [options.cacheName] Cache name to store and retrieve
     * requests. Defaults to the cache names provided by
     * {@link workbox-core.cacheNames}.
     * @param {Array<Object>} [options.plugins] [Plugins]{@link https://developers.google.com/web/tools/workbox/guides/using-plugins}
     * to use in conjunction with this caching strategy.
     * @param {Object} [options.fetchOptions] Values passed along to the
     * [`init`](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Parameters)
     * of [non-navigation](https://github.com/GoogleChrome/workbox/issues/1796)
     * `fetch()` requests made by this strategy.
     * @param {Object} [options.matchOptions] The
     * [`CacheQueryOptions`]{@link https://w3c.github.io/ServiceWorker/#dictdef-cachequeryoptions}
     * for any `cache.match()` or `cache.put()` calls made by this strategy.
     */
    constructor(options = {}) {
      this.cacheName = cacheNames.getRuntimeName(options.cacheName);
      this.plugins = options.plugins || [];
      this.fetchOptions = options.fetchOptions;
      this.matchOptions = options.matchOptions;
    }
    /**
     * Perform a request strategy and returns a `Promise` that will resolve with
     * a `Response`, invoking all relevant plugin callbacks.
     *
     * When a strategy instance is registered with a Workbox
     * {@link workbox-routing.Route}, this method is automatically
     * called when the route matches.
     *
     * Alternatively, this method can be used in a standalone `FetchEvent`
     * listener by passing it to `event.respondWith()`.
     *
     * @param {FetchEvent|Object} options A `FetchEvent` or an object with the
     *     properties listed below.
     * @param {Request|string} options.request A request to run this strategy for.
     * @param {ExtendableEvent} options.event The event associated with the
     *     request.
     * @param {URL} [options.url]
     * @param {*} [options.params]
     */
    handle(options) {
      const [responseDone] = this.handleAll(options);
      return responseDone;
    }
    /**
     * Similar to {@link workbox-strategies.Strategy~handle}, but
     * instead of just returning a `Promise` that resolves to a `Response` it
     * it will return an tuple of `[response, done]` promises, where the former
     * (`response`) is equivalent to what `handle()` returns, and the latter is a
     * Promise that will resolve once any promises that were added to
     * `event.waitUntil()` as part of performing the strategy have completed.
     *
     * You can await the `done` promise to ensure any extra work performed by
     * the strategy (usually caching responses) completes successfully.
     *
     * @param {FetchEvent|Object} options A `FetchEvent` or an object with the
     *     properties listed below.
     * @param {Request|string} options.request A request to run this strategy for.
     * @param {ExtendableEvent} options.event The event associated with the
     *     request.
     * @param {URL} [options.url]
     * @param {*} [options.params]
     * @return {Array<Promise>} A tuple of [response, done]
     *     promises that can be used to determine when the response resolves as
     *     well as when the handler has completed all its work.
     */
    handleAll(options) {
      if (options instanceof FetchEvent) {
        options = {
          event: options,
          request: options.request
        };
      }
      const event = options.event;
      const request = typeof options.request === "string" ? new Request(options.request) : options.request;
      const params = "params" in options ? options.params : void 0;
      const handler = new StrategyHandler(this, { event, request, params });
      const responseDone = this._getResponse(handler, request, event);
      const handlerDone = this._awaitComplete(responseDone, handler, request, event);
      return [responseDone, handlerDone];
    }
    async _getResponse(handler, request, event) {
      await handler.runCallbacks("handlerWillStart", { event, request });
      let response = void 0;
      try {
        response = await this._handle(request, handler);
        if (!response || response.type === "error") {
          throw new WorkboxError("no-response", { url: request.url });
        }
      } catch (error) {
        if (error instanceof Error) {
          for (const callback of handler.iterateCallbacks("handlerDidError")) {
            response = await callback({ error, event, request });
            if (response) {
              break;
            }
          }
        }
        if (!response) {
          throw error;
        } else if (true) {
          logger.log(`While responding to '${getFriendlyURL(request.url)}', an ${error instanceof Error ? error.toString() : ""} error occurred. Using a fallback response provided by a handlerDidError plugin.`);
        }
      }
      for (const callback of handler.iterateCallbacks("handlerWillRespond")) {
        response = await callback({ event, request, response });
      }
      return response;
    }
    async _awaitComplete(responseDone, handler, request, event) {
      let response;
      let error;
      try {
        response = await responseDone;
      } catch (error2) {
      }
      try {
        await handler.runCallbacks("handlerDidRespond", {
          event,
          request,
          response
        });
        await handler.doneWaiting();
      } catch (waitUntilError) {
        if (waitUntilError instanceof Error) {
          error = waitUntilError;
        }
      }
      await handler.runCallbacks("handlerDidComplete", {
        event,
        request,
        response,
        error
      });
      handler.destroy();
      if (error) {
        throw error;
      }
    }
  };

  // node_modules/workbox-precaching/PrecacheStrategy.js
  var PrecacheStrategy = class _PrecacheStrategy extends Strategy {
    /**
     *
     * @param {Object} [options]
     * @param {string} [options.cacheName] Cache name to store and retrieve
     * requests. Defaults to the cache names provided by
     * {@link workbox-core.cacheNames}.
     * @param {Array<Object>} [options.plugins] {@link https://developers.google.com/web/tools/workbox/guides/using-plugins|Plugins}
     * to use in conjunction with this caching strategy.
     * @param {Object} [options.fetchOptions] Values passed along to the
     * {@link https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Parameters|init}
     * of all fetch() requests made by this strategy.
     * @param {Object} [options.matchOptions] The
     * {@link https://w3c.github.io/ServiceWorker/#dictdef-cachequeryoptions|CacheQueryOptions}
     * for any `cache.match()` or `cache.put()` calls made by this strategy.
     * @param {boolean} [options.fallbackToNetwork=true] Whether to attempt to
     * get the response from the network if there's a precache miss.
     */
    constructor(options = {}) {
      options.cacheName = cacheNames.getPrecacheName(options.cacheName);
      super(options);
      this._fallbackToNetwork = options.fallbackToNetwork === false ? false : true;
      this.plugins.push(_PrecacheStrategy.copyRedirectedCacheableResponsesPlugin);
    }
    /**
     * @private
     * @param {Request|string} request A request to run this strategy for.
     * @param {workbox-strategies.StrategyHandler} handler The event that
     *     triggered the request.
     * @return {Promise<Response>}
     */
    async _handle(request, handler) {
      const response = await handler.cacheMatch(request);
      if (response) {
        return response;
      }
      if (handler.event && handler.event.type === "install") {
        return await this._handleInstall(request, handler);
      }
      return await this._handleFetch(request, handler);
    }
    async _handleFetch(request, handler) {
      let response;
      const params = handler.params || {};
      if (this._fallbackToNetwork) {
        if (true) {
          logger.warn(`The precached response for ${getFriendlyURL(request.url)} in ${this.cacheName} was not found. Falling back to the network.`);
        }
        const integrityInManifest = params.integrity;
        const integrityInRequest = request.integrity;
        const noIntegrityConflict = !integrityInRequest || integrityInRequest === integrityInManifest;
        response = await handler.fetch(new Request(request, {
          integrity: request.mode !== "no-cors" ? integrityInRequest || integrityInManifest : void 0
        }));
        if (integrityInManifest && noIntegrityConflict && request.mode !== "no-cors") {
          this._useDefaultCacheabilityPluginIfNeeded();
          const wasCached = await handler.cachePut(request, response.clone());
          if (true) {
            if (wasCached) {
              logger.log(`A response for ${getFriendlyURL(request.url)} was used to "repair" the precache.`);
            }
          }
        }
      } else {
        throw new WorkboxError("missing-precache-entry", {
          cacheName: this.cacheName,
          url: request.url
        });
      }
      if (true) {
        const cacheKey = params.cacheKey || await handler.getCacheKey(request, "read");
        logger.groupCollapsed(`Precaching is responding to: ` + getFriendlyURL(request.url));
        logger.log(`Serving the precached url: ${getFriendlyURL(cacheKey instanceof Request ? cacheKey.url : cacheKey)}`);
        logger.groupCollapsed(`View request details here.`);
        logger.log(request);
        logger.groupEnd();
        logger.groupCollapsed(`View response details here.`);
        logger.log(response);
        logger.groupEnd();
        logger.groupEnd();
      }
      return response;
    }
    async _handleInstall(request, handler) {
      this._useDefaultCacheabilityPluginIfNeeded();
      const response = await handler.fetch(request);
      const wasCached = await handler.cachePut(request, response.clone());
      if (!wasCached) {
        throw new WorkboxError("bad-precaching-response", {
          url: request.url,
          status: response.status
        });
      }
      return response;
    }
    /**
     * This method is complex, as there a number of things to account for:
     *
     * The `plugins` array can be set at construction, and/or it might be added to
     * to at any time before the strategy is used.
     *
     * At the time the strategy is used (i.e. during an `install` event), there
     * needs to be at least one plugin that implements `cacheWillUpdate` in the
     * array, other than `copyRedirectedCacheableResponsesPlugin`.
     *
     * - If this method is called and there are no suitable `cacheWillUpdate`
     * plugins, we need to add `defaultPrecacheCacheabilityPlugin`.
     *
     * - If this method is called and there is exactly one `cacheWillUpdate`, then
     * we don't have to do anything (this might be a previously added
     * `defaultPrecacheCacheabilityPlugin`, or it might be a custom plugin).
     *
     * - If this method is called and there is more than one `cacheWillUpdate`,
     * then we need to check if one is `defaultPrecacheCacheabilityPlugin`. If so,
     * we need to remove it. (This situation is unlikely, but it could happen if
     * the strategy is used multiple times, the first without a `cacheWillUpdate`,
     * and then later on after manually adding a custom `cacheWillUpdate`.)
     *
     * See https://github.com/GoogleChrome/workbox/issues/2737 for more context.
     *
     * @private
     */
    _useDefaultCacheabilityPluginIfNeeded() {
      let defaultPluginIndex = null;
      let cacheWillUpdatePluginCount = 0;
      for (const [index, plugin] of this.plugins.entries()) {
        if (plugin === _PrecacheStrategy.copyRedirectedCacheableResponsesPlugin) {
          continue;
        }
        if (plugin === _PrecacheStrategy.defaultPrecacheCacheabilityPlugin) {
          defaultPluginIndex = index;
        }
        if (plugin.cacheWillUpdate) {
          cacheWillUpdatePluginCount++;
        }
      }
      if (cacheWillUpdatePluginCount === 0) {
        this.plugins.push(_PrecacheStrategy.defaultPrecacheCacheabilityPlugin);
      } else if (cacheWillUpdatePluginCount > 1 && defaultPluginIndex !== null) {
        this.plugins.splice(defaultPluginIndex, 1);
      }
    }
  };
  PrecacheStrategy.defaultPrecacheCacheabilityPlugin = {
    async cacheWillUpdate({ response }) {
      if (!response || response.status >= 400) {
        return null;
      }
      return response;
    }
  };
  PrecacheStrategy.copyRedirectedCacheableResponsesPlugin = {
    async cacheWillUpdate({ response }) {
      return response.redirected ? await copyResponse(response) : response;
    }
  };

  // node_modules/workbox-precaching/PrecacheController.js
  var PrecacheController = class {
    /**
     * Create a new PrecacheController.
     *
     * @param {Object} [options]
     * @param {string} [options.cacheName] The cache to use for precaching.
     * @param {string} [options.plugins] Plugins to use when precaching as well
     * as responding to fetch events for precached assets.
     * @param {boolean} [options.fallbackToNetwork=true] Whether to attempt to
     * get the response from the network if there's a precache miss.
     */
    constructor({ cacheName, plugins = [], fallbackToNetwork = true } = {}) {
      this._urlsToCacheKeys = /* @__PURE__ */ new Map();
      this._urlsToCacheModes = /* @__PURE__ */ new Map();
      this._cacheKeysToIntegrities = /* @__PURE__ */ new Map();
      this._strategy = new PrecacheStrategy({
        cacheName: cacheNames.getPrecacheName(cacheName),
        plugins: [
          ...plugins,
          new PrecacheCacheKeyPlugin({ precacheController: this })
        ],
        fallbackToNetwork
      });
      this.install = this.install.bind(this);
      this.activate = this.activate.bind(this);
    }
    /**
     * @type {workbox-precaching.PrecacheStrategy} The strategy created by this controller and
     * used to cache assets and respond to fetch events.
     */
    get strategy() {
      return this._strategy;
    }
    /**
     * Adds items to the precache list, removing any duplicates and
     * stores the files in the
     * {@link workbox-core.cacheNames|"precache cache"} when the service
     * worker installs.
     *
     * This method can be called multiple times.
     *
     * @param {Array<Object|string>} [entries=[]] Array of entries to precache.
     */
    precache(entries) {
      this.addToCacheList(entries);
      if (!this._installAndActiveListenersAdded) {
        self.addEventListener("install", this.install);
        self.addEventListener("activate", this.activate);
        this._installAndActiveListenersAdded = true;
      }
    }
    /**
     * This method will add items to the precache list, removing duplicates
     * and ensuring the information is valid.
     *
     * @param {Array<workbox-precaching.PrecacheController.PrecacheEntry|string>} entries
     *     Array of entries to precache.
     */
    addToCacheList(entries) {
      if (true) {
        finalAssertExports.isArray(entries, {
          moduleName: "workbox-precaching",
          className: "PrecacheController",
          funcName: "addToCacheList",
          paramName: "entries"
        });
      }
      const urlsToWarnAbout = [];
      for (const entry of entries) {
        if (typeof entry === "string") {
          urlsToWarnAbout.push(entry);
        } else if (entry && entry.revision === void 0) {
          urlsToWarnAbout.push(entry.url);
        }
        const { cacheKey, url } = createCacheKey(entry);
        const cacheMode = typeof entry !== "string" && entry.revision ? "reload" : "default";
        if (this._urlsToCacheKeys.has(url) && this._urlsToCacheKeys.get(url) !== cacheKey) {
          throw new WorkboxError("add-to-cache-list-conflicting-entries", {
            firstEntry: this._urlsToCacheKeys.get(url),
            secondEntry: cacheKey
          });
        }
        if (typeof entry !== "string" && entry.integrity) {
          if (this._cacheKeysToIntegrities.has(cacheKey) && this._cacheKeysToIntegrities.get(cacheKey) !== entry.integrity) {
            throw new WorkboxError("add-to-cache-list-conflicting-integrities", {
              url
            });
          }
          this._cacheKeysToIntegrities.set(cacheKey, entry.integrity);
        }
        this._urlsToCacheKeys.set(url, cacheKey);
        this._urlsToCacheModes.set(url, cacheMode);
        if (urlsToWarnAbout.length > 0) {
          const warningMessage = `Workbox is precaching URLs without revision info: ${urlsToWarnAbout.join(", ")}
This is generally NOT safe. Learn more at https://bit.ly/wb-precache`;
          if (false) {
            console.warn(warningMessage);
          } else {
            logger.warn(warningMessage);
          }
        }
      }
    }
    /**
     * Precaches new and updated assets. Call this method from the service worker
     * install event.
     *
     * Note: this method calls `event.waitUntil()` for you, so you do not need
     * to call it yourself in your event handlers.
     *
     * @param {ExtendableEvent} event
     * @return {Promise<workbox-precaching.InstallResult>}
     */
    install(event) {
      return waitUntil(event, async () => {
        const installReportPlugin = new PrecacheInstallReportPlugin();
        this.strategy.plugins.push(installReportPlugin);
        for (const [url, cacheKey] of this._urlsToCacheKeys) {
          const integrity = this._cacheKeysToIntegrities.get(cacheKey);
          const cacheMode = this._urlsToCacheModes.get(url);
          const request = new Request(url, {
            integrity,
            cache: cacheMode,
            credentials: "same-origin"
          });
          await Promise.all(this.strategy.handleAll({
            params: { cacheKey },
            request,
            event
          }));
        }
        const { updatedURLs, notUpdatedURLs } = installReportPlugin;
        if (true) {
          printInstallDetails(updatedURLs, notUpdatedURLs);
        }
        return { updatedURLs, notUpdatedURLs };
      });
    }
    /**
     * Deletes assets that are no longer present in the current precache manifest.
     * Call this method from the service worker activate event.
     *
     * Note: this method calls `event.waitUntil()` for you, so you do not need
     * to call it yourself in your event handlers.
     *
     * @param {ExtendableEvent} event
     * @return {Promise<workbox-precaching.CleanupResult>}
     */
    activate(event) {
      return waitUntil(event, async () => {
        const cache = await self.caches.open(this.strategy.cacheName);
        const currentlyCachedRequests = await cache.keys();
        const expectedCacheKeys = new Set(this._urlsToCacheKeys.values());
        const deletedURLs = [];
        for (const request of currentlyCachedRequests) {
          if (!expectedCacheKeys.has(request.url)) {
            await cache.delete(request);
            deletedURLs.push(request.url);
          }
        }
        if (true) {
          printCleanupDetails(deletedURLs);
        }
        return { deletedURLs };
      });
    }
    /**
     * Returns a mapping of a precached URL to the corresponding cache key, taking
     * into account the revision information for the URL.
     *
     * @return {Map<string, string>} A URL to cache key mapping.
     */
    getURLsToCacheKeys() {
      return this._urlsToCacheKeys;
    }
    /**
     * Returns a list of all the URLs that have been precached by the current
     * service worker.
     *
     * @return {Array<string>} The precached URLs.
     */
    getCachedURLs() {
      return [...this._urlsToCacheKeys.keys()];
    }
    /**
     * Returns the cache key used for storing a given URL. If that URL is
     * unversioned, like `/index.html', then the cache key will be the original
     * URL with a search parameter appended to it.
     *
     * @param {string} url A URL whose cache key you want to look up.
     * @return {string} The versioned URL that corresponds to a cache key
     * for the original URL, or undefined if that URL isn't precached.
     */
    getCacheKeyForURL(url) {
      const urlObject = new URL(url, location.href);
      return this._urlsToCacheKeys.get(urlObject.href);
    }
    /**
     * @param {string} url A cache key whose SRI you want to look up.
     * @return {string} The subresource integrity associated with the cache key,
     * or undefined if it's not set.
     */
    getIntegrityForCacheKey(cacheKey) {
      return this._cacheKeysToIntegrities.get(cacheKey);
    }
    /**
     * This acts as a drop-in replacement for
     * [`cache.match()`](https://developer.mozilla.org/en-US/docs/Web/API/Cache/match)
     * with the following differences:
     *
     * - It knows what the name of the precache is, and only checks in that cache.
     * - It allows you to pass in an "original" URL without versioning parameters,
     * and it will automatically look up the correct cache key for the currently
     * active revision of that URL.
     *
     * E.g., `matchPrecache('index.html')` will find the correct precached
     * response for the currently active service worker, even if the actual cache
     * key is `'/index.html?__WB_REVISION__=1234abcd'`.
     *
     * @param {string|Request} request The key (without revisioning parameters)
     * to look up in the precache.
     * @return {Promise<Response|undefined>}
     */
    async matchPrecache(request) {
      const url = request instanceof Request ? request.url : request;
      const cacheKey = this.getCacheKeyForURL(url);
      if (cacheKey) {
        const cache = await self.caches.open(this.strategy.cacheName);
        return cache.match(cacheKey);
      }
      return void 0;
    }
    /**
     * Returns a function that looks up `url` in the precache (taking into
     * account revision information), and returns the corresponding `Response`.
     *
     * @param {string} url The precached URL which will be used to lookup the
     * `Response`.
     * @return {workbox-routing~handlerCallback}
     */
    createHandlerBoundToURL(url) {
      const cacheKey = this.getCacheKeyForURL(url);
      if (!cacheKey) {
        throw new WorkboxError("non-precached-url", { url });
      }
      return (options) => {
        options.request = new Request(url);
        options.params = Object.assign({ cacheKey }, options.params);
        return this.strategy.handle(options);
      };
    }
  };

  // node_modules/workbox-precaching/utils/getOrCreatePrecacheController.js
  var precacheController;
  var getOrCreatePrecacheController = () => {
    if (!precacheController) {
      precacheController = new PrecacheController();
    }
    return precacheController;
  };

  // node_modules/workbox-routing/_version.js
  try {
    self["workbox:routing:7.4.0"] && _();
  } catch (e) {
  }

  // node_modules/workbox-routing/utils/constants.js
  var defaultMethod = "GET";
  var validMethods = [
    "DELETE",
    "GET",
    "HEAD",
    "PATCH",
    "POST",
    "PUT"
  ];

  // node_modules/workbox-routing/utils/normalizeHandler.js
  var normalizeHandler = (handler) => {
    if (handler && typeof handler === "object") {
      if (true) {
        finalAssertExports.hasMethod(handler, "handle", {
          moduleName: "workbox-routing",
          className: "Route",
          funcName: "constructor",
          paramName: "handler"
        });
      }
      return handler;
    } else {
      if (true) {
        finalAssertExports.isType(handler, "function", {
          moduleName: "workbox-routing",
          className: "Route",
          funcName: "constructor",
          paramName: "handler"
        });
      }
      return { handle: handler };
    }
  };

  // node_modules/workbox-routing/Route.js
  var Route = class {
    /**
     * Constructor for Route class.
     *
     * @param {workbox-routing~matchCallback} match
     * A callback function that determines whether the route matches a given
     * `fetch` event by returning a non-falsy value.
     * @param {workbox-routing~handlerCallback} handler A callback
     * function that returns a Promise resolving to a Response.
     * @param {string} [method='GET'] The HTTP method to match the Route
     * against.
     */
    constructor(match, handler, method = defaultMethod) {
      if (true) {
        finalAssertExports.isType(match, "function", {
          moduleName: "workbox-routing",
          className: "Route",
          funcName: "constructor",
          paramName: "match"
        });
        if (method) {
          finalAssertExports.isOneOf(method, validMethods, { paramName: "method" });
        }
      }
      this.handler = normalizeHandler(handler);
      this.match = match;
      this.method = method;
    }
    /**
     *
     * @param {workbox-routing-handlerCallback} handler A callback
     * function that returns a Promise resolving to a Response
     */
    setCatchHandler(handler) {
      this.catchHandler = normalizeHandler(handler);
    }
  };

  // node_modules/workbox-routing/RegExpRoute.js
  var RegExpRoute = class extends Route {
    /**
     * If the regular expression contains
     * [capture groups]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#grouping-back-references},
     * the captured values will be passed to the
     * {@link workbox-routing~handlerCallback} `params`
     * argument.
     *
     * @param {RegExp} regExp The regular expression to match against URLs.
     * @param {workbox-routing~handlerCallback} handler A callback
     * function that returns a Promise resulting in a Response.
     * @param {string} [method='GET'] The HTTP method to match the Route
     * against.
     */
    constructor(regExp, handler, method) {
      if (true) {
        finalAssertExports.isInstance(regExp, RegExp, {
          moduleName: "workbox-routing",
          className: "RegExpRoute",
          funcName: "constructor",
          paramName: "pattern"
        });
      }
      const match = ({ url }) => {
        const result = regExp.exec(url.href);
        if (!result) {
          return;
        }
        if (url.origin !== location.origin && result.index !== 0) {
          if (true) {
            logger.debug(`The regular expression '${regExp.toString()}' only partially matched against the cross-origin URL '${url.toString()}'. RegExpRoute's will only handle cross-origin requests if they match the entire URL.`);
          }
          return;
        }
        return result.slice(1);
      };
      super(match, handler, method);
    }
  };

  // node_modules/workbox-routing/Router.js
  var Router = class {
    /**
     * Initializes a new Router.
     */
    constructor() {
      this._routes = /* @__PURE__ */ new Map();
      this._defaultHandlerMap = /* @__PURE__ */ new Map();
    }
    /**
     * @return {Map<string, Array<workbox-routing.Route>>} routes A `Map` of HTTP
     * method name ('GET', etc.) to an array of all the corresponding `Route`
     * instances that are registered.
     */
    get routes() {
      return this._routes;
    }
    /**
     * Adds a fetch event listener to respond to events when a route matches
     * the event's request.
     */
    addFetchListener() {
      self.addEventListener("fetch", ((event) => {
        const { request } = event;
        const responsePromise = this.handleRequest({ request, event });
        if (responsePromise) {
          event.respondWith(responsePromise);
        }
      }));
    }
    /**
     * Adds a message event listener for URLs to cache from the window.
     * This is useful to cache resources loaded on the page prior to when the
     * service worker started controlling it.
     *
     * The format of the message data sent from the window should be as follows.
     * Where the `urlsToCache` array may consist of URL strings or an array of
     * URL string + `requestInit` object (the same as you'd pass to `fetch()`).
     *
     * ```
     * {
     *   type: 'CACHE_URLS',
     *   payload: {
     *     urlsToCache: [
     *       './script1.js',
     *       './script2.js',
     *       ['./script3.js', {mode: 'no-cors'}],
     *     ],
     *   },
     * }
     * ```
     */
    addCacheListener() {
      self.addEventListener("message", ((event) => {
        if (event.data && event.data.type === "CACHE_URLS") {
          const { payload } = event.data;
          if (true) {
            logger.debug(`Caching URLs from the window`, payload.urlsToCache);
          }
          const requestPromises = Promise.all(payload.urlsToCache.map((entry) => {
            if (typeof entry === "string") {
              entry = [entry];
            }
            const request = new Request(...entry);
            return this.handleRequest({ request, event });
          }));
          event.waitUntil(requestPromises);
          if (event.ports && event.ports[0]) {
            void requestPromises.then(() => event.ports[0].postMessage(true));
          }
        }
      }));
    }
    /**
     * Apply the routing rules to a FetchEvent object to get a Response from an
     * appropriate Route's handler.
     *
     * @param {Object} options
     * @param {Request} options.request The request to handle.
     * @param {ExtendableEvent} options.event The event that triggered the
     *     request.
     * @return {Promise<Response>|undefined} A promise is returned if a
     *     registered route can handle the request. If there is no matching
     *     route and there's no `defaultHandler`, `undefined` is returned.
     */
    handleRequest({ request, event }) {
      if (true) {
        finalAssertExports.isInstance(request, Request, {
          moduleName: "workbox-routing",
          className: "Router",
          funcName: "handleRequest",
          paramName: "options.request"
        });
      }
      const url = new URL(request.url, location.href);
      if (!url.protocol.startsWith("http")) {
        if (true) {
          logger.debug(`Workbox Router only supports URLs that start with 'http'.`);
        }
        return;
      }
      const sameOrigin = url.origin === location.origin;
      const { params, route } = this.findMatchingRoute({
        event,
        request,
        sameOrigin,
        url
      });
      let handler = route && route.handler;
      const debugMessages = [];
      if (true) {
        if (handler) {
          debugMessages.push([`Found a route to handle this request:`, route]);
          if (params) {
            debugMessages.push([
              `Passing the following params to the route's handler:`,
              params
            ]);
          }
        }
      }
      const method = request.method;
      if (!handler && this._defaultHandlerMap.has(method)) {
        if (true) {
          debugMessages.push(`Failed to find a matching route. Falling back to the default handler for ${method}.`);
        }
        handler = this._defaultHandlerMap.get(method);
      }
      if (!handler) {
        if (true) {
          logger.debug(`No route found for: ${getFriendlyURL(url)}`);
        }
        return;
      }
      if (true) {
        logger.groupCollapsed(`Router is responding to: ${getFriendlyURL(url)}`);
        debugMessages.forEach((msg) => {
          if (Array.isArray(msg)) {
            logger.log(...msg);
          } else {
            logger.log(msg);
          }
        });
        logger.groupEnd();
      }
      let responsePromise;
      try {
        responsePromise = handler.handle({ url, request, event, params });
      } catch (err) {
        responsePromise = Promise.reject(err);
      }
      const catchHandler = route && route.catchHandler;
      if (responsePromise instanceof Promise && (this._catchHandler || catchHandler)) {
        responsePromise = responsePromise.catch(async (err) => {
          if (catchHandler) {
            if (true) {
              logger.groupCollapsed(`Error thrown when responding to:  ${getFriendlyURL(url)}. Falling back to route's Catch Handler.`);
              logger.error(`Error thrown by:`, route);
              logger.error(err);
              logger.groupEnd();
            }
            try {
              return await catchHandler.handle({ url, request, event, params });
            } catch (catchErr) {
              if (catchErr instanceof Error) {
                err = catchErr;
              }
            }
          }
          if (this._catchHandler) {
            if (true) {
              logger.groupCollapsed(`Error thrown when responding to:  ${getFriendlyURL(url)}. Falling back to global Catch Handler.`);
              logger.error(`Error thrown by:`, route);
              logger.error(err);
              logger.groupEnd();
            }
            return this._catchHandler.handle({ url, request, event });
          }
          throw err;
        });
      }
      return responsePromise;
    }
    /**
     * Checks a request and URL (and optionally an event) against the list of
     * registered routes, and if there's a match, returns the corresponding
     * route along with any params generated by the match.
     *
     * @param {Object} options
     * @param {URL} options.url
     * @param {boolean} options.sameOrigin The result of comparing `url.origin`
     *     against the current origin.
     * @param {Request} options.request The request to match.
     * @param {Event} options.event The corresponding event.
     * @return {Object} An object with `route` and `params` properties.
     *     They are populated if a matching route was found or `undefined`
     *     otherwise.
     */
    findMatchingRoute({ url, sameOrigin, request, event }) {
      const routes = this._routes.get(request.method) || [];
      for (const route of routes) {
        let params;
        const matchResult = route.match({ url, sameOrigin, request, event });
        if (matchResult) {
          if (true) {
            if (matchResult instanceof Promise) {
              logger.warn(`While routing ${getFriendlyURL(url)}, an async matchCallback function was used. Please convert the following route to use a synchronous matchCallback function:`, route);
            }
          }
          params = matchResult;
          if (Array.isArray(params) && params.length === 0) {
            params = void 0;
          } else if (matchResult.constructor === Object && // eslint-disable-line
          Object.keys(matchResult).length === 0) {
            params = void 0;
          } else if (typeof matchResult === "boolean") {
            params = void 0;
          }
          return { route, params };
        }
      }
      return {};
    }
    /**
     * Define a default `handler` that's called when no routes explicitly
     * match the incoming request.
     *
     * Each HTTP method ('GET', 'POST', etc.) gets its own default handler.
     *
     * Without a default handler, unmatched requests will go against the
     * network as if there were no service worker present.
     *
     * @param {workbox-routing~handlerCallback} handler A callback
     * function that returns a Promise resulting in a Response.
     * @param {string} [method='GET'] The HTTP method to associate with this
     * default handler. Each method has its own default.
     */
    setDefaultHandler(handler, method = defaultMethod) {
      this._defaultHandlerMap.set(method, normalizeHandler(handler));
    }
    /**
     * If a Route throws an error while handling a request, this `handler`
     * will be called and given a chance to provide a response.
     *
     * @param {workbox-routing~handlerCallback} handler A callback
     * function that returns a Promise resulting in a Response.
     */
    setCatchHandler(handler) {
      this._catchHandler = normalizeHandler(handler);
    }
    /**
     * Registers a route with the router.
     *
     * @param {workbox-routing.Route} route The route to register.
     */
    registerRoute(route) {
      if (true) {
        finalAssertExports.isType(route, "object", {
          moduleName: "workbox-routing",
          className: "Router",
          funcName: "registerRoute",
          paramName: "route"
        });
        finalAssertExports.hasMethod(route, "match", {
          moduleName: "workbox-routing",
          className: "Router",
          funcName: "registerRoute",
          paramName: "route"
        });
        finalAssertExports.isType(route.handler, "object", {
          moduleName: "workbox-routing",
          className: "Router",
          funcName: "registerRoute",
          paramName: "route"
        });
        finalAssertExports.hasMethod(route.handler, "handle", {
          moduleName: "workbox-routing",
          className: "Router",
          funcName: "registerRoute",
          paramName: "route.handler"
        });
        finalAssertExports.isType(route.method, "string", {
          moduleName: "workbox-routing",
          className: "Router",
          funcName: "registerRoute",
          paramName: "route.method"
        });
      }
      if (!this._routes.has(route.method)) {
        this._routes.set(route.method, []);
      }
      this._routes.get(route.method).push(route);
    }
    /**
     * Unregisters a route with the router.
     *
     * @param {workbox-routing.Route} route The route to unregister.
     */
    unregisterRoute(route) {
      if (!this._routes.has(route.method)) {
        throw new WorkboxError("unregister-route-but-not-found-with-method", {
          method: route.method
        });
      }
      const routeIndex = this._routes.get(route.method).indexOf(route);
      if (routeIndex > -1) {
        this._routes.get(route.method).splice(routeIndex, 1);
      } else {
        throw new WorkboxError("unregister-route-route-not-registered");
      }
    }
  };

  // node_modules/workbox-routing/utils/getOrCreateDefaultRouter.js
  var defaultRouter;
  var getOrCreateDefaultRouter = () => {
    if (!defaultRouter) {
      defaultRouter = new Router();
      defaultRouter.addFetchListener();
      defaultRouter.addCacheListener();
    }
    return defaultRouter;
  };

  // node_modules/workbox-routing/registerRoute.js
  function registerRoute(capture, handler, method) {
    let route;
    if (typeof capture === "string") {
      const captureUrl = new URL(capture, location.href);
      if (true) {
        if (!(capture.startsWith("/") || capture.startsWith("http"))) {
          throw new WorkboxError("invalid-string", {
            moduleName: "workbox-routing",
            funcName: "registerRoute",
            paramName: "capture"
          });
        }
        const valueToCheck = capture.startsWith("http") ? captureUrl.pathname : capture;
        const wildcards = "[*:?+]";
        if (new RegExp(`${wildcards}`).exec(valueToCheck)) {
          logger.debug(`The '$capture' parameter contains an Express-style wildcard character (${wildcards}). Strings are now always interpreted as exact matches; use a RegExp for partial or wildcard matches.`);
        }
      }
      const matchCallback = ({ url }) => {
        if (true) {
          if (url.pathname === captureUrl.pathname && url.origin !== captureUrl.origin) {
            logger.debug(`${capture} only partially matches the cross-origin URL ${url.toString()}. This route will only handle cross-origin requests if they match the entire URL.`);
          }
        }
        return url.href === captureUrl.href;
      };
      route = new Route(matchCallback, handler, method);
    } else if (capture instanceof RegExp) {
      route = new RegExpRoute(capture, handler, method);
    } else if (typeof capture === "function") {
      route = new Route(capture, handler, method);
    } else if (capture instanceof Route) {
      route = capture;
    } else {
      throw new WorkboxError("unsupported-route-type", {
        moduleName: "workbox-routing",
        funcName: "registerRoute",
        paramName: "capture"
      });
    }
    const defaultRouter2 = getOrCreateDefaultRouter();
    defaultRouter2.registerRoute(route);
    return route;
  }

  // node_modules/workbox-precaching/utils/removeIgnoredSearchParams.js
  function removeIgnoredSearchParams(urlObject, ignoreURLParametersMatching = []) {
    for (const paramName of [...urlObject.searchParams.keys()]) {
      if (ignoreURLParametersMatching.some((regExp) => regExp.test(paramName))) {
        urlObject.searchParams.delete(paramName);
      }
    }
    return urlObject;
  }

  // node_modules/workbox-precaching/utils/generateURLVariations.js
  function* generateURLVariations(url, { ignoreURLParametersMatching = [/^utm_/, /^fbclid$/], directoryIndex = "index.html", cleanURLs = true, urlManipulation } = {}) {
    const urlObject = new URL(url, location.href);
    urlObject.hash = "";
    yield urlObject.href;
    const urlWithoutIgnoredParams = removeIgnoredSearchParams(urlObject, ignoreURLParametersMatching);
    yield urlWithoutIgnoredParams.href;
    if (directoryIndex && urlWithoutIgnoredParams.pathname.endsWith("/")) {
      const directoryURL = new URL(urlWithoutIgnoredParams.href);
      directoryURL.pathname += directoryIndex;
      yield directoryURL.href;
    }
    if (cleanURLs) {
      const cleanURL = new URL(urlWithoutIgnoredParams.href);
      cleanURL.pathname += ".html";
      yield cleanURL.href;
    }
    if (urlManipulation) {
      const additionalURLs = urlManipulation({ url: urlObject });
      for (const urlToAttempt of additionalURLs) {
        yield urlToAttempt.href;
      }
    }
  }

  // node_modules/workbox-precaching/PrecacheRoute.js
  var PrecacheRoute = class extends Route {
    /**
     * @param {PrecacheController} precacheController A `PrecacheController`
     * instance used to both match requests and respond to fetch events.
     * @param {Object} [options] Options to control how requests are matched
     * against the list of precached URLs.
     * @param {string} [options.directoryIndex=index.html] The `directoryIndex` will
     * check cache entries for a URLs ending with '/' to see if there is a hit when
     * appending the `directoryIndex` value.
     * @param {Array<RegExp>} [options.ignoreURLParametersMatching=[/^utm_/, /^fbclid$/]] An
     * array of regex's to remove search params when looking for a cache match.
     * @param {boolean} [options.cleanURLs=true] The `cleanURLs` option will
     * check the cache for the URL with a `.html` added to the end of the end.
     * @param {workbox-precaching~urlManipulation} [options.urlManipulation]
     * This is a function that should take a URL and return an array of
     * alternative URLs that should be checked for precache matches.
     */
    constructor(precacheController2, options) {
      const match = ({ request }) => {
        const urlsToCacheKeys = precacheController2.getURLsToCacheKeys();
        for (const possibleURL of generateURLVariations(request.url, options)) {
          const cacheKey = urlsToCacheKeys.get(possibleURL);
          if (cacheKey) {
            const integrity = precacheController2.getIntegrityForCacheKey(cacheKey);
            return { cacheKey, integrity };
          }
        }
        if (true) {
          logger.debug(`Precaching did not find a match for ` + getFriendlyURL(request.url));
        }
        return;
      };
      super(match, precacheController2.strategy);
    }
  };

  // node_modules/workbox-precaching/addRoute.js
  function addRoute(options) {
    const precacheController2 = getOrCreatePrecacheController();
    const precacheRoute = new PrecacheRoute(precacheController2, options);
    registerRoute(precacheRoute);
  }

  // node_modules/workbox-precaching/utils/deleteOutdatedCaches.js
  var SUBSTRING_TO_FIND = "-precache-";
  var deleteOutdatedCaches = async (currentPrecacheName, substringToFind = SUBSTRING_TO_FIND) => {
    const cacheNames3 = await self.caches.keys();
    const cacheNamesToDelete = cacheNames3.filter((cacheName) => {
      return cacheName.includes(substringToFind) && cacheName.includes(self.registration.scope) && cacheName !== currentPrecacheName;
    });
    await Promise.all(cacheNamesToDelete.map((cacheName) => self.caches.delete(cacheName)));
    return cacheNamesToDelete;
  };

  // node_modules/workbox-precaching/cleanupOutdatedCaches.js
  function cleanupOutdatedCaches() {
    self.addEventListener("activate", ((event) => {
      const cacheName = cacheNames.getPrecacheName();
      event.waitUntil(deleteOutdatedCaches(cacheName).then((cachesDeleted) => {
        if (true) {
          if (cachesDeleted.length > 0) {
            logger.log(`The following out-of-date precaches were cleaned up automatically:`, cachesDeleted);
          }
        }
      }));
    }));
  }

  // node_modules/workbox-precaching/createHandlerBoundToURL.js
  function createHandlerBoundToURL(url) {
    const precacheController2 = getOrCreatePrecacheController();
    return precacheController2.createHandlerBoundToURL(url);
  }

  // node_modules/workbox-precaching/precache.js
  function precache(entries) {
    const precacheController2 = getOrCreatePrecacheController();
    precacheController2.precache(entries);
  }

  // node_modules/workbox-precaching/precacheAndRoute.js
  function precacheAndRoute(entries, options) {
    precache(entries);
    addRoute(options);
  }

  // node_modules/workbox-routing/NavigationRoute.js
  var NavigationRoute = class extends Route {
    /**
     * If both `denylist` and `allowlist` are provided, the `denylist` will
     * take precedence and the request will not match this route.
     *
     * The regular expressions in `allowlist` and `denylist`
     * are matched against the concatenated
     * [`pathname`]{@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLHyperlinkElementUtils/pathname}
     * and [`search`]{@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLHyperlinkElementUtils/search}
     * portions of the requested URL.
     *
     * *Note*: These RegExps may be evaluated against every destination URL during
     * a navigation. Avoid using
     * [complex RegExps](https://github.com/GoogleChrome/workbox/issues/3077),
     * or else your users may see delays when navigating your site.
     *
     * @param {workbox-routing~handlerCallback} handler A callback
     * function that returns a Promise resulting in a Response.
     * @param {Object} options
     * @param {Array<RegExp>} [options.denylist] If any of these patterns match,
     * the route will not handle the request (even if a allowlist RegExp matches).
     * @param {Array<RegExp>} [options.allowlist=[/./]] If any of these patterns
     * match the URL's pathname and search parameter, the route will handle the
     * request (assuming the denylist doesn't match).
     */
    constructor(handler, { allowlist = [/./], denylist = [] } = {}) {
      if (true) {
        finalAssertExports.isArrayOfClass(allowlist, RegExp, {
          moduleName: "workbox-routing",
          className: "NavigationRoute",
          funcName: "constructor",
          paramName: "options.allowlist"
        });
        finalAssertExports.isArrayOfClass(denylist, RegExp, {
          moduleName: "workbox-routing",
          className: "NavigationRoute",
          funcName: "constructor",
          paramName: "options.denylist"
        });
      }
      super((options) => this._match(options), handler);
      this._allowlist = allowlist;
      this._denylist = denylist;
    }
    /**
     * Routes match handler.
     *
     * @param {Object} options
     * @param {URL} options.url
     * @param {Request} options.request
     * @return {boolean}
     *
     * @private
     */
    _match({ url, request }) {
      if (request && request.mode !== "navigate") {
        return false;
      }
      const pathnameAndSearch = url.pathname + url.search;
      for (const regExp of this._denylist) {
        if (regExp.test(pathnameAndSearch)) {
          if (true) {
            logger.log(`The navigation route ${pathnameAndSearch} is not being used, since the URL matches this denylist pattern: ${regExp.toString()}`);
          }
          return false;
        }
      }
      if (this._allowlist.some((regExp) => regExp.test(pathnameAndSearch))) {
        if (true) {
          logger.debug(`The navigation route ${pathnameAndSearch} is being used.`);
        }
        return true;
      }
      if (true) {
        logger.log(`The navigation route ${pathnameAndSearch} is not being used, since the URL being navigated to doesn't match the allowlist.`);
      }
      return false;
    }
  };

  // src-pwa/custom-service-worker.ts
  self.skipWaiting();
  clientsClaim();
  precacheAndRoute([{"revision":"5e0bd1c281a62a380d7a948085bfe2d1","url":"robots.txt"},{"revision":"1a0450ec1bbe89da2e9eb777be170064","url":"manifest.json"},{"revision":"95167e8e03927557849ce2f766a73e1c","url":"logo.svg"},{"revision":"44a82eb2b4e6c26481938bb7db5f776a","url":"logo.png"},{"revision":"da09ef8f88d3327fdfbb48929c19384a","url":"list.txt"},{"revision":"fcc47c7cffac14015a8aaa0aaea3eb64","url":"list.html"},{"revision":"d77195c28254692d93d837f6df5207ff","url":"index.txt"},{"revision":"a75ed8dab4d3d6ef263016bc3abb35a1","url":"index.html"},{"revision":"b189a8ac068b567ececf31f5bea96785","url":"favicon.ico"},{"revision":"c38701350b2bf200aba176653d5ee95a","url":"admin.txt"},{"revision":"10f2dcd9e8bd586a97f6a4179122320a","url":"admin.html"},{"revision":"015e2c9b7fb9570c6f52ef7e4b1b4425","url":"add.txt"},{"revision":"636931a50cf9b5c27456ae83b61ae480","url":"add.html"},{"revision":"cb4281681e9470365229e3db7d16aa84","url":"_not-found.txt"},{"revision":"7e42948b170c2b3893413642c8a00fe3","url":"_not-found.html"},{"revision":"97237d232d152c8b391aaef551c74dd2","url":"__next._tree.txt"},{"revision":"0d0b26db69823abce15519b07a73313f","url":"__next._index.txt"},{"revision":"cd61f5acca60ed26246822c6fddee486","url":"__next._head.txt"},{"revision":"d77195c28254692d93d837f6df5207ff","url":"__next._full.txt"},{"revision":"77e9d71d5fb45fef756282390af59c26","url":"__next.__PAGE__.txt"},{"revision":"7e42948b170c2b3893413642c8a00fe3","url":"404.html"},{"revision":"ecddc83af659afd47da64137bb0539b2","url":"401.txt"},{"revision":"e52571d5c736f2fd0b8c65444c34f4ab","url":"401.html"},{"revision":"e1f892c3b79bde7e423c672414884c10","url":"list/__next.list.txt"},{"revision":"e50c13cca4828d1d0f91f06aa4b95819","url":"list/__next.list.__PAGE__.txt"},{"revision":"54f25f4faa085b22d701e88596108512","url":"list/__next._tree.txt"},{"revision":"0d0b26db69823abce15519b07a73313f","url":"list/__next._index.txt"},{"revision":"cd61f5acca60ed26246822c6fddee486","url":"list/__next._head.txt"},{"revision":"da09ef8f88d3327fdfbb48929c19384a","url":"list/__next._full.txt"},{"revision":"bb832ae88f759d5e8ac51a085d110e15","url":"icons/icon-512x512.png"},{"revision":"1c82f3358d5846fff5a52066f6dadd19","url":"icons/icon-384x384.png"},{"revision":"9897c7d392710c1baf4c4ebc1c1b8bac","url":"icons/icon-256x256.png"},{"revision":"fa318f4e0e687c217d331ca562c20384","url":"icons/icon-192x192.png"},{"revision":"0e9b71e6bcfd5dddd527d16294ff94d1","url":"icons/icon-128x128.png"},{"revision":"8874fb275ca6b79e78b05c5ce7f67ae3","url":"icons/favicon-96x96.png"},{"revision":"14611094fc037ae96267e63f7d6f699d","url":"icons/favicon-32x32.png"},{"revision":"0f9bec44c06154063e8a0e88b4718746","url":"icons/favicon-16x16.png"},{"revision":"0e9b71e6bcfd5dddd527d16294ff94d1","url":"icons/favicon-128x128.png"},{"revision":"71fc7f65627f10ee9cf809c08709f2e1","url":"icons/apple-launch-828x1792.png"},{"revision":"07c5b0c931443c8917a8b9826df2444d","url":"icons/apple-launch-750x1334.png"},{"revision":"39c65d38598d36780242ab80c30196fb","url":"icons/apple-launch-2048x2732.png"},{"revision":"6b5c2a677ea7b143c8d1230d47115081","url":"icons/apple-launch-1668x2388.png"},{"revision":"80c36bcead53d7106bb9f7f6d84a54f2","url":"icons/apple-launch-1668x2224.png"},{"revision":"82f8ea3f8e4e81669d66ad4f72455585","url":"icons/apple-launch-1620x2160.png"},{"revision":"91e088bea6c3f7bafd010160a639ae96","url":"icons/apple-launch-1536x2048.png"},{"revision":"66bc05ad15f13ae978166a5724c36c4a","url":"icons/apple-launch-1290x2796.png"},{"revision":"496f39ab0fd505102830e2d8c3932534","url":"icons/apple-launch-1284x2778.png"},{"revision":"00991090f3afc8d73afc043671e3bb07","url":"icons/apple-launch-1242x2688.png"},{"revision":"18ea885e2c330e5ad2780795b4ce27e7","url":"icons/apple-launch-1242x2208.png"},{"revision":"805b7fb862ce0a7f78c42bd2a10a2b37","url":"icons/apple-launch-1179x2556.png"},{"revision":"abc2eb54c11e324fd2ea95cb8ac64d87","url":"icons/apple-launch-1170x2532.png"},{"revision":"9444c78e35a464b830bd1b9d2c42e734","url":"icons/apple-launch-1125x2436.png"},{"revision":"047da9d9d786dc2545ea69da56fdde19","url":"icons/apple-launch-1080x2340.png"},{"revision":"6de3a8ed4ed8b3096194dd4b99364f07","url":"dev/routes-manifest.json"},{"revision":"93c3a72812a0dedcd9abf2f17835cb06","url":"dev/prerender-manifest.json"},{"revision":"cb0754649e00d2a7f186765afc1eca2e","url":"dev/package.json"},{"revision":"a2a72c2cc423e525a3ce0368d758a6e8","url":"dev/fallback-build-manifest.json"},{"revision":"e594ac656172cdf49c27bc6f42b306c2","url":"dev/build-manifest.json"},{"revision":"abee47769bf307639ace4945f9cfd4ff","url":"dev/static/development/_ssgManifest.js"},{"revision":"013eb57bab04ab886e7d6f5105a343c8","url":"dev/static/development/_clientMiddlewareManifest.js"},{"revision":"3f290ecb505664f59e6ec20e14f7fccd","url":"dev/static/development/_buildManifest.js"},{"revision":"39a229f68acb5be88e2ce771197712e8","url":"dev/static/chunks/turbopack-_1e1uh56._.js"},{"revision":"c1518dd364f23426ce688399de666be6","url":"dev/static/chunks/src_styles_app_1z54j98.css"},{"revision":"ad9692fa92508469d1017b37b5e707bb","url":"dev/static/chunks/src_stores_valuesStore_ts_1qejp1v._.js"},{"revision":"11fb5eea9cd123191b9ec66ee7abc38a","url":"dev/static/chunks/src_stores_userStore_ts_1qejp1v._.js"},{"revision":"293c94523e1a256d66fc3ade2a6bd517","url":"dev/static/chunks/src_stores_appStore_ts_1qejp1v._.js"},{"revision":"882bf3e49c8dc0d140c840bcd0056ad5","url":"dev/static/chunks/src_stores_0j1n5pr._.js"},{"revision":"b4eac2090445b846cf03257aee504bb7","url":"dev/static/chunks/src_helpers_collections_ts_0nv6g9a._.js"},{"revision":"b4eac2090445b846cf03257aee504bb7","url":"dev/static/chunks/src_helpers_collections_ts_0k59k43._.js"},{"revision":"ddf98116d28572ecc9dfcc3cdc64095c","url":"dev/static/chunks/src_components_atoms_AppToast_tsx_0n3xtoh._.js"},{"revision":"563ff05c9e9d3711224c04451e3a936c","url":"dev/static/chunks/src_app_page_tsx_1pmuprg._.js"},{"revision":"75066ea5717be7f2d665073143938f4e","url":"dev/static/chunks/src_app_page_tsx_1gecvfk._.js"},{"revision":"14c70b90e38ffdb7dda755da0d253779","url":"dev/static/chunks/src_app_not-found_tsx_1pmuprg._.js"},{"revision":"47df46e5bb67b80e5e8ba426255cd0e8","url":"dev/static/chunks/src_app_list_page_tsx_1pmuprg._.js"},{"revision":"151f01348deb7e8f7e67a1aabf335e28","url":"dev/static/chunks/src_app_list_page_tsx_0lj384x._.js"},{"revision":"52fbb6af1e834b1edba068e97ffa8c50","url":"dev/static/chunks/src_app_list_ListPageContent_tsx_14l0lzf._.js"},{"revision":"cf3fbb294d009804ac08a4f353c34d9d","url":"dev/static/chunks/src_app_list_ListPageContent_tsx_0w1v2u2._.js"},{"revision":"27afafbfa9d3bde857bab6b12e1c3f39","url":"dev/static/chunks/src_app_layout_tsx_1g4q4bt._.js"},{"revision":"84617962eaf4bd1d479bf9332e967c09","url":"dev/static/chunks/src_app_admin_page_tsx_1po4qpu._.js"},{"revision":"c226b5dc68a05bab9990f4785bfeab25","url":"dev/static/chunks/src_app_admin_page_tsx_1pmuprg._.js"},{"revision":"6b8dca64a372713aeb5a02525d485542","url":"dev/static/chunks/src_app_admin_AdminPageContent_tsx_1fa3gm2._.js"},{"revision":"128c4f6cf0e48d3778513590e462061c","url":"dev/static/chunks/src_app_admin_AdminPageContent_tsx_17f_tb2._.js"},{"revision":"bf12291baa324486d11f318fb893362c","url":"dev/static/chunks/src_app_add_page_tsx_1pmuprg._.js"},{"revision":"7713e8d73bc1f940f9683036918bad54","url":"dev/static/chunks/src_app_add_page_tsx_0x9h9rp._.js"},{"revision":"37dbaba50c471376b51019a9c3498660","url":"dev/static/chunks/src_app_add_AddPageContent_tsx_1vs2o2c._.js"},{"revision":"143b8a9740175b524e068bfb975f44a8","url":"dev/static/chunks/src_app_add_AddPageContent_tsx_0tg2hgr._.js"},{"revision":"fcceaa9e97ae56eeab010efba4efcfb9","url":"dev/static/chunks/src_app_HomePageContent_tsx_1yndqfz._.js"},{"revision":"38363ce5d58791b47393ec34b2cd4b4a","url":"dev/static/chunks/src_app_HomePageContent_tsx_175zr29._.js"},{"revision":"5d6271da291df9bdda842f14069514f4","url":"dev/static/chunks/src_app_ClientProviders_tsx_1x1a9fg._.js"},{"revision":"5ae5c1c6de6c9941f0e6e4c396a0b980","url":"dev/static/chunks/src_app_AppInitializer_tsx_0n3xtoh._.js"},{"revision":"836f33add0fb0c4e81e83b00c62b4c60","url":"dev/static/chunks/src_1tutnfl._.js"},{"revision":"70ea1e9895d79456e046b2bf65539328","url":"dev/static/chunks/src_1aquq8u._.js"},{"revision":"8eb75486157c80c56e343df0d538decc","url":"dev/static/chunks/src_1_o0xji._.js"},{"revision":"a669484e903bb966f8dac6604b43088a","url":"dev/static/chunks/src_1_7im4x._.js"},{"revision":"95106986d757a46c0f9e285af01833c3","url":"dev/static/chunks/src_17ykqdp._.js"},{"revision":"69796ef773981d00a1fcfa6855facb6b","url":"dev/static/chunks/src_17k_zh5._.js"},{"revision":"204d37267d467cb10f5b6f7bb7956dc8","url":"dev/static/chunks/src_10g19l6._.js"},{"revision":"d0b582182e2071da842825caa5b08fec","url":"dev/static/chunks/src_0oab2h-._.js"},{"revision":"e661db353a3e7990e337619f950d3757","url":"dev/static/chunks/src_0e7tpxd._.js"},{"revision":"3abe7a9b79419753bf84a07a79b79f56","url":"dev/static/chunks/src_0c2f10p._.js"},{"revision":"279a59b176a2fa1dee687d7a3d00f3c5","url":"dev/static/chunks/src_09d8i8q._.js"},{"revision":"c68533c7d2fdfa612bbee14881784f3f","url":"dev/static/chunks/src_00rqazp._.js"},{"revision":"2e7c2f6f91e8590c072ae5486e1ba911","url":"dev/static/chunks/node_modules_transliteration_dist_18in63n._.js"},{"revision":"d6de66c85248398aa3d9743f986f4abc","url":"dev/static/chunks/node_modules_photoswipe_dist_photoswipe_esm_1jaikr4.js"},{"revision":"ead4866827cc64208528600983b85328","url":"dev/static/chunks/node_modules_photoswipe_dist_photoswipe_esm_0k59k43.js"},{"revision":"cb754ed8400fc0c486db4c2af000343c","url":"dev/static/chunks/node_modules_photoswipe_dist_photoswipe_1xv-rlz.css"},{"revision":"eb9030c89a1d84855a2b9a9e8f4bc790","url":"dev/static/chunks/node_modules_next_dist_compiled_react-server-dom-turbopack_164kp-6._.js"},{"revision":"b503a128179575d76d73dd38785963cd","url":"dev/static/chunks/node_modules_next_dist_compiled_react-dom_096_9a-._.js"},{"revision":"28529ef34420e5b58bf4352ec0135eb4","url":"dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_090k2jm.js"},{"revision":"f5b907a740d6a35deb050a971c6f7677","url":"dev/static/chunks/node_modules_next_dist_compiled_1amofcm._.js"},{"revision":"746d4609f01a4630ef15d223349a0556","url":"dev/static/chunks/node_modules_next_dist_client_components_builtin_global-error_1pmuprg.js"},{"revision":"0dc89eb8c64148372d4d832fce0638e2","url":"dev/static/chunks/node_modules_next_dist_client_0r5nbpw._.js"},{"revision":"846118c33b2c0e922d7b3a7676f81f6f","url":"dev/static/chunks/node_modules_next_dist_build_polyfills_polyfill-nomodule.js"},{"revision":"5ee4dfa3e209124288b84d1231870a0b","url":"dev/static/chunks/node_modules_next_dist_1ybzpk2._.js"},{"revision":"a5e7df538f169ac0077b3af204ab000d","url":"dev/static/chunks/node_modules_next_dist_1tlu237._.js"},{"revision":"b474b4118de5decfd1cb9a5a65a70094","url":"dev/static/chunks/node_modules_firebase_firestore_dist_esm_index_esm_147y39w.js"},{"revision":"b474b4118de5decfd1cb9a5a65a70094","url":"dev/static/chunks/node_modules_firebase_firestore_dist_esm_index_esm_0rnwmgl.js"},{"revision":"1f66c279ec68492c4c59fd910cdb1dec","url":"dev/static/chunks/node_modules_exifreader_src_11uxgd4._.js"},{"revision":"87f68ed5d0547063bb75266414822dc8","url":"dev/static/chunks/node_modules_@heroicons_react_24_07e6auz._.js"},{"revision":"e966ef44d29e7890e972053d71d41e09","url":"dev/static/chunks/node_modules_@headlessui_react_dist_1td29hx._.js"},{"revision":"4b47faba975e33307440acb707c57f8c","url":"dev/static/chunks/node_modules_@headlessui_react_dist_1-dn3yg._.js"},{"revision":"36a403fb62d8f723901078c70ba0058e","url":"dev/static/chunks/node_modules_@floating-ui_react_dist_0acszqm._.js"},{"revision":"c2784f2ae81c2aee7daba555440924d3","url":"dev/static/chunks/node_modules_@firebase_storage_dist_index_esm2017_0levta9.js"},{"revision":"65c8de8e0c22c8b81ad1de1ba63de354","url":"dev/static/chunks/node_modules_@firebase_firestore_dist_index_esm2017_1rtdnxp.js"},{"revision":"dde7715a8b9707d77a3b4cec24cc3ff8","url":"dev/static/chunks/node_modules_@firebase_auth_dist_esm2017_1lpeziv._.js"},{"revision":"a0a9b51c9d95a9e6e91fb166ff46770b","url":"dev/static/chunks/node_modules_@firebase_auth_dist_esm2017_1b6vss7._.js"},{"revision":"08fb18f4030d07bfd6b7a291eb768504","url":"dev/static/chunks/node_modules_@firebase_auth_dist_esm2017_05kif1g._.js"},{"revision":"0d339888ed2e67e90c982ce989636ff4","url":"dev/static/chunks/node_modules_1x0hltz._.js"},{"revision":"e8754165502fc65c64c15eef34c98b73","url":"dev/static/chunks/node_modules_1d6fefd._.js"},{"revision":"2ba88a122dae81f6b5ad25b76909d31b","url":"dev/static/chunks/node_modules_17lck5a._.js"},{"revision":"086a9d6205dc3e43718fe6c80bec860d","url":"dev/static/chunks/node_modules_16i2eb4._.js"},{"revision":"3bee09dd2122b56775e2237ba8b3bd94","url":"dev/static/chunks/node_modules_0znbwy0._.js"},{"revision":"6d6c8545d577b42f9c83e2b0f213411e","url":"dev/static/chunks/node_modules_0dhlg4b._.js"},{"revision":"455944cedf74bb4213f49ba5f986d091","url":"dev/static/chunks/node_modules_0aaehd6._.js"},{"revision":"7c42f2ef5575fa3d15a87b54b1aa729e","url":"dev/static/chunks/node_modules_0_slozr._.js"},{"revision":"45e3a69ad4d8baf83d7b702c23ea4544","url":"dev/static/chunks/node_modules_08toek9._.js"},{"revision":"4b4f47c50da8275494c736acf0734f43","url":"dev/static/chunks/node_modules_08ph4h9._.js"},{"revision":"7525d5494afcbd316a395d3e305bb347","url":"dev/static/chunks/_1anvha4._.js"},{"revision":"13f719352f30d758777141f3fba6a91e","url":"dev/static/chunks/_0niie5o._.js"},{"revision":"d8b2211ee1e42b3ed3db00110f9b4f22","url":"dev/static/chunks/_0_qjayb._.js"},{"revision":"f15fdfc297d3c7c6effae772519eceec","url":"dev/static/chunks/[turbopack]_browser_dev_hmr-client_hmr-client_ts_1ofq5vg._.js"},{"revision":"d2babb1461dc36ae89b84ca2659bd25e","url":"dev/static/chunks/[turbopack]_browser_dev_hmr-client_hmr-client_ts_1mojsay._.js"},{"revision":"38df6f7ad0e1310c1401ba70938b6996","url":"dev/static/chunks/[turbopack]_browser_dev_hmr-client_hmr-client_ts_0dhxdav._.js"},{"revision":"6b7f9fcc9245de419e774d318ed20458","url":"dev/static/chunks/0nn8_@swc_helpers_cjs_03rh8y8._.js"},{"revision":"18a6d34c212e70efa7723fa965cb5c19","url":"dev/server/server-reference-manifest.json"},{"revision":"51fd8301fcccea0551cd39309b21afe3","url":"dev/server/server-reference-manifest.js"},{"revision":"99914b932bd37a50b983c5e7c90ae93b","url":"dev/server/pages-manifest.json"},{"revision":"c1baf267115ab8f45f0d217a37e9c53c","url":"dev/server/next-font-manifest.json"},{"revision":"9ad80c87dc5e1d4238e69c638442ed7c","url":"dev/server/next-font-manifest.js"},{"revision":"7aeb4154b5636f625bf330f161688b4e","url":"dev/server/middleware-manifest.json"},{"revision":"e4be7489c3f00ef8c49aba51a8671563","url":"dev/server/middleware-build-manifest.js"},{"revision":"d7aa1834e4b5ee75408143d266ce2f1c","url":"dev/server/interception-route-rewrite-manifest.js"},{"revision":"2866f8448d8dd7fe036e3866733a7df2","url":"dev/server/app-paths-manifest.json"},{"revision":"fe0f7fdc6eeea7e5e12fa93797f24141","url":"dev/server/chunks/ssr/src_app_page_tsx_1chiuah._.js"},{"revision":"39a2dc6ed5800d2ad4c80936871965d6","url":"dev/server/chunks/ssr/src_app_not-found_tsx_0xltofl._.js"},{"revision":"53af81b6a5ef43845182faea626e596f","url":"dev/server/chunks/ssr/src_app_list_page_tsx_1zosuso._.js"},{"revision":"47cc42ad82bdb858c2e923bfc43fd52d","url":"dev/server/chunks/ssr/src_app_admin_page_tsx_0ublbd0._.js"},{"revision":"4d29549a7e507bb3b3af744b0ea2823b","url":"dev/server/chunks/ssr/src_app_add_page_tsx_0zd6rsa._.js"},{"revision":"152112fb8ce7f3bc496f1beb2b45f2b9","url":"dev/server/chunks/ssr/node_modules_transliteration_dist_node_src_node_index_0wf6hqq.js"},{"revision":"4bd45d33b830be55f205e9eb8d1b8c8c","url":"dev/server/chunks/ssr/node_modules_protobufjs_1c-cik3._.js"},{"revision":"51fbe392c7d6cf5739cd3932ed454b58","url":"dev/server/chunks/ssr/node_modules_next_dist_server_route-modules_app-page_0qo_rmc._.js"},{"revision":"0b7408d131aa68c7af2dce8b558cc2bc","url":"dev/server/chunks/ssr/node_modules_next_dist_esm_1z98dhu._.js"},{"revision":"170ac42bc96a5d26a3287e58f470ef8a","url":"dev/server/chunks/ssr/node_modules_next_dist_esm_1kqkrlx._.js"},{"revision":"0d4e88d88ce0aa5fa0830eb0c628f3a2","url":"dev/server/chunks/ssr/node_modules_next_dist_esm_1g0kpbu._.js"},{"revision":"6ea4aeb897867fba41b413b940ed4fd4","url":"dev/server/chunks/ssr/node_modules_next_dist_esm_1_kobm0._.js"},{"revision":"b298573feca8e3954561f3755bb8b8f2","url":"dev/server/chunks/ssr/node_modules_next_dist_esm_14n__y4._.js"},{"revision":"0cabc6ff1ec075e02bf9aba2d1139caf","url":"dev/server/chunks/ssr/node_modules_next_dist_compiled_0d323sd._.js"},{"revision":"c6324f9421204524b34aa0498c89887a","url":"dev/server/chunks/ssr/node_modules_next_dist_client_components_builtin_unauthorized_0l_sp0x.js"},{"revision":"3ce3356e9b0480a4857939cae4d13a85","url":"dev/server/chunks/ssr/node_modules_next_dist_client_components_builtin_global-error_0-o-goa.js"},{"revision":"d847f17f7255c5df4f0d776b896eb2ba","url":"dev/server/chunks/ssr/node_modules_next_dist_client_components_0p8s4lh._.js"},{"revision":"83c4d3ba3d336cfc254e6ee353401df9","url":"dev/server/chunks/ssr/node_modules_next_dist_client_components_0bew68i._.js"},{"revision":"7099e6a5824bc8f523f1bcc862556a6f","url":"dev/server/chunks/ssr/node_modules_next_dist_1tyigpy._.js"},{"revision":"e772265e891acc1d6dfa26a8d3849e1e","url":"dev/server/chunks/ssr/node_modules_next_dist_07291d1._.js"},{"revision":"92f5ae5f2d32451678ddca526f43f6c9","url":"dev/server/chunks/ssr/node_modules_next_1qqlaq-._.js"},{"revision":"bd1883e71030900f7c721ee8b09298af","url":"dev/server/chunks/ssr/node_modules_exifreader_src_01q34zx._.js"},{"revision":"bd15ed365a057fad1b739d03faabda4d","url":"dev/server/chunks/ssr/node_modules_@heroicons_react_24_0q4wz8t._.js"},{"revision":"384ee85b03b8c4ef1db16d07c7af0149","url":"dev/server/chunks/ssr/node_modules_@grpc_grpc-js_1r8srfa._.js"},{"revision":"bc4c91c05a07176f7c73f994fccbd2ec","url":"dev/server/chunks/ssr/node_modules_@firebase_storage_dist_node-esm_index_node_esm_10cpnxo.js"},{"revision":"4a0c3b594660c0057beecce6beae9c99","url":"dev/server/chunks/ssr/node_modules_@firebase_firestore_dist_index_node_mjs_149_rdq._.js"},{"revision":"f47bc701d54b9862fba7ab3087b1699d","url":"dev/server/chunks/ssr/node_modules_@firebase_auth_dist_node-esm_1ptzkcw._.js"},{"revision":"dccb3f7b077dd6cd35dcdcecc3c3f5d4","url":"dev/server/chunks/ssr/node_modules_18kxkdt._.js"},{"revision":"8466085e2afe268519acfaabf38f0264","url":"dev/server/chunks/ssr/_next-internal_server_app_page_actions_0hhsz1j.js"},{"revision":"8a5d2ac71def807e12ccac9e7345d7e1","url":"dev/server/chunks/ssr/_next-internal_server_app_list_page_actions_04cxd7p.js"},{"revision":"e034591253f87eefcafeec8180996b5d","url":"dev/server/chunks/ssr/_next-internal_server_app_admin_page_actions_1mcickz.js"},{"revision":"0d81db4bc54c32d7d615e20a90ed4eaf","url":"dev/server/chunks/ssr/_next-internal_server_app_add_page_actions_0aj-j4-.js"},{"revision":"a0da1ef2f58128ad0841b3207c7fe373","url":"dev/server/chunks/ssr/_next-internal_server_app__not-found_page_actions_0pt47yr.js"},{"revision":"3011f740a0e6a162397b2e74299cb478","url":"dev/server/chunks/ssr/_1px39sa._.js"},{"revision":"fe66b2604b91be507cc62184e41cb0cf","url":"dev/server/chunks/ssr/[turbopack]_runtime.js"},{"revision":"77f0c85b03205c63bbff9301344dcdd4","url":"dev/server/chunks/ssr/[root-of-the-server]__1vliu7x._.js"},{"revision":"e01ee52065d80e2edd93b64fee7f810e","url":"dev/server/chunks/ssr/[root-of-the-server]__1tq6042._.js"},{"revision":"7f6106599b3a6106af03608f9ec45a4a","url":"dev/server/chunks/ssr/[root-of-the-server]__1352960._.js"},{"revision":"810422312481f12968e0b1abedfa36dd","url":"dev/server/chunks/ssr/[root-of-the-server]__0uziigb._.js"},{"revision":"43eb4eb26997ddcc2efcb59e3813ac89","url":"dev/server/chunks/ssr/[root-of-the-server]__0il83ul._.js"},{"revision":"de5e854d7dfb4fafea8e2e0d2e5ddbce","url":"dev/server/chunks/ssr/[root-of-the-server]__09lunx7._.js"},{"revision":"7f58b20eb8402faf4a04d7ffa729ab81","url":"dev/server/chunks/ssr/[externals]_next_dist_shared_lib_no-fallback-error_external_0r3u29k.js"},{"revision":"a406456990145773be2c0ff48bcfda93","url":"dev/server/chunks/ssr/[externals]__12if52y._.js"},{"revision":"d656b4ed946ab1d990207b06c42e1440","url":"dev/server/app/page_client-reference-manifest.js"},{"revision":"1c9af42e3a2e9807585cf111b37e44f2","url":"dev/server/app/page.js"},{"revision":"79de46890cb32a2400db0fe0ed3f04ad","url":"dev/server/app/page/server-reference-manifest.json"},{"revision":"3a0c2b1a5b161cb41467ab01a8106459","url":"dev/server/app/page/react-loadable-manifest.json"},{"revision":"c8573aa004774d292ee30bcd590d4337","url":"dev/server/app/page/next-font-manifest.json"},{"revision":"eee6686d9087ba7f8f2327b2fd41ab12","url":"dev/server/app/page/build-manifest.json"},{"revision":"7a564a7c25076ab1141e0fc4bf9535d1","url":"dev/server/app/page/app-paths-manifest.json"},{"revision":"a4a170944a5ef2bf6013ad213c59fce7","url":"dev/server/app/list/page_client-reference-manifest.js"},{"revision":"3d489184accbc81e343ccab85cd25388","url":"dev/server/app/list/page.js"},{"revision":"79de46890cb32a2400db0fe0ed3f04ad","url":"dev/server/app/list/page/server-reference-manifest.json"},{"revision":"bf91045e67283c1ccb3dddc545c75a5f","url":"dev/server/app/list/page/react-loadable-manifest.json"},{"revision":"c8573aa004774d292ee30bcd590d4337","url":"dev/server/app/list/page/next-font-manifest.json"},{"revision":"eee6686d9087ba7f8f2327b2fd41ab12","url":"dev/server/app/list/page/build-manifest.json"},{"revision":"86a1091e359a0f8fe4ce95a7e39f6a25","url":"dev/server/app/list/page/app-paths-manifest.json"},{"revision":"b810666169df82e830f21efbe431f041","url":"dev/server/app/admin/page_client-reference-manifest.js"},{"revision":"7116a78d8fc49e8d2a74447cbb71f602","url":"dev/server/app/admin/page.js"},{"revision":"79de46890cb32a2400db0fe0ed3f04ad","url":"dev/server/app/admin/page/server-reference-manifest.json"},{"revision":"8fa5580c593c49fdd474c13227589b4d","url":"dev/server/app/admin/page/react-loadable-manifest.json"},{"revision":"c8573aa004774d292ee30bcd590d4337","url":"dev/server/app/admin/page/next-font-manifest.json"},{"revision":"eee6686d9087ba7f8f2327b2fd41ab12","url":"dev/server/app/admin/page/build-manifest.json"},{"revision":"8e6f392eb307391e41e0eb1b00f118bf","url":"dev/server/app/admin/page/app-paths-manifest.json"},{"revision":"87ca5fe065f28c4b85086eccfda0252a","url":"dev/server/app/add/page_client-reference-manifest.js"},{"revision":"ca424c80079df953de662304edf4730e","url":"dev/server/app/add/page.js"},{"revision":"79de46890cb32a2400db0fe0ed3f04ad","url":"dev/server/app/add/page/server-reference-manifest.json"},{"revision":"cc9d75039d9e5b2deadd46f8f8259b7b","url":"dev/server/app/add/page/react-loadable-manifest.json"},{"revision":"c8573aa004774d292ee30bcd590d4337","url":"dev/server/app/add/page/next-font-manifest.json"},{"revision":"eee6686d9087ba7f8f2327b2fd41ab12","url":"dev/server/app/add/page/build-manifest.json"},{"revision":"f097e28b687c76057d252b515c6abde6","url":"dev/server/app/add/page/app-paths-manifest.json"},{"revision":"1af996b0d20629d7856779fd3151e040","url":"dev/server/app/_not-found/page_client-reference-manifest.js"},{"revision":"bc13083b61235f8e40aa2e34952dbeca","url":"dev/server/app/_not-found/page.js"},{"revision":"79de46890cb32a2400db0fe0ed3f04ad","url":"dev/server/app/_not-found/page/server-reference-manifest.json"},{"revision":"1c42d74cdd221764b31d510e81478b69","url":"dev/server/app/_not-found/page/react-loadable-manifest.json"},{"revision":"c8573aa004774d292ee30bcd590d4337","url":"dev/server/app/_not-found/page/next-font-manifest.json"},{"revision":"eee6686d9087ba7f8f2327b2fd41ab12","url":"dev/server/app/_not-found/page/build-manifest.json"},{"revision":"f96417966c95ed5691f6627aa78b211b","url":"dev/server/app/_not-found/page/app-paths-manifest.json"},{"revision":"99914b932bd37a50b983c5e7c90ae93b","url":"dev/cache/next-devtools-config.json"},{"revision":"a6b7eb31b5dcf3835a90ea0d201f21e3","url":"dev/build/package.json"},{"revision":"24f6b3e5efd1213314e34adb0a15fe78","url":"dev/build/425d580d18f26225.js"},{"revision":"fee707eea8fbb39de1c2e99e2019fb6f","url":"dev/build/chunks/node_modules_20v-8wl._.js"},{"revision":"2ecae4b3e1faa81a7ab373d5c2c09247","url":"dev/build/chunks/[turbopack]_runtime.js"},{"revision":"6d6264d420053d7c070c9f25feb228e0","url":"dev/build/chunks/[turbopack-node]_transforms_postcss_ts_13hmb-_._.js"},{"revision":"5cdfd025943f8bc962941689bd299275","url":"dev/build/chunks/[root-of-the-server]__1audplt._.js"},{"revision":"9255ee4fab0163ef1fda0be227e3dfe8","url":"dev/build/chunks/[root-of-the-server]__0x0qtct._.js"},{"revision":"e1f892c3b79bde7e423c672414884c10","url":"admin/__next.admin.txt"},{"revision":"2e6d19662dcf90669c48bdcff81f146e","url":"admin/__next.admin.__PAGE__.txt"},{"revision":"7c2b59477cd32695b7897d415e2dbc2d","url":"admin/__next._tree.txt"},{"revision":"0d0b26db69823abce15519b07a73313f","url":"admin/__next._index.txt"},{"revision":"cd61f5acca60ed26246822c6fddee486","url":"admin/__next._head.txt"},{"revision":"c38701350b2bf200aba176653d5ee95a","url":"admin/__next._full.txt"},{"revision":"e1f892c3b79bde7e423c672414884c10","url":"add/__next.add.txt"},{"revision":"6598668a2a8a11f697a3c0acd4cfe90f","url":"add/__next.add.__PAGE__.txt"},{"revision":"22e6191bda6ed486e0b5c5b8dbd438d7","url":"add/__next._tree.txt"},{"revision":"0d0b26db69823abce15519b07a73313f","url":"add/__next._index.txt"},{"revision":"cd61f5acca60ed26246822c6fddee486","url":"add/__next._head.txt"},{"revision":"015e2c9b7fb9570c6f52ef7e4b1b4425","url":"add/__next._full.txt"},{"revision":"ac6b96c96cb229c3963bc035a5745288","url":"_not-found/__next._tree.txt"},{"revision":"e1f892c3b79bde7e423c672414884c10","url":"_not-found/__next._not-found.txt"},{"revision":"af5d1ea677b9fb1901191a2ff1ed526d","url":"_not-found/__next._not-found.__PAGE__.txt"},{"revision":"0d0b26db69823abce15519b07a73313f","url":"_not-found/__next._index.txt"},{"revision":"5d4fe49b056a4245a814f8c6f8e66435","url":"_not-found/__next._head.txt"},{"revision":"cb4281681e9470365229e3db7d16aa84","url":"_not-found/__next._full.txt"},{"revision":"4f281e49674628c2c25ad072629e7ea5","url":"_next/static/css/adb36c88f133c302.css"},{"revision":"46f7a0b73c7ad8e36f18b4169cf4acd2","url":"_next/static/css/8757ea28e9e2f5d6.css"},{"revision":"e4a7bd1883fef177060e754a94da0b5b","url":"_next/static/chunks/webpack-c5bd74ec2c0c1a8c.js"},{"revision":"846118c33b2c0e922d7b3a7676f81f6f","url":"_next/static/chunks/polyfills-42372ed130431b0a.js"},{"revision":"aa8906bb62357ae0d5d62e67703dc5c6","url":"_next/static/chunks/main-app-4ad89a30a21dcf37.js"},{"revision":"48d836bb88ee59785a9641eeb8207a18","url":"_next/static/chunks/main-0685e79a01e306b5.js"},{"revision":"df192de88a9e31f33651417c3f08d81e","url":"_next/static/chunks/framework-228d67440a9d5288.js"},{"revision":"efc7e6102cbfe44a017d05b6258b7bd3","url":"_next/static/chunks/c16f53c3.d1dc27298ca4c9c2.js"},{"revision":"de6393339653a9cc1a3f57874c5b1a43","url":"_next/static/chunks/bc9e92e6-b5a431e9a8c1be07.js"},{"revision":"829b1b19ca0a135aa436ff426b4fde6f","url":"_next/static/chunks/bc6e6b98-7e38afd8198c02b5.js"},{"revision":"b13fd37909ecb6f564b67b09d1343f7c","url":"_next/static/chunks/ae6eea6a-5cb10529dea2bd01.js"},{"revision":"24cb6b657ada2a073ddc4aceed575fb5","url":"_next/static/chunks/9dadc25a.53285435c9663824.js"},{"revision":"6a894ace984ec900823bf01208d2ff29","url":"_next/static/chunks/867.c33fd84157ce2644.js"},{"revision":"861789d517e8b466d05bb030493918e2","url":"_next/static/chunks/855.62b364d0a387c979.js"},{"revision":"7a36131073ccbfeb6e7db5244f295cf8","url":"_next/static/chunks/794-ded3d6070a406ea0.js"},{"revision":"f798ae9daa423c59f8881485ec85e736","url":"_next/static/chunks/765.c350f32e51d2b3f5.js"},{"revision":"d781f56d4a6073b5a8db82464e7253f6","url":"_next/static/chunks/758.fbf1247264b5c0d0.js"},{"revision":"94bfda39f4557645aee0baf2f66e75c9","url":"_next/static/chunks/708.1418246d7dd26095.js"},{"revision":"afe28ceda2a9041b4babf208ee00aab9","url":"_next/static/chunks/677.37b54807def72468.js"},{"revision":"be01fc195dd668f26772ac691d11a871","url":"_next/static/chunks/594-86bab9f61981f148.js"},{"revision":"e7429c0a19b5214aec3de4f6a4f7dc16","url":"_next/static/chunks/500-6a8cbb636335852a.js"},{"revision":"71d2183a4447d1c3ce70ae81151d6a68","url":"_next/static/chunks/4bd1b696-215e5051988c3dde.js"},{"revision":"3269f64677050b91fbfc420c3aee6d21","url":"_next/static/chunks/436.0e070355d8928b6e.js"},{"revision":"764811e090407cd131fd96551bde6848","url":"_next/static/chunks/434.af33ea849ee4d3b7.js"},{"revision":"eea129233d608c546a314f8a26612585","url":"_next/static/chunks/426.d5873eacaa0003ce.js"},{"revision":"04153adbfa112d4de737941205109ef2","url":"_next/static/chunks/390-1b599f193f8eb26a.js"},{"revision":"e7b17fa600f1ccffb1fd97b9ee2d72e0","url":"_next/static/chunks/253.7644975b2cf63924.js"},{"revision":"6edd227107eb52819595a5073e8f5119","url":"_next/static/chunks/210.78431a3139272d70.js"},{"revision":"b68ce853bbc35a186a58a99abd84b209","url":"_next/static/chunks/193-14356c9e2c2edc69.js"},{"revision":"cdba48fa2db1859b97452ab5f69f576c","url":"_next/static/chunks/next/dist/client/components/builtin/unauthorized-7b4c6c53912cc774.js"},{"revision":"0aab9576a3cd4d52beb0995bed22b18a","url":"_next/static/chunks/next/dist/client/components/builtin/global-error-8d49fa5e7809a727.js"},{"revision":"cdba48fa2db1859b97452ab5f69f576c","url":"_next/static/chunks/next/dist/client/components/builtin/forbidden-7b4c6c53912cc774.js"},{"revision":"cdba48fa2db1859b97452ab5f69f576c","url":"_next/static/chunks/next/dist/client/components/builtin/app-error-7b4c6c53912cc774.js"},{"revision":"e2e3a88c79452f2cb662e7039d4ddc49","url":"_next/static/chunks/app/page-d840b9ff425b3d29.js"},{"revision":"5ff97dcef9cc69a71cb4af7e436ea0eb","url":"_next/static/chunks/app/not-found-f9df87ea823d2447.js"},{"revision":"ccc5fcad11658c5b582ca012f152b989","url":"_next/static/chunks/app/layout-43520d7a9c8e3ed9.js"},{"revision":"e3f0f3d504d70bbb45ad85e465a113a9","url":"_next/static/chunks/app/list/page-07783a640ac778c4.js"},{"revision":"d15907462590edc5c0099c285723be3f","url":"_next/static/chunks/app/admin/page-b6ce1ebeeb67e117.js"},{"revision":"f51e3f36fb9414914ea6033c4c0c1596","url":"_next/static/chunks/app/add/page-5275cf4e8bc0d6bc.js"},{"revision":"cdba48fa2db1859b97452ab5f69f576c","url":"_next/static/chunks/app/_not-found/page-7b4c6c53912cc774.js"},{"revision":"cdba48fa2db1859b97452ab5f69f576c","url":"_next/static/chunks/app/_global-error/page-7b4c6c53912cc774.js"},{"revision":"76a2cb5f0575769398ccf3c8c5e62036","url":"_next/static/chunks/app/401/page-1135bcfdd2165fb7.js"},{"revision":"b404e23d62d95bafd03ad7747cc0e88b","url":"_next/static/WvX6UrmmiANw8Z7VPlpsr/_ssgManifest.js"},{"revision":"ad7a33d58b7393bd3474c43ecef0f3f7","url":"_next/static/WvX6UrmmiANw8Z7VPlpsr/_buildManifest.js"},{"revision":"8f820ec5632117c828b59582689931e8","url":"401/__next._tree.txt"},{"revision":"0d0b26db69823abce15519b07a73313f","url":"401/__next._index.txt"},{"revision":"cd61f5acca60ed26246822c6fddee486","url":"401/__next._head.txt"},{"revision":"ecddc83af659afd47da64137bb0539b2","url":"401/__next._full.txt"},{"revision":"e1f892c3b79bde7e423c672414884c10","url":"401/__next.401.txt"},{"revision":"66efdab8392292902764e3037571700b","url":"401/__next.401.__PAGE__.txt"}]);
  cleanupOutdatedCaches();
  if (true) {
    registerRoute(
      new NavigationRoute(
        createHandlerBoundToURL("/index.html"),
        {
          denylist: [
            "/sw\\.js" ? new RegExp("/sw\\.js") : /default-regex/,
            /workbox-(.)*\.js$/
          ]
        }
      )
    );
  }
})();
