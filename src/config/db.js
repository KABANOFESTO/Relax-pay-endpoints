const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const dbConnect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("mongoDb connected successfully");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1)
    }
};

module.exports = { dbConnect };

