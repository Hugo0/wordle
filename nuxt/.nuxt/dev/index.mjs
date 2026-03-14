import process from 'node:process';globalThis._importMeta_={url:import.meta.url,env:process.env};import { tmpdir } from 'node:os';
import { defineEventHandler, handleCacheHeaders, splitCookiesString, createEvent, fetchWithEvent, isEvent, eventHandler, setHeaders, sendRedirect, proxyRequest, getRequestHeader, setResponseHeaders, setResponseStatus, send, getRequestHeaders, setResponseHeader, appendResponseHeader, getRequestURL, getResponseHeader, removeResponseHeader, createError, getQuery as getQuery$1, readBody, createApp, createRouter as createRouter$1, toNodeListener, lazyEventHandler, getResponseStatus, getRouterParam, getResponseStatusText } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/h3@1.15.6/node_modules/h3/dist/index.mjs';
import { Server } from 'node:http';
import { resolve, dirname, join } from 'node:path';
import nodeCrypto, { createHash } from 'node:crypto';
import { parentPort, threadId } from 'node:worker_threads';
import { escapeHtml } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/@vue+shared@3.5.30/node_modules/@vue/shared/dist/shared.cjs.js';
import { promises, readdirSync, existsSync, writeFileSync, readFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { createRenderer, getRequestDependencies, getPreloadLinks, getPrefetchLinks } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/vue-bundle-renderer@2.2.0/node_modules/vue-bundle-renderer/dist/runtime.mjs';
import { parseURL, withoutBase, joinURL, getQuery, withQuery, withTrailingSlash, decodePath, withLeadingSlash, withoutTrailingSlash, joinRelativeURL } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/ufo@1.6.3/node_modules/ufo/dist/index.mjs';
import { renderToString } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/vue@3.5.30_typescript@5.9.3/node_modules/vue/server-renderer/index.mjs';
import destr, { destr as destr$1 } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/destr@2.0.5/node_modules/destr/dist/index.mjs';
import { createHooks } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/hookable@5.5.3/node_modules/hookable/dist/index.mjs';
import { createFetch, Headers as Headers$1 } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/ofetch@1.5.1/node_modules/ofetch/dist/node.mjs';
import { fetchNodeRequestHandler, callNodeRequestHandler } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/node-mock-http@1.0.4/node_modules/node-mock-http/dist/index.mjs';
import { createStorage, prefixStorage } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/unstorage@1.17.4_db0@0.3.4_ioredis@5.10.0/node_modules/unstorage/dist/index.mjs';
import unstorage_47drivers_47fs from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/unstorage@1.17.4_db0@0.3.4_ioredis@5.10.0/node_modules/unstorage/drivers/fs.mjs';
import { digest } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/ohash@2.0.11/node_modules/ohash/dist/index.mjs';
import { klona } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/klona@2.0.6/node_modules/klona/dist/index.mjs';
import defu, { defuFn } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/defu@6.1.4/node_modules/defu/dist/defu.mjs';
import { snakeCase } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/scule@1.3.0/node_modules/scule/dist/index.mjs';
import { getContext } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/unctx@2.5.0/node_modules/unctx/dist/index.mjs';
import { toRouteMatcher, createRouter } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/radix3@1.1.2/node_modules/radix3/dist/index.mjs';
import { readFile } from 'node:fs/promises';
import consola, { consola as consola$1 } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/consola@3.4.2/node_modules/consola/dist/index.mjs';
import { ErrorParser } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/youch-core@0.3.3/node_modules/youch-core/build/index.js';
import { Youch } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/youch@4.1.0/node_modules/youch/build/index.js';
import { SourceMapConsumer } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/source-map@0.7.6/node_modules/source-map/source-map.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import { stringify, uneval } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/devalue@5.6.4/node_modules/devalue/index.js';
import { captureRawStackTrace, parseRawStackTrace } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/errx@0.1.0/node_modules/errx/dist/index.js';
import { isVNode, isRef, toValue } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/vue@3.5.30_typescript@5.9.3/node_modules/vue/index.mjs';
import _wH6JrtIxmaSoA8lCPWFnE9z4lQeXW6H5z3l5aymEQw from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/@nuxt+vite-builder@3.21.2_@types+node@25.5.0_lightningcss@1.31.1_magicast@0.5.2_nuxt@3._3025389ef66484aa542733b1258acfb4/node_modules/@nuxt/vite-builder/dist/fix-stacktrace.mjs';
import { fileURLToPath } from 'node:url';
import { dirname as dirname$1, resolve as resolve$1 } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/pathe@2.0.3/node_modules/pathe/dist/index.mjs';
import { createHead as createHead$1, propsToString, renderSSRHead } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/unhead@2.1.12/node_modules/unhead/dist/server.mjs';
import { DeprecationsPlugin, PromisesPlugin, TemplateParamsPlugin, AliasSortingPlugin } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/unhead@2.1.12/node_modules/unhead/dist/plugins.mjs';
import { walkResolver } from 'file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/unhead@2.1.12/node_modules/unhead/dist/utils.mjs';

const serverAssets = [{"baseName":"server","dir":"/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/server/assets"}];

const assets$1 = createStorage();

for (const asset of serverAssets) {
  assets$1.mount(asset.baseName, unstorage_47drivers_47fs({ base: asset.dir, ignore: (asset?.ignore || []) }));
}

const storage = createStorage({});

storage.mount('/assets', assets$1);

storage.mount('root', unstorage_47drivers_47fs({"driver":"fs","readOnly":true,"base":"/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt","watchOptions":{"ignored":[null]}}));
storage.mount('src', unstorage_47drivers_47fs({"driver":"fs","readOnly":true,"base":"/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/server","watchOptions":{"ignored":[null]}}));
storage.mount('build', unstorage_47drivers_47fs({"driver":"fs","readOnly":false,"base":"/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/.nuxt"}));
storage.mount('cache', unstorage_47drivers_47fs({"driver":"fs","readOnly":false,"base":"/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/.nuxt/cache"}));
storage.mount('data', unstorage_47drivers_47fs({"driver":"fs","base":"/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/.data/kv"}));

function useStorage(base = "") {
  return base ? prefixStorage(storage, base) : storage;
}

const Hasher = /* @__PURE__ */ (() => {
  class Hasher2 {
    buff = "";
    #context = /* @__PURE__ */ new Map();
    write(str) {
      this.buff += str;
    }
    dispatch(value) {
      const type = value === null ? "null" : typeof value;
      return this[type](value);
    }
    object(object) {
      if (object && typeof object.toJSON === "function") {
        return this.object(object.toJSON());
      }
      const objString = Object.prototype.toString.call(object);
      let objType = "";
      const objectLength = objString.length;
      objType = objectLength < 10 ? "unknown:[" + objString + "]" : objString.slice(8, objectLength - 1);
      objType = objType.toLowerCase();
      let objectNumber = null;
      if ((objectNumber = this.#context.get(object)) === void 0) {
        this.#context.set(object, this.#context.size);
      } else {
        return this.dispatch("[CIRCULAR:" + objectNumber + "]");
      }
      if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(object)) {
        this.write("buffer:");
        return this.write(object.toString("utf8"));
      }
      if (objType !== "object" && objType !== "function" && objType !== "asyncfunction") {
        if (this[objType]) {
          this[objType](object);
        } else {
          this.unknown(object, objType);
        }
      } else {
        const keys = Object.keys(object).sort();
        const extraKeys = [];
        this.write("object:" + (keys.length + extraKeys.length) + ":");
        const dispatchForKey = (key) => {
          this.dispatch(key);
          this.write(":");
          this.dispatch(object[key]);
          this.write(",");
        };
        for (const key of keys) {
          dispatchForKey(key);
        }
        for (const key of extraKeys) {
          dispatchForKey(key);
        }
      }
    }
    array(arr, unordered) {
      unordered = unordered === void 0 ? false : unordered;
      this.write("array:" + arr.length + ":");
      if (!unordered || arr.length <= 1) {
        for (const entry of arr) {
          this.dispatch(entry);
        }
        return;
      }
      const contextAdditions = /* @__PURE__ */ new Map();
      const entries = arr.map((entry) => {
        const hasher = new Hasher2();
        hasher.dispatch(entry);
        for (const [key, value] of hasher.#context) {
          contextAdditions.set(key, value);
        }
        return hasher.toString();
      });
      this.#context = contextAdditions;
      entries.sort();
      return this.array(entries, false);
    }
    date(date) {
      return this.write("date:" + date.toJSON());
    }
    symbol(sym) {
      return this.write("symbol:" + sym.toString());
    }
    unknown(value, type) {
      this.write(type);
      if (!value) {
        return;
      }
      this.write(":");
      if (value && typeof value.entries === "function") {
        return this.array(
          [...value.entries()],
          true
          /* ordered */
        );
      }
    }
    error(err) {
      return this.write("error:" + err.toString());
    }
    boolean(bool) {
      return this.write("bool:" + bool);
    }
    string(string) {
      this.write("string:" + string.length + ":");
      this.write(string);
    }
    function(fn) {
      this.write("fn:");
      if (isNativeFunction(fn)) {
        this.dispatch("[native]");
      } else {
        this.dispatch(fn.toString());
      }
    }
    number(number) {
      return this.write("number:" + number);
    }
    null() {
      return this.write("Null");
    }
    undefined() {
      return this.write("Undefined");
    }
    regexp(regex) {
      return this.write("regex:" + regex.toString());
    }
    arraybuffer(arr) {
      this.write("arraybuffer:");
      return this.dispatch(new Uint8Array(arr));
    }
    url(url) {
      return this.write("url:" + url.toString());
    }
    map(map) {
      this.write("map:");
      const arr = [...map];
      return this.array(arr, false);
    }
    set(set) {
      this.write("set:");
      const arr = [...set];
      return this.array(arr, false);
    }
    bigint(number) {
      return this.write("bigint:" + number.toString());
    }
  }
  for (const type of [
    "uint8array",
    "uint8clampedarray",
    "unt8array",
    "uint16array",
    "unt16array",
    "uint32array",
    "unt32array",
    "float32array",
    "float64array"
  ]) {
    Hasher2.prototype[type] = function(arr) {
      this.write(type + ":");
      return this.array([...arr], false);
    };
  }
  function isNativeFunction(f) {
    if (typeof f !== "function") {
      return false;
    }
    return Function.prototype.toString.call(f).slice(
      -15
      /* "[native code] }".length */
    ) === "[native code] }";
  }
  return Hasher2;
})();
function serialize(object) {
  const hasher = new Hasher();
  hasher.dispatch(object);
  return hasher.buff;
}
function hash(value) {
  return digest(typeof value === "string" ? value : serialize(value)).replace(/[-_]/g, "").slice(0, 10);
}

function defaultCacheOptions() {
  return {
    name: "_",
    base: "/cache",
    swr: true,
    maxAge: 1
  };
}
function defineCachedFunction(fn, opts = {}) {
  opts = { ...defaultCacheOptions(), ...opts };
  const pending = {};
  const group = opts.group || "nitro/functions";
  const name = opts.name || fn.name || "_";
  const integrity = opts.integrity || hash([fn, opts]);
  const validate = opts.validate || ((entry) => entry.value !== void 0);
  async function get(key, resolver, shouldInvalidateCache, event) {
    const cacheKey = [opts.base, group, name, key + ".json"].filter(Boolean).join(":").replace(/:\/$/, ":index");
    let entry = await useStorage().getItem(cacheKey).catch((error) => {
      console.error(`[cache] Cache read error.`, error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }) || {};
    if (typeof entry !== "object") {
      entry = {};
      const error = new Error("Malformed data read from cache.");
      console.error("[cache]", error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }
    const ttl = (opts.maxAge ?? 0) * 1e3;
    if (ttl) {
      entry.expires = Date.now() + ttl;
    }
    const expired = shouldInvalidateCache || entry.integrity !== integrity || ttl && Date.now() - (entry.mtime || 0) > ttl || validate(entry) === false;
    const _resolve = async () => {
      const isPending = pending[key];
      if (!isPending) {
        if (entry.value !== void 0 && (opts.staleMaxAge || 0) >= 0 && opts.swr === false) {
          entry.value = void 0;
          entry.integrity = void 0;
          entry.mtime = void 0;
          entry.expires = void 0;
        }
        pending[key] = Promise.resolve(resolver());
      }
      try {
        entry.value = await pending[key];
      } catch (error) {
        if (!isPending) {
          delete pending[key];
        }
        throw error;
      }
      if (!isPending) {
        entry.mtime = Date.now();
        entry.integrity = integrity;
        delete pending[key];
        if (validate(entry) !== false) {
          let setOpts;
          if (opts.maxAge && !opts.swr) {
            setOpts = { ttl: opts.maxAge };
          }
          const promise = useStorage().setItem(cacheKey, entry, setOpts).catch((error) => {
            console.error(`[cache] Cache write error.`, error);
            useNitroApp().captureError(error, { event, tags: ["cache"] });
          });
          if (event?.waitUntil) {
            event.waitUntil(promise);
          }
        }
      }
    };
    const _resolvePromise = expired ? _resolve() : Promise.resolve();
    if (entry.value === void 0) {
      await _resolvePromise;
    } else if (expired && event && event.waitUntil) {
      event.waitUntil(_resolvePromise);
    }
    if (opts.swr && validate(entry) !== false) {
      _resolvePromise.catch((error) => {
        console.error(`[cache] SWR handler error.`, error);
        useNitroApp().captureError(error, { event, tags: ["cache"] });
      });
      return entry;
    }
    return _resolvePromise.then(() => entry);
  }
  return async (...args) => {
    const shouldBypassCache = await opts.shouldBypassCache?.(...args);
    if (shouldBypassCache) {
      return fn(...args);
    }
    const key = await (opts.getKey || getKey)(...args);
    const shouldInvalidateCache = await opts.shouldInvalidateCache?.(...args);
    const entry = await get(
      key,
      () => fn(...args),
      shouldInvalidateCache,
      args[0] && isEvent(args[0]) ? args[0] : void 0
    );
    let value = entry.value;
    if (opts.transform) {
      value = await opts.transform(entry, ...args) || value;
    }
    return value;
  };
}
function cachedFunction(fn, opts = {}) {
  return defineCachedFunction(fn, opts);
}
function getKey(...args) {
  return args.length > 0 ? hash(args) : "";
}
function escapeKey(key) {
  return String(key).replace(/\W/g, "");
}
function defineCachedEventHandler(handler, opts = defaultCacheOptions()) {
  const variableHeaderNames = (opts.varies || []).filter(Boolean).map((h) => h.toLowerCase()).sort();
  const _opts = {
    ...opts,
    getKey: async (event) => {
      const customKey = await opts.getKey?.(event);
      if (customKey) {
        return escapeKey(customKey);
      }
      const _path = event.node.req.originalUrl || event.node.req.url || event.path;
      let _pathname;
      try {
        _pathname = escapeKey(decodeURI(parseURL(_path).pathname)).slice(0, 16) || "index";
      } catch {
        _pathname = "-";
      }
      const _hashedPath = `${_pathname}.${hash(_path)}`;
      const _headers = variableHeaderNames.map((header) => [header, event.node.req.headers[header]]).map(([name, value]) => `${escapeKey(name)}.${hash(value)}`);
      return [_hashedPath, ..._headers].join(":");
    },
    validate: (entry) => {
      if (!entry.value) {
        return false;
      }
      if (entry.value.code >= 400) {
        return false;
      }
      if (entry.value.body === void 0) {
        return false;
      }
      if (entry.value.headers.etag === "undefined" || entry.value.headers["last-modified"] === "undefined") {
        return false;
      }
      return true;
    },
    group: opts.group || "nitro/handlers",
    integrity: opts.integrity || hash([handler, opts])
  };
  const _cachedHandler = cachedFunction(
    async (incomingEvent) => {
      const variableHeaders = {};
      for (const header of variableHeaderNames) {
        const value = incomingEvent.node.req.headers[header];
        if (value !== void 0) {
          variableHeaders[header] = value;
        }
      }
      const reqProxy = cloneWithProxy(incomingEvent.node.req, {
        headers: variableHeaders
      });
      const resHeaders = {};
      let _resSendBody;
      const resProxy = cloneWithProxy(incomingEvent.node.res, {
        statusCode: 200,
        writableEnded: false,
        writableFinished: false,
        headersSent: false,
        closed: false,
        getHeader(name) {
          return resHeaders[name];
        },
        setHeader(name, value) {
          resHeaders[name] = value;
          return this;
        },
        getHeaderNames() {
          return Object.keys(resHeaders);
        },
        hasHeader(name) {
          return name in resHeaders;
        },
        removeHeader(name) {
          delete resHeaders[name];
        },
        getHeaders() {
          return resHeaders;
        },
        end(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2();
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return this;
        },
        write(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2(void 0);
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return true;
        },
        writeHead(statusCode, headers2) {
          this.statusCode = statusCode;
          if (headers2) {
            if (Array.isArray(headers2) || typeof headers2 === "string") {
              throw new TypeError("Raw headers  is not supported.");
            }
            for (const header in headers2) {
              const value = headers2[header];
              if (value !== void 0) {
                this.setHeader(
                  header,
                  value
                );
              }
            }
          }
          return this;
        }
      });
      const event = createEvent(reqProxy, resProxy);
      event.fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: useNitroApp().localFetch
      });
      event.$fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: globalThis.$fetch
      });
      event.waitUntil = incomingEvent.waitUntil;
      event.context = incomingEvent.context;
      event.context.cache = {
        options: _opts
      };
      const body = await handler(event) || _resSendBody;
      const headers = event.node.res.getHeaders();
      headers.etag = String(
        headers.Etag || headers.etag || `W/"${hash(body)}"`
      );
      headers["last-modified"] = String(
        headers["Last-Modified"] || headers["last-modified"] || (/* @__PURE__ */ new Date()).toUTCString()
      );
      const cacheControl = [];
      if (opts.swr) {
        if (opts.maxAge) {
          cacheControl.push(`s-maxage=${opts.maxAge}`);
        }
        if (opts.staleMaxAge) {
          cacheControl.push(`stale-while-revalidate=${opts.staleMaxAge}`);
        } else {
          cacheControl.push("stale-while-revalidate");
        }
      } else if (opts.maxAge) {
        cacheControl.push(`max-age=${opts.maxAge}`);
      }
      if (cacheControl.length > 0) {
        headers["cache-control"] = cacheControl.join(", ");
      }
      const cacheEntry = {
        code: event.node.res.statusCode,
        headers,
        body
      };
      return cacheEntry;
    },
    _opts
  );
  return defineEventHandler(async (event) => {
    if (opts.headersOnly) {
      if (handleCacheHeaders(event, { maxAge: opts.maxAge })) {
        return;
      }
      return handler(event);
    }
    const response = await _cachedHandler(
      event
    );
    if (event.node.res.headersSent || event.node.res.writableEnded) {
      return response.body;
    }
    if (handleCacheHeaders(event, {
      modifiedTime: new Date(response.headers["last-modified"]),
      etag: response.headers.etag,
      maxAge: opts.maxAge
    })) {
      return;
    }
    event.node.res.statusCode = response.code;
    for (const name in response.headers) {
      const value = response.headers[name];
      if (name === "set-cookie") {
        event.node.res.appendHeader(
          name,
          splitCookiesString(value)
        );
      } else {
        if (value !== void 0) {
          event.node.res.setHeader(name, value);
        }
      }
    }
    return response.body;
  });
}
function cloneWithProxy(obj, overrides) {
  return new Proxy(obj, {
    get(target, property, receiver) {
      if (property in overrides) {
        return overrides[property];
      }
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      if (property in overrides) {
        overrides[property] = value;
        return true;
      }
      return Reflect.set(target, property, value, receiver);
    }
  });
}
const cachedEventHandler = defineCachedEventHandler;

