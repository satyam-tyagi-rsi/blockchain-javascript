const express = require('express');
const bodyParser = require('body-parser');
const rp = require('request-promise');
const logger = require('morgan');
const { Blockchain } = require('./blockchain');
// const { keys, walletAddress } = require('./keygenerator');

const port = process.argv[2];
const PORT = process.env.PORT || port;
const app = express();

const blockchain = new Blockchain();

//middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(logger('dev'));

// Get blockchain
app.get(`/chain`, (req, res) => {
    res.json({ message: `Blockchain retrieved successfully`, data: blockchain });
});

//Register and broadcast node
app.post(`/register-and-broadcast-node`, (req, res) => {
    const newNodeUrl = req.body.newNodeUrl;
    const registeredNodePromises = [];

    if (blockchain.networkNodes.includes(newNodeUrl) || blockchain.currentNodeUrl === newNodeUrl) return res.json({message: 'Node cannot be addded'});

    blockchain.networkNodes.push(newNodeUrl);
    blockchain.networkNodes.forEach(node => {
        let requestOptions = {
            uri: `${node}/register-node`,
            method: `POST`,
            body: { newNodeUrl },
            json: true
        };

        registeredNodePromises.push(rp(requestOptions));
    });

    Promise.all(registeredNodePromises).then(() => {
        const bulkRegisterOptions = {
            uri: `${newNodeUrl}/register-bulk-nodes`,
            method: `POST`,
            body: {
                allNetworkNodes: [...blockchain.networkNodes, blockchain.currentNodeUrl]
            },
            json: true
        }

        return rp(bulkRegisterOptions);
    }).then(() => {
        res.json({ message: `New node registered with network successfully` });
    });
});

//Register individual node
app.post(`/register-node`, (req, res) => {
    const registerNode = req.body.newNodeUrl;

    if (!blockchain.networkNodes.includes(registerNode) && blockchain.currentNodeUrl !== registerNode) {
        blockchain.networkNodes.push(registerNode);
    }

    res.json({ message: `New node registered successfully with node` });
});

//Register bulk nodes
app.post(`/register-bulk-nodes`, (req, res) => {
    let registerBulkNodes = req.body.allNetworkNodes;

    registerBulkNodes.forEach(node => {
        if (!blockchain.networkNodes.includes(node) && blockchain.currentNodeUrl !== node) {
            blockchain.networkNodes.push(node);
        }
    });

    res.json({ message: `Bulk registration successfull` });
});

// Broadcast transaction
app.post(`/transaction-broadcast`, (req, res) => {
    const transaction = { fromAddress: req.body.fromAddress, toAddress: req.body.toAddress, amount: req.body.amount};
    const newTransaction = blockchain.createTransaction(transaction);

    const requestPromises = [];
    blockchain.networkNodes.forEach(node => {
        const requestOptions = {
            uri: `${node}/transaction`,
            method: `POST`,
            body: newTransaction,
            json: true
        }

        requestPromises.push(rp(requestOptions));
    });

    Promise.all(requestPromises).then(() => {
        res.json({message: `Transaction created and broadcasted successfully`});
    });
});

//Add broadcasted transaction
app.post(`/transaction`, (req, res) => {
    const newTransaction = req.body;
    const nextBlockNumber = blockchain.addTransaction(newTransaction);
    res.json({message: `Transaction will be added in block ${nextBlockNumber}`});
});

//Mine Block
app.post('/mine', (req, res) => {
    const minerAddress = req.body.minerAddress;
    const minedBlock = blockchain.minePendingTransactionsBlock(minerAddress);

    const requestPromises = [];
    blockchain.networkNodes.forEach(node => {
        let requestOptions = {
            uri: `${node}/receive-mined-block`,
            method: `POST`,
            body: minedBlock,
            json: true
        }

        requestPromises.push(rp(requestOptions));
    });

    Promise.all(requestPromises).then(() => {
        res.json({message: 'New Block mined and broadcasted successfully'});
    });
});

app.post(`/receive-mined-block`, (req, res) => {
    const minedBlock = req.body;
    const lastBlock = blockchain.getLatestBlock();

    if(lastBlock.hash === minedBlock.previousHash) {
        blockchain.chain.push(minedBlock);
        blockchain.pendingTransactions = [];
        res.json({message: `Mined block added and received successfully`, newBlock: minedBlock});
    } else {
        res.json({message: `Mined block rejected`, newBlock: minedBlock});
    }
});

app.get('/node-resolve', (req, res) => {
    const requestPromises = [];
    blockchain.networkNodes.forEach(node => {    
        const requestOptions = {
            uri: `${node}/chain`,
            method: `GET`,
            json: true
        }

        requestPromises.push(rp(requestOptions));
    });

    Promise.all(requestPromises).then(blockchains => {

        let newChain = generateLongestChain(blockchains, blockchain.chain.length);
        if(newChain) {
            blockchain.chain = newChain;
            res.json({message: `Node updated successfully`, data: newChain});
        } else {
            res.json({message: `Node already updated`, data: blockchain.chain});
        }
    });
});

function generateLongestChain (blockchains, maxChainLength) {
    let newChain = null;
    blockchains.forEach(blckchain => {
        if (blockchain.isChainValid(blckchain.data) && blckchain.data.chain.length > maxChainLength) {
            maxChainLength = blckchain.data.chain.length;
            newChain = blckchain.data.chain;
        }
    });

    return newChain;
}

app.listen(PORT, err => {
    if (!err) console.log(`Server is listening on PORT ${PORT}`);
    else throw new Error(`Error is ${err}`);
});