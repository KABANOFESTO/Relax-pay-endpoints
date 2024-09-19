const express = require('express');
const Stock = require('../model/stockModel');

const router = express.Router();

router.post('/stock', async (req, res) => {
    try {
        const { product, price, quantity } = req.body;

        if (!product || !price || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Product, price, and quantity are required'
            });
        }

        const existingStock = await Stock.findOne({ 'product.type': product });

        if (existingStock) {
            
            existingStock.quantity = parseInt(existingStock.quantity) + parseInt(quantity);
            await existingStock.save();

            return res.status(200).json({
                success: true,
                message: 'Stock updated successfully',
                stock: existingStock
            });
        } else {
            // Create new stock if product does not exist
            const newStock = new Stock({
                product,
                price,
                quantity
            });
            await newStock.save();

            res.status(201).json({
                success: true,
                message: 'New stock created successfully',
                stock: newStock
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get all stock (GET)
router.get('/stocks', async (req, res) => {
    try {
        const stocks = await Stock.find({});
        res.status(200).json({
            success: true,
            stocks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get a single stock by ID (GET)
router.get('/stock/:id', async (req, res) => {
    try {
        const stock = await Stock.findById(req.params.id);

        if (!stock) {
            return res.status(404).json({
                success: false,
                message: 'Stock not found'
            });
        }

        res.status(200).json({
            success: true,
            stock
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update stock by ID (PUT)
router.put('/stock/:id', async (req, res) => {
    try {
        const { product, price, quantity } = req.body;

        const stock = await Stock.findById(req.params.id);

        if (!stock) {
            return res.status(404).json({
                success: false,
                message: 'Stock not found'
            });
        }

        stock.product = product || stock.product;
        stock.price = price || stock.price;
        stock.quantity = quantity || stock.quantity;

        await stock.save();

        res.status(200).json({
            success: true,
            stock
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Delete stock by ID (DELETE)
router.delete('/stock/:id', async (req, res) => {
    try {
        const stock = await Stock.findById(req.params.id);

        if (!stock) {
            return res.status(404).json({
                success: false,
                message: 'Stock not found'
            });
        }

        await stock.remove();

        res.status(200).json({
            success: true,
            message: 'Stock deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