const inlineAppConfig = {
  "nuxt": {}
};



const appConfig = defuFn(inlineAppConfig);

function getEnv(key, opts) {
  const envKey = snakeCase(key).toUpperCase();
  return destr(
    process.env[opts.prefix + envKey] ?? process.env[opts.altPrefix + envKey]
  );
}
function _isObject(input) {
  return typeof input === "object" && !Array.isArray(input);
}
function applyEnv(obj, opts, parentKey = "") {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key;
    const envValue = getEnv(subKey, opts);
    if (_isObject(obj[key])) {
      if (_isObject(envValue)) {
        obj[key] = { ...obj[key], ...envValue };
        applyEnv(obj[key], opts, subKey);
      } else if (envValue === void 0) {
        applyEnv(obj[key], opts, subKey);
      } else {
        obj[key] = envValue ?? obj[key];
      }
    } else {
      obj[key] = envValue ?? obj[key];
    }
    if (opts.envExpansion && typeof obj[key] === "string") {
      obj[key] = _expandFromEnv(obj[key]);
    }
  }
  return obj;
}
const envExpandRx = /\{\{([^{}]*)\}\}/g;
function _expandFromEnv(value) {
  return value.replace(envExpandRx, (match, key) => {
    return process.env[key] || match;
  });
}

const _inlineRuntimeConfig = {
  "app": {
    "baseURL": "/",
    "buildId": "dev",
    "buildAssetsDir": "/_nuxt/",
    "cdnURL": ""
  },
  "nitro": {
    "envPrefix": "NUXT_",
    "routeRules": {
      "/__nuxt_error": {
        "cache": false
      },
      "/_nuxt/builds/meta/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      },
      "/_nuxt/builds/**": {
        "headers": {
          "cache-control": "public, max-age=1, immutable"
        }
      }
    }
  },
  "public": {},
  "dataDir": "",
  "webappDataDir": "",
  "openaiApiKey": "",
  "wordImagesDir": "",
  "wordDefsDir": "",
  "wordStatsDir": "",
  "wordHistoryDir": ""
};
const envOptions = {
  prefix: "NITRO_",
  altPrefix: _inlineRuntimeConfig.nitro.envPrefix ?? process.env.NITRO_ENV_PREFIX ?? "_",
  envExpansion: _inlineRuntimeConfig.nitro.envExpansion ?? process.env.NITRO_ENV_EXPANSION ?? false
};
const _sharedRuntimeConfig = _deepFreeze(
  applyEnv(klona(_inlineRuntimeConfig), envOptions)
);
function useRuntimeConfig(event) {
  if (!event) {
    return _sharedRuntimeConfig;
  }
  if (event.context.nitro.runtimeConfig) {
    return event.context.nitro.runtimeConfig;
  }
  const runtimeConfig = klona(_inlineRuntimeConfig);
  applyEnv(runtimeConfig, envOptions);
  event.context.nitro.runtimeConfig = runtimeConfig;
  return runtimeConfig;
}
_deepFreeze(klona(appConfig));
function _deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      _deepFreeze(value);
    }
  }
  return Object.freeze(object);
}
new Proxy(/* @__PURE__ */ Object.create(null), {
  get: (_, prop) => {
    console.warn(
      "Please use `useRuntimeConfig()` instead of accessing config directly."
    );
    const runtimeConfig = useRuntimeConfig();
    if (prop in runtimeConfig) {
      return runtimeConfig[prop];
    }
    return void 0;
  }
});

getContext("nitro-app", {
  asyncContext: false,
  AsyncLocalStorage: void 0
});

const config = useRuntimeConfig();
const _routeRulesMatcher = toRouteMatcher(
  createRouter({ routes: config.nitro.routeRules })
);
function createRouteRulesHandler(ctx) {
  return eventHandler((event) => {
    const routeRules = getRouteRules(event);
    if (routeRules.headers) {
      setHeaders(event, routeRules.headers);
    }
    if (routeRules.redirect) {
      let target = routeRules.redirect.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.redirect._redirectStripBase;
        if (strpBase) {
          targetPath = withoutBase(targetPath, strpBase);
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery(event.path);
        target = withQuery(target, query);
      }
      return sendRedirect(event, target, routeRules.redirect.statusCode);
    }
    if (routeRules.proxy) {
      let target = routeRules.proxy.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.proxy._proxyStripBase;
        if (strpBase) {
          targetPath = withoutBase(targetPath, strpBase);
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery(event.path);
        target = withQuery(target, query);
      }
      return proxyRequest(event, target, {
        fetch: ctx.localFetch,
        ...routeRules.proxy
      });
    }
  });
}
function getRouteRules(event) {
  event.context._nitro = event.context._nitro || {};
  if (!event.context._nitro.routeRules) {
    event.context._nitro.routeRules = getRouteRulesForPath(
      withoutBase(event.path.split("?")[0], useRuntimeConfig().app.baseURL)
    );
  }
  return event.context._nitro.routeRules;
}
function getRouteRulesForPath(path) {
  return defu({}, ..._routeRulesMatcher.matchAll(path).reverse());
}

function _captureError(error, type) {
  console.error(`[${type}]`, error);
  useNitroApp().captureError(error, { tags: [type] });
}
function trapUnhandledNodeErrors() {
  process.on(
    "unhandledRejection",
    (error) => _captureError(error, "unhandledRejection")
  );
  process.on(
    "uncaughtException",
    (error) => _captureError(error, "uncaughtException")
  );
}
function joinHeaders(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}
function normalizeFetchResponse(response) {
  if (!response.headers.has("set-cookie")) {
    return response;
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: normalizeCookieHeaders(response.headers)
  });
}
function normalizeCookieHeader(header = "") {
  return splitCookiesString(joinHeaders(header));
}
function normalizeCookieHeaders(headers) {
  const outgoingHeaders = new Headers();
  for (const [name, header] of headers) {
    if (name === "set-cookie") {
      for (const cookie of normalizeCookieHeader(header)) {
        outgoingHeaders.append("set-cookie", cookie);
      }
    } else {
      outgoingHeaders.set(name, joinHeaders(header));
    }
  }
  return outgoingHeaders;
}

/**
* Nitro internal functions extracted from https://github.com/nitrojs/nitro/blob/v2/src/runtime/internal/utils.ts
*/
function isJsonRequest(event) {
	// If the client specifically requests HTML, then avoid classifying as JSON.
	if (hasReqHeader(event, "accept", "text/html")) {
		return false;
	}
	return hasReqHeader(event, "accept", "application/json") || hasReqHeader(event, "user-agent", "curl/") || hasReqHeader(event, "user-agent", "httpie/") || hasReqHeader(event, "sec-fetch-mode", "cors") || event.path.startsWith("/api/") || event.path.endsWith(".json");
}
function hasReqHeader(event, name, includes) {
	const value = getRequestHeader(event, name);
	return !!(value && typeof value === "string" && value.toLowerCase().includes(includes));
}

