const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    pid: {
        type: String, 
        required: true 
    },
    name: String,
    quantity: Number,
    price: Number 
});

const ProductModel = mongoose.model("products", ProductSchema);

module.exports = ProductModel;
