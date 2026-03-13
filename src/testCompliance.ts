// Intentional test violations for Compliance Shield

const password = "demo12345";

const api_key = "test_api_key";

const hashAlgo = "MD5";

const cryptoAlgo = "DES";

const secret = "very_secret_value";

export function testFunction() {
  console.log(password, api_key, hashAlgo, cryptoAlgo, secret);
}