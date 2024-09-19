const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    product: {
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
    number: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const Customer = mongoose.model("Customer", customerSchema);

module.exports = Customer;
