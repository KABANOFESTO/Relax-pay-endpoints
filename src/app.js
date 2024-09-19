const express = require('express');
const { dbConnect } = require('./config/db');
const dotenv = require('dotenv');

dotenv.config();


const app = express();

const port = process.env.PORT || 4000;

dbConnect();


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})