const iframeStorageBridge = (nonce) => `
(function () {
  const NONCE = ${JSON.stringify(nonce)};
  const memoryStore = Object.create(null);

  const post = (type, payload) => {
    window.parent.postMessage({ type, nonce: NONCE, ...payload }, '*');
  };

  const isValid = (data) => data && data.nonce === NONCE;

  const mockStorage = {
    getItem(key) {
      return Object.hasOwn(memoryStore, key)
        ? memoryStore[key]
        : null;
    },
    setItem(key, value) {
      const v = String(value);
      memoryStore[key] = v;
      post('storage-set', { key, value: v });
    },
    removeItem(key) {
      delete memoryStore[key];
      post('storage-remove', { key });
    },
    clear() {
      for (const key of Object.keys(memoryStore))
        delete memoryStore[key];
      post('storage-clear', {});
    },
    key(index) {
      const keys = Object.keys(memoryStore);
      return keys[index] ?? null;
    },
    get length() {
      return Object.keys(memoryStore).length;
    }
  };

  const defineLocalStorage = () => {
    try {
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: false,
        configurable: true
      });
    } catch {
      window.localStorage = mockStorage;
    }
  };

  defineLocalStorage();

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!isValid(data) || data.type !== 'storage-sync-data') return;

    const incoming = data.data || {};
    for (const key of Object.keys(incoming))
      memoryStore[key] = incoming[key];

    if (typeof window.initTheme === 'function')
      window.initTheme();
    window.dispatchEvent(new Event('storage-ready'));
  });

  // Clipboard API is unavailable in data: URL iframe, so we use postMessage
  document.addEventListener('DOMContentLoaded', function() {
    window.copyErrorMessage = function(button) {
      post('clipboard-copy', { text: button.dataset.errorText });
      button.classList.add('copied');
      setTimeout(function() { button.classList.remove('copied'); }, 2000);
    };
  });

  post('storage-sync-request', {});
})();
`;
const parentStorageBridge = (nonce) => `
(function () {
  const host = document.querySelector('nuxt-error-overlay');
  if (!host) return;

  const NONCE = ${JSON.stringify(nonce)};
  const isValid = (data) => data && data.nonce === NONCE;

  // Handle clipboard copy from iframe
  window.addEventListener('message', function(e) {
    if (isValid(e) && e.data.type === 'clipboard-copy') {
      navigator.clipboard.writeText(e.data.text).catch(function() {});
    }
  });

  const collectLocalStorage = () => {
    const all = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k != null) all[k] = localStorage.getItem(k);
    }
    return all;
  };

  const attachWhenReady = () => {
    const root = host.shadowRoot;
    if (!root)
      return false;
    const iframe = root.getElementById('frame');
    if (!iframe || !iframe.contentWindow)
      return false;

    const handlers = {
      'storage-set': (d) => localStorage.setItem(d.key, d.value),
      'storage-remove': (d) => localStorage.removeItem(d.key),
      'storage-clear': () => localStorage.clear(),
      'storage-sync-request': () => {
        iframe.contentWindow.postMessage({
          type: 'storage-sync-data',
          data: collectLocalStorage(),
          nonce: NONCE
        }, '*');
      }
    };

    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!isValid(data)) return;
      const fn = handlers[data.type];
      if (fn) fn(data);
    });

    return true;
  };

  if (attachWhenReady())
    return;

  const obs = new MutationObserver(() => {
    if (attachWhenReady())
      obs.disconnect();
  });

  obs.observe(host, { childList: true, subtree: true });
})();
`;
const errorCSS = `
:host {
  --preview-width: 240px;
  --preview-height: 180px;
  --base-width: 1200px;
  --base-height: 900px;
  --z-base: 999999998;
  --error-pip-left: auto;
  --error-pip-top: auto;
  --error-pip-right: 5px;
  --error-pip-bottom: 5px;
  --error-pip-origin: bottom right;
  --app-preview-left: auto;
  --app-preview-top: auto;
  --app-preview-right: 5px;
  --app-preview-bottom: 5px;
  all: initial;
  display: contents;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
#frame {
  position: fixed;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  border: none;
  z-index: var(--z-base);
}
#frame[inert] {
  left: var(--error-pip-left);
  top: var(--error-pip-top);
  right: var(--error-pip-right);
  bottom: var(--error-pip-bottom);
  width: var(--base-width);
  height: var(--base-height);
  transform: scale(calc(240 / 1200));
  transform-origin: var(--error-pip-origin);
  overflow: hidden;
  border-radius: calc(1200 * 8px / 240);
}
#preview {
  position: fixed;
  left: var(--app-preview-left);
  top: var(--app-preview-top);
  right: var(--app-preview-right);
  bottom: var(--app-preview-bottom);
  width: var(--preview-width);
  height: var(--preview-height);
  overflow: hidden;
  border-radius: 6px;
  pointer-events: none;
  z-index: var(--z-base);
  background: white;
  display: none;
}
#preview iframe {
  transform-origin: var(--error-pip-origin);
}
#frame:not([inert]) + #preview {
  display: block;
}
#toggle {
  position: fixed;
  left: var(--app-preview-left);
  top: var(--app-preview-top);
  right: calc(var(--app-preview-right) - 3px);
  bottom: calc(var(--app-preview-bottom) - 3px);
  width: var(--preview-width);
  height: var(--preview-height);
  background: none;
  border: 3px solid #00DC82;
  border-radius: 8px;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s, box-shadow 0.2s;
  z-index: calc(var(--z-base) + 1);
  display: flex;
  align-items: center;
  justify-content: center;
}
#toggle:hover,
#toggle:focus {
  opacity: 1;
  box-shadow: 0 0 20px rgba(0, 220, 130, 0.6);
}
#toggle:focus-visible {
  outline: 3px solid #00DC82;
  outline-offset: 0;
  box-shadow: 0 0 24px rgba(0, 220, 130, 0.8);
}
#frame[inert] ~ #toggle {
  left: var(--error-pip-left);
  top: var(--error-pip-top);
  right: calc(var(--error-pip-right) - 3px);
  bottom: calc(var(--error-pip-bottom) - 3px);
  cursor: grab;
}
:host(.dragging) #frame[inert] ~ #toggle {
  cursor: grabbing;
}
#frame:not([inert]) ~ #toggle,
#frame:not([inert]) + #preview {
  cursor: grab;
}
:host(.dragging-preview) #frame:not([inert]) ~ #toggle,
:host(.dragging-preview) #frame:not([inert]) + #preview {
  cursor: grabbing;
}

#pip-close {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 16px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
}
#pip-close:focus-visible {
  outline: 2px solid #00DC82;
  outline-offset: 2px;
}

#pip-restore {
  position: fixed;
  right: 16px;
  bottom: 16px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 2px solid #00DC82;
  background: #111;
  color: #fff;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  z-index: calc(var(--z-base) + 2);
  cursor: grab;
}
#pip-restore:focus-visible {
  outline: 2px solid #00DC82;
  outline-offset: 2px;
}
:host(.dragging-restore) #pip-restore {
  cursor: grabbing;
}

#frame[hidden],
#toggle[hidden],
#preview[hidden],
#pip-restore[hidden],
#pip-close[hidden] {
  display: none !important;
}

@media (prefers-reduced-motion: reduce) {
  #toggle {
    transition: none;
  }
}
`;
function webComponentScript(base64HTML, startMinimized) {
	return `
(function () {
  try {
    // =========================
    // Host + Shadow
    // =========================
    const host = document.querySelector('nuxt-error-overlay');
    if (!host)
      return;
    const shadow = host.attachShadow({ mode: 'open' });

    // =========================
    // DOM helpers
    // =========================
    const el = (tag) => document.createElement(tag);
    const on = (node, type, fn, opts) => node.addEventListener(type, fn, opts);
    const hide = (node, v) => node.toggleAttribute('hidden', !!v);
    const setVar = (name, value) => host.style.setProperty(name, value);
    const unsetVar = (name) => host.style.removeProperty(name);

    // =========================
    // Create DOM
    // =========================
    const style = el('style');
    style.textContent = ${JSON.stringify(errorCSS)};

    const iframe = el('iframe');
    iframe.id = 'frame';
    iframe.src = 'data:text/html;base64,${base64HTML}';
    iframe.title = 'Detailed error stack trace';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-top-navigation-by-user-activation');

    const preview = el('div');
    preview.id = 'preview';

    const toggle = el('div');
    toggle.id = 'toggle';
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('role', 'button');
    toggle.setAttribute('tabindex', '0');
    toggle.innerHTML = '<span class="sr-only">Toggle detailed error view</span>';

    const liveRegion = el('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.className = 'sr-only';

    const pipCloseButton = el('button');
    pipCloseButton.id = 'pip-close';
    pipCloseButton.setAttribute('type', 'button');
    pipCloseButton.setAttribute('aria-label', 'Hide error preview overlay');
    pipCloseButton.innerHTML = '&times;';
    pipCloseButton.hidden = true;
    toggle.appendChild(pipCloseButton);

    const pipRestoreButton = el('button');
    pipRestoreButton.id = 'pip-restore';
    pipRestoreButton.setAttribute('type', 'button');
    pipRestoreButton.setAttribute('aria-label', 'Show error overlay');
    pipRestoreButton.innerHTML = '<span aria-hidden="true">⟲</span><span>Show error overlay</span>';
    pipRestoreButton.hidden = true;

    // Order matters: #frame + #preview adjacency
    shadow.appendChild(style);
    shadow.appendChild(liveRegion);
    shadow.appendChild(iframe);
    shadow.appendChild(preview);
    shadow.appendChild(toggle);
    shadow.appendChild(pipRestoreButton);

    // =========================
    // Constants / keys
    // =========================
    const POS_KEYS = {
      position: 'nuxt-error-overlay:position',
      hiddenPretty: 'nuxt-error-overlay:error-pip:hidden',
      hiddenPreview: 'nuxt-error-overlay:app-preview:hidden'
    };

    const CSS_VARS = {
      pip: {
        left: '--error-pip-left',
        top: '--error-pip-top',
        right: '--error-pip-right',
        bottom: '--error-pip-bottom'
      },
      preview: {
        left: '--app-preview-left',
        top: '--app-preview-top',
        right: '--app-preview-right',
        bottom: '--app-preview-bottom'
      }
    };

    const MIN_GAP = 5;
    const DRAG_THRESHOLD = 2;

    // =========================
    // Local storage safe access + state
    // =========================
    let storageReady = true;
    let isPrettyHidden = false;
    let isPreviewHidden = false;

    const safeGet = (k) => {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    };

    const safeSet = (k, v) => {
      if (!storageReady) 
        return;
      try {
        localStorage.setItem(k, v);
      } catch {}
    };

    // =========================
    // Sizing helpers
    // =========================
    const vvSize = () => {
      const v = window.visualViewport;
      return v ? { w: v.width, h: v.height } : { w: window.innerWidth, h: window.innerHeight };
    };

    const previewSize = () => {
      const styles = getComputedStyle(host);
      const w = parseFloat(styles.getPropertyValue('--preview-width')) || 240;
      const h = parseFloat(styles.getPropertyValue('--preview-height')) || 180;
      return { w, h };
    };

    const sizeForTarget = (target) => {
      if (!target)
        return previewSize();
      const rect = target.getBoundingClientRect();
      if (rect.width && rect.height)
        return { w: rect.width, h: rect.height };
      return previewSize();
    };

    // =========================
    // Dock model + offset/alignment calculations
    // =========================
    const dock = { edge: null, offset: null, align: null, gap: null };

    const maxOffsetFor = (edge, size) => {
      const vv = vvSize();
      if (edge === 'left' || edge === 'right')
        return Math.max(MIN_GAP, vv.h - size.h - MIN_GAP);
      return Math.max(MIN_GAP, vv.w - size.w - MIN_GAP);
    };

    const clampOffset = (edge, value, size) => {
      const max = maxOffsetFor(edge, size);
      return Math.min(Math.max(value, MIN_GAP), max);
    };

    const updateDockAlignment = (size) => {
      if (!dock.edge || dock.offset == null)
        return;
      const max = maxOffsetFor(dock.edge, size);
      if (dock.offset <= max / 2) {
        dock.align = 'start';
        dock.gap = dock.offset;
      } else {
        dock.align = 'end';
        dock.gap = Math.max(0, max - dock.offset);
      }
    };

    const appliedOffsetFor = (size) => {
      if (!dock.edge || dock.offset == null)
        return null;
      const max = maxOffsetFor(dock.edge, size);

      if (dock.align === 'end' && typeof dock.gap === 'number') {
        return clampOffset(dock.edge, max - dock.gap, size);
      }
      if (dock.align === 'start' && typeof dock.gap === 'number') {
        return clampOffset(dock.edge, dock.gap, size);
      }
      return clampOffset(dock.edge, dock.offset, size);
    };

    const nearestEdgeAt = (x, y) => {
      const { w, h } = vvSize();
      const d = { left: x, right: w - x, top: y, bottom: h - y };
      return Object.keys(d).reduce((a, b) => (d[a] < d[b] ? a : b));
    };

    const cornerDefaultDock = () => {
      const vv = vvSize();
      const size = previewSize();
      const offset = Math.max(MIN_GAP, vv.w - size.w - MIN_GAP);
      return { edge: 'bottom', offset };
    };

    const currentTransformOrigin = () => {
      if (!dock.edge) return null;
      if (dock.edge === 'left' || dock.edge === 'top')
        return 'top left';
      if (dock.edge === 'right')
        return 'top right';
      return 'bottom left';
    };

    // =========================
    // Persist / load dock
    // =========================
    const loadDock = () => {
      const raw = safeGet(POS_KEYS.position);
      if (!raw)
        return;
      try {
        const parsed = JSON.parse(raw);
        const { edge, offset, align, gap } = parsed || {};
        if (!['left', 'right', 'top', 'bottom'].includes(edge))
          return;
        if (typeof offset !== 'number')
          return;

        dock.edge = edge;
        dock.offset = clampOffset(edge, offset, previewSize());
        dock.align = align === 'start' || align === 'end' ? align : null;
        dock.gap = typeof gap === 'number' ? gap : null;

        if (!dock.align || dock.gap == null)
          updateDockAlignment(previewSize());
      } catch {}
    };

    const persistDock = () => {
      if (!dock.edge || dock.offset == null)
        return; 
      safeSet(POS_KEYS.position, JSON.stringify({
        edge: dock.edge,
        offset: dock.offset,
        align: dock.align,
        gap: dock.gap
      }));
    };

    // =========================
    // Apply dock
    // =========================
    const dockToVars = (vars) => ({
      set: (side, v) => host.style.setProperty(vars[side], v),
      clear: (side) => host.style.removeProperty(vars[side])
    });

    const dockToEl = (node) => ({
      set: (side, v) => { node.style[side] = v; },
      clear: (side) => { node.style[side] = ''; }
    });

    const applyDock = (target, size, opts) => {
      if (!dock.edge || dock.offset == null) {
        target.clear('left');
        target.clear('top');
        target.clear('right');
        target.clear('bottom');
        return;
      }

      target.set('left', 'auto');
      target.set('top', 'auto');
      target.set('right', 'auto');
      target.set('bottom', 'auto');

      const applied = appliedOffsetFor(size);

      if (dock.edge === 'left') {
        target.set('left', MIN_GAP + 'px');
        target.set('top', applied + 'px');
      } else if (dock.edge === 'right') {
        target.set('right', MIN_GAP + 'px');
        target.set('top', applied + 'px');
      } else if (dock.edge === 'top') {
        target.set('top', MIN_GAP + 'px');
        target.set('left', applied + 'px');
      } else {
        target.set('bottom', MIN_GAP + 'px');
        target.set('left', applied + 'px');
      }

      if (!opts || opts.persist !== false)
        persistDock();
    };

    const applyDockAll = (opts) => {
      applyDock(dockToVars(CSS_VARS.pip), previewSize(), opts);
      applyDock(dockToVars(CSS_VARS.preview), previewSize(), opts);
      applyDock(dockToEl(pipRestoreButton), sizeForTarget(pipRestoreButton), opts);
    };

    const repaintToDock = () => {
      if (!dock.edge || dock.offset == null)
        return;
      const origin = currentTransformOrigin();
      if (origin)
        setVar('--error-pip-origin', origin);
      else 
        unsetVar('--error-pip-origin');
      applyDockAll({ persist: false });
    };

    // =========================
    // Hidden state + UI
    // =========================
    const loadHidden = () => {
      const rawPretty = safeGet(POS_KEYS.hiddenPretty);
      if (rawPretty != null)
        isPrettyHidden = rawPretty === '1' || rawPretty === 'true';
      const rawPreview = safeGet(POS_KEYS.hiddenPreview);
      if (rawPreview != null)
        isPreviewHidden = rawPreview === '1' || rawPreview === 'true';
    };

    const setPrettyHidden = (v) => {
      isPrettyHidden = !!v;
      safeSet(POS_KEYS.hiddenPretty, isPrettyHidden ? '1' : '0');
      updateUI();
    };

    const setPreviewHidden = (v) => {
      isPreviewHidden = !!v;
      safeSet(POS_KEYS.hiddenPreview, isPreviewHidden ? '1' : '0');
      updateUI();
    };

    const isMinimized = () => iframe.hasAttribute('inert');

    const setMinimized = (v) => {
      if (v) {
        iframe.setAttribute('inert', '');
        toggle.setAttribute('aria-expanded', 'false');
      } else {
        iframe.removeAttribute('inert');
        toggle.setAttribute('aria-expanded', 'true');
      }
    };

    const setRestoreLabel = (kind) => {
      if (kind === 'pretty') {
        pipRestoreButton.innerHTML = '<span aria-hidden="true">⟲</span><span>Show error overlay</span>';
        pipRestoreButton.setAttribute('aria-label', 'Show error overlay');
      } else {
        pipRestoreButton.innerHTML = '<span aria-hidden="true">⟲</span><span>Show error page</span>';
        pipRestoreButton.setAttribute('aria-label', 'Show error page');
      }
    };

    const updateUI = () => {
      const minimized = isMinimized();
      const showPiP = minimized && !isPrettyHidden;
      const showPreview = !minimized && !isPreviewHidden;
      const pipHiddenByUser = minimized && isPrettyHidden;
      const previewHiddenByUser = !minimized && isPreviewHidden;
      const showToggle = minimized ? showPiP : showPreview;
      const showRestore = pipHiddenByUser || previewHiddenByUser;

      hide(iframe, pipHiddenByUser);
      hide(preview, !showPreview);
      hide(toggle, !showToggle);
      hide(pipCloseButton, !showToggle);
      hide(pipRestoreButton, !showRestore);

      pipCloseButton.setAttribute('aria-label', minimized ? 'Hide error overlay' : 'Hide error page preview');

      if (pipHiddenByUser)
        setRestoreLabel('pretty');
      else if (previewHiddenByUser)
        setRestoreLabel('preview');

      host.classList.toggle('pip-hidden', isPrettyHidden);
      host.classList.toggle('preview-hidden', isPreviewHidden);
    };

    // =========================
    // Preview snapshot
    // =========================
    const updatePreview = () => {
      try {
        let previewIframe = preview.querySelector('iframe');
        if (!previewIframe) {
          previewIframe = el('iframe');
          previewIframe.style.cssText = 'width: 1200px; height: 900px; transform: scale(0.2); transform-origin: top left; border: none;';
          previewIframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
          preview.appendChild(previewIframe);
        }

        const doctype = document.doctype ? '<!DOCTYPE ' + document.doctype.name + '>' : '';
        const cleanedHTML = document.documentElement.outerHTML
          .replace(/<nuxt-error-overlay[^>]*>.*?<\\/nuxt-error-overlay>/gs, '')
          .replace(/<script[^>]*>.*?<\\/script>/gs, '');

        const iframeDoc = previewIframe.contentDocument || previewIframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(doctype + cleanedHTML);
        iframeDoc.close();
      } catch (err) {
        console.error('Failed to update preview:', err);
      }
    };

    // =========================
    // View toggling
    // =========================
    const toggleView = () => {
      if (isMinimized()) {
        updatePreview();
        setMinimized(false);
        liveRegion.textContent = 'Showing detailed error view';
        setTimeout(() => { 
          try { 
            iframe.contentWindow.focus();
          } catch {}
        }, 100);
      } else {
        setMinimized(true);
        liveRegion.textContent = 'Showing error page';
        repaintToDock();
        void iframe.offsetWidth;
      }
      updateUI();
    };

    // =========================
    // Dragging (unified, rAF throttled)
    // =========================
    let drag = null;
    let rafId = null;
    let suppressToggleClick = false;
    let suppressRestoreClick = false;

    const beginDrag = (e) => {
      if (drag) 
        return;

      if (!dock.edge || dock.offset == null) {
        const def = cornerDefaultDock();
        dock.edge = def.edge;
        dock.offset = def.offset;
        updateDockAlignment(previewSize());
      }

      const isRestoreTarget = e.currentTarget === pipRestoreButton;

      drag = {
        kind: isRestoreTarget ? 'restore' : (isMinimized() ? 'pip' : 'preview'),
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        moved: false,
        target: e.currentTarget
      };

      drag.target.setPointerCapture(e.pointerId);

      if (drag.kind === 'restore')
        host.classList.add('dragging-restore');
      else 
        host.classList.add(drag.kind === 'pip' ? 'dragging' : 'dragging-preview');

      e.preventDefault();
    };

    const moveDrag = (e) => {
      if (!drag || drag.pointerId !== e.pointerId)
        return;

      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      
      const dx = drag.lastX - drag.startX;
      const dy = drag.lastY - drag.startY;

      if (!drag.moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
        drag.moved = true;
      }

      if (!drag.moved)
        return;
      if (rafId)
        return;

      rafId = requestAnimationFrame(() => {
        rafId = null;

        const edge = nearestEdgeAt(drag.lastX, drag.lastY);
        const size = sizeForTarget(drag.target);

        let offset;
        if (edge === 'left' || edge === 'right') {
          const top = drag.lastY - (size.h / 2);
          offset = clampOffset(edge, Math.round(top), size);
        } else {
          const left = drag.lastX - (size.w / 2);
          offset = clampOffset(edge, Math.round(left), size);
        }

        dock.edge = edge;
        dock.offset = offset;
        updateDockAlignment(size);

        const origin = currentTransformOrigin();
        setVar('--error-pip-origin', origin || 'bottom right');

        applyDockAll({ persist: false });
      });
    };

    const endDrag = (e) => {
      if (!drag || drag.pointerId !== e.pointerId)
        return;

      const endedKind = drag.kind;
      drag.target.releasePointerCapture(e.pointerId);

      if (endedKind === 'restore')
        host.classList.remove('dragging-restore');
      else 
        host.classList.remove(endedKind === 'pip' ? 'dragging' : 'dragging-preview');

      const didMove = drag.moved;
      drag = null;

      if (didMove) {
        persistDock();
        if (endedKind === 'restore')
          suppressRestoreClick = true;
        else 
          suppressToggleClick = true;
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const bindDragTarget = (node) => {
      on(node, 'pointerdown', beginDrag);
      on(node, 'pointermove', moveDrag);
      on(node, 'pointerup', endDrag);
      on(node, 'pointercancel', endDrag);
    };

    bindDragTarget(toggle);
    bindDragTarget(pipRestoreButton);

    // =========================
    // Events (toggle / close / restore)
    // =========================
    on(toggle, 'click', (e) => {
      if (suppressToggleClick) {
        e.preventDefault();
        suppressToggleClick = false;
        return;
      }
      toggleView();
    });

    on(toggle, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleView();
      }
    });

    on(pipCloseButton, 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isMinimized())
        setPrettyHidden(true);
      else
        setPreviewHidden(true);
    });

    on(pipCloseButton, 'pointerdown', (e) => {
      e.stopPropagation();
    });

    on(pipRestoreButton, 'click', (e) => {
      if (suppressRestoreClick) {
        e.preventDefault();
        suppressRestoreClick = false;
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (isMinimized()) 
        setPrettyHidden(false);
      else 
        setPreviewHidden(false);
    });

    // =========================
    // Lifecycle: load / sync / repaint
    // =========================
    const loadState = () => {
      loadDock();
      loadHidden();

      if (isPrettyHidden && !isMinimized())
        setMinimized(true);

      updateUI();
      repaintToDock();
    };

    loadState();

    on(window, 'storage-ready', () => {
      storageReady = true;
      loadState();
    });

    const onViewportChange = () => repaintToDock();

    on(window, 'resize', onViewportChange);

    if (window.visualViewport) {
      on(window.visualViewport, 'resize', onViewportChange);
      on(window.visualViewport, 'scroll', onViewportChange);
    }

    // initial preview
    setTimeout(updatePreview, 100);

    // initial minimized option
    if (${startMinimized}) {
      setMinimized(true);
      repaintToDock();
      void iframe.offsetWidth;
      updateUI();
    }
  } catch (err) {
    console.error('Failed to initialize Nuxt error overlay:', err);
  }
})();
`;
}
function generateErrorOverlayHTML(html, options) {
	const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
	const errorPage = html.replace("<head>", `<head><script>${iframeStorageBridge(nonce)}<\/script>`);
	const base64HTML = Buffer.from(errorPage, "utf8").toString("base64");
	return `
    <script>${parentStorageBridge(nonce)}<\/script>
    <nuxt-error-overlay></nuxt-error-overlay>
    <script>${webComponentScript(base64HTML, options?.startMinimized ?? false)}<\/script>
  `;
}

const errorHandler$0 = (async function errorhandler(error, event, { defaultHandler }) {
	if (event.handled || isJsonRequest(event)) {
		// let Nitro handle JSON errors
		return;
	}
	// invoke default Nitro error handler (which will log appropriately if required)
	const defaultRes = await defaultHandler(error, event, { json: true });
	// let Nitro handle redirect if appropriate
	const status = error.status || error.statusCode || 500;
	if (status === 404 && defaultRes.status === 302) {
		setResponseHeaders(event, defaultRes.headers);
		setResponseStatus(event, defaultRes.status, defaultRes.statusText);
		return send(event, JSON.stringify(defaultRes.body, null, 2));
	}
	if (typeof defaultRes.body !== "string" && Array.isArray(defaultRes.body.stack)) {
		// normalize to string format expected by nuxt `error.vue`
		defaultRes.body.stack = defaultRes.body.stack.join("\n");
	}
	const errorObject = defaultRes.body;
	// remove proto/hostname/port from URL
	const url = new URL(errorObject.url);
	errorObject.url = withoutBase(url.pathname, useRuntimeConfig(event).app.baseURL) + url.search + url.hash;
	// add default server message (keep sanitized for unhandled errors)
	errorObject.message = error.unhandled ? errorObject.message || "Server Error" : error.message || errorObject.message || "Server Error";
	// we will be rendering this error internally so we can pass along the error.data safely
	errorObject.data ||= error.data;
	errorObject.statusText ||= error.statusText || error.statusMessage;
	delete defaultRes.headers["content-type"];
	delete defaultRes.headers["content-security-policy"];
	setResponseHeaders(event, defaultRes.headers);
	// Access request headers
	const reqHeaders = getRequestHeaders(event);
	// Detect to avoid recursion in SSR rendering of errors
	const isRenderingError = event.path.startsWith("/__nuxt_error") || !!reqHeaders["x-nuxt-error"];
	// HTML response (via SSR)
	const res = isRenderingError ? null : await useNitroApp().localFetch(withQuery(joinURL(useRuntimeConfig(event).app.baseURL, "/__nuxt_error"), errorObject), {
		headers: {
			...reqHeaders,
			"x-nuxt-error": "true"
		},
		redirect: "manual"
	}).catch(() => null);
	if (event.handled) {
		return;
	}
	// Fallback to static rendered error page
	if (!res) {
		const { template } = await Promise.resolve().then(function () { return error500; });
		{
			// TODO: Support `message` in template
			errorObject.description = errorObject.message;
		}
		setResponseHeader(event, "Content-Type", "text/html;charset=UTF-8");
		return send(event, template(errorObject));
	}
	const html = await res.text();
	for (const [header, value] of res.headers.entries()) {
		if (header === "set-cookie") {
			appendResponseHeader(event, header, value);
			continue;
		}
		setResponseHeader(event, header, value);
	}
	setResponseStatus(event, res.status && res.status !== 200 ? res.status : defaultRes.status, res.statusText || defaultRes.statusText);
	if (!globalThis._importMeta_.test && typeof html === "string") {
		const prettyResponse = await defaultHandler(error, event, { json: false });
		if (typeof prettyResponse.body === "string") {
			return send(event, html.replace("</body>", `${generateErrorOverlayHTML(prettyResponse.body, { startMinimized: 300 <= status && status < 500 })}</body>`));
		}
	}
	return send(event, html);
});

function defineNitroErrorHandler(handler) {
  return handler;
}

