const mongoose = require("mongoose")

const ConnectMongoDB = async () => {
    await mongoose.connect(process.env.DB_URL)
    console.log('connected to database')
}

module.exports = ConnectMongoDB;