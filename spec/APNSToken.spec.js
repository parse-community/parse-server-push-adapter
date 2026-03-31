import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import APNSToken from '../src/APNSToken.js';

describe('APNSToken', () => {
  let testKeyPEM;
  let tmpDir;

  beforeAll(() => {
    // Generate a real ES256 key pair for testing
    const { privateKey } = generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });
    testKeyPEM = privateKey.export({ type: 'pkcs8', format: 'pem' });
    tmpDir = mkdtempSync(join(tmpdir(), 'apns-token-test-'));
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('rejects missing key', () => {
    expect(() => new APNSToken({ keyId: 'KEY1', teamId: 'TEAM1' }))
      .toThrowError('APNSToken requires a key (.p8 private key)');
  });

  it('rejects missing keyId', () => {
    expect(() => new APNSToken({ key: testKeyPEM, teamId: 'TEAM1' }))
      .toThrowError('APNSToken requires a keyId');
  });

  it('rejects missing teamId', () => {
    expect(() => new APNSToken({ key: testKeyPEM, keyId: 'KEY1' }))
      .toThrowError('APNSToken requires a teamId');
  });

  it('generates a valid JWT with correct structure', () => {
    const token = new APNSToken({ key: testKeyPEM, keyId: 'KEYID12345', teamId: 'TEAMID1234' });
    const jwt = token.current;

    const parts = jwt.split('.');
    expect(parts.length).toBe(3);

    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    expect(header.alg).toBe('ES256');
    expect(header.kid).toBe('KEYID12345');
    expect(header.typ).toBeUndefined();

    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    expect(claims.iss).toBe('TEAMID1234');
    expect(typeof claims.iat).toBe('number');
    expect(claims.iat).toBeCloseTo(Math.floor(Date.now() / 1000), 0);
  });

  it('caches token across calls', () => {
    const token = new APNSToken({ key: testKeyPEM, keyId: 'KEY1', teamId: 'TEAM1' });
    const jwt1 = token.current;
    const jwt2 = token.current;
    expect(jwt1).toBe(jwt2);
  });

  it('refreshes after expiry threshold', () => {
    const token = new APNSToken({ key: testKeyPEM, keyId: 'KEY1', teamId: 'TEAM1' });
    const jwt1 = token.current;

    // Simulate token being 51 minutes old
    token._tokenIssuedAt = Date.now() - (51 * 60 * 1000);

    const jwt2 = token.current;
    expect(jwt2).not.toBe(jwt1);
  });

  it('does not refresh before expiry threshold', () => {
    const token = new APNSToken({ key: testKeyPEM, keyId: 'KEY1', teamId: 'TEAM1' });
    const jwt1 = token.current;

    // Simulate token being 49 minutes old (under 50 min threshold)
    token._tokenIssuedAt = Date.now() - (49 * 60 * 1000);

    const jwt2 = token.current;
    expect(jwt2).toBe(jwt1);
  });

  it('refresh() forces token regeneration', () => {
    const token = new APNSToken({ key: testKeyPEM, keyId: 'KEY1', teamId: 'TEAM1' });
    const jwt1 = token.current;
    const jwt2 = token.refresh();
    expect(jwt2).not.toBe(jwt1);
  });

  it('accepts key as Buffer', () => {
    const token = new APNSToken({ key: Buffer.from(testKeyPEM), keyId: 'KEY1', teamId: 'TEAM1' });
    const jwt = token.current;
    expect(jwt.split('.').length).toBe(3);
  });

  it('accepts key as file path', () => {
    const keyPath = join(tmpDir, 'AuthKey_TEST.p8');
    writeFileSync(keyPath, testKeyPEM);
    const token = new APNSToken({ key: keyPath, keyId: 'KEY1', teamId: 'TEAM1' });
    const jwt = token.current;
    expect(jwt.split('.').length).toBe(3);
  });
});