const errorHandler$1 = defineNitroErrorHandler(
  async function defaultNitroErrorHandler(error, event) {
    const res = await defaultHandler(error, event);
    if (!event.node?.res.headersSent) {
      setResponseHeaders(event, res.headers);
    }
    setResponseStatus(event, res.status, res.statusText);
    return send(
      event,
      typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2)
    );
  }
);
async function defaultHandler(error, event, opts) {
  const isSensitive = error.unhandled || error.fatal;
  const statusCode = error.statusCode || 500;
  const statusMessage = error.statusMessage || "Server Error";
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  if (statusCode === 404) {
    const baseURL = "/";
    if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) {
      const redirectTo = `${baseURL}${url.pathname.slice(1)}${url.search}`;
      return {
        status: 302,
        statusText: "Found",
        headers: { location: redirectTo },
        body: `Redirecting...`
      };
    }
  }
  await loadStackTrace(error).catch(consola.error);
  const youch = new Youch();
  if (isSensitive && !opts?.silent) {
    const tags = [error.unhandled && "[unhandled]", error.fatal && "[fatal]"].filter(Boolean).join(" ");
    const ansiError = await (await youch.toANSI(error)).replaceAll(process.cwd(), ".");
    consola.error(
      `[request error] ${tags} [${event.method}] ${url}

`,
      ansiError
    );
  }
  const useJSON = opts?.json ?? !getRequestHeader(event, "accept")?.includes("text/html");
  const headers = {
    "content-type": useJSON ? "application/json" : "text/html",
    // Prevent browser from guessing the MIME types of resources.
    "x-content-type-options": "nosniff",
    // Prevent error page from being embedded in an iframe
    "x-frame-options": "DENY",
    // Prevent browsers from sending the Referer header
    "referrer-policy": "no-referrer",
    // Disable the execution of any js
    "content-security-policy": "script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self';"
  };
  if (statusCode === 404 || !getResponseHeader(event, "cache-control")) {
    headers["cache-control"] = "no-cache";
  }
  const body = useJSON ? {
    error: true,
    url,
    statusCode,
    statusMessage,
    message: error.message,
    data: error.data,
    stack: error.stack?.split("\n").map((line) => line.trim())
  } : await youch.toHTML(error, {
    request: {
      url: url.href,
      method: event.method,
      headers: getRequestHeaders(event)
    }
  });
  return {
    status: statusCode,
    statusText: statusMessage,
    headers,
    body
  };
}
async function loadStackTrace(error) {
  if (!(error instanceof Error)) {
    return;
  }
  const parsed = await new ErrorParser().defineSourceLoader(sourceLoader).parse(error);
  const stack = error.message + "\n" + parsed.frames.map((frame) => fmtFrame(frame)).join("\n");
  Object.defineProperty(error, "stack", { value: stack });
  if (error.cause) {
    await loadStackTrace(error.cause).catch(consola.error);
  }
}
async function sourceLoader(frame) {
  if (!frame.fileName || frame.fileType !== "fs" || frame.type === "native") {
    return;
  }
  if (frame.type === "app") {
    const rawSourceMap = await readFile(`${frame.fileName}.map`, "utf8").catch(() => {
    });
    if (rawSourceMap) {
      const consumer = await new SourceMapConsumer(rawSourceMap);
      const originalPosition = consumer.originalPositionFor({ line: frame.lineNumber, column: frame.columnNumber });
      if (originalPosition.source && originalPosition.line) {
        frame.fileName = resolve(dirname(frame.fileName), originalPosition.source);
        frame.lineNumber = originalPosition.line;
        frame.columnNumber = originalPosition.column || 0;
      }
    }
  }
  const contents = await readFile(frame.fileName, "utf8").catch(() => {
  });
  return contents ? { contents } : void 0;
}
function fmtFrame(frame) {
  if (frame.type === "native") {
    return frame.raw;
  }
  const src = `${frame.fileName || ""}:${frame.lineNumber}:${frame.columnNumber})`;
  return frame.functionName ? `at ${frame.functionName} (${src}` : `at ${src}`;
}

const errorHandlers = [errorHandler$0, errorHandler$1];

async function errorHandler(error, event) {
  for (const handler of errorHandlers) {
    try {
      await handler(error, event, { defaultHandler });
      if (event.handled) {
        return; // Response handled
      }
    } catch(error) {
      // Handler itself thrown, log and continue
      console.error(error);
    }
  }
  // H3 will handle fallback
}

const script = `
if (!window.__NUXT_DEVTOOLS_TIME_METRIC__) {
  Object.defineProperty(window, '__NUXT_DEVTOOLS_TIME_METRIC__', {
    value: {},
    enumerable: false,
    configurable: true,
  })
}
window.__NUXT_DEVTOOLS_TIME_METRIC__.appInit = Date.now()
`;

const _sjMePKrNGll3zPD4lwvTvGsbvS6cnMh4Hk4wjqqrCI = (function(nitro) {
  nitro.hooks.hook("render:html", (htmlContext) => {
    htmlContext.head.push(`<script>${script}<\/script>`);
  });
});

const rootDir = "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt";

const appHead = {"meta":[{"name":"viewport","content":"width=device-width, initial-scale=1, viewport-fit=cover"},{"charset":"utf-8"}],"link":[{"rel":"icon","type":"image/x-icon","href":"/favicon/favicon.ico"},{"rel":"apple-touch-icon","sizes":"180x180","href":"/favicon/apple-touch-icon.png"}],"style":[],"script":[],"noscript":[],"charset":"utf-8","viewport":"width=device-width, initial-scale=1, viewport-fit=cover"};

const appRootTag = "div";

const appRootAttrs = {"id":"__nuxt"};

const appTeleportTag = "div";

const appTeleportAttrs = {"id":"teleports"};

const appId = "nuxt-app";

const devReducers = {
	VNode: (data) => isVNode(data) ? {
		type: data.type,
		props: data.props
	} : undefined,
	URL: (data) => data instanceof URL ? data.toString() : undefined
};
const asyncContext = getContext("nuxt-dev", {
	asyncContext: true,
	AsyncLocalStorage
});
const _qzyfNCKoru8iok4BIAvpzlXDQxqwJ64tO5fihMjIg = (nitroApp) => {
	const handler = nitroApp.h3App.handler;
	nitroApp.h3App.handler = (event) => {
		return asyncContext.callAsync({
			logs: [],
			event
		}, () => handler(event));
	};
	onConsoleLog((_log) => {
		const ctx = asyncContext.tryUse();
		if (!ctx) {
			return;
		}
		const rawStack = captureRawStackTrace();
		if (!rawStack || rawStack.includes("runtime/vite-node.mjs")) {
			return;
		}
		const trace = [];
		let filename = "";
		for (const entry of parseRawStackTrace(rawStack)) {
			if (entry.source === globalThis._importMeta_.url) {
				continue;
			}
			if (EXCLUDE_TRACE_RE.test(entry.source)) {
				continue;
			}
			filename ||= entry.source.replace(withTrailingSlash(rootDir), "");
			trace.push({
				...entry,
				source: entry.source.startsWith("file://") ? entry.source.replace("file://", "") : entry.source
			});
		}
		const log = {
			..._log,
			filename,
			stack: trace
		};
		// retain log to be include in the next render
		ctx.logs.push(log);
	});
	nitroApp.hooks.hook("afterResponse", () => {
		const ctx = asyncContext.tryUse();
		if (!ctx) {
			return;
		}
		return nitroApp.hooks.callHook("dev:ssr-logs", {
			logs: ctx.logs,
			path: ctx.event.path
		});
	});
	// Pass any logs to the client
	nitroApp.hooks.hook("render:html", (htmlContext) => {
		const ctx = asyncContext.tryUse();
		if (!ctx) {
			return;
		}
		try {
			const reducers = Object.assign(Object.create(null), devReducers, ctx.event.context["~payloadReducers"]);
			htmlContext.bodyAppend.unshift(`<script type="application/json" data-nuxt-logs="${appId}">${stringify(ctx.logs, reducers)}<\/script>`);
		} catch (e) {
			const shortError = e instanceof Error && "toString" in e ? ` Received \`${e.toString()}\`.` : "";
			console.warn(`[nuxt] Failed to stringify dev server logs.${shortError} You can define your own reducer/reviver for rich types following the instructions in https://nuxt.com/docs/api/composables/use-nuxt-app#payload.`);
		}
	});
};
const EXCLUDE_TRACE_RE = /\/node_modules\/(?:.*\/)?(?:nuxt|nuxt-nightly|nuxt-edge|nuxt3|consola|@vue)\/|core\/runtime\/nitro/;
function onConsoleLog(callback) {
	consola$1.addReporter({ log(logObj) {
		callback(logObj);
	} });
	consola$1.wrapConsole();
}

const plugins = [
  _sjMePKrNGll3zPD4lwvTvGsbvS6cnMh4Hk4wjqqrCI,
_qzyfNCKoru8iok4BIAvpzlXDQxqwJ64tO5fihMjIg,
_wH6JrtIxmaSoA8lCPWFnE9z4lQeXW6H5z3l5aymEQw
];

const assets = {};

function readAsset (id) {
  const serverDir = dirname$1(fileURLToPath(globalThis._importMeta_.url));
  return promises.readFile(resolve$1(serverDir, assets[id].path))
}

const publicAssetBases = {"/_nuxt/builds/meta/":{"maxAge":31536000},"/_nuxt/builds/":{"maxAge":1}};

function isPublicAssetURL(id = '') {
  if (assets[id]) {
    return true
  }
  for (const base in publicAssetBases) {
    if (id.startsWith(base)) { return true }
  }
  return false
}

function getAsset (id) {
  return assets[id]
}

const METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
const EncodingMap = { gzip: ".gz", br: ".br" };
const _xd5KXU = eventHandler((event) => {
  if (event.method && !METHODS.has(event.method)) {
    return;
  }
  let id = decodePath(
    withLeadingSlash(withoutTrailingSlash(parseURL(event.path).pathname))
  );
  let asset;
  const encodingHeader = String(
    getRequestHeader(event, "accept-encoding") || ""
  );
  const encodings = [
    ...encodingHeader.split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(),
    ""
  ];
  for (const encoding of encodings) {
    for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
      const _asset = getAsset(_id);
      if (_asset) {
        asset = _asset;
        id = _id;
        break;
      }
    }
  }
  if (!asset) {
    if (isPublicAssetURL(id)) {
      removeResponseHeader(event, "Cache-Control");
      throw createError({ statusCode: 404 });
    }
    return;
  }
  if (asset.encoding !== void 0) {
    appendResponseHeader(event, "Vary", "Accept-Encoding");
  }
  const ifNotMatch = getRequestHeader(event, "if-none-match") === asset.etag;
  if (ifNotMatch) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  const ifModifiedSinceH = getRequestHeader(event, "if-modified-since");
  const mtimeDate = new Date(asset.mtime);
  if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  if (asset.type && !getResponseHeader(event, "Content-Type")) {
    setResponseHeader(event, "Content-Type", asset.type);
  }
  if (asset.etag && !getResponseHeader(event, "ETag")) {
    setResponseHeader(event, "ETag", asset.etag);
  }
  if (asset.mtime && !getResponseHeader(event, "Last-Modified")) {
    setResponseHeader(event, "Last-Modified", mtimeDate.toUTCString());
  }
  if (asset.encoding && !getResponseHeader(event, "Content-Encoding")) {
    setResponseHeader(event, "Content-Encoding", asset.encoding);
  }
  if (asset.size > 0 && !getResponseHeader(event, "Content-Length")) {
    setResponseHeader(event, "Content-Length", asset.size);
  }
  return readAsset(id);
});

const _CcWxU7 = defineEventHandler((event) => {
  const url = getRequestURL(event);
  if (url.protocol === "http:" && !url.hostname.includes("localhost") && !url.hostname.includes("127.0.0")) {
    return sendRedirect(event, url.href.replace("http:", "https:"), 301);
  }
});

const VueResolver = (_, value) => {
  return isRef(value) ? toValue(value) : value;
};

const headSymbol = "usehead";
// @__NO_SIDE_EFFECTS__
function vueInstall(head) {
  const plugin = {
    install(app) {
      app.config.globalProperties.$unhead = head;
      app.config.globalProperties.$head = head;
      app.provide(headSymbol, head);
    }
  };
  return plugin.install;
}

// @__NO_SIDE_EFFECTS__
function resolveUnrefHeadInput(input) {
  return walkResolver(input, VueResolver);
}

const NUXT_RUNTIME_PAYLOAD_EXTRACTION = false;

// @__NO_SIDE_EFFECTS__
function createHead(options = {}) {
  const head = createHead$1({
    ...options,
    propResolvers: [VueResolver]
  });
  head.install = vueInstall(head);
  return head;
}

const unheadOptions = {
  disableDefaults: true,
  disableCapoSorting: false,
  plugins: [DeprecationsPlugin, PromisesPlugin, TemplateParamsPlugin, AliasSortingPlugin],
};

function createSSRContext(event) {
	const ssrContext = {
		url: event.path,
		event,
		runtimeConfig: useRuntimeConfig(event),
		noSSR: event.context.nuxt?.noSSR || (false),
		head: createHead(unheadOptions),
		error: false,
		nuxt: undefined,
		payload: {},
		["~payloadReducers"]: Object.create(null),
		modules: new Set()
	};
	return ssrContext;
}
function setSSRError(ssrContext, error) {
	ssrContext.error = true;
	ssrContext.payload = { error };
	ssrContext.url = error.url;
}

function buildAssetsDir() {
	// TODO: support passing event to `useRuntimeConfig`
	return useRuntimeConfig().app.buildAssetsDir;
}
function buildAssetsURL(...path) {
	return joinRelativeURL(publicAssetsURL(), buildAssetsDir(), ...path);
}
function publicAssetsURL(...path) {
	// TODO: support passing event to `useRuntimeConfig`
	const app = useRuntimeConfig().app;
	const publicBase = app.cdnURL || app.baseURL;
	return path.length ? joinRelativeURL(publicBase, ...path) : publicBase;
}

const APP_ROOT_OPEN_TAG = `<${appRootTag}${propsToString(appRootAttrs)}>`;
const APP_ROOT_CLOSE_TAG = `</${appRootTag}>`;
// @ts-expect-error file will be produced after app build
const getServerEntry = () => import('file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/.nuxt//dist/server/server.mjs').then((r) => r.default || r);
// @ts-expect-error file will be produced after app build
const getClientManifest = () => import('file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/.nuxt//dist/server/client.manifest.mjs').then((r) => r.default || r).then((r) => typeof r === "function" ? r() : r);
// -- SSR Renderer --
const getSSRRenderer = lazyCachedFunction(async () => {
	// Load server bundle
	const createSSRApp = await getServerEntry();
	if (!createSSRApp) {
		throw new Error("Server bundle is not available");
	}
	// Load precomputed dependencies
	const precomputed = undefined ;
	// Create renderer
	const renderer = createRenderer(createSSRApp, {
		precomputed,
		manifest: await getClientManifest() ,
		renderToString: renderToString$1,
		buildAssetsURL
	});
	async function renderToString$1(input, context) {
		const html = await renderToString(input, context);
		// In development with vite-node, the manifest is on-demand and will be available after rendering
		// eslint-disable-next-line no-restricted-globals
		if (process.env.NUXT_VITE_NODE_OPTIONS) {
			renderer.rendererContext.updateManifest(await getClientManifest());
		}
		return APP_ROOT_OPEN_TAG + html + APP_ROOT_CLOSE_TAG;
	}
	return renderer;
});
// -- SPA Renderer --
const getSPARenderer = lazyCachedFunction(async () => {
	const precomputed = undefined ;
	// @ts-expect-error virtual file
	const spaTemplate = await Promise.resolve().then(function () { return _virtual__spaTemplate; }).then((r) => r.template).catch(() => "").then((r) => {
		{
			return APP_ROOT_OPEN_TAG + r + APP_ROOT_CLOSE_TAG;
		}
	});
	// Create SPA renderer and cache the result for all requests
	const renderer = createRenderer(() => () => {}, {
		precomputed,
		manifest: await getClientManifest() ,
		renderToString: () => spaTemplate,
		buildAssetsURL
	});
	const result = await renderer.renderToString({});
	const renderToString = (ssrContext) => {
		const config = useRuntimeConfig(ssrContext.event);
		ssrContext.modules ||= new Set();
		ssrContext.payload.serverRendered = false;
		ssrContext.config = {
			public: config.public,
			app: config.app
		};
		return Promise.resolve(result);
	};
	return {
		rendererContext: renderer.rendererContext,
		renderToString
	};
});
function lazyCachedFunction(fn) {
	let res = null;
	return () => {
		if (res === null) {
			res = fn().catch((err) => {
				res = null;
				throw err;
			});
		}
		return res;
	};
}
function getRenderer(ssrContext) {
	return ssrContext.noSSR ? getSPARenderer() : getSSRRenderer();
}
// @ts-expect-error file will be produced after app build
const getSSRStyles = lazyCachedFunction(() => Promise.resolve().then(function () { return styles$1; }).then((r) => r.default || r));

async function renderInlineStyles(usedModules) {
	const styleMap = await getSSRStyles();
	const inlinedStyles = new Set();
	for (const mod of usedModules) {
		if (mod in styleMap && styleMap[mod]) {
			for (const style of await styleMap[mod]()) {
				inlinedStyles.add(style);
			}
		}
	}
	return Array.from(inlinedStyles).map((style) => ({ innerHTML: style }));
}

// @ts-expect-error virtual file
const ROOT_NODE_REGEX = new RegExp(`^<${appRootTag}[^>]*>([\\s\\S]*)<\\/${appRootTag}>$`);
/**
* remove the root node from the html body
*/
function getServerComponentHTML(body) {
	const match = body.match(ROOT_NODE_REGEX);
	return match?.[1] || body;
}
const SSR_SLOT_TELEPORT_MARKER = /^uid=([^;]*);slot=(.*)$/;
const SSR_CLIENT_TELEPORT_MARKER = /^uid=([^;]*);client=(.*)$/;
const SSR_CLIENT_SLOT_MARKER = /^island-slot=([^;]*);(.*)$/;
function getSlotIslandResponse(ssrContext) {
	if (!ssrContext.islandContext || !Object.keys(ssrContext.islandContext.slots).length) {
		return undefined;
	}
	const response = {};
	for (const [name, slot] of Object.entries(ssrContext.islandContext.slots)) {
		response[name] = {
			...slot,
			fallback: ssrContext.teleports?.[`island-fallback=${name}`]
		};
	}
	return response;
}
function getClientIslandResponse(ssrContext) {
	if (!ssrContext.islandContext || !Object.keys(ssrContext.islandContext.components).length) {
		return undefined;
	}
	const response = {};
	for (const [clientUid, component] of Object.entries(ssrContext.islandContext.components)) {
		// remove teleport anchor to avoid hydration issues
		const html = ssrContext.teleports?.[clientUid]?.replaceAll("<!--teleport start anchor-->", "") || "";
		response[clientUid] = {
			...component,
			html,
			slots: getComponentSlotTeleport(clientUid, ssrContext.teleports ?? {})
		};
	}
	return response;
}
function getComponentSlotTeleport(clientUid, teleports) {
	const entries = Object.entries(teleports);
	const slots = {};
	for (const [key, value] of entries) {
		const match = key.match(SSR_CLIENT_SLOT_MARKER);
		if (match) {
			const [, id, slot] = match;
			if (!slot || clientUid !== id) {
				continue;
			}
			slots[slot] = value;
		}
	}
	return slots;
}
function replaceIslandTeleports(ssrContext, html) {
	const { teleports, islandContext } = ssrContext;
	if (islandContext || !teleports) {
		return html;
	}
	for (const key in teleports) {
		const matchClientComp = key.match(SSR_CLIENT_TELEPORT_MARKER);
		if (matchClientComp) {
			const [, uid, clientId] = matchClientComp;
			if (!uid || !clientId) {
				continue;
			}
			html = html.replace(new RegExp(` data-island-uid="${uid}" data-island-component="${clientId}"[^>]*>`), (full) => {
				return full + teleports[key];
			});
			continue;
		}
		const matchSlot = key.match(SSR_SLOT_TELEPORT_MARKER);
		if (matchSlot) {
			const [, uid, slot] = matchSlot;
			if (!uid || !slot) {
				continue;
			}
			html = html.replace(new RegExp(` data-island-uid="${uid}" data-island-slot="${slot}"[^>]*>`), (full) => {
				return full + teleports[key];
			});
		}
	}
	return html;
}

