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

// Nodemailer Email Transporter Setup (Render-Friendly Secure Route)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, 
    auth: {
        user: 'sinhaharshit67@gmail.com',
        pass: 'bsaqmnrrrhxrvexr' // 🌟 FIXED: Sahi password bina spaces ke set kar diya hai
    },
    tls: {
        rejectUnauthorized: false 
    }
});

// Live In-Memory Array for Tracker
let donationRecords = [];

app.get('/', (req, res) => {
    res.send('Pragat Hanuman Ji Mandir Backend Server is Running Successfully!');
});

// 1. Create Razorpay Order Route
app.post('/create-order', async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }
        const options = {
            amount: amount * 100, // Converts rupees to paise
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

// 2. Payment Success Route (FREEZE-PROOF & REFRESH SAFE)
app.post('/api/payment/success', async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, amount, name, email, phone, gotra } = req.body;
        
        // Dynamic Indian Date Standard
        const indianDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

        const newRecord = {
            id: razorpay_payment_id,
            orderId: razorpay_order_id,
            name: name || "अज्ञात भक्त",
            email: email || "N/A",
            phone: phone || "N/A",
            gotra: gotra || "अज्ञात गोत्र",
            amount: amount,
            date: indianDate,
            status: "Successful"
        };
        
        // Save to temporary live dashboard stream
        donationRecords.unshift(newRecord); 

        // BACKUP LOGGING: Server logs output
        console.log("🚩 NEW DONATION RECORDED:", JSON.stringify(newRecord));

        // Frontend ko instant discharge karo taaki user experience seamless rahe
        res.json({ success: true, message: "Payment recorded successfully!" });

        // ---- BACKGROUND EMAIL ASYNC CORRIDOR ----
        const bhaktMailOptions = {
            from: '"श्री प्रगट हनुमान जी देवस्थानम" <sinhaharshit67@gmail.com>',
            to: email,
            subject: 'पावन दान की रसीद - श्री प्रगट हनुमान जी देवस्थानम 🙏',
            html: `
                <div style="font-family: Arial, sans-serif; border: 2px solid #ff6600; padding: 20px; max-width: 600px; border-radius: 10px; background-color: #fffcf8;">
                    <h2 style="color: #ff6600; text-align: center; margin-bottom: 5px;">जय श्री राम | जय हनुमान</h2>
                    <p style="text-align: center; font-size: 12px; color: #666; margin-top: 0;">श्री प्रगट हनुमान जी देवस्थानम्, सूखी सेवनिया</p>
                    <p style="margin-top: 20px;">प्रिय भक्त <b>${newRecord.name}</b> जी,</p>
                    <p>मन्दिर निर्माण, गऊ सेवा एवं निरंतर भंडारा सेवा हेतु आपकी श्रद्धा और दान राशि सफलतापूर्वक प्राप्त हो चुकी है। बाबा बजरंगबली आपके जीवन में सुख, समृद्धि और उत्तम स्वास्थ्य प्रदान करें।</p>
                    <hr style="border: 1px dashed #ff6600; margin: 20px 0;">
                    <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                        <tr style="height: 30px;"><td><b>रसीद संख्या (Payment ID):</b></td><td style="text-align: right; color: #555;">${newRecord.id}</td></tr>
                        <tr style="height: 30px;"><td><b>भक्त का नाम:</b></td><td style="text-align: right; color: #555;">${newRecord.name}</td></tr>
                        <tr style="height: 30px;"><td><b>गोत्र (Gotra):</b></td><td style="text-align: right; color: #555;">${newRecord.gotra}</td></tr>
                        <tr style="height: 30px;"><td><b>दिनांक (Date):</b></td><td style="text-align: right; color: #555;">${newRecord.date}</td></tr>
                        <tr style="height: 40px; font-size: 16px; color: #ff6600;"><td><b>कुल सहयोग राशि:</b></td><td style="text-align: right;"><b>₹${newRecord.amount}</b></td></tr>
                    </table>
                    <hr style="border: 1px dashed #ff6600; margin: 20px 0;">
                    <p style="text-align: center; color: #ff6600; font-weight: bold; font-size: 15px;">।। हनुमान जी महाराज का आशीर्वाद आप पर सदा बना रहे ।।</p>
                </div>
            `
        };

        const gurujiMailOptions = {
            from: '"Mandir Website Alert" <sinhaharshit67@gmail.com>',
            to: 'sinhaharshit98@gmail.com', 
            subject: `🚨 नई दान राशि प्राप्त हुई - ₹${newRecord.amount}`,
            html: `
                <div style="font-family: Arial; border: 1px solid #333; padding: 20px; background-color: #f9f9f9;">
                    <h3 style="color: #cc0000; margin-top: 0;">वेबसाइट पर एक नया ऑनलाइन दान प्राप्त हुआ है:</h3>
                    <p><b>भक्त का नाम:</b> ${newRecord.name}</p>
                    <p><b>सहयोग राशि:</b> ₹${newRecord.amount}</p>
                    <p><b>ईमेल आईडी:</b> ${newRecord.email}</p>
                    <p><b>मोबाइल नंबर:</b> ${newRecord.phone}</p>
                    <p><b>गोत्र (Gotra):</b> ${newRecord.gotra}</p>
                    <p><b>भुगतान का समय:</b> ${newRecord.date}</p>
                    <p><b>Razorpay Payment ID:</b> ${newRecord.id}</p>
                </div>
            `
        };

        // Non-blocking asynchronous background thread triggers
        if (email && email.trim() !== "" && email !== "N/A") {
            transporter.sendMail(bhaktMailOptions, (err, info) => {
                if (err) console.error("❌ Bhakt Email Sending Failed:", err.message);
                else console.log("✅ Bhakt Email Sent Successfully!");
            });
        }

        transporter.sendMail(gurujiMailOptions, (err, info) => {
            if (err) console.error("❌ Notification Email to Admin Failed:", err.message);
            else console.log("✅ Admin Live Notification Email Sent!");
        });

    } catch (error) {
        console.error("Payment Success Pipeline Crash:", error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
});

// 3. Admin open tracking gateway data pipeline
app.get('/api/donations', (req, res) => {
    try {
        res.status(200).json({
            success: true,
            donations: donationRecords
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch tracker records" });
    }
});

// 4. Secure Password Admin Records Route
app.post('/api/admin/records', (req, res) => {
    const { password } = req.body;
    if (password === 'PragatHanuman@2026') {
        res.json({ success: true, records: donationRecords });
    } else {
        res.status(401).json({ success: false, message: 'गलत पासवर्ड!' });
    }
});

// Server Listen Engine
const PORT = process.env.PORT || 5002;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running smoothly on port ${PORT}`);
});