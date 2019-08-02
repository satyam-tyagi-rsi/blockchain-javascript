const { BlockChain, Transaction } = require('./blockchain');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

//Create New chain
const myBlockChain = new BlockChain();

const myKey = ec.keyFromPrivate('a07550ce8b1fa9000a1b5825210545c4a346314a63de417d383fe04077569d8f');
const myWalletAddress = myKey.getPublic('hex');
console.log(myKey.getPrivate('hex'));

const transaction1 = new Transaction(myWalletAddress, 'public key goes here', 10);
transaction1.signTransaction(myKey);
myBlockChain.addTransaction(transaction1);

console.log('Miners start mining...........');
myBlockChain.minePendingTransactionsBlock(myWalletAddress);
console.log(`Satyam's miner balance is: ${myBlockChain.checkBalance(myWalletAddress)}`);