const ISLAND_SUFFIX_RE = /\.json(?:\?.*)?$/;
const handler$1 = defineEventHandler(async (event) => {
	const nitroApp = useNitroApp();
	setResponseHeaders(event, {
		"content-type": "application/json;charset=utf-8",
		"x-powered-by": "Nuxt"
	});
	const islandContext = await getIslandContext(event);
	const ssrContext = {
		...createSSRContext(event),
		islandContext,
		noSSR: false,
		url: islandContext.url
	};
	// Render app
	const renderer = await getSSRRenderer();
	const renderResult = await renderer.renderToString(ssrContext).catch(async (err) => {
		await ssrContext.nuxt?.hooks.callHook("app:error", err);
		throw err;
	});
	// Handle errors
	if (ssrContext.payload?.error) {
		throw ssrContext.payload.error;
	}
	const inlinedStyles = await renderInlineStyles(ssrContext.modules ?? []);
	await ssrContext.nuxt?.hooks.callHook("app:rendered", {
		ssrContext,
		renderResult
	});
	if (inlinedStyles.length) {
		ssrContext.head.push({ style: inlinedStyles });
	}
	{
		const { styles } = getRequestDependencies(ssrContext, renderer.rendererContext);
		const link = [];
		for (const resource of Object.values(styles)) {
			// Do not add links to resources that are inlined (vite v5+)
			if ("inline" in getQuery(resource.file)) {
				continue;
			}
			// Add CSS links in <head> for CSS files
			// - in dev mode when rendering an island and the file has scoped styles and is not a page
			if (resource.file.includes("scoped") && !resource.file.includes("pages/")) {
				link.push({
					rel: "stylesheet",
					href: renderer.rendererContext.buildAssetsURL(resource.file),
					crossorigin: ""
				});
			}
		}
		if (link.length) {
			ssrContext.head.push({ link }, { mode: "server" });
		}
	}
	const islandHead = {};
	for (const entry of ssrContext.head.entries.values()) {
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		for (const [key, value] of Object.entries(resolveUnrefHeadInput(entry.input))) {
			const currentValue = islandHead[key];
			if (Array.isArray(currentValue)) {
				currentValue.push(...value);
			} else {
				islandHead[key] = value;
			}
		}
	}
	// TODO: remove for v4
	islandHead.link ||= [];
	islandHead.style ||= [];
	const islandResponse = {
		id: islandContext.id,
		head: islandHead,
		html: getServerComponentHTML(renderResult.html),
		components: getClientIslandResponse(ssrContext),
		slots: getSlotIslandResponse(ssrContext)
	};
	await nitroApp.hooks.callHook("render:island", islandResponse, {
		event,
		islandContext
	});
	return islandResponse;
});
const ISLAND_PATH_PREFIX = "/__nuxt_island/";
const VALID_COMPONENT_NAME_RE = /^[a-z][\w.-]*$/i;
async function getIslandContext(event) {
	let url = event.path || "";
	if (!url.startsWith(ISLAND_PATH_PREFIX)) {
		throw createError({
			statusCode: 400,
			statusMessage: "Invalid island request path"
		});
	}
	const componentParts = url.substring(ISLAND_PATH_PREFIX.length).replace(ISLAND_SUFFIX_RE, "").split("_");
	const hashId = componentParts.length > 1 ? componentParts.pop() : undefined;
	const componentName = componentParts.join("_");
	if (!componentName || !VALID_COMPONENT_NAME_RE.test(componentName)) {
		throw createError({
			statusCode: 400,
			statusMessage: "Invalid island component name"
		});
	}
	const context = event.method === "GET" ? getQuery$1(event) : await readBody(event);
	// Only extract known context fields to prevent arbitrary data injection
	return {
		url: typeof context?.url === "string" ? context.url : "/",
		id: hashId,
		name: componentName,
		props: destr$1(context.props) || {},
		slots: {},
		components: {}
	};
}

const _lazy_iG2kzo = () => Promise.resolve().then(function () { return data_get$1; });
const _lazy_aXBS87 = () => Promise.resolve().then(function () { return _word__get$3; });
const _lazy_huJbPU = () => Promise.resolve().then(function () { return _word__get$1; });
const _lazy_DObZ0b = () => Promise.resolve().then(function () { return wordStats_post$1; });
const _lazy_uCk_hb = () => Promise.resolve().then(function () { return languages_get$1; });
const _lazy_YiDv2M = () => Promise.resolve().then(function () { return stats_get$1; });
const _lazy_jFTGjD = () => Promise.resolve().then(function () { return llms_txt$1; });
const _lazy_jU25_9 = () => Promise.resolve().then(function () { return robots_txt$1; });
const _lazy_r2WudL = () => Promise.resolve().then(function () { return sitemapMain_xml$1; });
const _lazy_xl4zn_ = () => Promise.resolve().then(function () { return sitemapWords__lang__xml$1; });
const _lazy_vCaXyg = () => Promise.resolve().then(function () { return sitemap_xml$1; });
const _lazy_J1L6sE = () => Promise.resolve().then(function () { return renderer; });

const handlers = [
  { route: '', handler: _xd5KXU, lazy: false, middleware: true, method: undefined },
  { route: '', handler: _CcWxU7, lazy: false, middleware: true, method: undefined },
  { route: '/api/:lang/data', handler: _lazy_iG2kzo, lazy: true, middleware: false, method: "get" },
  { route: '/api/:lang/definition/:word', handler: _lazy_aXBS87, lazy: true, middleware: false, method: "get" },
  { route: '/api/:lang/word-image/:word', handler: _lazy_huJbPU, lazy: true, middleware: false, method: "get" },
  { route: '/api/:lang/word-stats', handler: _lazy_DObZ0b, lazy: true, middleware: false, method: "post" },
  { route: '/api/languages', handler: _lazy_uCk_hb, lazy: true, middleware: false, method: "get" },
  { route: '/api/stats', handler: _lazy_YiDv2M, lazy: true, middleware: false, method: "get" },
  { route: '/llms.txt', handler: _lazy_jFTGjD, lazy: true, middleware: false, method: undefined },
  { route: '/robots.txt', handler: _lazy_jU25_9, lazy: true, middleware: false, method: undefined },
  { route: '/sitemap-main.xml', handler: _lazy_r2WudL, lazy: true, middleware: false, method: undefined },
  { route: '/sitemap-words-:lang.xml', handler: _lazy_xl4zn_, lazy: true, middleware: false, method: undefined },
  { route: '/sitemap.xml', handler: _lazy_vCaXyg, lazy: true, middleware: false, method: undefined },
  { route: '/__nuxt_error', handler: _lazy_J1L6sE, lazy: true, middleware: false, method: undefined },
  { route: '/__nuxt_island/**', handler: handler$1, lazy: false, middleware: false, method: undefined },
  { route: '/**', handler: _lazy_J1L6sE, lazy: true, middleware: false, method: undefined }
];

function createNitroApp() {
  const config = useRuntimeConfig();
  const hooks = createHooks();
  const captureError = (error, context = {}) => {
    const promise = hooks.callHookParallel("error", error, context).catch((error_) => {
      console.error("Error while capturing another error", error_);
    });
    if (context.event && isEvent(context.event)) {
      const errors = context.event.context.nitro?.errors;
      if (errors) {
        errors.push({ error, context });
      }
      if (context.event.waitUntil) {
        context.event.waitUntil(promise);
      }
    }
  };
  const h3App = createApp({
    debug: destr(true),
    onError: (error, event) => {
      captureError(error, { event, tags: ["request"] });
      return errorHandler(error, event);
    },
    onRequest: async (event) => {
      event.context.nitro = event.context.nitro || { errors: [] };
      const fetchContext = event.node.req?.__unenv__;
      if (fetchContext?._platform) {
        event.context = {
          _platform: fetchContext?._platform,
          // #3335
          ...fetchContext._platform,
          ...event.context
        };
      }
      if (!event.context.waitUntil && fetchContext?.waitUntil) {
        event.context.waitUntil = fetchContext.waitUntil;
      }
      event.fetch = (req, init) => fetchWithEvent(event, req, init, { fetch: localFetch });
      event.$fetch = (req, init) => fetchWithEvent(event, req, init, {
        fetch: $fetch
      });
      event.waitUntil = (promise) => {
        if (!event.context.nitro._waitUntilPromises) {
          event.context.nitro._waitUntilPromises = [];
        }
        event.context.nitro._waitUntilPromises.push(promise);
        if (event.context.waitUntil) {
          event.context.waitUntil(promise);
        }
      };
      event.captureError = (error, context) => {
        captureError(error, { event, ...context });
      };
      await nitroApp$1.hooks.callHook("request", event).catch((error) => {
        captureError(error, { event, tags: ["request"] });
      });
    },
    onBeforeResponse: async (event, response) => {
      await nitroApp$1.hooks.callHook("beforeResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    },
    onAfterResponse: async (event, response) => {
      await nitroApp$1.hooks.callHook("afterResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    }
  });
  const router = createRouter$1({
    preemptive: true
  });
  const nodeHandler = toNodeListener(h3App);
  const localCall = (aRequest) => callNodeRequestHandler(
    nodeHandler,
    aRequest
  );
  const localFetch = (input, init) => {
    if (!input.toString().startsWith("/")) {
      return globalThis.fetch(input, init);
    }
    return fetchNodeRequestHandler(
      nodeHandler,
      input,
      init
    ).then((response) => normalizeFetchResponse(response));
  };
  const $fetch = createFetch({
    fetch: localFetch,
    Headers: Headers$1,
    defaults: { baseURL: config.app.baseURL }
  });
  globalThis.$fetch = $fetch;
  h3App.use(createRouteRulesHandler({ localFetch }));
  for (const h of handlers) {
    let handler = h.lazy ? lazyEventHandler(h.handler) : h.handler;
    if (h.middleware || !h.route) {
      const middlewareBase = (config.app.baseURL + (h.route || "/")).replace(
        /\/+/g,
        "/"
      );
      h3App.use(middlewareBase, handler);
    } else {
      const routeRules = getRouteRulesForPath(
        h.route.replace(/:\w+|\*\*/g, "_")
      );
      if (routeRules.cache) {
        handler = cachedEventHandler(handler, {
          group: "nitro/routes",
          ...routeRules.cache
        });
      }
      router.use(h.route, handler, h.method);
    }
  }
  h3App.use(config.app.baseURL, router.handler);
  const app = {
    hooks,
    h3App,
    router,
    localCall,
    localFetch,
    captureError
  };
  return app;
}
function runNitroPlugins(nitroApp2) {
  for (const plugin of plugins) {
    try {
      plugin(nitroApp2);
    } catch (error) {
      nitroApp2.captureError(error, { tags: ["plugin"] });
      throw error;
    }
  }
}
const nitroApp$1 = createNitroApp();
function useNitroApp() {
  return nitroApp$1;
}
runNitroPlugins(nitroApp$1);

function defineRenderHandler(render) {
  const runtimeConfig = useRuntimeConfig();
  return eventHandler(async (event) => {
    const nitroApp = useNitroApp();
    const ctx = { event, render, response: void 0 };
    await nitroApp.hooks.callHook("render:before", ctx);
    if (!ctx.response) {
      if (event.path === `${runtimeConfig.app.baseURL}favicon.ico`) {
        setResponseHeader(event, "Content-Type", "image/x-icon");
        return send(
          event,
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        );
      }
      ctx.response = await ctx.render(event);
      if (!ctx.response) {
        const _currentStatus = getResponseStatus(event);
        setResponseStatus(event, _currentStatus === 200 ? 500 : _currentStatus);
        return send(
          event,
          "No response returned from render handler: " + event.path
        );
      }
    }
    await nitroApp.hooks.callHook("render:response", ctx.response, ctx);
    if (ctx.response.headers) {
      setResponseHeaders(event, ctx.response.headers);
    }
    if (ctx.response.statusCode || ctx.response.statusMessage) {
      setResponseStatus(
        event,
        ctx.response.statusCode,
        ctx.response.statusMessage
      );
    }
    return ctx.response.body;
  });
}

const scheduledTasks = false;

const tasks = {
  
};

const __runningTasks__ = {};
async function runTask(name, {
  payload = {},
  context = {}
} = {}) {
  if (__runningTasks__[name]) {
    return __runningTasks__[name];
  }
  if (!(name in tasks)) {
    throw createError({
      message: `Task \`${name}\` is not available!`,
      statusCode: 404
    });
  }
  if (!tasks[name].resolve) {
    throw createError({
      message: `Task \`${name}\` is not implemented!`,
      statusCode: 501
    });
  }
  const handler = await tasks[name].resolve();
  const taskEvent = { name, payload, context };
  __runningTasks__[name] = handler.run(taskEvent);
  try {
    const res = await __runningTasks__[name];
    return res;
  } finally {
    delete __runningTasks__[name];
  }
}

if (!globalThis.crypto) {
  globalThis.crypto = nodeCrypto.webcrypto;
}
const { NITRO_NO_UNIX_SOCKET, NITRO_DEV_WORKER_ID } = process.env;
trapUnhandledNodeErrors();
parentPort?.on("message", (msg) => {
  if (msg && msg.event === "shutdown") {
    shutdown();
  }
});
const nitroApp = useNitroApp();
const server = new Server(toNodeListener(nitroApp.h3App));
let listener;
listen().catch(() => listen(
  true
  /* use random port */
)).catch((error) => {
  console.error("Dev worker failed to listen:", error);
  return shutdown();
});
nitroApp.router.get(
  "/_nitro/tasks",
  defineEventHandler(async (event) => {
    const _tasks = await Promise.all(
      Object.entries(tasks).map(async ([name, task]) => {
        const _task = await task.resolve?.();
        return [name, { description: _task?.meta?.description }];
      })
    );
    return {
      tasks: Object.fromEntries(_tasks),
      scheduledTasks
    };
  })
);
nitroApp.router.use(
  "/_nitro/tasks/:name",
  defineEventHandler(async (event) => {
    const name = getRouterParam(event, "name");
    const payload = {
      ...getQuery$1(event),
      ...await readBody(event).then((r) => r?.payload).catch(() => ({}))
    };
    return await runTask(name, { payload });
  })
);
function listen(useRandomPort = Boolean(
  NITRO_NO_UNIX_SOCKET || process.versions.webcontainer || "Bun" in globalThis && process.platform === "win32"
)) {
  return new Promise((resolve, reject) => {
    try {
      listener = server.listen(useRandomPort ? 0 : getSocketAddress(), () => {
        const address = server.address();
        parentPort?.postMessage({
          event: "listen",
          address: typeof address === "string" ? { socketPath: address } : { host: "localhost", port: address?.port }
        });
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}
function getSocketAddress() {
  const socketName = `nitro-worker-${process.pid}-${threadId}-${NITRO_DEV_WORKER_ID}-${Math.round(Math.random() * 1e4)}.sock`;
  if (process.platform === "win32") {
    return join(String.raw`\\.\pipe`, socketName);
  }
  if (process.platform === "linux") {
    const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
    if (nodeMajor >= 20) {
      return `\0${socketName}`;
    }
  }
  return join(tmpdir(), socketName);
}
async function shutdown() {
  server.closeAllConnections?.();
  await Promise.all([
    new Promise((resolve) => listener?.close(resolve)),
    nitroApp.hooks.callHook("close").catch(console.error)
  ]);
  parentPort?.postMessage({ event: "exit" });
}

const _messages = {
	"appName": "Nuxt",
	"version": "",
	"status": 500,
	"statusText": "Server error",
	"description": "This page is temporarily unavailable."
};
const template$1 = (messages) => {
	messages = {
		..._messages,
		...messages
	};
	return "<!DOCTYPE html><html lang=\"en\"><head><title>" + escapeHtml(messages.status) + " - " + escapeHtml(messages.statusText) + " | " + escapeHtml(messages.appName) + "</title><meta charset=\"utf-8\"><meta content=\"width=device-width,initial-scale=1.0,minimum-scale=1.0\" name=\"viewport\"><style>.spotlight{background:linear-gradient(45deg,#00dc82,#36e4da 50%,#0047e1);filter:blur(20vh)}*,:after,:before{border-color:var(--un-default-border-color,#e5e7eb);border-style:solid;border-width:0;box-sizing:border-box}:after,:before{--un-content:\"\"}html{line-height:1.5;-webkit-text-size-adjust:100%;font-family:ui-sans-serif,system-ui,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;font-feature-settings:normal;font-variation-settings:normal;-moz-tab-size:4;tab-size:4;-webkit-tap-highlight-color:transparent}body{line-height:inherit;margin:0}h1{font-size:inherit;font-weight:inherit}h1,p{margin:0}*,:after,:before{--un-rotate:0;--un-rotate-x:0;--un-rotate-y:0;--un-rotate-z:0;--un-scale-x:1;--un-scale-y:1;--un-scale-z:1;--un-skew-x:0;--un-skew-y:0;--un-translate-x:0;--un-translate-y:0;--un-translate-z:0;--un-pan-x: ;--un-pan-y: ;--un-pinch-zoom: ;--un-scroll-snap-strictness:proximity;--un-ordinal: ;--un-slashed-zero: ;--un-numeric-figure: ;--un-numeric-spacing: ;--un-numeric-fraction: ;--un-border-spacing-x:0;--un-border-spacing-y:0;--un-ring-offset-shadow:0 0 transparent;--un-ring-shadow:0 0 transparent;--un-shadow-inset: ;--un-shadow:0 0 transparent;--un-ring-inset: ;--un-ring-offset-width:0px;--un-ring-offset-color:#fff;--un-ring-width:0px;--un-ring-color:rgba(147,197,253,.5);--un-blur: ;--un-brightness: ;--un-contrast: ;--un-drop-shadow: ;--un-grayscale: ;--un-hue-rotate: ;--un-invert: ;--un-saturate: ;--un-sepia: ;--un-backdrop-blur: ;--un-backdrop-brightness: ;--un-backdrop-contrast: ;--un-backdrop-grayscale: ;--un-backdrop-hue-rotate: ;--un-backdrop-invert: ;--un-backdrop-opacity: ;--un-backdrop-saturate: ;--un-backdrop-sepia: }.fixed{position:fixed}.-bottom-1\\/2{bottom:-50%}.left-0{left:0}.right-0{right:0}.grid{display:grid}.mb-16{margin-bottom:4rem}.mb-8{margin-bottom:2rem}.h-1\\/2{height:50%}.max-w-520px{max-width:520px}.min-h-screen{min-height:100vh}.place-content-center{place-content:center}.overflow-hidden{overflow:hidden}.bg-white{--un-bg-opacity:1;background-color:rgb(255 255 255/var(--un-bg-opacity))}.px-8{padding-left:2rem;padding-right:2rem}.text-center{text-align:center}.text-8xl{font-size:6rem;line-height:1}.text-xl{font-size:1.25rem;line-height:1.75rem}.text-black{--un-text-opacity:1;color:rgb(0 0 0/var(--un-text-opacity))}.font-light{font-weight:300}.font-medium{font-weight:500}.leading-tight{line-height:1.25}.font-sans{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji}.antialiased{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}@media(prefers-color-scheme:dark){.dark\\:bg-black{--un-bg-opacity:1;background-color:rgb(0 0 0/var(--un-bg-opacity))}.dark\\:text-white{--un-text-opacity:1;color:rgb(255 255 255/var(--un-text-opacity))}}@media(min-width:640px){.sm\\:px-0{padding-left:0;padding-right:0}.sm\\:text-4xl{font-size:2.25rem;line-height:2.5rem}}</style><script>!function(){const e=document.createElement(\"link\").relList;if(!(e&&e.supports&&e.supports(\"modulepreload\"))){for(const e of document.querySelectorAll('link[rel=\"modulepreload\"]'))r(e);new MutationObserver(e=>{for(const o of e)if(\"childList\"===o.type)for(const e of o.addedNodes)\"LINK\"===e.tagName&&\"modulepreload\"===e.rel&&r(e)}).observe(document,{childList:!0,subtree:!0})}function r(e){if(e.ep)return;e.ep=!0;const r=function(e){const r={};return e.integrity&&(r.integrity=e.integrity),e.referrerPolicy&&(r.referrerPolicy=e.referrerPolicy),\"use-credentials\"===e.crossOrigin?r.credentials=\"include\":\"anonymous\"===e.crossOrigin?r.credentials=\"omit\":r.credentials=\"same-origin\",r}(e);fetch(e.href,r)}}();<\/script></head><body class=\"antialiased bg-white dark:bg-black dark:text-white font-sans grid min-h-screen overflow-hidden place-content-center text-black\"><div class=\"-bottom-1/2 fixed h-1/2 left-0 right-0 spotlight\"></div><div class=\"max-w-520px text-center\"><h1 class=\"font-medium mb-8 sm:text-10xl text-8xl\">" + escapeHtml(messages.status) + "</h1><p class=\"font-light leading-tight mb-16 px-8 sm:px-0 sm:text-4xl text-xl\">" + escapeHtml(messages.description) + "</p></div></body></html>";
};

const error500 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  template: template$1
}, Symbol.toStringTag, { value: 'Module' }));

const template = "";

const _virtual__spaTemplate = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  template: template
}, Symbol.toStringTag, { value: 'Module' }));

const styles = {};

const styles$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: styles
}, Symbol.toStringTag, { value: 'Module' }));

