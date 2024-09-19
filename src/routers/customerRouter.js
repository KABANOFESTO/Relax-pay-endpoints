const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
dotenv.config();

// Import models
const Stock = require('../model/stockModel');
const Customer = require('../model/customerModel');

// Require the AT package
const AfricasTalking = require("africastalking");

// Initialize the SDK
const africastalking = AfricasTalking({
  apiKey: process.env.API_KEY,
  username: process.env.USERNAME
});

console.log('AfricasTalking SDK initialized:', africastalking);

// Get the payment service
const payments = africastalking.PAYMENTS;
console.log('Payments service:', payments);

if (!payments || !payments.mobileCheckout) {
  console.error('Payments service or mobileCheckout is not available');
}

// Create a new transaction and send messages (POST)
router.post("/transaction", async (req, res) => {
  console.log('Received transaction request:', req.body);
  
  const { product, quantity, number_to_receive, number_to_pay } = req.body;

  if (!product || !quantity || !number_to_receive || !number_to_pay) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields"
    });
  }

  try {
    // Check if the product exists in stock and has enough quantity
    const stockItem = await Stock.findOne({ product });
    if (!stockItem) {
      return res.status(404).json({
        success: false,
        message: `Product ${product} not found in stock`
      });
    }

    if (stockItem.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for product ${product}`
      });
    }

    // Reduce stock quantity
    stockItem.quantity -= quantity;
    await stockItem.save();

    // Create and save customer record
    const newCustomer = new Customer({
      product,
      quantity,
      number_to_receive,
      number_to_pay
    });
    await newCustomer.save();

    // Calculate total amount based on stock price and quantity
    const totalAmount = stockItem.price * quantity;

    const options = {
      productName: process.env.AT_PRODUCT_NAME,
      phoneNumber: number_to_pay,
      currencyCode: "RWF",
      amount: totalAmount,
      metadata: {
        reason: "Payment for goods"
      }
    };

    console.log('Payment options:', options);

    if (!payments || typeof payments.mobileCheckout !== 'function') {
      throw new Error('Payments service or mobileCheckout method is not available');
    }

    payments.mobileCheckout(options)
      .then(response => {
        console.log('Payment response:', response);
        res.status(201).json({
          success: true,
          transaction: newCustomer,
          stock: stockItem,
          paymentResponse: response
        });
      })
      .catch(error => {
        console.error('Payment error:', error);
        res.status(500).json({
          success: false,
          message: error.toString()
        });
      });
  } catch (error) {
    console.error('Transaction error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all transactions (GET)
router.get("/transactions", async (req, res) => {
  try {
    const transactions = await Customer.find({});
    res.status(200).json({
      success: true,
      transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create callback route for payment status
router.post("/payment-status", async (req, res) => {
  console.log('Payment status received:', req.body);
  res.status(200).json({
    status: "success",
    message: "Payment status received successfully"
  });
});

module.exports = router;