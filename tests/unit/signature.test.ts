import {
  buildSignaturePayload,
  computeSignature,
  verifySignature,
} from '../../src/interfaces/http/webhook/signature';

const SECRET = 'test-webhook-secret';

describe('signature', () => {
  it('подтверждает корректную подпись', () => {
    const payload = buildSignaturePayload('1700000000', 'nonce-1', '{"a":1}');
    const sig = computeSignature(SECRET, payload);
    expect(verifySignature(SECRET, payload, sig)).toBe(true);
  });

  it('отклоняет подпись с неверным секретом', () => {
    const payload = buildSignaturePayload('1700000000', 'nonce-1', '{"a":1}');
    const sig = computeSignature('wrong-secret', payload);
    expect(verifySignature(SECRET, payload, sig)).toBe(false);
  });

  it('отклоняет подпись при изменённом теле', () => {
    const payload = buildSignaturePayload('1700000000', 'nonce-1', '{"a":1}');
    const sig = computeSignature(SECRET, payload);
    const tampered = buildSignaturePayload('1700000000', 'nonce-1', '{"a":2}');
    expect(verifySignature(SECRET, tampered, sig)).toBe(false);
  });

  it('отклоняет мусорную/пустую подпись без исключений', () => {
    const payload = buildSignaturePayload('1700000000', 'nonce-1', '{}');
    expect(verifySignature(SECRET, payload, '')).toBe(false);
    expect(verifySignature(SECRET, payload, 'zz')).toBe(false);
    expect(verifySignature(SECRET, payload, 'deadbeef')).toBe(false);
  });
});