function resolveDataDir() {
  const envDataDir = process.env.NUXT_WEBAPP_DATA_DIR;
  if (envDataDir && existsSync(envDataDir)) return envDataDir;
  const candidates = [
    resolve(process.cwd(), "..", "webapp", "data"),
    resolve(process.cwd(), "webapp", "data")
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    `Cannot find webapp/data/ directory. Tried: ${candidates.join(", ")}`
  );
}
const DATA_DIR = resolveDataDir();
const PERSISTENT_DIR = process.env.DATA_DIR || resolve(DATA_DIR, "..", "static");
const WORD_IMAGES_DIR = join(PERSISTENT_DIR, "word-images");
const WORD_DEFS_DIR = join(PERSISTENT_DIR, "word-defs");
const WORD_STATS_DIR = join(PERSISTENT_DIR, "word-stats");
const WORD_HISTORY_DIR = join(PERSISTENT_DIR, "word-history");
const MIGRATION_DAY_IDX = 1681;
function readTextLines(filePath) {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, "utf-8").split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
}
function readNonCommentLines(filePath) {
  return readTextLines(filePath).filter((l) => !l.startsWith("#"));
}
function readJsonFile(filePath) {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf-8"));
}
function loadCharacters(lang) {
  const charPath = join(DATA_DIR, "languages", lang, `${lang}_characters.txt`);
  if (existsSync(charPath)) {
    return readTextLines(charPath);
  }
  const wordsPath = join(DATA_DIR, "languages", lang, `${lang}_5words.txt`);
  const characters = /* @__PURE__ */ new Set();
  for (const line of readTextLines(wordsPath)) {
    for (const char of line) {
      characters.add(char);
    }
  }
  const sorted = [...characters].sort();
  writeFileSync(charPath, sorted.join("\n") + "\n", "utf-8");
  return sorted;
}
function loadWords(lang, langConfig) {
  const wordsPath = join(DATA_DIR, "languages", lang, `${lang}_5words.txt`);
  let words = readTextLines(wordsPath);
  const useGraphemes = (langConfig == null ? void 0 : langConfig.grapheme_mode) === "true";
  const characters = new Set(loadCharacters(lang));
  if (useGraphemes) {
    const segmenter = new Intl.Segmenter(void 0, { granularity: "grapheme" });
    words = words.filter((w) => {
      const graphemes = [...segmenter.segment(w)].map((s) => s.segment);
      return graphemes.length === 5;
    });
  } else {
    words = words.map((w) => w.toLowerCase()).filter((w) => w.length === 5 && /^[\p{L}]+$/u.test(w));
  }
  words = words.filter((w) => [...w].every((c) => characters.has(c)));
  const shuffledPath = join(
    DATA_DIR,
    "languages",
    lang,
    `${lang}_5words_shuffled.json`
  );
  if (existsSync(shuffledPath)) {
    const shuffled = readJsonFile(shuffledPath);
    if (shuffled && shuffled.length > 0) return shuffled;
  }
  let nInOrder = 0;
  let lastLetter = "";
  for (const word of words) {
    if (word[0] <= lastLetter) nInOrder++;
    lastLetter = word[0];
  }
  if (words.length > 0 && nInOrder / words.length > 0.8) {
    console.warn(
      `[data-loader] ${lang} words appear sorted but no _shuffled.json found. Run: uv run python scripts/preshuffle_word_lists.py`
    );
  }
  return words;
}
function loadSupplementalWords(lang) {
  const supplementPath = join(
    DATA_DIR,
    "languages",
    lang,
    `${lang}_5words_supplement.txt`
  );
  const characters = new Set(loadCharacters(lang));
  return readTextLines(supplementPath).filter(
    (w) => [...w].every((c) => characters.has(c))
  );
}
function loadBlocklist(lang) {
  const blocklistPath = join(DATA_DIR, "languages", lang, `${lang}_blocklist.txt`);
  const lines = readNonCommentLines(blocklistPath);
  return new Set(lines.map((w) => w.toLowerCase()));
}
function loadDailyWords(lang) {
  const dailyPath = join(DATA_DIR, "languages", lang, `${lang}_daily_words.txt`);
  const lines = readNonCommentLines(dailyPath).map((w) => w.toLowerCase());
  return lines.length > 0 ? lines : null;
}
function loadCuratedSchedule(lang) {
  const schedulePath = join(
    DATA_DIR,
    "languages",
    lang,
    `${lang}_curated_schedule.txt`
  );
  const lines = readNonCommentLines(schedulePath).map((w) => w.toLowerCase());
  return lines.length > 0 ? lines : null;
}
let _defaultConfig = null;
function loadLanguageConfig(lang) {
  if (!_defaultConfig) {
    _defaultConfig = readJsonFile(
      join(DATA_DIR, "default_language_config.json")
    );
  }
  const defaultConfig = _defaultConfig;
  const langConfigPath = join(DATA_DIR, "languages", lang, "language_config.json");
  const langConfig = readJsonFile(langConfigPath);
  if (!langConfig) return defaultConfig;
  const merged = { ...defaultConfig };
  for (const [key, value] of Object.entries(langConfig)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value) && key in merged && typeof merged[key] === "object") {
      merged[key] = { ...merged[key], ...value };
    } else {
      merged[key] = value;
    }
  }
  return merged;
}
function loadKeyboard(lang) {
  const keyboardPath = join(DATA_DIR, "languages", lang, `${lang}_keyboard.json`);
  const raw = readJsonFile(keyboardPath);
  if (!raw) return { default: null, layouts: {} };
  if (Array.isArray(raw)) {
    if (raw.length === 0) return { default: null, layouts: {} };
    return {
      default: "default",
      layouts: { default: { label: "Default", rows: raw } }
    };
  }
  if (typeof raw !== "object") return { default: null, layouts: {} };
  const layoutsBlock = raw.layouts;
  const sourceLayouts = typeof layoutsBlock === "object" && layoutsBlock !== null ? layoutsBlock : Object.fromEntries(
    Object.entries(raw).filter(([k]) => k !== "default")
  );
  const normalizedLayouts = {};
  for (const [name, value] of Object.entries(sourceLayouts)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const v = value;
      normalizedLayouts[name] = {
        label: v.label || name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        rows: v.rows || []
      };
    } else {
      normalizedLayouts[name] = {
        label: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        rows: value
      };
    }
  }
  let defaultLayout = raw.default;
  if (!defaultLayout || !(defaultLayout in normalizedLayouts)) {
    defaultLayout = Object.keys(normalizedLayouts)[0];
  }
  return { default: defaultLayout || null, layouts: normalizedLayouts };
}
let _cachedData = null;
function loadAllData() {
  if (_cachedData) return _cachedData;
  console.log("[data-loader] Loading data...");
  const langDir = join(DATA_DIR, "languages");
  const languageCodes = readdirSync(langDir).filter(
    (f) => existsSync(join(langDir, f, `${f}_5words.txt`))
  );
  const configs = {};
  const characters = {};
  for (const lc of languageCodes) {
    configs[lc] = loadLanguageConfig(lc);
    characters[lc] = loadCharacters(lc);
  }
  const wordLists = {};
  const supplements = {};
  const blocklists = {};
  const dailyWords = {};
  const curatedSchedules = {};
  const keyboards = {};
  for (const lc of languageCodes) {
    wordLists[lc] = loadWords(lc, configs[lc]);
    supplements[lc] = loadSupplementalWords(lc);
    blocklists[lc] = loadBlocklist(lc);
    dailyWords[lc] = loadDailyWords(lc);
    curatedSchedules[lc] = loadCuratedSchedule(lc);
    keyboards[lc] = loadKeyboard(lc);
  }
  const languages = {};
  for (const lc of languageCodes) {
    const config = configs[lc];
    languages[lc] = {
      language_name: config.name || lc,
      language_name_native: config.name_native || config.name || lc,
      language_code: lc
    };
  }
  const todaysIdx = getTodaysIdx$1();
  const daysSinceMigration = todaysIdx - MIGRATION_DAY_IDX;
  for (const lc of languageCodes) {
    const schedule = curatedSchedules[lc];
    const scheduleLen = schedule ? schedule.length : 0;
    if (scheduleLen < daysSinceMigration && dailyWords[lc]) {
      console.warn(
        `[data-loader] WORD SAFETY: ${lc} curated_schedule has ${scheduleLen} entries but ${daysSinceMigration} days since migration. Run: uv run python scripts/freeze_past_words.py ${lc}`
      );
    }
  }
  const stats = {
    totalLanguages: languageCodes.length,
    withSupplements: Object.values(supplements).filter((s) => s.length > 0).length
  };
  console.log(`[data-loader] Loaded ${stats.totalLanguages} languages (${stats.withSupplements} with supplements)`);
  _cachedData = {
    languageCodes,
    configs,
    wordLists,
    supplements,
    blocklists,
    dailyWords,
    curatedSchedules,
    characters,
    keyboards,
    languages
  };
  return _cachedData;
}
function getTodaysIdx$1(timezone = "UTC") {
  const now = /* @__PURE__ */ new Date();
  let localDate;
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const parts = formatter.format(now);
    localDate = /* @__PURE__ */ new Date(parts + "T00:00:00Z");
  } catch {
    localDate = now;
  }
  const epoch = /* @__PURE__ */ new Date("1970-01-01T00:00:00Z");
  const nDays = Math.floor((localDate.getTime() - epoch.getTime()) / (86400 * 1e3));
  return nDays - 18992 + 195;
}

function getTodaysIdx(timezone = "UTC") {
  const now = /* @__PURE__ */ new Date();
  let dateStr;
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    dateStr = formatter.format(now);
  } catch {
    dateStr = now.toISOString().slice(0, 10);
  }
  const [y, m, d] = dateStr.split("-").map(Number);
  const localDate = new Date(Date.UTC(y, m - 1, d));
  const epoch = new Date(Date.UTC(1970, 0, 1));
  const nDays = Math.floor(
    (localDate.getTime() - epoch.getTime()) / (86400 * 1e3)
  );
  return nDays - 18992 + 195;
}
function idxToDate(dayIdx) {
  const nDays = dayIdx + 18992 - 195;
  return new Date(Date.UTC(1970, 0, 1 + nDays));
}
function wordHash(word, langCode) {
  const h = createHash("sha256").update(`${langCode}:${word}`).digest();
  return h.readBigUInt64BE(0);
}
function dayHash(dayIdx, langCode) {
  const h = createHash("sha256").update(`${langCode}:day:${dayIdx}`).digest();
  return h.readBigUInt64BE(0);
}
function getDailyWordConsistentHash(words, blocklist, dayIdx, langCode) {
  const dayH = dayHash(dayIdx, langCode);
  const candidates = [];
  for (const word of words) {
    if (!blocklist.has(word)) {
      candidates.push([wordHash(word, langCode), word]);
    }
  }
  if (candidates.length === 0) {
    return words[0] || "";
  }
  candidates.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  for (const [wh, word] of candidates) {
    if (wh >= dayH) return word;
  }
  return candidates[0][1];
}
function getDailyWordLegacy(words, blocklist, dayIdx) {
  const listLen = words.length;
  if (blocklist.size === 0) {
    return words[dayIdx % listLen];
  }
  for (let offset = 0; offset < listLen; offset++) {
    const idx = (dayIdx + offset) % listLen;
    const word = words[idx];
    if (!blocklist.has(word)) return word;
  }
  return words[dayIdx % listLen];
}
function computeWordForDay(langCode, dayIdx) {
  const data = loadAllData();
  const wordList = data.wordLists[langCode];
  const blocklist = data.blocklists[langCode];
  const dailyWords = data.dailyWords[langCode];
  const curatedSchedule = data.curatedSchedules[langCode];
  if (dayIdx <= MIGRATION_DAY_IDX) {
    return getDailyWordLegacy(wordList, /* @__PURE__ */ new Set(), dayIdx);
  }
  const scheduleIdx = dayIdx - MIGRATION_DAY_IDX - 1;
  if (curatedSchedule && scheduleIdx < curatedSchedule.length) {
    return curatedSchedule[scheduleIdx];
  }
  if (dailyWords) {
    return getDailyWordConsistentHash(dailyWords, /* @__PURE__ */ new Set(), dayIdx, langCode);
  }
  return getDailyWordConsistentHash(wordList, blocklist, dayIdx, langCode);
}
function getWordForDay(langCode, dayIdx) {
  const cachePath = join(WORD_HISTORY_DIR, langCode, `${dayIdx}.txt`);
  if (existsSync(cachePath)) {
    try {
      const cached = readFileSync(cachePath, "utf-8").trim();
      if (cached) return cached;
    } catch {
    }
  }
  const word = computeWordForDay(langCode, dayIdx);
  const todaysIdx = getTodaysIdx();
  if (dayIdx <= todaysIdx) {
    const langDir = join(WORD_HISTORY_DIR, langCode);
    mkdirSync(langDir, { recursive: true });
    const tmpPath = cachePath + ".tmp";
    try {
      writeFileSync(tmpPath, word, "utf-8");
      const { renameSync } = require("fs");
      renameSync(tmpPath, cachePath);
    } catch {
    }
  }
  return word;
}

function buildLanguageSession(langCode, requestedLayout) {
  const data = loadAllData();
  const config = data.configs[langCode];
  const wordList = data.wordLists[langCode];
  const wordListSupplement = data.supplements[langCode];
  const timezone = config.timezone || "UTC";
  let timezoneOffset = 0;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset"
    });
    const parts = formatter.formatToParts(/* @__PURE__ */ new Date());
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    if (tzPart) {
      const match = tzPart.value.match(/GMT([+-]?\d+(?::(\d+))?)?/);
      if (match) {
        const hours = parseInt(match[1] || "0", 10);
        const minutes = parseInt(match[2] || "0", 10);
        timezoneOffset = hours + (hours >= 0 ? minutes : -minutes) / 60;
      }
    }
  } catch {
    timezoneOffset = 0;
  }
  const todaysIdx = getTodaysIdx(timezone);
  const dailyWord = getWordForDay(langCode, todaysIdx);
  const usedChars = /* @__PURE__ */ new Set();
  for (const word of wordList) {
    for (const char of word) usedChars.add(char);
  }
  const characters = data.characters[langCode].filter((c) => usedChars.has(c));
  const keyboardConfig = data.keyboards[langCode] || { default: null, layouts: {} };
  const keyboardLayouts = buildKeyboardLayouts(keyboardConfig, characters);
  const keyboardLayoutName = selectKeyboardLayout(
    keyboardLayouts,
    requestedLayout || null,
    keyboardConfig.default
  );
  const layoutMeta = keyboardLayouts[keyboardLayoutName];
  const keyboard = layoutMeta.rows;
  const keyboardLayoutLabel = layoutMeta.label;
  const keyDiacriticHints = buildKeyDiacriticHints(config, keyboard);
  return {
    languageCode: langCode,
    config,
    wordList,
    wordListSupplement,
    characters,
    dailyWord,
    todaysIdx,
    timezoneOffset,
    keyboard,
    keyboardLayouts,
    keyboardLayoutName,
    keyboardLayoutLabel,
    keyDiacriticHints
  };
}
function buildKeyboardLayouts(keyboardConfig, characters) {
  const layouts = {};
  for (const [name, meta] of Object.entries(keyboardConfig.layouts)) {
    layouts[name] = {
      label: meta.label || name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      rows: meta.rows || []
    };
  }
  if (Object.keys(layouts).length === 0) {
    layouts["alphabetical"] = {
      label: "Alphabetical",
      rows: generateAlphabeticalKeyboard(characters)
    };
  }
  return layouts;
}
function selectKeyboardLayout(layouts, requested, defaultLayout) {
  if (requested && requested in layouts) return requested;
  if (defaultLayout && defaultLayout in layouts) return defaultLayout;
  return Object.keys(layouts)[0];
}
function generateAlphabeticalKeyboard(characters) {
  const keyboard = [];
  for (let i = 0; i < characters.length; i++) {
    if (i % 10 === 0) keyboard.push([]);
    keyboard[keyboard.length - 1].push(characters[i]);
  }
  if (keyboard.length === 0) return keyboard;
  keyboard[keyboard.length - 1].splice(0, 0, "\u21E8");
  keyboard[keyboard.length - 1].push("\u232B");
  if (keyboard.length >= 2 && keyboard[keyboard.length - 1].length === 11) {
    const popped = keyboard[keyboard.length - 1].splice(1, 1)[0];
    keyboard[keyboard.length - 2].splice(-1, 0, popped);
  }
  if (keyboard.length >= 3 && keyboard[keyboard.length - 1].length === 12) {
    const popped1 = keyboard[keyboard.length - 2].splice(0, 1)[0];
    keyboard[keyboard.length - 3].splice(-1, 0, popped1);
    const popped2 = keyboard[keyboard.length - 1].splice(2, 1)[0];
    keyboard[keyboard.length - 2].splice(-1, 0, popped2);
    const popped3 = keyboard[keyboard.length - 1].splice(2, 1)[0];
    keyboard[keyboard.length - 2].splice(-1, 0, popped3);
  }
  return keyboard;
}
function buildKeyDiacriticHints(config, keyboard) {
  const diacriticMap = config.diacritic_map;
  if (!diacriticMap) return {};
  const keyboardKeys = /* @__PURE__ */ new Set();
  for (const row of keyboard) {
    for (const key of row) keyboardKeys.add(key.toLowerCase());
  }
  const hints = {};
  for (const [baseChar, variants] of Object.entries(diacriticMap)) {
    if (keyboardKeys.has(baseChar.toLowerCase())) {
      const numVariants = variants.length;
      let hintStr = variants.slice(0, 5).join("");
      if (numVariants > 5) hintStr += "\u2026";
      hints[baseChar.toLowerCase()] = {
        text: hintStr,
        above: numVariants >= 4
      };
    }
  }
  return hints;
}

