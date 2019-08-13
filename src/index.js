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
    res.json({ message: `Blockchain retrieved successfully`, data: blockchain.chain });
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
    let transactionPromises = [];
    
    blockchain.createTransaction(transaction).then(result => {
        blockchain.networkNodes.forEach(node => {
            let requestOptions = {
                uri: `${node}/transaction`,
                method: `POST`,
                body: {transaction: result.data},
                json: true
            }

            transactionPromises.push(rp(requestOptions));
        });

        if(transactionPromises.length > 0) {
            Promise.all(transactionPromises).then(() => {
                res.json({message: 'Transaction broadcasted and created in network'});
            });
        } else {
            res.json({message: `Transaction created but not broadcasted`});
        }
    });
});

//Add broadcasted transaction
app.post(`/transaction`, (req, res) => {
    const transaction = req.body.transaction;
    const nextBlockNumber = blockchain.addTransaction(transaction);
    
    res.json({message: `Transaction will be added in Block ${nextBlockNumber}`});
});

//Mine Block
app.post('/mine-and-broadcast', (req, res) => {
    const minerAddress = req.body.minerAddress;

    const minedBlockPromises = [];

    const minedBlock = blockchain.minePendingTransactionsBlock(minerAddress);
    blockchain.networkNodes.forEach(node => {
        let requestOptions = {
            uri: `${node}/add-mined-block`,
            method: `POST`,
            body: {minedBlock},
            json: true
        }

        minedBlockPromises.push(rp(requestOptions));
    });

    if(minedBlockPromises.length > 0) {
        Promise.all(minedBlockPromises).then(() => {
            res.json({message: 'New Block mined and broadcasted on network'});
        });
    } else {
        res.json({message: `New Block mined but not broadcasted`});
    }
});

app.post(`/add-mined-block`, (req, res) => {
    const minedBlock = req.body.minedBlock;

    blockchain.chain.push(minedBlock);
    blockchain.pendingTransactions = [];

    res.json({message: `Mined block added successfully`});
});

app.get('/node-resolve', (req, res) => {
    const resolveNodePromises = [];

    blockchain.networkNodes.forEach(node => {    
        const requestOptions = {
            uri: `${node}/chain`,
            method: `GET`,
            json: true
        }

        resolveNodePromises.push(rp(requestOptions));
    });

    if(resolveNodePromises.length > 0) {
        Promise.all(resolveNodePromises).then(allNodesResult => {

            let newChain = generateLongestChain(allNodesResult, blockchain.chain.length);
            if(newChain) {
                blockchain.chain = newChain;
                res.json({message: `Node updated successfully`, data: newChain});
            } else {
                res.json({message: `Node already updated`, data: blockchain.chain});
            }
        });
    } else {
        res.json({message: `Node already updated`, data: blockchain.chain});
    }

});

function generateLongestChain (allNodesChain, maxChainLength) {
    let newChain = null;
    allNodesChain.forEach(node => { 

        if (blockchain.isChainValid(node) && node.data.length > maxChainLength) {
            maxChainLength = node.data.length;
            newChain = node.data;
        }
    });

    return newChain;
}

app.listen(PORT, err => {
    if (!err) console.log(`Server is listening on PORT ${PORT}`);
    else throw new Error(`Error is ${err}`);
});