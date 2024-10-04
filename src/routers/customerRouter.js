const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
const axios = require("axios");
dotenv.config();

// Import models
const Stock = require('../model/stockModel');
const Customer = require('../model/customerModel');

// Flutterwave API setup
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;

// Africa's Talking setup
const AfricasTalking = require("africastalking");
const africastalking = AfricasTalking({
  apiKey: process.env.API_KEY,
  username: process.env.USERNAME
});

const sms = africastalking.SMS;
const ussd = africastalking.USSD;

// Helper function to send SMS
async function sendSMS(to, message) {
  try {
    const result = await sms.send({ to, message });
    console.log('SMS sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
}

// Create a new transaction and initiate USSD payment (POST)
router.post("/transaction", async (req, res) => {
  console.log('Received transaction request:', req.body);

  const { product, quantity, number_to_receive } = req.body;

  if (!product || !quantity || !number_to_receive) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields"
    });
  }

  try {
    // Check if the product exists in stock and has enough quantity
    const stockItem = await Stock.findOne({ product });
    if (!stockItem || stockItem.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for product ${product}`
      });
    }

    const totalAmount = stockItem.price * quantity;

    // Create a new customer transaction
    const newCustomer = new Customer({
      product,
      quantity,
      number_to_receive,
      total_amount: totalAmount,
      status: 'pending'
    });
    await newCustomer.save();

    // Send product details and total amount via SMS
    const message = `You are about to buy ${quantity} ${product} for a total of ${totalAmount} RWF. To proceed, dial *123# and follow the prompts.`;
    await sendSMS(number_to_receive, message);

    res.status(200).json({
      success: true,
      message: "Transaction initiated. Customer has been notified via SMS.",
      transaction: newCustomer
    });

  } catch (error) {
    console.error('Transaction error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// USSD Payment using Flutterwave (POST)
router.post("/ussd-payment", async (req, res) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body;

  let response = '';

  try {
    const textArray = text.split('*');
    const level = textArray.length;

    if (level === 1) {
      // First level: Show pending transaction
      const pendingTransaction = await Customer.findOne({ number_to_receive: phoneNumber, status: 'pending' });
      if (!pendingTransaction) {
        response = 'END No pending transaction found.';
      } else {
        response = `CON You have a pending purchase of ${pendingTransaction.quantity} ${pendingTransaction.product} for ${pendingTransaction.total_amount} RWF.\n1. Proceed with payment\n2. Cancel transaction`;
      }
    } else if (level === 2) {
      if (text === '1') {
        // User wants to proceed with payment
        response = 'CON Please enter your Mobile Money PIN:';
      } else if (text === '2') {
        // User wants to cancel the transaction
        await Customer.findOneAndUpdate({ number_to_receive: phoneNumber, status: 'pending' }, { status: 'cancelled' });
        response = 'END Transaction cancelled.';
      } else {
        response = 'END Invalid option selected.';
      }
    } else if (level === 3) {
      // Process payment with Flutterwave
      const pendingTransaction = await Customer.findOne({ number_to_receive: phoneNumber, status: 'pending' });
      if (!pendingTransaction) {
        response = 'END No pending transaction found.';
      } else {
        const paymentData = {
          tx_ref: `TX-${Date.now()}`,
          amount: pendingTransaction.total_amount,
          currency: "RWF",
          payment_type: "mobilemoneyrwanda",
          customer: {
            phone_number: phoneNumber
          }
        };

        const headers = {
          Authorization: `Bearer ${FLW_SECRET_KEY}`,
          "Content-Type": "application/json"
        };

        try {
          const flutterwaveResponse = await axios.post('https://api.flutterwave.com/v3/charges?type=mobile_money_rwanda', paymentData, { headers });

          if (flutterwaveResponse.data.status === 'success') {
            // Update transaction status
            await Customer.findByIdAndUpdate(pendingTransaction._id, { status: 'completed' });

            // Reduce stock quantity for the same product name
            const updatedStock = await Stock.findOneAndUpdate(
              { product: pendingTransaction.product },
              { $inc: { quantity: -pendingTransaction.quantity } },
              { new: true }
            );

            if (!updatedStock) {
              console.error(`Failed to update stock for product: ${pendingTransaction.product}`);
              // You might want to handle this error case appropriately
            }

            // Send thank you SMS
            await sendSMS(phoneNumber, "Thank you for using Relax pay");

            response = 'END Payment successful. Thank you for using Relax pay.';
          } else {
            response = 'END Payment failed. Please try again later.';
          }
        } catch (error) {
          console.error('Flutterwave payment error:', error);
          response = 'END An error occurred during payment. Please try again later.';
        }
      }
    }

    // Send the response back to the USSD gateway
    res.set('Content-Type', 'text/plain');
    res.send(response);

  } catch (error) {
    console.error('USSD error:', error);
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

module.exports = router;