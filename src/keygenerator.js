const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

const key = ec.genKeyPair('hex');
const publicKey = key.getPublic('hex');
const privateKey = key.getPrivate('hex');

console.log(`Public key is: ${publicKey}`);
console.log(`Private key is: ${privateKey}`);

const keys = ec.keyFromPrivate(privateKey);
const walletAddress = key.getPublic('hex');

module.exports.keys = keys;
module.exports.walletAddress = walletAddress;