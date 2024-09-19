const joi = require('joi');

// User creation schema
const createUserSchema = joi.object({
    username: joi.string().min(4),
    email: joi.string().email().required(),
    password: joi.string().min(6).required(),
    confirm_password: joi.ref('password'),
});

// User login schema
const loginUserSchema = joi.object({
    email: joi.string().required(),
    password: joi.string().min(6).required(),
});

// Customer schema validation
const customerSchema = joi.object({
    product: joi.string().required(),
    quantity: joi.number().integer().required(),
    number_to_receive: joi.string().required(),
    number_to_pay: joi.string().required()
});

// Stock schema validation
const stockSchema = joi.object({
    product: joi.string().required(),
    price: joi.number().required(),
    quantity: joi.number().integer().required(),
    date: joi.date().default(Date.now),
});

module.exports = {
    loginUserSchema,
    createUserSchema,
    customerSchema,
    stockSchema
};