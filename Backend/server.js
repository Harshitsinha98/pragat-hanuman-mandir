const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const crypto = require('crypto');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();

// --------------------------------------------------------------------------
// Configuration (all secrets come from environment variables)
// --------------------------------------------------------------------------
const {
    PORT = 5002,
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
    RESEND_API_KEY,
    ADMIN_PASSWORD,
    ALLOWED_ORIGINS,
    ADMIN_ALERT_EMAIL = 'sinhaharshit67@gmail.com',
    MAIL_FROM = 'श्री प्रगट हनुमान जी देवस्थानम <onboarding@resend.dev>',
} = process.env;

// Fail fast if critical secrets are missing
['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'].forEach((key) => {
    if (!process.env[key]) console.warn(`⚠️  Missing environment variable: ${key}`);
});

// --------------------------------------------------------------------------
// Middleware
// --------------------------------------------------------------------------
// CORS: restrict to an allowlist when ALLOWED_ORIGINS is provided,
// otherwise fall back to open CORS (useful for local development).
const allowlist = (ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (allowlist.length === 0) return callback(null, true); // dev/default
        if (!origin || allowlist.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
}));
app.use(express.json({ limit: '10kb' }));

// Basic security headers (no extra dependency needed)
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
});

// Lightweight in-memory rate limiter (per IP, per window)
function rateLimit({ windowMs, max }) {
    const hits = new Map();
    return (req, res, next) => {
        const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        const now = Date.now();
        const entry = hits.get(ip) || { count: 0, start: now };
        if (now - entry.start > windowMs) {
            entry.count = 0;
            entry.start = now;
        }
        entry.count += 1;
        hits.set(ip, entry);
        if (entry.count > max) {
            return res.status(429).json({ success: false, message: 'बहुत अधिक अनुरोध, कृपया कुछ देर बाद प्रयास करें।' });
        }
        next();
    };
}

const paymentLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
const adminLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 10 });

// --------------------------------------------------------------------------
// Integrations
// --------------------------------------------------------------------------
const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
if (!resend) console.warn('⚠️  RESEND_API_KEY not set — receipt emails are disabled.');

// In-memory stores (note: reset on restart — use a DB for persistence)
let donationRecords = [];
let pujaBookings = [];

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const escapeHtml = (str = '') =>
    String(str).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

// --------------------------------------------------------------------------
// Routes
// --------------------------------------------------------------------------
app.get('/', (req, res) => {
    res.send('Pragat Hanuman Ji Mandir Backend is running with Resend API Engine!');
});

// Health check for uptime monitoring
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), records: donationRecords.length });
});

// 1. Create Razorpay Order
app.post('/create-order', paymentLimiter, async (req, res) => {
    try {
        const amount = Number(req.body.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }
        if (amount > 500000) {
            return res.status(400).json({ success: false, message: 'Amount exceeds allowed limit' });
        }

        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100), // rupees -> paise
            currency: 'INR',
            receipt: `receipt_order_${Date.now()}`,
        });

        res.status(200).json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            key_id: RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error('Razorpay Order Error:', error);
        res.status(500).json({ success: false, message: 'Order creation failed' });
    }
});

