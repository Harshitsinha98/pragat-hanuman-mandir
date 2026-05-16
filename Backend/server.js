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
// 🚨 TRICK: Isko ekदम standard aur clean rakhte hain
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'sinhaharshit67@gmail.com', // 🌟 Maine aapki ID daal di hai (Agar mandir ki ho toh change kar lena)
        pass: 'plxrbywzzfgsqwja' // 🔑 Aapka naya google app password bina space ke
    }
});

let donationRecords = [];

app.get('/', (req, res) => {
    res.send('Pragat Hanuman Ji Mandir Backend Server is Running Successfully!');
});

// 1. Create Order Route
app.post('/create-order', async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }
        const options = {
            amount: amount * 100,
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

// 2. Payment Success Route (FREEZE-PROOF VERSION 🛡️)
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

        // 🌟 CRITICAL: Frontend ko TURANT response bhej do taaki PAGE FREEZE NA HO!
        res.json({ success: true, message: "Payment recorded successfully!" });

        // ---- EMAIL KA KAAM BACKGROUND MEIN HOGA (NO AWAIT, NO FREEZE) ----
        const bhaktMailOptions = {
            from: '"श्री प्रगट हनुमान जी देवस्थानम" <sinhaharshit67@gmail.com>', // Sender Email match honi chahiye
            to: email,
            subject: 'पावन दान की रसीद - श्री प्रगट हनुमान जी देवस्थानम 🙏',
            html: `
                <div style="font-family: Arial, sans-serif; border: 2px solid #ff6600; padding: 20px; max-width: 600px; border-radius: 10px;">
                    <h2 style="color: #ff6600; text-align: center;">जय श्री राम | जय हनुमान</h2>
                    <p>प्रिय <b>${name}</b> जी,</p>
                    <p>श्री प्रगट हनुमान जी देवस्थानम् मंदिर निर्माण/सेवा हेतु आपके द्वारा दी गई दान राशि हमें सफलतापूर्वक प्राप्त हो गई है। हनुमान जी महाराज आपकी सभी मनोकामनाएं पूर्ण करें।</p>
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

        const gurujiMailOptions = {
            from: '"Mandir Website" <sinhaharshit67@gmail.com>',
            to: 'sinhaharshit98@gmail.com', // 🚨 Subah yahan Guruji ki Email daal dena, abhi check karne ke liye apni hi rani do
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

        // Background mail triggers without freezing the server response
        if (email && email.trim() !== "") {
            transporter.sendMail(bhaktMailOptions, (err, info) => {
                if (err) console.error("Bhakt Email Failed:", err.message);
                else console.log("Bhakt Email Sent!");
            });
        }

        transporter.sendMail(gurujiMailOptions, (err, info) => {
            if (err) console.error("Guruji Email Failed:", err.message);
            else console.log("Guruji Email Sent!");
        });

    } catch (error) {
        console.error("Payment Success Route Error:", error);
        // Agar response pehle nahi gaya toh safely ab bhej do
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: error.message });
        }
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