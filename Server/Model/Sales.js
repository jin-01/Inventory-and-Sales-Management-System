const mongoose = require('mongoose');

const SalesOrderSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: true
    },
    productName: String,
    quantitySold: Number,
    sellingPrice: Number,
    date: {
        type: Date,
        default: Date.now
    }
});

const SalesOrderModel = mongoose.model('salesOrders', SalesOrderSchema);

module.exports = SalesOrderModel;
