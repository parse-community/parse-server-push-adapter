'use strict';
import http2 from 'node:http2';
import log from 'npmlog';

const LOG_PREFIX = 'parse-server-push-adapter APNSConnection';

const ENDPOINTS = {
  production: 'https://api.push.apple.com',
  sandbox: 'https://api.sandbox.push.apple.com',
};

const PING_INTERVAL_MS = 60 * 1000;
const DEFAULT_REQUEST_TIMEOUT_MS = 5000;
const DEFAULT_RETRY_LIMIT = 3;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

export default class APNSConnection {

  constructor({ production = false, connectionRetryLimit, requestTimeout } = {}) {
    this._endpoint = production ? ENDPOINTS.production : ENDPOINTS.sandbox;
    this._retryLimit = connectionRetryLimit ?? DEFAULT_RETRY_LIMIT;
    this._requestTimeout = requestTimeout ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this._session = null;
    this._pingInterval = null;
    this._draining = false;
    this._connectionAttempts = 0;
  }

  async send(deviceToken, headers, payload, authToken) {
    const session = this._getSession();
    const body = JSON.stringify(payload);

    const requestHeaders = {
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      'authorization': `bearer ${authToken}`,
      ...headers,
    };

    return this._request(session, requestHeaders, body);
  }

  _request(session, headers, body, retryCount = 0) {
    return new Promise((resolve, reject) => {
      let req;
      try {
        req = session.request(headers);
      } catch (err) {
        // Session may have been destroyed between _getSession and request
        if (this._session === session) {
          this._destroySession();
        }
        if (retryCount < this._retryLimit) {
          const newSession = this._getSession();
          return resolve(this._request(newSession, headers, body, retryCount + 1));
        }
        return reject(err);
      }

      let status;
      let responseData = '';
      let settled = false;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          req.close(http2.constants.NGHTTP2_CANCEL);
          resolve({ status: 0, body: { reason: 'RequestTimeout' } });
        }
      }, this._requestTimeout);

      req.on('response', (responseHeaders) => {
        status = responseHeaders[':status'];
      });

      req.on('data', (chunk) => {
        responseData += chunk;
      });

      req.on('end', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);

        let parsedBody = {};
        if (responseData) {
          try {
            parsedBody = JSON.parse(responseData);
          } catch {
            parsedBody = { reason: responseData };
          }
        }

        // Retry on retryable status codes
        if (RETRYABLE_STATUS_CODES.has(status) && retryCount < this._retryLimit) {
          const delay = this._getRetryDelay(parsedBody);
          if (delay > 0) {
            setTimeout(() => {
              resolve(this._request(session, headers, body, retryCount + 1));
            }, delay);
          } else {
            resolve(this._request(session, headers, body, retryCount + 1));
          }
          return;
        }

        resolve({ status, body: parsedBody });
      });

      req.on('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        log.error(LOG_PREFIX, 'Request error: %s', err.message);

        if (retryCount < this._retryLimit) {
          if (this._session === session) {
            this._destroySession();
          }
          const newSession = this._getSession();
          resolve(this._request(newSession, headers, body, retryCount + 1));
        } else {
          resolve({ status: 0, body: { reason: err.message } });
        }
      });

      req.write(body);
      req.end();
    });
  }

  _getRetryDelay(responseBody) {
    // Respect Retry-After if present (in seconds)
    if (responseBody && responseBody['retry-after']) {
      return parseInt(responseBody['retry-after'], 10) * 1000;
    }
    return 0;
  }

  _getSession() {
    if (this._session && !this._session.destroyed && !this._draining) {
      return this._session;
    }

    this._destroySession();

    if (this._connectionAttempts >= this._retryLimit) {
      throw new Error(`Failed to connect to APNs after ${this._retryLimit} attempts`);
    }

    this._connectionAttempts++;
    this._draining = false;

    const session = http2.connect(this._endpoint);
    this._session = session;

    session.on('goaway', () => {
      log.warn(LOG_PREFIX, 'Received GOAWAY from APNs, will reconnect on next request');
      if (this._session === session) {
        this._draining = true;
      }
    });

    session.on('error', (err) => {
      log.error(LOG_PREFIX, 'Session error: %s', err.message);
      if (this._session === session) {
        this._destroySession();
      }
    });

    session.on('close', () => {
      if (this._session === session) {
        this._session = null;
        this._stopPing();
      }
    });

    // Reset connection attempts on successful connect
    session.on('connect', () => {
      this._connectionAttempts = 0;
    });

    this._startPing();
    return session;
  }

  _startPing() {
    this._stopPing();
    this._pingInterval = setInterval(() => {
      const currentSession = this._session;
      if (currentSession && !currentSession.destroyed) {
        currentSession.ping((err) => {
          if (err) {
            log.warn(LOG_PREFIX, 'Ping failed: %s', err.message);
            if (this._session === currentSession) {
              this._destroySession();
            }
          }
        });
      }
    }, PING_INTERVAL_MS);
    // Allow the process to exit even if ping interval is active
    if (this._pingInterval.unref) {
      this._pingInterval.unref();
    }
  }

  _stopPing() {
    if (this._pingInterval) {
      clearInterval(this._pingInterval);
      this._pingInterval = null;
    }
  }

  _destroySession() {
    this._stopPing();
    if (this._session && !this._session.destroyed) {
      this._session.destroy();
    }
    this._session = null;
  }

  destroy() {
    this._destroySession();
  }
}
