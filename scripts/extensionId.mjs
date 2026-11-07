/**
 * Chrome extension ID from SHA-256(manifest key), first 16 bytes → 32 chars a-p.
 * @param {Buffer|Uint8Array} hash32AtLeast16
 * @returns {string}
 */
export function extensionIdFromSha256Prefix(hash32AtLeast16) {
  const m = hash32AtLeast16;
  const alphabet = 'abcdefghijklmnop';
  let id = '';
  for (let i = 0; i < 16; i += 1) {
    id += alphabet[(m[i] >> 4) & 0xf];
    id += alphabet[m[i] & 0xf];
  }
  return id;
}
