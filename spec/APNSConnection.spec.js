import http2 from 'node:http2';
import APNSConnection from '../src/APNSConnection.js';

describe('APNSConnection', () => {

  describe('constructor', () => {
    it('defaults to sandbox endpoint', () => {
      const conn = new APNSConnection();
      expect(conn._endpoint).toBe('https://api.sandbox.push.apple.com');
    });

    it('uses production endpoint when production is true', () => {
      const conn = new APNSConnection({ production: true });
      expect(conn._endpoint).toBe('https://api.push.apple.com');
    });

    it('uses default retry limit of 3', () => {
      const conn = new APNSConnection();
      expect(conn._retryLimit).toBe(3);
    });

    it('accepts custom retry limit', () => {
      const conn = new APNSConnection({ connectionRetryLimit: 5 });
      expect(conn._retryLimit).toBe(5);
    });

    it('uses default request timeout of 5000ms', () => {
      const conn = new APNSConnection();
      expect(conn._requestTimeout).toBe(5000);
    });

    it('accepts custom request timeout', () => {
      const conn = new APNSConnection({ requestTimeout: 10000 });
      expect(conn._requestTimeout).toBe(10000);
    });

    it('starts with no active session', () => {
      const conn = new APNSConnection();
      expect(conn._session).toBeNull();
    });
  });

  describe('send', () => {
    let conn;
    let mockSession;
    let mockRequest;

    beforeEach(() => {
      conn = new APNSConnection({ production: true });

      // Create mock request stream
      mockRequest = {
        _handlers: {},
        on(event, handler) { this._handlers[event] = handler; return this; },
        write: jasmine.createSpy('write'),
        end: jasmine.createSpy('end'),
        close: jasmine.createSpy('close'),
      };

      // Create mock session
      mockSession = {
        destroyed: false,
        _handlers: {},
        on(event, handler) { this._handlers[event] = handler; return this; },
        request: jasmine.createSpy('request').and.returnValue(mockRequest),
        ping: jasmine.createSpy('ping').and.callFake((cb) => cb(null)),
        destroy: jasmine.createSpy('destroy').and.callFake(function() { this.destroyed = true; }),
      };

      spyOn(http2, 'connect').and.returnValue(mockSession);
    });

    afterEach(() => {
      conn.destroy();
    });

    it('sends POST request with correct path and headers', async () => {
      const sendPromise = conn.send(
        'abc123',
        { 'apns-topic': 'com.example', 'apns-push-type': 'alert' },
        { aps: { alert: 'hello' } },
        'bearer-token'
      );

      // Simulate success response
      mockRequest._handlers.response({ ':status': 200 });
      mockRequest._handlers.end();

      const result = await sendPromise;

      expect(mockSession.request).toHaveBeenCalledWith({
        ':method': 'POST',
        ':path': '/3/device/abc123',
        'authorization': 'bearer bearer-token',
        'apns-topic': 'com.example',
        'apns-push-type': 'alert',
      });
      expect(mockRequest.write).toHaveBeenCalledWith('{"aps":{"alert":"hello"}}');
      expect(result.status).toBe(200);
    });

    it('parses error response body', async () => {
      const sendPromise = conn.send('abc123', {}, {}, 'token');

      mockRequest._handlers.response({ ':status': 400 });
      mockRequest._handlers.data('{"reason":"BadDeviceToken"}');
      mockRequest._handlers.end();

      const result = await sendPromise;

      expect(result.status).toBe(400);
      expect(result.body.reason).toBe('BadDeviceToken');
    });

    it('retries on 500 status code', async () => {
      const sendPromise = conn.send('abc123', {}, {}, 'token');

      // Set up second mock request BEFORE triggering the end event,
      // because the retry fires synchronously inside the end handler
      const mockRequest2 = {
        _handlers: {},
        on(event, handler) { this._handlers[event] = handler; return this; },
        write: jasmine.createSpy('write'),
        end: jasmine.createSpy('end'),
        close: jasmine.createSpy('close'),
      };
      mockSession.request.and.returnValue(mockRequest2);

      // First attempt: 500 triggers immediate retry
      mockRequest._handlers.response({ ':status': 500 });
      mockRequest._handlers.data('{"reason":"InternalServerError"}');
      mockRequest._handlers.end();

      // Second attempt responds with success
      mockRequest2._handlers.response({ ':status': 200 });
      mockRequest2._handlers.end();

      const result = await sendPromise;
      expect(result.status).toBe(200);
      expect(mockSession.request).toHaveBeenCalledTimes(2);
    });

    it('resolves with timeout on request timeout', async () => {
      conn = new APNSConnection({ production: true, requestTimeout: 50 });
      spyOn(conn, '_getSession').and.returnValue(mockSession);

      const sendPromise = conn.send('abc123', {}, {}, 'token');

      // Don't respond — let timeout fire
      const result = await sendPromise;
      expect(result.status).toBe(0);
      expect(result.body.reason).toBe('RequestTimeout');
      expect(mockRequest.close).toHaveBeenCalledWith(http2.constants.NGHTTP2_CANCEL);
    });

    it('creates session lazily on first send', async () => {
      expect(conn._session).toBeNull();

      const sendPromise = conn.send('abc123', {}, {}, 'token');
      mockRequest._handlers.response({ ':status': 200 });
      mockRequest._handlers.end();

      await sendPromise;
      expect(http2.connect).toHaveBeenCalledWith('https://api.push.apple.com');
    });

    it('reuses existing session', async () => {
      // First send
      const sendPromise1 = conn.send('abc123', {}, {}, 'token');
      mockRequest._handlers.response({ ':status': 200 });
      mockRequest._handlers.end();
      await sendPromise1;

      // Second send
      const mockRequest2 = {
        _handlers: {},
        on(event, handler) { this._handlers[event] = handler; return this; },
        write: jasmine.createSpy('write'),
        end: jasmine.createSpy('end'),
        close: jasmine.createSpy('close'),
      };
      mockSession.request.and.returnValue(mockRequest2);

      const sendPromise2 = conn.send('abc456', {}, {}, 'token');
      mockRequest2._handlers.response({ ':status': 200 });
      mockRequest2._handlers.end();
      await sendPromise2;

      // connect should only be called once
      expect(http2.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('connection lifecycle', () => {
    it('reconnects after GOAWAY on next request', async () => {
      const conn = new APNSConnection({ production: true });
      const mockRequest = {
        _handlers: {},
        on(event, handler) { this._handlers[event] = handler; return this; },
        write: jasmine.createSpy('write'),
        end: jasmine.createSpy('end'),
        close: jasmine.createSpy('close'),
      };

      const mockSession = {
        destroyed: false,
        _handlers: {},
        on(event, handler) { this._handlers[event] = handler; return this; },
        request: jasmine.createSpy('request').and.returnValue(mockRequest),
        ping: jasmine.createSpy('ping').and.callFake((cb) => cb(null)),
        destroy: jasmine.createSpy('destroy').and.callFake(function() { this.destroyed = true; }),
      };

      spyOn(http2, 'connect').and.returnValue(mockSession);

      // First request establishes session
      const sendPromise = conn.send('abc123', {}, {}, 'token');
      mockRequest._handlers.response({ ':status': 200 });
      mockRequest._handlers.end();
      await sendPromise;

      expect(http2.connect).toHaveBeenCalledTimes(1);

      // Trigger GOAWAY
      mockSession._handlers.goaway();
      expect(conn._draining).toBe(true);

      // Next request should create new session
      const mockSession2 = {
        destroyed: false,
        _handlers: {},
        on(event, handler) { this._handlers[event] = handler; return this; },
        request: jasmine.createSpy('request').and.returnValue(mockRequest),
        ping: jasmine.createSpy('ping').and.callFake((cb) => cb(null)),
        destroy: jasmine.createSpy('destroy').and.callFake(function() { this.destroyed = true; }),
      };
      http2.connect.and.returnValue(mockSession2);

      const sendPromise2 = conn.send('abc456', {}, {}, 'token');
      mockRequest._handlers.response({ ':status': 200 });
      mockRequest._handlers.end();
      await sendPromise2;

      expect(http2.connect).toHaveBeenCalledTimes(2);
      conn.destroy();
    });

    it('destroy tears down session', () => {
      const conn = new APNSConnection();
      const mockSession = {
        destroyed: false,
        _handlers: {},
        on(event, handler) { this._handlers[event] = handler; return this; },
        request: jasmine.createSpy('request'),
        ping: jasmine.createSpy('ping').and.callFake((cb) => cb(null)),
        destroy: jasmine.createSpy('destroy').and.callFake(function() { this.destroyed = true; }),
      };

      spyOn(http2, 'connect').and.returnValue(mockSession);

      // Establish session
      conn._getSession();
      expect(conn._session).not.toBeNull();

      conn.destroy();
      expect(mockSession.destroy).toHaveBeenCalled();
      expect(conn._session).toBeNull();
    });
  });
});
