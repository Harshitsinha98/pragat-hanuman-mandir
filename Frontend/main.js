/* ==========================================================================
   श्री प्रगट हनुमान जी देवस्थानम् — Shared front-end logic
   Handles: navigation, Hanuman Chalisa audio, donation flow (Razorpay),
   toast notifications, scroll reveal and the back-to-top button.
   ========================================================================== */

/* Live backend (Render). Change here in one place if the API host moves. */
const BACKEND_URL = "https://pragat-hanuman-mandir.onrender.com";

/* ---------- Toast notifications (replaces alert()) ---------- */
const Toast = (() => {
    let container;

    function ensureContainer() {
        if (!container) {
            container = document.createElement("div");
            container.className = "toast-container";
            document.body.appendChild(container);
        }
        return container;
    }

    function show(message, { type = "info", title = "", duration = 5000 } = {}) {
        const icons = { success: "🙏", error: "⚠️", info: "🔔" };
        const el = document.createElement("div");
        el.className = `toast ${type}`;
        el.innerHTML = `
            <span class="toast__icon">${icons[type] || icons.info}</span>
            <div class="toast__body">
                ${title ? `<span class="toast__title">${title}</span>` : ""}
                <span>${message}</span>
            </div>`;
        ensureContainer().appendChild(el);

        const remove = () => {
            el.classList.add("hide");
            el.addEventListener("animationend", () => el.remove(), { once: true });
        };
        const timer = setTimeout(remove, duration);
        el.addEventListener("click", () => { clearTimeout(timer); remove(); });
    }

    return { show };
})();

/* ---------- Navigation (hamburger drawer + sticky shrink) ---------- */
function initNavigation() {
    const header = document.querySelector(".site-header");
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("primaryNav");
    const backdrop = document.getElementById("navBackdrop");

    if (header) {
        window.addEventListener("scroll", () => {
            header.classList.toggle("scrolled", window.scrollY > 40);
        }, { passive: true });
    }

    if (!toggle || !nav) return;

    const closeMenu = () => {
        toggle.classList.remove("active");
        nav.classList.remove("open");
        backdrop && backdrop.classList.remove("active");
        document.body.style.overflow = "";
    };

    toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        toggle.classList.toggle("active", open);
        backdrop && backdrop.classList.toggle("active", open);
        document.body.style.overflow = open ? "hidden" : "";
    });

    backdrop && backdrop.addEventListener("click", closeMenu);
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());
}

/* ---------- Hanuman Chalisa audio engine ---------- */
function initAudio() {
    const audio = document.getElementById("bgAudio");
    const fabs = document.querySelectorAll("[data-audio-toggle]");
    if (!audio) return;

    const setLabel = (playing) => {
        fabs.forEach((fab) => {
            fab.classList.toggle("playing", playing);
            const icon = fab.querySelector("[data-audio-icon]");
            const text = fab.querySelector("[data-audio-text]");
            if (icon) icon.textContent = playing ? "⏸️" : "🎵";
            if (text) text.textContent = playing ? "चल रहा है…" : "हनुमान चालीसा";
        });
    };

    window.toggleAudio = function () {
        if (audio.paused) {
            audio.play()
                .then(() => setLabel(true))
                .catch(() => Toast.show("कृपया स्क्रीन पर एक बार टैप करें, फिर चालीसा प्ले करें।", { type: "info" }));
        } else {
            audio.pause();
            setLabel(false);
        }
    };

    fabs.forEach((fab) => fab.addEventListener("click", window.toggleAudio));
    audio.addEventListener("play", () => setLabel(true));
    audio.addEventListener("pause", () => setLabel(false));
}

