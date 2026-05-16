const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const nodemailer = require('nodemailer');
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

// Nodemailer Email Transporter Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'YOUR_EMAIL@gmail.com', // 🚨 Yahan apni ya mandir ki Gmail ID dalo
        pass: 'YOUR_GOOGLE_APP_PASSWORD' // 🚨 Yahan wo 16 letters ka App Password dalo bina space ke
    }
});

// Database alternative (Array)
let donationRecords = [];

// Default Route
app.get('/', (req, res) => {
    res.send('Pragat Hanuman Ji Mandir Backend Server is Running Successfully!');
});

// 1. Create Order Route (Ab ye bhakt ki details bhi temporarily save karega)
app.post('/create-order', async (req, res) => {
    try {
        const { amount, name, email, phone, gotra } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        const options = {
            amount: amount * 100, // Paise mein convert
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
        res.status(500).json({ success: false, message: "Order creation failed" });
    }
});

// 2. Payment Success aur Email Trigger Route
app.post('/api/payment/success', async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, amount, name, email, phone, gotra } = req.body;
        
        const newRecord = {
            id: razorpay_payment_id,
            orderId: razorpay_order_id,
            name: name || "अज्ञात भक्त",
            email: email || "N/A",
            phone: phone || "N/A",
            gotra: gotra || "N/A",
            amount: amount,
            date: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
            status: "Successful"
        };
        
        donationRecords.push(newRecord);

        // ---- EMAIL 1: BHAKT KE LIYE RASEED ----
        const bhaktMailOptions = {
            from: '"श्री प्रगट हनुमान जी देवस्थानम" <YOUR_EMAIL@gmail.com>',
            to: email,
            subject: 'पावन दान की रसीद - श्री प्रगट हनुमान जी देवस्थानम 🙏',
            html: `
                <div style="font-family: 'Arial', sans-serif; border: 2px solid #ff6600; padding: 20px; max-width: 600px; border-radius: 10px;">
                    <h2 style="color: #ff6600; text-align: center;">जय श्री राम | जय हनुमान</h2>
                    <p>प्रिय <b>${name}</b> जी,</p>
                    <p>श्री प्रगट हनुमान जी देवस्थानम मंदिर निर्माण/सेवा हेतु आपके द्वारा दी गई दान राशि हमें सफलतापूर्वक प्राप्त हो गई है। हनुमान जी महाराज आपकी सभी मनोकामनाएं पूर्ण करें।</p>
                    <hr style="border: 1px dashed #ff6600;">
                    <table style="width: 100%; font-size: 14px;">
                        <tr><td><b>रसीद संख्या (Payment ID):</b></td><td>${razorpay_payment_id}</td></tr>
                        <tr><td><b>दान राशि (Amount):</b></td><td>₹${amount}</td></tr>
                        <tr><td><b>दिनांक (Date):</b></td><td>${newRecord.date}</td></tr>
                        <tr><td><b>गोत्र (Gotra):</b></td><td>${newRecord.gotra}</td></tr>
                    </table>
                    <hr style="border: 1px dashed #ff6600;">
                    <p style="text-align: center; color: #ff6600; font-weight: bold;">।। हनुमान जी महाराज का आशीर्वाद आप पर सदा बना रहे ।।</p>
                </div>
            `
        };

        // ---- EMAIL 2: GURUJI KE LIYE NOTIFICATION ----
        const gurujiMailOptions = {
            from: '"Mandir Website System" <YOUR_EMAIL@gmail.com>',
            to: 'GURUJI_EMAIL@gmail.com', // 🚨 Yahan Guruji ki asli Email ID dalo
            subject: '🚨 नई दान राशि प्राप्त हुई - मंदिर वेबसाइट',
            html: `
                <div style="font-family: Arial; border: 1px solid #333; padding: 20px;">
                    <h3>प्रणाम गुरुजी, वेबसाइट पर एक नया दान प्राप्त हुआ है:</h3>
                    <p><b>भक्त का नाम:</b> ${name}</p>
                    <p><b>राशि:</b> ₹${amount}</p>
                    <p><b>ईमेल:</b> ${email}</p>
                    <p><b>मोबाइल:</b> ${phone}</p>
                    <p><b>गोत्र:</b> ${gotra}</p>
                    <p><b>समय:</b> ${newRecord.date}</p>
                </div>
            `
        };

        // Emails Send karein (Agar email fail bhi ho toh payment record kharab na ho, isliye try-catch lagaya hai)
        try {
            if(email) await transporter.sendMail(bhaktMailOptions);
            await transporter.sendMail(gurujiMailOptions);
        } catch (mailErr) {
            console.error("Email Sending Failed:", mailErr);
        }

        res.json({ success: true, message: "Payment processed and emails sent!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin Route
app.post('/api/admin/records', (req, res) => {
    const { password } = req.body;
    if (password === 'PragatHanuman@2026') {
        res.json({ success: true, records: donationRecords });
    } else {
        res.status(401).json({ success: false, message: 'गलत पासवर्ड!' });
    }
});

// Server Listen
const PORT = process.env.PORT || 5002;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});