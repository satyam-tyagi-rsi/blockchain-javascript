const express = require('express');
const bodyParser = require('body-parser');
const rp = require('request-promise');
const port = process.argv[2];

console.log('Current node url is ', port);
const app = express();
const { Blockchain } = require('./blockchain');
const blockchain = new Blockchain();

const PORT = process.env.PORT || port;

//middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/blockchain', (req, res) => {
    res.json({ message: 'Blockchain retrieved successfully', data: blockchain });
});

//Register and broadcast node
app.post('/register-and-broadcast-node', (req, res) => {
    const newNodeUrl = req.body.newNodeUrl;
    const registeredNodePromises = [];

    if (!blockchain.networkNodes.includes(newNodeUrl)) blockchain.networkNodes.push(newNodeUrl);

    blockchain.networkNodes.forEach(node => {
        let requestOptions = {
            uri: node + '/register-node',
            method: 'POST',
            body: { newNodeUrl },
            json: true
        };
        console.log('dsssssssssssssss', requestOptions);
        registeredNodePromises.push(rp(requestOptions));
    });

    Promise.all(registeredNodePromises).then(() => {
        const bulkRegisterOptions = {
            uri: newNodeUrl + '/register-bulk-nodes',
            method: 'POST',
            body: {
                allNetworkNodes: [...blockchain.networkNodes, blockchain.currentNodeUrl]
            },
            json: true
        }

        return rp(bulkRegisterOptions);
    }).then(() => {
        res.json({ message: 'New node registered with network successfully' });
    });
});

//Register individual node
app.post('/register-node', (req, res) => {
    const registerNode = req.body.newNodeUrl;
    console.log('registerNode', registerNode);

    if (!blockchain.networkNodes.includes(registerNode) && blockchain.currentNodeUrl !== registerNode) {
        blockchain.networkNodes.push(registerNode);
    }

    res.json({ message: 'New node registered successfully with node' });
});

//Register bulk nodes
app.post('/register-bulk-nodes', (req, res) => {
    let registerBulkNodes = req.body.allNetworkNodes;

    registerBulkNodes.forEach(node => {
        if (!blockchain.networkNodes.includes(node) && blockchain.currentNodeUrl !== node) {
            blockchain.networkNodes.push(node);
        }
    });
    res.json({ message: 'Bulk registration successfull' });
});

app.post('/transaction-broadcast', (req, res) => {
    
});

app.listen(PORT, err => {
    if (!err) console.log(`Server is listening on PORT ${PORT}`);
    else throw new Error(`Error is ${err}`);
});