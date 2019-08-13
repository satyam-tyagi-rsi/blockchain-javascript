const SHA256 = require('crypto-js/sha256');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const currentNodeUrl = process.argv[3];

class Transaction {
    constructor(fromAddress, toAddress, amount) {
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
        this.timestamp = Date.now();
        this.transactionHash = this.calculateHash();
    }

    calculateHash() {
        return SHA256(this.fromAddress + this.toAddress + this.amount + this.timestamp).toString();
    }

    signTransaction(signingKey) {
        if(signingKey.getPublic('hex') !== this.fromAddress) {
            throw new Error('You cannot sign transactions for other wallets');
        }
        const transactionHash = this.calculateHash();
        const sign = signingKey.sign(transactionHash, 'base64');
        this.signature = sign;
    }

    isValid() {
        if(this.fromAddress === null) return true;

        if(!this.signature || this.signature.length === 0) {
            throw new Error('No signature in this transaction');
        }

        const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
        return publicKey.verify(this.calculateHash(), this.signature);
    }
}

class Block {
    constructor(transactions, previousHash = '') {
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.hash = this.calculateHash();
        this.timestamp = Date.now();
        this.nonce = 0;
    }

    calculateHash() {
        return SHA256(this.timestamp + JSON.stringify(this.transactions) + this.previousHash + this.nonce).toString();
    }

    mineBlock(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.calculateHash();
        }

        console.log(`Block Mined...${this.hash} at nounce: ${this.nonce}`);
    }

    hasValidTransaction() {
        for(const transaction of this.transactions) {
            if(!transaction.isValid()) {
                return false;
            }
        }
        
        return true;
    }

}

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 3;
        this.pendingTransactions = [];
        this.miningRewards = 100;
        this.networkNodes = [];
        this.currentNodeUrl = currentNodeUrl;
    }

    createGenesisBlock() {
        return new Block([], '0');
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    minePendingTransactionsBlock(miningRewardsAddress) {
        const rewardTransaction = new Transaction(null, miningRewardsAddress, this.miningRewards);
        console.log('rewardTransaction', rewardTransaction);
        this.pendingTransactions.push(rewardTransaction);

        let newblock = new Block(this.pendingTransactions, this.getLatestBlock().hash);
        newblock.mineBlock(this.difficulty);

        this.chain.push(newblock);
        this.pendingTransactions = [];

        return newblock;
    }

    createTransaction (transactionObject) {  
        return new Promise ((resolve, reject) => {
            const transaction = new Transaction(transactionObject.fromAddress, transactionObject.toAddress, transactionObject.amount);
            if(!transaction.fromAddress || !transaction.toAddress || !transaction.amount) {
                reject('Transaction must include from address, to address and amount');
            }
            
            this.pendingTransactions.push(transaction);
            resolve({message: 'Transaction created successfully!', data: transaction});
        });
    }

    addTransaction(transaction) {
        this.pendingTransactions.push(transaction);
        return this.chain.length + 1;
    }

    checkBalance(address) {
        let balance = 0;

        for (const block of this.chain) {
            for (const transaction of block.transactions) {
                if (transaction.fromAddress === address) {
                    balance -= transaction.amount;
                }

                if (transaction.toAddress === address) {
                    balance += transaction.amount;
                }
            }
        }
        return balance;
    }

    getAllTransactionsForWallet(walletAddress) {
        let transactionsForWallet = [];
        
        for (const block of this.chain) {
            for (const transaction of block.transactions) {
                if (transaction.fromAddress === walletAddress || transaction.toAddress === walletAddress) {
                    transactionsForWallet.push(transaction);
                }
            }
        }

        return transactionsForWallet;
    }

    isChainValid(chain) {
        console.log('chain is', chain)
        for (let i = 1; i < chain.length; i++) {
            const currentBlock = chain[i];
            const previousBlock = chain[i - 1];

            // if (!currentBlock.hasValidTransaction()) return false;

            if (currentBlock.hash !== currentBlock.calculateHash()) return false;

            if (currentBlock.previousHash !== previousBlock.hash) return false;
        }
        return true;
    }
}

module.exports.Blockchain = Blockchain;
module.exports.Transaction = Transaction;
module.exports.Block = Block;