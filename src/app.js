const express = require('express');
const { dbConnect } = require('./config/db');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import cors
const userRoute = require('./routers/userRouter');
const customerRoute = require('./routers/customerRouter');
const stockRoute = require('./routers/stockRouter');
const resetRoute = require('./routers/resetpwdRouter');
// const { payments, sms } = require('./config/africanstalking'); 

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Connect to the database
dbConnect();

// Use CORS middleware
app.use(cors()); // Enable CORS for all routes

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Define routes
app.use("/user", userRoute);
app.use("/customer", customerRoute); // Added missing slash
app.use("/stocks", stockRoute);
app.use("/reset", resetRoute);

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
