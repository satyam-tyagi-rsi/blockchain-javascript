const express = require('express');
const bodyParser = require('body-parser');
const app = express();

const PORT = process.env.PORT || 3002;

//middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.listen(PORT, (err, result) => {
    if(!err) console.log(`Server is listening on PORT ${PORT}`);
    else throw new Error(`Error is ${err}`);
});