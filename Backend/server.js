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
            amount: amount * 100, // Razorpay amount paise me leta hai (e.g., ₹500 = 50000 paise)
            currency: "INR",
            receipt: `receipt_order_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);
        
        res.status(200).json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            key_id: process.env.RAZORPAY_KEY_ID // Frontend ko payment popup kholne ke liye chahiye hoga
        });

    } catch (error) {
        console.error("Razorpay Order Error:", error);
        res.status(500).json({ success: false, message: "Something went wrong while creating order" });
    }
});

// Server Listen
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Array to temporarily hold donation records (Production me database use hota hai)
let donationRecords = [];
// Jab signature match ho jaye, tab isko andar jodiye:
const newRecord = {
    id: razorpay_payment_id,
    orderId: razorpay_order_id,
    amount: req.body.amount, // Jo amount frontend se aaya
    date: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    status: "Successful"
};
donationRecords.push(newRecord);



// Admin Route with Password Protection
app.post('/api/admin/records', (req, res) => {
    const { password } = req.body;

    // Guruji ka secure password (Ise aap badal sakte hain)
    if (password === 'PragatHanuman@2026') {
        res.json({ success: true, records: donationRecords });
    } else {
        res.status(401).json({ success: false, message: 'गलत पासवर्ड! कृपया सही पासवर्ड दर्ज करें।' });
    }
});