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

// Get the airtime service
const airtime = africastalking.AIRTIME;
console.log('Airtime service:', airtime);

if (!airtime) {
  console.error('Airtime service is not available');
}

// Create a new transaction and send airtime (POST)
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
    
    const newCustomer = new Customer({
      product,
      quantity,
      number_to_receive,
      number_to_pay
    });
    await newCustomer.save();

    const totalAmount = stockItem.price * quantity;

    const options = {
      recipients: [
        {
          phoneNumber: number_to_receive,
          amount: totalAmount,
          currencyCode: "RWF"
        }
      ]
    };

    console.log('Airtime options:', options);

    if (!airtime || typeof airtime.send !== 'function') {
      throw new Error('Airtime service or send method is not available');
    }

    airtime.send(options)
      .then(response => {
        console.log('Airtime response:', response);
        res.status(201).json({
          success: true,
          transaction: newCustomer,
          stock: stockItem,
          airtimeResponse: response
        });
      })
      .catch(error => {
        console.error('Airtime error:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          response: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          } : 'No response'
        });
        res.status(500).json({
          success: false,
          message: error.message,
          details: error.response ? error.response.data : 'No additional details'
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

// Airtime Status Notification endpoint
router.post("/airtime-status", async (req, res) => {
  const {
    phoneNumber,
    description,
    status,
    requestId,
    discount,
    value
  } = req.body;

  console.log('Received Airtime Status Notification:', req.body);

  try {
    // Find the customer by phone number
    const customer = await Customer.findOne({ number_to_receive: phoneNumber });
    if (customer) {
      // Update customer record with airtime status
      customer.airtimeStatus = status;
      customer.airtimeDescription = description;
      customer.airtimeRequestId = requestId;
      customer.airtimeDiscount = discount;
      customer.airtimeValue = value;
      await customer.save();
      console.log('Customer record updated with airtime status');
    } else {
      console.log('No matching customer found for phone number:', phoneNumber);
    }

    // If the status is 'Failed', you might want to refund the stock
    if (status === 'Failed') {
      const stock = await Stock.findOne({ product: customer.product });
      if (stock) {
        stock.quantity += customer.quantity;
        await stock.save();
        console.log('Stock refunded due to failed transaction');
      }
    }

    // Respond to Africa's Talking to acknowledge receipt of the notification
    res.status(200).json({ message: 'Status notification received and processed' });
  } catch (error) {
    console.error('Error processing airtime status notification:', error);
    res.status(500).json({ message: 'Error processing status notification' });
  }
});

module.exports = router;