/* ---------- Donation flow (Razorpay) ---------- */
async function initiateDonation(formData, submitBtn) {
    const originalHTML = submitBtn ? submitBtn.innerHTML : "";
    const setLoading = (loading) => {
        if (!submitBtn) return;
        submitBtn.disabled = loading;
        submitBtn.innerHTML = loading
            ? '<span class="btn-spinner"></span> प्रक्रिया जारी है…'
            : originalHTML;
    };

    try {
        setLoading(true);
        const res = await fetch(`${BACKEND_URL}/create-order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: formData.amount }),
        });
        const data = await res.json();

        if (!data.success) {
            Toast.show("सर्वर से संपर्क नहीं हो पाया, कृपया दोबारा प्रयास करें।", { type: "error" });
            setLoading(false);
            return;
        }

        const options = {
            key: data.key_id,
            amount: data.amount,
            currency: "INR",
            name: "श्री प्रगट हनुमान जी देवस्थानम्",
            description: "मन्दिर सेवा / निर्माण दान",
            image: "images/logo.png",
            order_id: data.order_id,
            handler: async function (response) {
                try {
                    await fetch(`${BACKEND_URL}/api/payment/success`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            amount: formData.amount,
                            name: formData.name,
                            email: formData.email,
                            phone: formData.phone,
                            gotra: formData.gotra,
                        }),
                    });
                } catch (e) {
                    console.error("Receipt logging failed:", e);
                }
                Toast.show("आपका दान सफलतापूर्वक प्राप्त हुआ। रसीद आपके ईमेल पर भेज दी गई है।", {
                    type: "success",
                    title: "जय श्री राम! 🚩",
                    duration: 8000,
                });
                const form = document.getElementById("donationForm");
                form && form.reset();
                document.querySelectorAll(".chip.active").forEach((c) => c.classList.remove("active"));
            },
            prefill: { name: formData.name, email: formData.email, contact: formData.phone },
            theme: { color: "#7A0016" },
        };

        const rzp = new Razorpay(options);
        rzp.on("payment.failed", (resp) =>
            Toast.show(resp.error && resp.error.description ? resp.error.description : "भुगतान असफल रहा।", { type: "error", title: "भुगतान असफल" })
        );
        rzp.open();
        setLoading(false);
    } catch (err) {
        console.error(err);
        Toast.show("नेटवर्क त्रुटि! कृपया अपना इंटरनेट कनेक्शन जांचें।", { type: "error" });
        setLoading(false);
    }
}

function initDonationForm() {
    const form = document.getElementById("donationForm");
    if (!form) return;

    // Preset amount chips
    const amountInput = document.getElementById("donationAmount");
    document.querySelectorAll(".chip").forEach((chip) => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
            chip.classList.add("active");
            if (amountInput) amountInput.value = chip.dataset.amount;
        });
    });
    amountInput && amountInput.addEventListener("input", () =>
        document.querySelectorAll(".chip.active").forEach((c) => c.classList.remove("active"))
    );

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const amount = Number(amountInput ? amountInput.value : 0);
        if (!amount || amount <= 0) {
            Toast.show("कृपया एक वैध सहयोग राशि दर्ज करें।", { type: "error" });
            return;
        }
        const formData = {
            name: document.getElementById("donorName").value.trim(),
            email: document.getElementById("donorEmail").value.trim(),
            phone: document.getElementById("donorPhone").value.trim(),
            gotra: (document.getElementById("donorGotra").value || "").trim() || "N/A",
            amount: amount,
        };
        await initiateDonation(formData, form.querySelector('button[type="submit"]'));
    });
}

/* ---------- Scroll reveal ---------- */
function initReveal() {
    const items = document.querySelectorAll(".reveal");
    if (!items.length || !("IntersectionObserver" in window)) {
        items.forEach((i) => i.classList.add("visible"));
        return;
    }
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });
    items.forEach((i) => io.observe(i));
}

/* ---------- Animated counters ---------- */
function initCounters() {
    const nums = document.querySelectorAll("[data-count]");
    if (!nums.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const target = Number(el.dataset.count);
            const suffix = el.dataset.suffix || "";
            const dur = 1600;
            const start = performance.now();
            const step = (now) => {
                const p = Math.min((now - start) / dur, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                el.textContent = Math.floor(eased * target).toLocaleString("en-IN") + suffix;
                if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
            io.unobserve(el);
        });
    }, { threshold: 0.4 });
    nums.forEach((n) => io.observe(n));
}

/* ---------- Back to top ---------- */
function initToTop() {
    const btn = document.getElementById("toTop");
    if (!btn) return;
    window.addEventListener("scroll", () => {
        btn.classList.toggle("show", window.scrollY > 500);
    }, { passive: true });
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/* ---------- Lightbox (gallery) ---------- */
function initLightbox() {
    const lb = document.getElementById("lightbox");
    if (!lb) return;
    const img = lb.querySelector("img");
    document.querySelectorAll("[data-lightbox]").forEach((el) => {
        el.addEventListener("click", () => {
            img.src = el.dataset.lightbox || el.querySelector("img").src;
            lb.classList.add("open");
            document.body.style.overflow = "hidden";
        });
    });
    const close = () => { lb.classList.remove("open"); document.body.style.overflow = ""; };
    lb.addEventListener("click", (e) => { if (e.target !== img) close(); });
    document.addEventListener("keydown", (e) => e.key === "Escape" && close());
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initAudio();
    initDonationForm();
    initReveal();
    initCounters();
    initToTop();
    initLightbox();
});