// 2. Payment Success (verifies signature, records, then emails asynchronously)
app.post('/api/payment/success', paymentLimiter, async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount, name, email, phone, gotra } = req.body;

        // Verify signature when available (defends against spoofed success calls)
        if (razorpay_signature && RAZORPAY_KEY_SECRET) {
            const expected = crypto
                .createHmac('sha256', RAZORPAY_KEY_SECRET)
                .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                .digest('hex');
            if (expected !== razorpay_signature) {
                return res.status(400).json({ success: false, message: 'Invalid payment signature' });
            }
        }

        const indianDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const newRecord = {
            id: razorpay_payment_id,
            orderId: razorpay_order_id,
            name: name || 'अज्ञात भक्त',
            email: email || 'N/A',
            phone: phone || 'N/A',
            gotra: gotra || 'अज्ञात गोत्र',
            amount,
            date: indianDate,
            status: 'Successful',
        };

        donationRecords.unshift(newRecord);
        console.log('🚩 NEW DONATION RECORDED:', JSON.stringify(newRecord));

        // Respond immediately so the UI never freezes
        res.json({ success: true, message: 'Payment recorded successfully!' });

        if (!resend) return; // email disabled

        // Receipt to the devotee
        if (email && isValidEmail(email)) {
            resend.emails.send({
                from: MAIL_FROM,
                to: email,
                subject: 'पावन दान की रसीद - श्री प्रगट हनुमान जी देवस्थानम 🙏',
                html: `
                    <div style="font-family: Arial, sans-serif; border: 2px solid #ff6600; padding: 20px; max-width: 600px; border-radius: 10px; background-color: #fffcf8;">
                        <h2 style="color: #ff6600; text-align: center; margin-bottom: 5px;">जय श्री राम | जय हनुमान</h2>
                        <p style="text-align: center; font-size: 12px; color: #666; margin-top: 0;">श्री प्रगट हनुमान जी देवस्थानम्, सूखी सेवनिया</p>
                        <p style="margin-top: 20px;">प्रिय भक्त <b>${escapeHtml(newRecord.name)}</b> जी,</p>
                        <p>मन्दिर निर्माण, गऊ सेवा एवं निरंतर भंडारा सेवा हेतु आपकी श्रद्धा और दान राशि सफलतापूर्वक प्राप्त हो चुकी है। बाबा बजरंगबली आपके जीवन में सुख, समृद्धि और उत्तम स्वास्थ्य प्रदान करें।</p>
                        <hr style="border: 1px dashed #ff6600; margin: 20px 0;">
                        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                            <tr style="height: 30px;"><td><b>रसीद संख्या (Payment ID):</b></td><td style="text-align: right; color: #555;">${escapeHtml(newRecord.id)}</td></tr>
                            <tr style="height: 30px;"><td><b>भक्त का नाम:</b></td><td style="text-align: right; color: #555;">${escapeHtml(newRecord.name)}</td></tr>
                            <tr style="height: 30px;"><td><b>गोत्र (Gotra):</b></td><td style="text-align: right; color: #555;">${escapeHtml(newRecord.gotra)}</td></tr>
                            <tr style="height: 30px;"><td><b>दिनांक (Date):</b></td><td style="text-align: right; color: #555;">${escapeHtml(newRecord.date)}</td></tr>
                            <tr style="height: 40px; font-size: 16px; color: #ff6600;"><td><b>कुल सहयोग राशि:</b></td><td style="text-align: right;"><b>₹${escapeHtml(newRecord.amount)}</b></td></tr>
                        </table>
                        <hr style="border: 1px dashed #ff6600; margin: 20px 0;">
                        <p style="text-align: center; color: #ff6600; font-weight: bold; font-size: 15px;">।। हनुमान जी महाराज का आशीर्वाद आप पर सदा बना रहे ।।</p>
                    </div>
                `,
            })
                .then(() => console.log('✅ Bhakt receipt email sent via Resend!'))
                .catch((err) => console.error('❌ Resend Bhakt Mail Error:', err.message));
        }

        // Real-time alert to the temple/admin
        resend.emails.send({
            from: 'मन्दिर वेबसाइट अलर्ट <onboarding@resend.dev>',
            to: ADMIN_ALERT_EMAIL,
            subject: `🚨 नई दान राशि प्राप्त हुई - ₹${newRecord.amount}`,
            html: `
                <div style="font-family: Arial; border: 1px solid #333; padding: 20px; background-color: #f9f9f9;">
                    <h3 style="color: #cc0000; margin-top: 0;">वेबसाइट पर एक नया ऑनलाइन दान प्राप्त हुआ है:</h3>
                    <p><b>भक्त का नाम:</b> ${escapeHtml(newRecord.name)}</p>
                    <p><b>सहयोग राशि:</b> ₹${escapeHtml(newRecord.amount)}</p>
                    <p><b>ईमेल आईडी:</b> ${escapeHtml(newRecord.email)}</p>
                    <p><b>मोबाइल नंबर:</b> ${escapeHtml(newRecord.phone)}</p>
                    <p><b>गोत्र (Gotra):</b> ${escapeHtml(newRecord.gotra)}</p>
                    <p><b>भुगतान का समय:</b> ${escapeHtml(newRecord.date)}</p>
                    <p><b>Razorpay Payment ID:</b> ${escapeHtml(newRecord.id)}</p>
                </div>
            `,
        })
            .then(() => console.log('✅ Admin alert dispatched via Resend!'))
            .catch((err) => console.error('❌ Resend Admin Notification Error:', err.message));
    } catch (error) {
        console.error('Payment Success Pipeline Crash:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Internal error' });
        }
    }
});

// 3. Public donations list
app.get('/api/donations', (req, res) => {
    res.status(200).json({ success: true, donations: donationRecords });
});

