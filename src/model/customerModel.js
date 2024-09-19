const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    product: { type: String, required: true },
    quantity: { type: Number, required: true },
    number_to_pay: { type: Number, required: true },
    number_to_receive: { type: Number, required: true }
});

module.exports = mongoose.model('Customer', customerSchema);
