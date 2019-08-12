const express = require('express');
const bodyParser = require('body-parser');
const rp = require('request-promise');
const currentNodePORT = process.argv[2]

console.log('Current node url is ', currentNodePORT);
const app = express();
const { Blockchain } = require('./blockchain');
const blockchain = new Blockchain();

const PORT = process.env.PORT || currentNodePORT;

//middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/blockchain', (req, res) => {
    res.json({message: 'Blockchain retrieved successfully', data: blockchain});
});

//Register node
app.post('/register-and-broadcast-node', (req, res) => {
    // var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    const hostUrl = req.body.address;
    console.log('hostURL', hostUrl);

    const promisesArray = [];
    if(blockchain.networkNodesUrl.includes(hostUrl)) {
        res.json({message: 'Already added', data: []});
    } else {
        blockchain.networkNodesUrl.push(hostUrl);
        console.log(blockchain.networkNodesUrl);
        blockchain.networkNodesUrl.forEach(node => {
            let options = {
                uri: node + '/register-node',
                method: 'POST',
                body: {
                    node: hostUrl
                },
                json: true
            };
            // console.log('options', options);
            let promise = rp(options);
            promisesArray.push(promise);
        });

        Promise.all(promisesArray).then(result => {
            const bulkOptions = {
                uri: hostUrl + '/bulk-register',
                method: 'POST',
                body: {
                    nodes: [...blockchain.networkNodesUrl, blockchain.currentNodeUrl]
                },
                json: true
            }
            console.log('options', bulkOptions);
            rp(bulkOptions).then(result => {
                res.json({message: result.message});
            });
        }).catch(err => {
            console.log(err.message);
            res.json({message: 'Does not added node'});
        });
    }
});

app.post('/register-node', (req, res) => {
    const registerNode = req.body.node;
    console.log('registerNode',registerNode);
    if(!registerNode) {
        return res.json({message: 'No node reuested for adding in network'});
    }

    if(blockchain.currentNodeUrl === registerNode || blockchain.networkNodesUrl.includes(registerNode)) {
        return res.json({message: 'Node already added'});
    }

    blockchain.networkNodesUrl.push(registerNode);
    res.json({message: 'Node added successfully in network'});
});

app.post('/bulk-register', (req, res) => {
    let bulkNodes = req.body.nodes;
    console.log('bulk nodes', bulkNodes);
    if(bulkNodes && bulkNodes.length > 0) {

        bulkNodes.forEach(node => {
            if(blockchain.currentNodeUrl !== node && !blockchain.networkNodesUrl.includes(node)) {
                blockchain.networkNodesUrl.push(node);
                console.log(blockchain.networkNodesUrl);
            }
        });
    }
    res.json({message: 'Node broadcasted and registered with network successfully'});
});

app.listen(PORT, (err, result) => {
    if(!err) console.log(`Server is listening on PORT ${PORT}`);
    else throw new Error(`Error is ${err}`);
});