// 4. Puja / Seva booking (records request + notifies the temple by email)
app.post('/api/puja/book', paymentLimiter, async (req, res) => {
    try {
        const { name, phone, email, gotra, seva, date, note } = req.body;

        if (!name || !phone || !seva || !date) {
            return res.status(400).json({ success: false, message: 'नाम, मोबाइल, सेवा एवं तिथि आवश्यक हैं।' });
        }
        if (!/^\d{7,15}$/.test(String(phone).replace(/\s+/g, ''))) {
            return res.status(400).json({ success: false, message: 'कृपया वैध मोबाइल नंबर दर्ज करें।' });
        }

        const indianDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const booking = {
            id: `PUJA-${Date.now()}`,
            name: String(name).slice(0, 80),
            phone: String(phone).slice(0, 20),
            email: email || 'N/A',
            gotra: gotra || 'N/A',
            seva: String(seva).slice(0, 80),
            date: String(date).slice(0, 20),
            note: (note || '').slice(0, 500),
            createdAt: indianDate,
            status: 'Pending',
        };

        pujaBookings.unshift(booking);
        console.log('📿 NEW PUJA BOOKING:', JSON.stringify(booking));

        res.json({ success: true, message: 'Booking recorded', id: booking.id });

        if (!resend) return; // email disabled

        // Notify the temple/admin about the new booking
        resend.emails.send({
            from: 'मन्दिर सेवा बुकिंग <onboarding@resend.dev>',
            to: ADMIN_ALERT_EMAIL,
            subject: `📿 नई सेवा/पूजा बुकिंग - ${escapeHtml(booking.seva)}`,
            html: `
                <div style="font-family: Arial; border: 1px solid #7A0016; padding: 20px; background-color: #fffcf8;">
                    <h3 style="color: #7A0016; margin-top: 0;">वेबसाइट से एक नई सेवा/पूजा बुकिंग प्राप्त हुई है:</h3>
                    <p><b>भक्त का नाम:</b> ${escapeHtml(booking.name)}</p>
                    <p><b>सेवा:</b> ${escapeHtml(booking.seva)}</p>
                    <p><b>वांछित तिथि:</b> ${escapeHtml(booking.date)}</p>
                    <p><b>मोबाइल:</b> ${escapeHtml(booking.phone)}</p>
                    <p><b>ईमेल:</b> ${escapeHtml(booking.email)}</p>
                    <p><b>गोत्र:</b> ${escapeHtml(booking.gotra)}</p>
                    <p><b>संदेश:</b> ${escapeHtml(booking.note) || '—'}</p>
                    <p><b>बुकिंग समय:</b> ${escapeHtml(booking.createdAt)}</p>
                </div>
            `,
        })
            .then(() => console.log('✅ Puja booking alert dispatched!'))
            .catch((err) => console.error('❌ Resend Booking Mail Error:', err.message));

        // Acknowledge the devotee if an email was provided
        if (email && isValidEmail(email)) {
            resend.emails.send({
                from: MAIL_FROM,
                to: email,
                subject: 'सेवा/पूजा बुकिंग प्राप्त हुई - श्री प्रगट हनुमान जी देवस्थानम 🙏',
                html: `
                    <div style="font-family: Arial; border: 2px solid #7A0016; padding: 20px; max-width: 600px; border-radius: 10px; background-color: #fffcf8;">
                        <h2 style="color: #FF6F00; text-align: center;">जय श्री राम | जय हनुमान</h2>
                        <p>प्रिय भक्त <b>${escapeHtml(booking.name)}</b> जी,</p>
                        <p>आपकी <b>${escapeHtml(booking.seva)}</b> सेवा हेतु बुकिंग (दिनांक: ${escapeHtml(booking.date)}) सफलतापूर्वक दर्ज हो गई है। मन्दिर परिवार शीघ्र ही आपसे संपर्क कर विवरण की पुष्टि करेगा।</p>
                        <p style="text-align:center; color:#FF6F00; font-weight:bold;">।। हनुमान जी महाराज का आशीर्वाद आप पर सदा बना रहे ।।</p>
                    </div>
                `,
            }).catch((err) => console.error('❌ Resend Booking Ack Error:', err.message));
        }
    } catch (error) {
        console.error('Puja Booking Error:', error);
        if (!res.headersSent) res.status(500).json({ success: false, message: 'Internal error' });
    }
});

// 5. Admin authentication + records
app.post('/api/admin/records', adminLimiter, (req, res) => {
    const { password } = req.body;
    const expected = ADMIN_PASSWORD || 'PragatHanuman@2026'; // fallback for legacy setups
    if (password && password === expected) {
        return res.json({ success: true, records: donationRecords, bookings: pujaBookings });
    }
    return res.status(401).json({ success: false, message: 'गलत पासवर्ड!' });
});

// --------------------------------------------------------------------------
// Start
// --------------------------------------------------------------------------
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT} with Resend Mail Router Engine`);
});