const data_get = defineEventHandler((event) => {
  const lang = getRouterParam(event, "lang");
  const data = loadAllData();
  if (!data.languageCodes.includes(lang)) {
    throw createError({ statusCode: 404, message: "Unknown language" });
  }
  const query = getQuery$1(event);
  const layout = query.layout || void 0;
  const session = buildLanguageSession(lang, layout);
  return {
    word_list: session.wordList,
    word_list_supplement: session.wordListSupplement,
    characters: session.characters,
    config: session.config,
    todays_idx: session.todaysIdx,
    todays_word: session.dailyWord,
    timezone_offset: session.timezoneOffset,
    keyboard: session.keyboard,
    keyboard_layouts: session.keyboardLayouts,
    keyboard_layout_name: session.keyboardLayoutName,
    key_diacritic_hints: session.keyDiacriticHints
  };
});

const data_get$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: data_get
}, Symbol.toStringTag, { value: 'Module' }));

const NEGATIVE_CACHE_TTL = 24 * 3600;
function resolveDefinitionsDir() {
  const candidates = [
    resolve(process.cwd(), "..", "webapp", "data", "definitions"),
    resolve(process.cwd(), "webapp", "data", "definitions")
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
}
const DEFINITIONS_DIR = resolveDefinitionsDir();
const _kaikkiCache = {};
function loadKaikkiFile(cacheKey, filePath) {
  if (_kaikkiCache[cacheKey]) return _kaikkiCache[cacheKey];
  if (existsSync(filePath)) {
    try {
      _kaikkiCache[cacheKey] = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch {
      _kaikkiCache[cacheKey] = {};
    }
  } else {
    _kaikkiCache[cacheKey] = {};
  }
  return _kaikkiCache[cacheKey];
}
function lookupKaikki(word, langCode, variant) {
  const cacheKey = variant === "native" ? `${langCode}_native` : `${langCode}_en`;
  const fileName = variant === "native" ? `${langCode}.json` : `${langCode}_en.json`;
  const source = variant === "native" ? "kaikki" : "kaikki-en";
  const defs = loadKaikkiFile(cacheKey, join(DEFINITIONS_DIR, fileName));
  const definition = defs[word.toLowerCase()];
  if (definition) {
    return {
      definition,
      part_of_speech: null,
      source,
      url: wiktionaryUrl(word, langCode)
    };
  }
  return null;
}
const WIKT_LANG_MAP = {
  nb: "no",
  nn: "no",
  hyw: "hy",
  ckb: "ku"
};
function wiktionaryUrl(word, langCode) {
  const wiktLang = WIKT_LANG_MAP[langCode] || langCode;
  return `https://${wiktLang}.wiktionary.org/wiki/${encodeURIComponent(word)}`;
}
const LLM_LANG_NAMES = {
  en: "English",
  fi: "Finnish",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  sv: "Swedish",
  nb: "Norwegian Bokm\xE5l",
  nn: "Norwegian Nynorsk",
  da: "Danish",
  pl: "Polish",
  ru: "Russian",
  uk: "Ukrainian",
  bg: "Bulgarian",
  hr: "Croatian",
  sr: "Serbian",
  sl: "Slovenian",
  cs: "Czech",
  sk: "Slovak",
  ro: "Romanian",
  hu: "Hungarian",
  tr: "Turkish",
  az: "Azerbaijani",
  et: "Estonian",
  lt: "Lithuanian",
  lv: "Latvian",
  el: "Greek",
  ka: "Georgian",
  hy: "Armenian",
  he: "Hebrew",
  ar: "Arabic",
  fa: "Persian",
  vi: "Vietnamese",
  id: "Indonesian",
  ms: "Malay",
  ca: "Catalan",
  gl: "Galician",
  eu: "Basque",
  br: "Breton",
  oc: "Occitan",
  la: "Latin",
  ko: "Korean",
  sq: "Albanian",
  mk: "Macedonian",
  is: "Icelandic",
  ga: "Irish",
  cy: "Welsh",
  mt: "Maltese",
  hyw: "Western Armenian",
  ckb: "Central Kurdish",
  pau: "Palauan",
  ie: "Interlingue",
  rw: "Kinyarwanda",
  tlh: "Klingon",
  qya: "Quenya"
};
const LLM_MODEL = "gpt-5.2";
async function callLlmDefinition(word, langCode) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const langName = LLM_LANG_NAMES[langCode];
  if (!langName) return null;
  const isEnglish = langCode === "en";
  const nativeInstruction = isEnglish ? "same as definition_en" : `a short definition in ${langName} (1 sentence, max 150 chars)`;
  const userPrompt = `Define the ${langName} word "${word}".

This is a common word from a daily word game. Give the MOST COMMON everyday meaning, not archaic or rare senses.

Return JSON:
{
  "definition_native": "${nativeInstruction}",
  "definition_en": "a short definition in English (1 sentence, max 150 chars)",
  "part_of_speech": "noun/verb/adjective/adverb/other (lowercase English)",
  "confidence": 0.0-1.0
}

If you don't recognize this word in ${langName}, return all fields as null with confidence 0.0.`;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a multilingual dictionary. Return valid JSON only."
          },
          { role: "user", content: userPrompt }
        ],
        max_completion_tokens: 200,
        temperature: 0,
        response_format: { type: "json_object" }
      }),
      signal: AbortSignal.timeout(15e3)
    });
    const data = await response.json();
    const text = data.choices[0].message.content.trim();
    const result = JSON.parse(text);
    const confidence = result.confidence || 0;
    const definitionEn = result.definition_en;
    const definitionNative = result.definition_native;
    if (!definitionEn || confidence < 0.3) {
      console.log(
        `[LLM LOW] ${langCode}/${word}: confidence=${confidence}, def_en=${definitionEn}`
      );
      return null;
    }
    const defEn = definitionEn.slice(0, 300);
    const defNative = (definitionNative || definitionEn).slice(0, 300);
    const wiktUrl = wiktionaryUrl(word, langCode);
    return {
      definition_native: defNative,
      definition_en: defEn,
      definition: defEn,
      // backward compat
      confidence,
      part_of_speech: result.part_of_speech,
      source: "llm",
      url: wiktUrl,
      wiktionary_url: wiktUrl
    };
  } catch (e) {
    console.warn(`[LLM ERROR] ${langCode}/${word}: ${e.message || e}`);
    return null;
  }
}
async function fetchDefinition(word, langCode, options = {}) {
  const cacheDir = WORD_DEFS_DIR;
  const langCacheDir = join(cacheDir, langCode);
  const cachePath = join(langCacheDir, `${word.toLowerCase()}.json`);
  if (existsSync(cachePath)) {
    try {
      const loaded = JSON.parse(readFileSync(cachePath, "utf-8"));
      if (loaded.not_found) {
        if (!options.skipNegativeCache) {
          const cachedTs = loaded.ts || 0;
          if (Date.now() / 1e3 - cachedTs < NEGATIVE_CACHE_TTL) {
            return null;
          }
        }
      } else if (loaded && Object.keys(loaded).length > 0) {
        return loaded;
      }
    } catch {
    }
  }
  let result = await callLlmDefinition(word, langCode);
  if (!result) {
    result = lookupKaikki(word, langCode, "native") || lookupKaikki(word, langCode, "en");
  }
  try {
    mkdirSync(langCacheDir, { recursive: true });
    writeFileSync(
      cachePath,
      JSON.stringify(
        result || { not_found: true, ts: Math.floor(Date.now() / 1e3) }
      ),
      "utf-8"
    );
  } catch {
  }
  return result;
}

const _word__get$2 = defineEventHandler(async (event) => {
  const lang = getRouterParam(event, "lang");
  const word = getRouterParam(event, "word");
  const data = loadAllData();
  if (!data.languageCodes.includes(lang)) {
    throw createError({ statusCode: 404, message: "Unknown language" });
  }
  const wordLower = word.toLowerCase();
  const allWords = /* @__PURE__ */ new Set([
    ...data.wordLists[lang],
    ...data.supplements[lang]
  ]);
  if (!allWords.has(wordLower)) {
    throw createError({ statusCode: 404, message: "Unknown word" });
  }
  const query = getQuery$1(event);
  const skipCache = query.refresh === "1";
  const result = await fetchDefinition(wordLower, lang, {
    skipNegativeCache: skipCache
  });
  if (result) return result;
  throw createError({ statusCode: 404, message: "No definition found" });
});

const _word__get$3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: _word__get$2
}, Symbol.toStringTag, { value: 'Module' }));

const LANGUAGE_POPULARITY$1 = [
  "fi",
  "en",
  "ar",
  "tr",
  "hr",
  "bg",
  "de",
  "he",
  "sv",
  "ru",
  "hu",
  "es",
  "et",
  "da",
  "sr",
  "ro",
  "ca",
  "sk",
  "it",
  "az",
  "fr",
  "lv",
  "la",
  "gl",
  "mk",
  "uk",
  "pt",
  "vi",
  "pl",
  "hy"
];
const IMAGE_LANGUAGES = new Set(LANGUAGE_POPULARITY$1);
const IMAGE_MIN_DAY_IDX = 1708;
const _word__get = defineEventHandler(async (event) => {
  var _a;
  const lang = getRouterParam(event, "lang");
  const word = getRouterParam(event, "word");
  const data = loadAllData();
  if (!data.languageCodes.includes(lang)) {
    throw createError({ statusCode: 404, message: "Not found" });
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw createError({ statusCode: 404, message: "Not available" });
  }
  const cacheDir = join(WORD_IMAGES_DIR, lang);
  const cachePath = join(cacheDir, `${word.toLowerCase()}.webp`);
  if (existsSync(cachePath)) {
    setResponseHeader(event, "Content-Type", "image/webp");
    setResponseHeader(event, "Cache-Control", "public, max-age=31536000");
    return readFileSync(cachePath);
  }
  if (!IMAGE_LANGUAGES.has(lang)) {
    throw createError({ statusCode: 404, message: "Image not available for this language" });
  }
  const tz = data.configs[lang].timezone || "UTC";
  const todaysIdx = getTodaysIdx(tz);
  const query = getQuery$1(event);
  let dayIdx = query.day_idx ? parseInt(query.day_idx, 10) : todaysIdx;
  if (dayIdx < 1 || dayIdx > todaysIdx) {
    throw createError({ statusCode: 403, message: "Invalid day index" });
  }
  const expectedWord = getWordForDay(lang, dayIdx);
  if (word.toLowerCase() !== expectedWord.toLowerCase()) {
    throw createError({ statusCode: 403, message: "Not a valid daily word" });
  }
  if (dayIdx < IMAGE_MIN_DAY_IDX) {
    throw createError({ statusCode: 404, message: "Image not available for historical words" });
  }
  const pendingPath = cachePath + ".pending";
  if (existsSync(pendingPath)) {
    setResponseStatus(event, 202);
    return "Image being generated";
  }
  try {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(pendingPath, "", { flag: "wx" });
  } catch {
    setResponseStatus(event, 202);
    return "Image being generated";
  }
  try {
    let definitionHint = "";
    const defn = await fetchDefinition(word, lang);
    if (defn) {
      const enDef = defn.definition_en || defn.definition || "";
      if (enDef) definitionHint = `, which means ${enDef}`;
    }
    const prompt = `A painterly illustration representing the concept of ${word}${definitionHint}. No text, no letters, no words, no UI elements.`;
    const { default: OpenAI } = await import('file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/openai@5.23.2_ws@8.19.0/node_modules/openai/index.mjs');
    const client = new OpenAI({ apiKey: openaiKey });
    const response = await client.images.generate({
      model: "dall-e-3",
      prompt,
      size: "1024x1024",
      quality: "standard",
      n: 1
    });
    const imageUrl = (_a = response.data[0]) == null ? void 0 : _a.url;
    if (!(imageUrl == null ? void 0 : imageUrl.startsWith("https://"))) {
      throw createError({ statusCode: 404, message: "Image generation failed" });
    }
    const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(3e4) });
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const sharp = (await import('file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js')).default;
    const webpBuffer = await sharp(imageBuffer).webp({ quality: 80 }).toBuffer();
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cachePath, webpBuffer);
    setResponseHeader(event, "Content-Type", "image/webp");
    setResponseHeader(event, "Cache-Control", "public, max-age=31536000");
    return webpBuffer;
  } catch (e) {
    console.error(`[word-image] Failed for ${lang}/${word}: ${e.message}`);
    throw createError({ statusCode: 404, message: "Image generation failed" });
  } finally {
    if (existsSync(pendingPath)) {
      try {
        unlinkSync(pendingPath);
      } catch {
      }
    }
  }
});

const _word__get$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: _word__get
}, Symbol.toStringTag, { value: 'Module' }));

const STATS_MAX_IPS = 5e4;
const _statsSeenIps = /* @__PURE__ */ new Set();
let _statsSeenDay = null;
function loadWordStats(langCode, dayIdx) {
  const statsPath = join(WORD_STATS_DIR, langCode, `${dayIdx}.json`);
  if (!existsSync(statsPath)) return null;
  try {
    return JSON.parse(readFileSync(statsPath, "utf-8"));
  } catch {
    return null;
  }
}
async function updateWordStats(langCode, dayIdx, won, attempts) {
  const statsDir = join(WORD_STATS_DIR, langCode);
  const statsPath = join(statsDir, `${dayIdx}.json`);
  mkdirSync(statsDir, { recursive: true });
  let lockfile;
  try {
    lockfile = await import('file:///home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/proper-lockfile@4.1.2/node_modules/proper-lockfile/index.js');
  } catch {
    _writeStats(statsPath, won, attempts);
    return;
  }
  if (!existsSync(statsPath)) {
    writeFileSync(statsPath, "{}", "utf-8");
  }
  let release;
  try {
    release = await lockfile.lock(statsPath, {
      stale: 1e4,
      retries: 0
    });
  } catch {
    return;
  }
  try {
    _writeStats(statsPath, won, attempts);
  } finally {
    if (release) await release();
  }
}
function _writeStats(statsPath, won, attempts) {
  let stats;
  try {
    if (existsSync(statsPath)) {
      const raw = readFileSync(statsPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.total) {
        stats = parsed;
      } else {
        stats = newStats();
      }
    } else {
      stats = newStats();
    }
  } catch {
    stats = newStats();
  }
  stats.total += 1;
  if (won) {
    stats.wins += 1;
    if (typeof attempts === "number" && attempts >= 1 && attempts <= 6) {
      stats.distribution[String(attempts)] = (stats.distribution[String(attempts)] || 0) + 1;
    }
  } else {
    stats.losses += 1;
  }
  writeFileSync(statsPath, JSON.stringify(stats), "utf-8");
}
function newStats() {
  return {
    total: 0,
    wins: 0,
    losses: 0,
    distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 }
  };
}
function isDuplicateSubmission(langCode, dayIdx, clientId, todaysIdx) {
  if (_statsSeenDay !== todaysIdx) {
    _statsSeenIps.clear();
    _statsSeenDay = todaysIdx;
  }
  const dedupKey = `${langCode}:${dayIdx}:${clientId.slice(0, 64)}`;
  if (_statsSeenIps.has(dedupKey)) return true;
  if (_statsSeenIps.size < STATS_MAX_IPS) {
    _statsSeenIps.add(dedupKey);
  }
  return false;
}

const wordStats_post = defineEventHandler(async (event) => {
  var _a, _b;
  const lang = getRouterParam(event, "lang");
  const data = loadAllData();
  if (!data.languageCodes.includes(lang)) {
    throw createError({ statusCode: 404, message: "Not found" });
  }
  const body = await readBody(event);
  if (!body) {
    throw createError({ statusCode: 400, message: "Missing body" });
  }
  const { day_idx, attempts, won } = body;
  if (typeof day_idx !== "number" || typeof won !== "boolean") {
    throw createError({ statusCode: 400, message: "Invalid data" });
  }
  const tz = data.configs[lang].timezone || "UTC";
  const todaysIdx = getTodaysIdx(tz);
  if (day_idx !== todaysIdx) {
    throw createError({ statusCode: 403, message: "Not today" });
  }
  const clientId = body.client_id || ((_b = (_a = getRequestHeader(event, "x-forwarded-for")) == null ? void 0 : _a.split(",")[0]) == null ? void 0 : _b.trim()) || "unknown";
  if (isDuplicateSubmission(lang, day_idx, clientId, todaysIdx)) {
    const existing = loadWordStats(lang, day_idx);
    return existing || {};
  }
  try {
    await updateWordStats(lang, day_idx, won, attempts);
  } catch {
    console.warn(`[word-stats] Disk write failed for ${lang}`);
  }
  const updated = loadWordStats(lang, day_idx);
  return updated || {};
});

const wordStats_post$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: wordStats_post
}, Symbol.toStringTag, { value: 'Module' }));

const LANGUAGE_POPULARITY = [
  "fi",
  "en",
  "ar",
  "tr",
  "hr",
  "bg",
  "de",
  "he",
  "sv",
  "ru",
  "hu",
  "es",
  "et",
  "da",
  "sr",
  "ro",
  "ca",
  "sk",
  "it",
  "az",
  "fr",
  "lv",
  "la",
  "gl",
  "mk",
  "uk",
  "pt",
  "vi",
  "pl",
  "hy",
  "nb",
  "sl",
  "nl",
  "cs",
  "hyw",
  "fa",
  "eu",
  "gd",
  "ga",
  "ko",
  "ka",
  "nn",
  "is",
  "ckb",
  "el",
  "lt",
  "pau",
  "mn",
  "ia",
  "mi",
  "lb",
  "br",
  "ne",
  "eo",
  "fy",
  "nds",
  "tlh",
  "ie",
  "tk",
  "fo",
  "oc",
  "fur",
  "ltg",
  "qya",
  "rw"
];
const languages_get = defineEventHandler(() => {
  const data = loadAllData();
  return {
    languages: data.languages,
    language_codes: data.languageCodes,
    language_popularity: LANGUAGE_POPULARITY
  };
});

