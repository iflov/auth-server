import crypto from 'crypto';

const base64UrlEncode = (buffer: Buffer) => {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

export const generateAuthCode = () => {
  return base64UrlEncode(crypto.randomBytes(32));
};
