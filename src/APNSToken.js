'use strict';
import { readFileSync } from 'node:fs';
import { createPrivateKey, sign } from 'node:crypto';

// Token refresh threshold: 50 minutes (Apple requires < 60 min, recommends > 20 min between refreshes)
const TOKEN_MAX_AGE_MS = 50 * 60 * 1000;

function base64url(input) {
  const str = typeof input === 'string' ? input : input.toString('base64');
  return str.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export default class APNSToken {

  constructor({ key, keyId, teamId }) {
    if (!key) {
      throw new Error('APNSToken requires a key (.p8 private key)');
    }
    if (!keyId) {
      throw new Error('APNSToken requires a keyId');
    }
    if (!teamId) {
      throw new Error('APNSToken requires a teamId');
    }

    // Load key: if it doesn't look like PEM content, treat as file path
    let keyData = key;
    if (Buffer.isBuffer(key)) {
      keyData = key.toString('utf8');
    }
    if (typeof keyData === 'string' && !keyData.includes('-----BEGIN')) {
      keyData = readFileSync(keyData, 'utf8');
    }

    this._privateKey = createPrivateKey(keyData);
    this._keyId = keyId;
    this._teamId = teamId;
    this._token = null;
    this._tokenIssuedAt = 0;
  }

  get current() {
    const now = Date.now();
    if (this._token && (now - this._tokenIssuedAt) < TOKEN_MAX_AGE_MS) {
      return this._token;
    }
    return this._generate();
  }

  refresh() {
    return this._generate();
  }

  _generate() {
    const iat = Math.floor(Date.now() / 1000);
    const header = base64url(Buffer.from(JSON.stringify({ alg: 'ES256', kid: this._keyId })));
    const claims = base64url(Buffer.from(JSON.stringify({ iss: this._teamId, iat })));
    const signingInput = `${header}.${claims}`;
    const signature = sign('sha256', Buffer.from(signingInput), { key: this._privateKey, dsaEncoding: 'ieee-p1363' });
    this._token = `${signingInput}.${base64url(signature)}`;
    this._tokenIssuedAt = Date.now();
    return this._token;
  }
}
