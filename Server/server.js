const express = require('express')
const cors = require('cors')
const multer = require('multer');
const fs = require('fs');
const userRoutes = require("./auth/user");
const authRoutes = require("./auth/auth");

const ConnectMongoDB = require('./ConnetMongoDB/ConnectMongoDB')
const ProductModel = require('./Model/Products');
const SalesOrderModel = require('./Model/Sales');
require('dotenv').config() 
const upload = multer({ dest: 'uploads/' }); 
const app = express()

app.use(cors())
app.use(express.json())

//Connect to database
ConnectMongoDB()
//start server
app.listen(process.env.PORT, () =>{
    console.log('server started')
})

// routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    const filePath = req.file.path;

    // Check if the file is a text file
    if (req.file.mimetype !== 'text/plain') {
        fs.unlinkSync(filePath); // Remove the invalid file
        return res.status(400).json({ error: 'Invalid file type. Only .txt files are allowed.' });
    }

    // Read the uploaded file
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            fs.unlinkSync(filePath); // Clean up the uploaded file
            return res.status(500).json({ error: 'Error reading the file.' });
        }

        try {
            // Parse the file content
            const products = parseProductsFromFile(data);

            // Check for duplicates in the database
            const productIds = products.map(product => product.pid);
            ProductModel.find({ pid: { $in: productIds } })
                .then(existingProducts => {
                    const existingIds = existingProducts.map(p => p.pid);
                    const duplicates = products.filter(product => existingIds.includes(product.pid));

                    if (duplicates.length > 0) {
                        fs.unlinkSync(filePath); // Remove the file
                        return res.status(400).json({ error: `Duplicate product SKUs found: ${duplicates.map(d => d.pid).join(', ')}` });
                    }

                    // Save products to the database
                    ProductModel.insertMany(products)
                        .then(() => {
                            fs.unlinkSync(filePath); // Remove the file after processing
                            res.json({ message: 'Products uploaded and created successfully.' });
                        })
                        .catch(err => {
                            console.error(err);
                            res.status(500).json({ error: 'Error saving products to the database.' });
                        });
                })
                .catch(err => {
                    console.error(err);
                    res.status(500).json({ error: 'Error checking for duplicate products.' });
                });
        } catch (error) {
            fs.unlinkSync(filePath); // Remove the file
            return res.status(400).json({ error: error.message }); // Return the error message to the client
        }
    });
});

// Function to parse the file content into product objects
function parseProductsFromFile(data) {
    const products = [];
    const productEntries = data.split(';'); // Split by semicolon for each product

    productEntries.forEach((entry, index) => {
        // Trim the entry and skip if it's empty
        entry = entry.trim();
        if (!entry) {
            return; // Skip this iteration for empty entries
        }

        const lines = entry.split('\n'); // Split by new line
        const product = {};
        let isValid = true; // Track the validity of the current product entry

        lines.forEach(line => {
            const [key, value] = line.split(':').map(item => item.trim());
            if (key && value) {
                switch (key) {
                    case 'sku':
                        product.pid = value;
                        break;
                    case 'name':
                        product.name = value;
                        break;
                    case 'quantity':
                        product.quantity = parseInt(value, 10);
                        break;
                    case 'price':
                        product.price = parseFloat(value);
                        break;
                    default:
                        isValid = false; // Invalid key found
                        break;
                }
            } else {
                isValid = false; // Invalid line format
            }
        });

        // Validate the product data
        if (!product.pid || !product.name || isNaN(product.quantity) || isNaN(product.price) || !isValid) {
            throw new Error(`Invalid format in product entry at index ${index + 1}. Each product must include sku, name, quantity, and price in the correct format.`);
        }

        products.push(product);
    });

    return products;
}




app.post('/create', (req, res) => {
    const { pid } = req.body;

    // Check for existing product with the same pid
    ProductModel.findOne({ pid: pid })
        .then(existingProduct => {
            if (existingProduct) {
                return res.status(400).json({ error: 'Product with this SKU already exists.' });
            }

            // If no duplicate is found, create the new product
            return ProductModel.create(req.body)
                .then(product => res.json(product))
                .catch(err => res.status(500).json({ error: 'Error creating product.' }));
        })
        .catch(err => res.status(500).json({ error: 'Database query error.' }));
});


app.get('/get', (req, res) => {
    ProductModel.find()
        .then(products => res.json(products))
        .catch(err => res.json({err}));
});

app.get('/get/:pid', (req, res) => {
    const { pid } = req.params; 
    ProductModel.findOne({ pid }) 
        .then(product => {
            if (!product) {
                return res.json({ error: 'Product not found' });
            }
            res.json(product);
        })
        .catch(err => res.json({err}));
});
// Update a product by PID
app.put('/update/:pid', (req, res) => {
    const { pid } = req.params; 
    const { name, quantity, price } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (quantity !== undefined) updateData.quantity = quantity; 
    if (price !== undefined) updateData.price = price;

    ProductModel.findOneAndUpdate({ pid }, updateData, { new: true, runValidators: true }) 
        .then(updatedProduct => {
            if (!updatedProduct) {
                return res.json({ error: 'Product not found' });
            }
            res.json(updatedProduct);
        })
        .catch(err => res.json({ err }));
});


app.delete('/delete/:pid', (req, res) => {
    const { pid } = req.params;
    ProductModel.findOneAndDelete({ pid })
        .then(deletedProduct => {
            if (!deletedProduct) {
                return res.json({ error: 'Product not found' });
            }
            res.json({ message: 'Product deleted successfully', product: deletedProduct });
        })
        .catch(err => res.json({ err }));
});

// Create sales order
app.post('/salesOrder/create', async (req, res) => {
    SalesOrderModel.create(req.body)
    .then(product => res.json(product))
    .catch(err => res.json(err))
})


// Update product quantity using 'pid'
app.put('/product/updateQuantity/:pid', (req, res) => {
    const { pid } = req.params; // Get the 'pid' from the URL parameters
    const { quantity } = req.body; // Get the new quantity from the request body

    ProductModel.findOneAndUpdate(
        { pid: pid }, 
        { quantity: quantity }, 
        { new: true, runValidators: true }
    )
    .then(updatedProduct => {
        if (updatedProduct) {
            res.status(200).send('Product quantity updated');
        } else {
            res.status(404).send('Product not found');
        }
    })
    .catch(error => {
        res.status(500).send('Error updating product quantity');
    });
});

// Get all sales records
app.get('/salesOrder/getAll', (req, res) => {
    SalesOrderModel.find()
        .then(salesRecords => res.json(salesRecords))
        .catch(err => res.status(500).json({ error: 'Error fetching sales records' }));
});





