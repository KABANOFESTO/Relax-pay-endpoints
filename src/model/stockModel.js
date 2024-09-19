const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    product: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const Stock = mongoose.model("Stock", stockSchema);

module.exports = Stock;