const languages_get$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: languages_get
}, Symbol.toStringTag, { value: 'Module' }));

let _statsCache = { data: null, ts: 0 };
const STATS_CACHE_TTL = 300;
const stats_get = defineEventHandler(() => {
  var _a, _b, _c, _d, _e;
  const now = Date.now() / 1e3;
  if (_statsCache.data && now - _statsCache.ts < STATS_CACHE_TTL) {
    return _statsCache.data;
  }
  const data = loadAllData();
  const todaysIdx = getTodaysIdx();
  const langStats = [];
  let totalWordsAll = 0;
  let totalDailyWordsAll = 0;
  let earliestStatsIdx = null;
  for (const lc of data.languageCodes) {
    const nWords = ((_a = data.wordLists[lc]) == null ? void 0 : _a.length) || 0;
    const nSupplement = ((_b = data.supplements[lc]) == null ? void 0 : _b.length) || 0;
    totalWordsAll += nWords + nSupplement;
    const daily = data.dailyWords[lc];
    const nDaily = daily ? daily.length : 0;
    const nBlocklist = ((_c = data.blocklists[lc]) == null ? void 0 : _c.size) || 0;
    const hasSchedule = !!data.curatedSchedules[lc];
    totalDailyWordsAll += nDaily || nWords;
    let langTotalPlays = 0;
    let langTotalWins = 0;
    const langDir = join(WORD_STATS_DIR, lc);
    if (existsSync(langDir)) {
      for (const fname of readdirSync(langDir)) {
        if (!fname.endsWith(".json")) continue;
        const day = parseInt(fname.slice(0, -5), 10);
        if (isNaN(day)) continue;
        try {
          const s = JSON.parse(readFileSync(join(langDir, fname), "utf-8"));
          langTotalPlays += s.total || 0;
          langTotalWins += s.wins || 0;
          if (earliestStatsIdx === null || day < earliestStatsIdx) {
            earliestStatsIdx = day;
          }
        } catch {
        }
      }
    }
    langStats.push({
      code: lc,
      name: ((_d = data.languages[lc]) == null ? void 0 : _d.language_name) || lc,
      name_native: ((_e = data.languages[lc]) == null ? void 0 : _e.language_name_native) || "",
      n_words: nWords,
      n_supplement: nSupplement,
      n_daily: nDaily,
      n_blocklist: nBlocklist,
      has_schedule: hasSchedule,
      total_plays: langTotalPlays,
      total_wins: langTotalWins,
      win_rate: langTotalPlays > 0 ? Math.round(langTotalWins / langTotalPlays * 100) : null
    });
  }
  langStats.sort((a, b) => b.n_words - a.n_words);
  const globalPlays = langStats.reduce((sum, ls) => sum + ls.total_plays, 0);
  const globalWins = langStats.reduce((sum, ls) => sum + ls.total_wins, 0);
  let statsSinceDate = null;
  if (earliestStatsIdx !== null) {
    statsSinceDate = idxToDate(earliestStatsIdx).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }
  const nCurated = langStats.filter((ls) => ls.n_daily > 0).length;
  const result = {
    lang_stats: langStats,
    total_languages: data.languageCodes.length,
    total_words: totalWordsAll,
    total_daily_words: totalDailyWordsAll,
    n_curated: nCurated,
    total_puzzles: todaysIdx * data.languageCodes.length,
    todays_idx: todaysIdx,
    global_plays: globalPlays,
    global_wins: globalWins,
    global_win_rate: globalPlays > 0 ? Math.round(globalWins / globalPlays * 100) : null,
    stats_since_date: statsSinceDate
  };
  _statsCache = { data: result, ts: now };
  return result;
});

const stats_get$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: stats_get
}, Symbol.toStringTag, { value: 'Module' }));

const llms_txt = defineEventHandler((event) => {
  const data = loadAllData();
  const langLines = [...data.languageCodes].sort().map((lc) => {
    var _a;
    return `- [${(_a = data.languages[lc]) == null ? void 0 : _a.language_name}](https://wordle.global/${lc})`;
  }).join("\n");
  setResponseHeader(event, "Content-Type", "text/plain; charset=utf-8");
  return `# Wordle Global

> Free, open-source Wordle in ${data.languageCodes.length}+ languages. A new 5-letter word to guess every day.

Play at https://wordle.global

## Languages

${langLines}

## About

- Each day has a new 5-letter word to guess in 6 tries
- Green = correct letter in correct position
- Yellow = correct letter in wrong position
- Gray = letter not in the word
- Free, no account required, works offline (PWA)
- Open source: https://github.com/Hugo0/wordle
`;
});

const llms_txt$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: llms_txt
}, Symbol.toStringTag, { value: 'Module' }));

const robots_txt = defineEventHandler((event) => {
  setResponseHeader(event, "Content-Type", "text/plain");
  return `User-agent: *
Allow: /
Disallow: /*/api/

Sitemap: https://wordle.global/sitemap.xml
`;
});

const robots_txt$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: robots_txt
}, Symbol.toStringTag, { value: 'Module' }));

const sitemapMain_xml = defineEventHandler((event) => {
  const data = loadAllData();
  const todaysIdx = getTodaysIdx();
  const base = "https://wordle.global";
  const hubTotalPages = todaysIdx > 0 ? Math.ceil(todaysIdx / 30) : 1;
  const urls = [];
  urls.push(`  <url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`);
  for (const lc of Object.keys(data.languages).sort()) {
    urls.push(
      `  <url><loc>${base}/${lc}</loc><changefreq>daily</changefreq><priority>0.9</priority></url>`
    );
  }
  for (const lc of Object.keys(data.languages).sort()) {
    for (let page = 1; page <= hubTotalPages; page++) {
      const pageParam = page > 1 ? `?page=${page}` : "";
      urls.push(
        `  <url><loc>${base}/${lc}/words${pageParam}</loc><changefreq>daily</changefreq><priority>0.5</priority></url>`
      );
    }
  }
  setResponseHeader(event, "Content-Type", "application/xml");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
});

const sitemapMain_xml$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: sitemapMain_xml
}, Symbol.toStringTag, { value: 'Module' }));

const sitemapWords__lang__xml = defineEventHandler((event) => {
  const lang = getRouterParam(event, "lang");
  const data = loadAllData();
  if (!data.languageCodes.includes(lang)) {
    throw createError({ statusCode: 404, message: "Not found" });
  }
  const todaysIdx = getTodaysIdx();
  const base = "https://wordle.global";
  const urls = [];
  for (let dIdx = todaysIdx; dIdx >= 1; dIdx--) {
    const dDate = idxToDate(dIdx).toISOString().slice(0, 10);
    const ageRatio = (todaysIdx - dIdx) / Math.max(todaysIdx, 1);
    const priority = Math.round(Math.max(0.3, 1 - ageRatio * 0.7) * 10) / 10;
    urls.push(
      `  <url><loc>${base}/${lang}/word/${dIdx}</loc><lastmod>${dDate}</lastmod><priority>${priority}</priority></url>`
    );
  }
  setResponseHeader(event, "Content-Type", "application/xml");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
});

const sitemapWords__lang__xml$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: sitemapWords__lang__xml
}, Symbol.toStringTag, { value: 'Module' }));

const sitemap_xml = defineEventHandler((event) => {
  const data = loadAllData();
  const todaysIdx = getTodaysIdx();
  const todayStr = idxToDate(todaysIdx).toISOString().slice(0, 10);
  const sortedLangs = [...data.languageCodes].sort();
  const base = "https://wordle.global";
  const sitemaps = [
    `  <sitemap><loc>${base}/sitemap-main.xml</loc><lastmod>${todayStr}</lastmod></sitemap>`,
    ...sortedLangs.map(
      (lc) => `  <sitemap><loc>${base}/sitemap-words-${lc}.xml</loc><lastmod>${todayStr}</lastmod></sitemap>`
    )
  ];
  setResponseHeader(event, "Content-Type", "application/xml");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.join("\n")}
</sitemapindex>`;
});

const sitemap_xml$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: sitemap_xml
}, Symbol.toStringTag, { value: 'Module' }));

function renderPayloadResponse(ssrContext) {
	return {
		body: encodeForwardSlashes(stringify(splitPayload(ssrContext).payload, ssrContext["~payloadReducers"])) ,
		statusCode: getResponseStatus(ssrContext.event),
		statusMessage: getResponseStatusText(ssrContext.event),
		headers: {
			"content-type": "application/json;charset=utf-8" ,
			"x-powered-by": "Nuxt"
		}
	};
}
function renderPayloadJsonScript(opts) {
	const contents = opts.data ? encodeForwardSlashes(stringify(opts.data, opts.ssrContext["~payloadReducers"])) : "";
	const payload = {
		"type": "application/json",
		"innerHTML": contents,
		"data-nuxt-data": appId,
		"data-ssr": !(opts.ssrContext.noSSR)
	};
	{
		payload.id = "__NUXT_DATA__";
	}
	if (opts.src) {
		payload["data-src"] = opts.src;
	}
	const config = uneval(opts.ssrContext.config);
	return [payload, { innerHTML: `window.__NUXT__={};window.__NUXT__.config=${config}` }];
}
/**
* Encode forward slashes as unicode escape sequences to prevent
* Google from treating them as internal links and trying to crawl them.
* @see https://github.com/nuxt/nuxt/issues/24175
*/
function encodeForwardSlashes(str) {
	return str.replaceAll("/", "\\u002F");
}
function splitPayload(ssrContext) {
	const { data, prerenderedAt, ...initial } = ssrContext.payload;
	return {
		initial: {
			...initial,
			prerenderedAt
		},
		payload: {
			data,
			prerenderedAt
		}
	};
}

const renderSSRHeadOptions = {"omitLineBreaks":false};

// @ts-expect-error private property consumed by vite-generated url helpers
globalThis.__buildAssetsURL = buildAssetsURL;
// @ts-expect-error private property consumed by vite-generated url helpers
globalThis.__publicAssetsURL = publicAssetsURL;
const HAS_APP_TELEPORTS = !!(appTeleportAttrs.id);
const APP_TELEPORT_OPEN_TAG = HAS_APP_TELEPORTS ? `<${appTeleportTag}${propsToString(appTeleportAttrs)}>` : "";
const APP_TELEPORT_CLOSE_TAG = HAS_APP_TELEPORTS ? `</${appTeleportTag}>` : "";
const PAYLOAD_URL_RE = /^[^?]*\/_payload.json(?:\?.*)?$/ ;
const PAYLOAD_FILENAME = "_payload.json" ;
const handler = defineRenderHandler(async (event) => {
	const nitroApp = useNitroApp();
	// Whether we're rendering an error page
	const ssrError = event.path.startsWith("/__nuxt_error") ? getQuery$1(event) : null;
	if (ssrError && !("__unenv__" in event.node.req)) {
		throw createError({
			status: 404,
			statusText: "Page Not Found: /__nuxt_error",
			message: "Page Not Found: /__nuxt_error"
		});
	}
	// Initialize ssr context
	const ssrContext = createSSRContext(event);
	// needed for hash hydration plugin to work
	const headEntryOptions = { mode: "server" };
	ssrContext.head.push(appHead, headEntryOptions);
	if (ssrError) {
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		const status = ssrError.status || ssrError.statusCode;
		if (status) {
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			ssrError.status = ssrError.statusCode = Number.parseInt(status);
		}
		setSSRError(ssrContext, ssrError);
	}
	// Get route options (for `ssr: false`, `isr`, `cache` and `noScripts`)
	const routeOptions = getRouteRules(event);
	// Whether we are prerendering route or using ISR/SWR caching
	const _PAYLOAD_EXTRACTION = !ssrContext.noSSR && (NUXT_RUNTIME_PAYLOAD_EXTRACTION);
	const isRenderingPayload = (_PAYLOAD_EXTRACTION || routeOptions.prerender) && PAYLOAD_URL_RE.test(ssrContext.url);
	if (isRenderingPayload) {
		const url = ssrContext.url.substring(0, ssrContext.url.lastIndexOf("/")) || "/";
		ssrContext.url = url;
		event._path = event.node.req.url = url;
	}
	if (routeOptions.ssr === false) {
		ssrContext.noSSR = true;
	}
	const payloadURL = _PAYLOAD_EXTRACTION ? joinURL(ssrContext.runtimeConfig.app.cdnURL || ssrContext.runtimeConfig.app.baseURL, ssrContext.url.replace(/\?.*$/, ""), PAYLOAD_FILENAME) + "?" + ssrContext.runtimeConfig.app.buildId : undefined;
	// Render app
	const renderer = await getRenderer(ssrContext);
	const _rendered = await renderer.renderToString(ssrContext).catch(async (error) => {
		// We use error to bypass full render if we have an early response we can make
		// TODO: remove _renderResponse in nuxt v5
		if ((ssrContext["~renderResponse"] || ssrContext._renderResponse) && error.message === "skipping render") {
			return {};
		}
		// Use explicitly thrown error in preference to subsequent rendering errors
		const _err = !ssrError && ssrContext.payload?.error || error;
		await ssrContext.nuxt?.hooks.callHook("app:error", _err);
		throw _err;
	});
	// Render inline styles
	// TODO: remove _renderResponse in nuxt v5
	const inlinedStyles = [];
	await ssrContext.nuxt?.hooks.callHook("app:rendered", {
		ssrContext,
		renderResult: _rendered
	});
	if (ssrContext["~renderResponse"] || ssrContext._renderResponse) {
		// TODO: remove _renderResponse in nuxt v5
		return ssrContext["~renderResponse"] || ssrContext._renderResponse;
	}
	// Handle errors
	if (ssrContext.payload?.error && !ssrError) {
		throw ssrContext.payload.error;
	}
	// Directly render payload routes
	if (isRenderingPayload) {
		const response = renderPayloadResponse(ssrContext);
		return response;
	}
	const NO_SCRIPTS = routeOptions.noScripts;
	// Setup head
	const { styles, scripts } = getRequestDependencies(ssrContext, renderer.rendererContext);
	// 1. Preload payloads and app manifest
	if (_PAYLOAD_EXTRACTION && !NO_SCRIPTS) {
		ssrContext.head.push({ link: [{
			rel: "preload",
			as: "fetch",
			crossorigin: "anonymous",
			href: payloadURL
		} ] }, headEntryOptions);
	}
	if (ssrContext["~preloadManifest"] && !NO_SCRIPTS) {
		ssrContext.head.push({ link: [{
			rel: "preload",
			as: "fetch",
			fetchpriority: "low",
			crossorigin: "anonymous",
			href: buildAssetsURL(`builds/meta/${ssrContext.runtimeConfig.app.buildId}.json`)
		}] }, {
			...headEntryOptions,
			tagPriority: "low"
		});
	}
	// 2. Styles
	if (inlinedStyles.length) {
		ssrContext.head.push({ style: inlinedStyles });
	}
	const link = [];
	for (const resource of Object.values(styles)) {
		// Do not add links to resources that are inlined (vite v5+)
		if ("inline" in getQuery(resource.file)) {
			continue;
		}
		// Add CSS links in <head> for CSS files
		// - in production
		// - in dev mode when not rendering an island
		link.push({
			rel: "stylesheet",
			href: renderer.rendererContext.buildAssetsURL(resource.file),
			crossorigin: ""
		});
	}
	if (link.length) {
		ssrContext.head.push({ link }, headEntryOptions);
	}
	if (!NO_SCRIPTS) {
		// 4. Resource Hints
		// Remove lazy hydrated modules from ssrContext.modules so they don't get preloaded
		// (CSS links are already added above, this only affects JS preloads)
		if (ssrContext["~lazyHydratedModules"]) {
			for (const id of ssrContext["~lazyHydratedModules"]) {
				ssrContext.modules?.delete(id);
			}
		}
		// TODO: add priorities based on Capo
		ssrContext.head.push({ link: getPreloadLinks(ssrContext, renderer.rendererContext) }, headEntryOptions);
		ssrContext.head.push({ link: getPrefetchLinks(ssrContext, renderer.rendererContext) }, headEntryOptions);
		// 5. Payloads
		ssrContext.head.push({ script: _PAYLOAD_EXTRACTION ? renderPayloadJsonScript({
			ssrContext,
			data: splitPayload(ssrContext).initial,
			src: payloadURL
		})  : renderPayloadJsonScript({
			ssrContext,
			data: ssrContext.payload
		})  }, {
			...headEntryOptions,
			tagPosition: "bodyClose",
			tagPriority: "high"
		});
	}
	// 6. Scripts
	if (!routeOptions.noScripts) {
		const tagPosition = "head";
		ssrContext.head.push({ script: Object.values(scripts).map((resource) => ({
			type: resource.module ? "module" : null,
			src: renderer.rendererContext.buildAssetsURL(resource.file),
			defer: resource.module ? null : true,
			tagPosition,
			crossorigin: ""
		})) }, headEntryOptions);
	}
	const { headTags, bodyTags, bodyTagsOpen, htmlAttrs, bodyAttrs } = await renderSSRHead(ssrContext.head, renderSSRHeadOptions);
	// Create render context
	const htmlContext = {
		htmlAttrs: htmlAttrs ? [htmlAttrs] : [],
		head: normalizeChunks([headTags]),
		bodyAttrs: bodyAttrs ? [bodyAttrs] : [],
		bodyPrepend: normalizeChunks([bodyTagsOpen, ssrContext.teleports?.body]),
		body: [replaceIslandTeleports(ssrContext, _rendered.html) , APP_TELEPORT_OPEN_TAG + (HAS_APP_TELEPORTS ? joinTags([ssrContext.teleports?.[`#${appTeleportAttrs.id}`]]) : "") + APP_TELEPORT_CLOSE_TAG],
		bodyAppend: [bodyTags]
	};
	// Allow hooking into the rendered result
	await nitroApp.hooks.callHook("render:html", htmlContext, { event });
	// Construct HTML response
	return {
		body: renderHTMLDocument(htmlContext),
		statusCode: getResponseStatus(event),
		statusMessage: getResponseStatusText(event),
		headers: {
			"content-type": "text/html;charset=utf-8",
			"x-powered-by": "Nuxt"
		}
	};
});
function normalizeChunks(chunks) {
	const result = [];
	for (const _chunk of chunks) {
		const chunk = _chunk?.trim();
		if (chunk) {
			result.push(chunk);
		}
	}
	return result;
}
function joinTags(tags) {
	return tags.join("");
}
function joinAttrs(chunks) {
	if (chunks.length === 0) {
		return "";
	}
	return " " + chunks.join(" ");
}
function renderHTMLDocument(html) {
	return "<!DOCTYPE html>" + `<html${joinAttrs(html.htmlAttrs)}>` + `<head>${joinTags(html.head)}</head>` + `<body${joinAttrs(html.bodyAttrs)}>${joinTags(html.bodyPrepend)}${joinTags(html.body)}${joinTags(html.bodyAppend)}</body>` + "</html>";
}

const renderer = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: handler
}, Symbol.toStringTag, { value: 'Module' }));
//# sourceMappingURL=index.mjs.map
