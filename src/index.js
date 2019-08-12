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
app.use(bodyParser.urlencoded({extended: false}));

app.get('/blockchain', (req, res) => {
    res.json({message: 'Blockchain retrieved successfully', data: blockchain});
});

//Register node
app.post('/register-and-broadcast-node', (req, res) => {
    // var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    const hostUrl = req.body.address;
    console.log('hostURL', hostUrl);

    const promisesArray = [];
    if(blockchain.networkNodes.includes(hostUrl)) {
        res.json({message: 'Already added', data: []});
    } else {
        blockchain.networkNodesUrl.push(hostUrl);
        console.log(blockchain.networkNodes);
        blockchain.networkNodes.forEach(node => {
            let options = {
                uri: node + '/register-node',
                method: 'GET',
                body: {
                    node: blockchain.currentNodeUrl
                },
                json: true
            };
            console.log('options', options);
            let promise = rp(options);
            promisesArray.push(promise);
        });

        Promise.all(promisesArray).then(result => {
            res.json({message: 'Node added and broadcasted in a network'});
        }).catch(err => {
            console.log(err);
            res.json({message: 'Does not added node'});
        });
    }
});

app.get('/register-node', (req, res) => {
    const registerNode = req.body.node;
    console.log('registerNode',registerNode);
    if(!registerNode) {
        return res.json({message: 'No node reuested for adding in network'});
    }

    if(blockchain.currentNode === registerNode || blockchain.networkNodes.includes(registerNode)) {
        return res.json({message: 'Node already added'});
    }

    blockchain.networkNodes.push(registerNode);
    res.json({message: 'Node added successfully in network'});
});

app.listen(PORT, (err, result) => {
    if(!err) console.log(`Server is listening on PORT ${PORT}`);
    else throw new Error(`Error is ${err}`);
});