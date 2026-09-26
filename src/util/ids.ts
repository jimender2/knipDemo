let counter = 0;

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

function randomChunk(length: number): string {
  let out = '';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) {
    out += ALPHABET[byte % ALPHABET.length];
  }
  return out;
}

export function newId(): string {
  counter = (counter + 1) % 0xffff;
  return `c_${Date.now().toString(36)}${counter.toString(36).padStart(3, '0')}${randomChunk(4)}`;
}
