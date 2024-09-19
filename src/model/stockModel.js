const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    product: {
        type: {
            type: String,
            required: true,
        }
    },
    price: {
        type: {
            type: String,
            required: true,
        }
    },
    quantity: {
        type: {
            type: String,
            required: true,
        }
    },
    date: {
        type: Date,
        default: Date.now 
    }
});

const Stock = mongoose.model("Stock", stockSchema);

module.exports = Stock;
