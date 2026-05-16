// ==========================================================================
// 1. BACKEND CONFIGURATION
// ==========================================================================
// Local machine par test karne ke liye port 5002 ka use kar rahe hain
// Jab hum ise Render par live deploy karenge, tab yahan Render ka live URL aayega
const BACKEND_URL = "http://localhost:5002";

// ==========================================================================
// 2. BACKGROUND IMAGE CAROUSEL (AUTOMATIC SLIDESHOW)
// ==========================================================================
document.addEventListener("DOMContentLoaded", function() {
    const slides = document.querySelectorAll(".slide-img");
    let currentSlide = 0;
    const slideInterval = 4000; // 4000ms = 4 Seconds mein image change hogi

    if (slides.length > 0) {
        setInterval(function() {
            // Current slide se 'active' class hatana
            slides[currentSlide].classList.remove("active");
            
            // Agli slide par index move karna
            currentSlide = (currentSlide + 1) % slides.length;
            
            // Nayi slide ko 'active' class dena taaki wo fade-in ho jaye
            slides[currentSlide].classList.add("active");
        }, slideInterval);
    }
});

// ==========================================================================
// 3. RAZORPAY PAYMENT INTEGRATION (DONATION LOGIC)
// ==========================================================================
async function initiatePayment() {
    const amountInput = document.getElementById('amount').value;

    // Validation: Check agar input khali hai, zero hai ya negative hai
    if (!amountInput || amountInput <= 0) {
        alert("कृपया एक वैध सहयोग राशि दर्ज करें (Please enter a valid amount).");
        return;
    }

    try {
        // A. Backend (Port 5002) se Razorpay Order ID generate karwana
        const response = await fetch('https://pragat-hanuman-mandir.onrender.com/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount: amountInput })
        });

        const data = await response.json();

        if (!data.success) {
            alert("ऑर्डर जनरेट करने में समस्या आई। कृपया दोबारा प्रयास करें।");
            return;
        }

        // B. Razorpay Checkout Popup Configuration (Premium Maroon Theme)
        const options = {
            "key": data.key_id, // Backend se fetch ki gayi Razorpay Public Key
            "amount": data.amount, // Total amount paise mein (e.g. 50000 paise = ₹500)
            "currency": "INR",
            "name": "श्री प्रगट हनुमान जी देवस्थानम्",
            "description": "मन्दिर निर्माण एवं सेवा हेतु सहयोग निधि",
            "image": "images/logo.png", // Mandir ka logo agar available ho
            "order_id": data.order_id, // Server se aayi hui genuine Order ID
            
            // Success Handler: Jab payment successfully complete ho jaye
            "handler": function (response) {
                alert(`जय श्री राम! आपका दान सफलतापूर्वक प्राप्त हुआ। \nPayment ID: ${response.razorpay_payment_id}`);
                document.getElementById('amount').value = ''; // Input field clear karne ke liye
            },
            
            // Popup Dynamic Customization
            "theme": {
                "color": "#7A0016" // Humara standard premium maroon shade
            }
        };

        // C. Razorpay Checkout Window Launch karna
        const rzp1 = new Razorpay(options);
        
        rzp1.on('payment.failed', function (response) {
            alert(`भुगतान असफल रहा। कारण: ${response.error.description}`);
        });

        rzp1.open();

    } catch (error) {
        console.error("Payment Error:", error);
        alert("सर्वर से कनेक्ट करने में असमर्थ। कृपया सुनिश्चित करें कि बैकएंड सर्ver 5002 पोर्ट पर चल रहा है।");
    }
}
// Hanuman Chalisa Audio Controller Logic
const bgAudio = document.getElementById('bgAudio');
const audioWidget = document.getElementById('audio-control-widget');
const audioIcon = document.getElementById('audio-icon');

// 1. Smart Autoplay Rule: Jaise hi user page par pehla click karega, audio shuru ho jayega
document.addEventListener('click', () => {
    if (bgAudio.paused && !audioWidget.classList.contains('muted-by-user')) {
        playAudio();
    }
}, { once: true }); // '{ once: true }' ka matlab ye event sirf pehle click par chalega

function playAudio() {
    bgAudio.play().then(() => {
        audioIcon.innerText = "🔊";
        audioWidget.classList.add('audio-playing');
    }).catch(error => {
        console.log("Browser blocked autoplay, waiting for interaction.");
    });
}

// 2. Manual Mute / Play Button Toggle
function toggleAudio() {
    if (bgAudio.paused) {
        bgAudio.play();
        audioIcon.innerText = "🔊";
        audioWidget.classList.add('audio-playing');
        audioWidget.classList.remove('muted-by-user');
    } else {
        bgAudio.pause();
        audioIcon.innerText = "🔇";
        audioWidget.classList.remove('audio-playing');
        audioWidget.classList.add('muted-by-user'); // User ne khud mute kiya, isliye auto-start nahi hoga
    }
}
// Form submit hone par chalega
document.getElementById('donationForm').addEventListener('submit', async function(e) {
    e.preventDefault(); // Page reload hone se rokne ke liye

    // Saara data collect karna
    const formData = {
        name: document.getElementById('donorName').value,
        email: document.getElementById('donorEmail').value,
        phone: document.getElementById('donorPhone').value,
        gotra: document.getElementById('donorGotra').value || 'N/A',
        amount: document.getElementById('donationAmount').value
    };

    // Aapka payment wala function trigger hoga
    await initiateDonation(formData);
});