const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Array to temporarily hold donation records
let donationRecords = [];

// Default Route for checking server status
app.get('/', (req, res) => {
    res.send('Pragat Hanuman Ji Mandir Backend Server is Running Successfully!');
});

// 1. Create Order Route (Frontend se hit hoga)
app.post('/create-order', async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        const options = {
            amount: amount * 100, // Razorpay amount paise me leta hai
            currency: "INR",
            receipt: `receipt_order_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);
        
        res.status(200).json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            key_id: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error("Razorpay Order Error:", error);
        res.status(500).json({ success: false, message: "Something went wrong while creating order" });
    }
});

// 2. Webhook / Success Record Route (Future integration ke liye ya manually push karne ke liye)
app.post('/api/payment/success', (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, amount } = req.body;
        
        const newRecord = {
            id: razorpay_payment_id || `PAY_${Date.now()}`,
            orderId: razorpay_order_id || `ORD_${Date.now()}`,
            amount: amount || 0,
            date: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
            status: "Successful"
        };
        
        donationRecords.push(newRecord);
        res.json({ success: true, message: "Record added successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin Route with Password Protection
app.post('/api/admin/records', (req, res) => {
    const { password } = req.body;

    // Guruji ka secure password
    if (password === 'PragatHanuman@2026') {
        res.json({ success: true, records: donationRecords });
    } else {
        res.status(401).json({ success: false, message: 'गलत पासवर्ड! कृपया सही पासवर्ड दर्ज करें।' });
    }
});

// Server Listen
const PORT = process.env.PORT || 5002;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});