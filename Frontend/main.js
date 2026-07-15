/* ==========================================================================
   श्री प्रगट हनुमान जी देवस्थानम् — Shared front-end logic v2
   ========================================================================== */

const BACKEND_URL = "https://pragat-hanuman-mandir.onrender.com";

/* ---------- Toast notifications ---------- */
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

/* ---------- Preloader ---------- */
function initPreloader() {
    const pre = document.getElementById("preloader");
    if (!pre) return;
    const hide = () => setTimeout(() => pre.classList.add("hide"), 400);
    if (document.readyState === "complete") hide();
    else window.addEventListener("load", hide);
    // Safety timeout in case load never fires
    setTimeout(() => pre.classList.add("hide"), 4000);
}

/* ---------- Theme toggle (light/dark) ---------- */
function initTheme() {
    const saved = localStorage.getItem("mandir-theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    const updateIcon = () => {
        const dark = document.documentElement.getAttribute("data-theme") === "dark";
        document.querySelectorAll("[data-theme-icon]").forEach((el) => (el.textContent = dark ? "☀️" : "🌙"));
    };
    updateIcon();
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) =>
        btn.addEventListener("click", () => {
            const dark = document.documentElement.getAttribute("data-theme") === "dark";
            const next = dark ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", next);
            localStorage.setItem("mandir-theme", next);
            updateIcon();
        })
    );
}

/* ---------- Scroll progress bar ---------- */
function initScrollProgress() {
    const bar = document.getElementById("scrollProgress");
    if (!bar) return;
    window.addEventListener("scroll", () => {
        const h = document.documentElement;
        const scrolled = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
        bar.style.width = scrolled + "%";
    }, { passive: true });
}

/* ---------- Language toggle (Hindi / English) ---------- */
function initLanguage() {
    const saved = localStorage.getItem("mandir-lang") || "hi";
    const apply = (lang) => {
        document.querySelectorAll("[data-hi]").forEach((el) => {
            const val = lang === "en" ? el.getAttribute("data-en") : el.getAttribute("data-hi");
            if (val !== null) el.textContent = val;
        });
        document.querySelectorAll("[data-lang-label]").forEach((el) => (el.textContent = lang === "en" ? "हिंदी" : "ENG"));
        localStorage.setItem("mandir-lang", lang);
    };
    apply(saved);
    document.querySelectorAll("[data-lang-toggle]").forEach((btn) =>
        btn.addEventListener("click", () => {
            const cur = localStorage.getItem("mandir-lang") || "hi";
            apply(cur === "hi" ? "en" : "hi");
        })
    );
}

/* ---------- Navigation ---------- */
function initNavigation() {
    const header = document.querySelector(".site-header");
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("primaryNav");
    const backdrop = document.getElementById("navBackdrop");
    if (header) window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 40), { passive: true });
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

/* ---------- Hero typing effect ---------- */
function initTyping() {
    const el = document.getElementById("heroTyping");
    if (!el) return;
    const phrases = JSON.parse(el.dataset.phrases || "[]");
    if (!phrases.length) return;
    let pi = 0, ci = 0, deleting = false;
    const tick = () => {
        const word = phrases[pi];
        el.textContent = word.substring(0, ci);
        if (!deleting && ci < word.length) { ci++; setTimeout(tick, 70); }
        else if (!deleting && ci === word.length) { deleting = true; setTimeout(tick, 1800); }
        else if (deleting && ci > 0) { ci--; setTimeout(tick, 35); }
        else { deleting = false; pi = (pi + 1) % phrases.length; setTimeout(tick, 300); }
    };
    tick();
}

/* ---------- Floating petals ---------- */
function initPetals() {
    const host = document.getElementById("petals");
    if (!host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const glyphs = ["🌼", "🌸", "🏵️", "🌺"];
    for (let i = 0; i < 14; i++) {
        const p = document.createElement("span");
        p.className = "petal";
        p.textContent = glyphs[i % glyphs.length];
        p.style.left = Math.random() * 100 + "%";
        p.style.fontSize = 14 + Math.random() * 16 + "px";
        p.style.animationDuration = 8 + Math.random() * 9 + "s";
        p.style.animationDelay = Math.random() * 10 + "s";
        host.appendChild(p);
    }
}

/* ---------- Aarti / Darshan live status ---------- */
function initAartiStatus() {
    const wrap = document.getElementById("aartiWidget");
    if (!wrap) return;
    const aartis = [
        { name: "मंगला आरती", h: 6, m: 0 },
        { name: "श्रृंगार दर्शन", h: 9, m: 0 },
        { name: "मध्याह्न आरती", h: 12, m: 0 },
        { name: "संध्या आरती", h: 19, m: 0 },
        { name: "शयन आरती", h: 21, m: 0 },
    ];
    const OPEN = 6 * 60, CLOSE = 21 * 60 + 30; // darshan window in minutes

    const render = () => {
        const now = new Date();
        const mins = now.getHours() * 60 + now.getMinutes();
        const isOpen = mins >= OPEN && mins <= CLOSE;

        const pill = wrap.querySelector("[data-status]");
        if (pill) {
            pill.className = "status-pill " + (isOpen ? "open" : "closed");
            pill.innerHTML = `<span class="dot"></span> ${isOpen ? "दर्शन खुले हैं" : "दर्शन बंद हैं"}`;
        }

        // find next aarti today, else first tomorrow
        let next = aartis.find((a) => a.h * 60 + a.m > mins);
        let target = new Date(now);
        if (next) target.setHours(next.h, next.m, 0, 0);
        else { next = aartis[0]; target.setDate(target.getDate() + 1); target.setHours(next.h, next.m, 0, 0); }

        const nameEl = wrap.querySelector("[data-next-name]");
        if (nameEl) nameEl.textContent = next.name;

        const diff = Math.max(0, target - now);
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        const set = (sel, v) => { const e = wrap.querySelector(sel); if (e) e.textContent = String(v).padStart(2, "0"); };
        set("[data-cd-h]", h); set("[data-cd-m]", m); set("[data-cd-s]", s);
    };
    render();
    setInterval(render, 1000);
}

/* ---------- Festival countdown ---------- */
function initFestivalCountdown() {
    const wrap = document.getElementById("festivalCountdown");
    if (!wrap) return;
    // Upcoming festivals (approx dates); JS picks the next future one automatically.
    const festivals = [
        { name: "रक्षा बंधन", date: "2026-08-28" },
        { name: "श्री कृष्ण जन्माष्टमी", date: "2026-09-04" },
        { name: "गणेश चतुर्थी", date: "2026-09-14" },
        { name: "शारदीय नवरात्रि", date: "2026-10-11" },
        { name: "दशहरा (विजयादशमी)", date: "2026-10-20" },
        { name: "दीपावली", date: "2026-11-08" },
        { name: "कार्तिक हनुमान जयंती", date: "2026-11-24" },
        { name: "मकर संक्रांति", date: "2027-01-14" },
        { name: "महाशिवरात्रि", date: "2027-03-06" },
        { name: "होली", date: "2027-03-22" },
        { name: "चैत्र हनुमान जयंती", date: "2027-04-11" },
    ];
    const now = new Date();
    const upcoming = festivals.map((f) => ({ ...f, d: new Date(f.date + "T06:00:00") })).filter((f) => f.d > now).sort((a, b) => a.d - b.d)[0];
    if (!upcoming) return;

    const nameEl = wrap.querySelector("[data-fest-name]");
    const dateEl = wrap.querySelector("[data-fest-date]");
    if (nameEl) nameEl.textContent = upcoming.name;
    if (dateEl) dateEl.textContent = upcoming.d.toLocaleDateString("hi-IN", { day: "numeric", month: "long", year: "numeric", weekday: "long" });

    const render = () => {
        const diff = Math.max(0, upcoming.d - new Date());
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        const set = (sel, v) => { const e = wrap.querySelector(sel); if (e) e.textContent = String(v).padStart(2, "0"); };
        set("[data-fd]", d); set("[data-fh]", h); set("[data-fm]", m); set("[data-fs]", s);
    };
    render();
    setInterval(render, 1000);
}

/* ---------- Donation thermometer ---------- */
function initThermometer() {
    const fill = document.getElementById("thermoFill");
    if (!fill) return;
    const goal = Number(fill.dataset.goal || 5100000);
    const raised = Number(fill.dataset.raised || 3245000);
    const pct = Math.min(100, Math.round((raised / goal) * 100));
    const raisedEl = document.getElementById("thermoRaised");
    const goalEl = document.getElementById("thermoGoal");
    if (raisedEl) raisedEl.textContent = "₹" + raised.toLocaleString("en-IN");
    if (goalEl) goalEl.textContent = "लक्ष्य ₹" + goal.toLocaleString("en-IN");
    const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (e.isIntersecting) {
                fill.style.width = pct + "%";
                fill.textContent = pct + "%";
                io.disconnect();
            }
        });
    }, { threshold: 0.3 });
    io.observe(fill);
}

/* ---------- Testimonials carousel ---------- */
function initTestimonials() {
    const track = document.getElementById("testiTrack");
    const dotsWrap = document.getElementById("testiDots");
    if (!track) return;
    const slides = track.children.length;
    let idx = 0;
    for (let i = 0; i < slides; i++) {
        const b = document.createElement("button");
        b.addEventListener("click", () => go(i));
        dotsWrap && dotsWrap.appendChild(b);
    }
    const dots = dotsWrap ? dotsWrap.children : [];
    const go = (i) => {
        idx = (i + slides) % slides;
        track.style.transform = `translateX(-${idx * 100}%)`;
        Array.from(dots).forEach((d, di) => d.classList.toggle("active", di === idx));
    };
    go(0);
    let timer = setInterval(() => go(idx + 1), 5500);
    track.parentElement.addEventListener("mouseenter", () => clearInterval(timer));
    track.parentElement.addEventListener("mouseleave", () => (timer = setInterval(() => go(idx + 1), 5500)));
}

/* ---------- FAQ accordion ---------- */
function initFAQ() {
    document.querySelectorAll(".faq-item").forEach((item) => {
        const q = item.querySelector(".faq-q");
        const a = item.querySelector(".faq-a");
        if (!q || !a) return;
        q.addEventListener("click", () => {
            const open = item.classList.contains("open");
            document.querySelectorAll(".faq-item.open").forEach((o) => {
                o.classList.remove("open");
                const oa = o.querySelector(".faq-a");
                if (oa) oa.style.maxHeight = null;
            });
            if (!open) { item.classList.add("open"); a.style.maxHeight = a.scrollHeight + "px"; }
        });
    });
}

/* ---------- Generic modal (Chalisa etc.) ---------- */
function initModals() {
    document.querySelectorAll("[data-modal-open]").forEach((btn) =>
        btn.addEventListener("click", () => {
            const m = document.getElementById(btn.dataset.modalOpen);
            if (m) { m.classList.add("open"); document.body.style.overflow = "hidden"; }
        })
    );
    document.querySelectorAll(".modal").forEach((m) => {
        const close = () => { m.classList.remove("open"); document.body.style.overflow = ""; };
        m.addEventListener("click", (e) => { if (e.target === m || e.target.classList.contains("modal__close")) close(); });
        document.addEventListener("keydown", (e) => e.key === "Escape" && close());
    });
}

/* ---------- Audio engine ---------- */
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
            audio.play().then(() => setLabel(true)).catch(() => Toast.show("कृपया स्क्रीन पर एक बार टैप करें, फिर चालीसा प्ले करें।", { type: "info" }));
        } else { audio.pause(); setLabel(false); }
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
        submitBtn.innerHTML = loading ? '<span class="btn-spinner"></span> प्रक्रिया जारी है…' : originalHTML;
    };
    try {
        setLoading(true);
        const res = await fetch(`${BACKEND_URL}/create-order`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: formData.amount }),
        });
        const data = await res.json();
        if (!data.success) { Toast.show("सर्वर से संपर्क नहीं हो पाया, कृपया दोबारा प्रयास करें।", { type: "error" }); setLoading(false); return; }
        const options = {
            key: data.key_id, amount: data.amount, currency: "INR",
            name: "श्री प्रगट हनुमान जी देवस्थानम्", description: "मन्दिर सेवा / निर्माण दान",
            image: "images/logo.png", order_id: data.order_id,
            handler: async function (response) {
                try {
                    await fetch(`${BACKEND_URL}/api/payment/success`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                            amount: formData.amount, name: formData.name, email: formData.email,
                            phone: formData.phone, gotra: formData.gotra,
                        }),
                    });
                } catch (e) { console.error("Receipt logging failed:", e); }
                Toast.show("आपका दान सफलतापूर्वक प्राप्त हुआ। रसीद आपके ईमेल पर भेज दी गई है।", { type: "success", title: "जय श्री राम! 🚩", duration: 8000 });
                const form = document.getElementById("donationForm");
                form && form.reset();
                document.querySelectorAll(".chip.active").forEach((c) => c.classList.remove("active"));
            },
            prefill: { name: formData.name, email: formData.email, contact: formData.phone },
            theme: { color: "#7A0016" },
        };
        const rzp = new Razorpay(options);
        rzp.on("payment.failed", (resp) => Toast.show(resp.error && resp.error.description ? resp.error.description : "भुगतान असफल रहा।", { type: "error", title: "भुगतान असफल" }));
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
    const amountInput = document.getElementById("donationAmount");
    document.querySelectorAll(".chip").forEach((chip) => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
            chip.classList.add("active");
            if (amountInput) amountInput.value = chip.dataset.amount;
        });
    });
    amountInput && amountInput.addEventListener("input", () => document.querySelectorAll(".chip.active").forEach((c) => c.classList.remove("active")));
    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const amount = Number(amountInput ? amountInput.value : 0);
        if (!amount || amount <= 0) { Toast.show("कृपया एक वैध सहयोग राशि दर्ज करें।", { type: "error" }); return; }
        const formData = {
            name: document.getElementById("donorName").value.trim(),
            email: document.getElementById("donorEmail").value.trim(),
            phone: document.getElementById("donorPhone").value.trim(),
            gotra: (document.getElementById("donorGotra").value || "").trim() || "N/A",
            amount,
        };
        await initiateDonation(formData, form.querySelector('button[type="submit"]'));
    });
}

/* ---------- Puja / Seva booking ---------- */
function initBookingForm() {
    const form = document.getElementById("bookingForm");
    if (!form) return;
    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const original = btn.innerHTML;
        const payload = {
            name: form.querySelector("#bkName").value.trim(),
            phone: form.querySelector("#bkPhone").value.trim(),
            email: form.querySelector("#bkEmail").value.trim(),
            gotra: (form.querySelector("#bkGotra").value || "").trim() || "N/A",
            seva: form.querySelector("#bkSeva").value,
            date: form.querySelector("#bkDate").value,
            note: (form.querySelector("#bkNote").value || "").trim(),
        };
        if (!payload.name || !payload.phone || !payload.seva || !payload.date) {
            Toast.show("कृपया नाम, मोबाइल, सेवा एवं तिथि भरें।", { type: "error" });
            return;
        }
        try {
            btn.disabled = true;
            btn.innerHTML = '<span class="btn-spinner"></span> बुकिंग हो रही है…';
            const res = await fetch(`${BACKEND_URL}/api/puja/book`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({ success: false }));
            if (res.ok && data.success) {
                Toast.show("आपकी सेवा/पूजा बुकिंग दर्ज हो गई है। मन्दिर परिवार शीघ्र संपर्क करेगा।", { type: "success", title: "सेवा स्वीकृत 🙏", duration: 8000 });
                form.reset();
            } else {
                Toast.show(data.message || "बुकिंग दर्ज नहीं हो सकी, कृपया दोबारा प्रयास करें।", { type: "error" });
            }
        } catch (err) {
            console.error(err);
            Toast.show("सर्वर से संपर्क नहीं हो सका। आप WhatsApp पर भी बुकिंग कर सकते हैं।", { type: "error" });
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    });
}

/* ---------- Newsletter ---------- */
function initNewsletter() {
    const form = document.getElementById("newsletterForm");
    if (!form) return;
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        Toast.show("धन्यवाद! आप मन्दिर के अपडेट्स एवं पर्व सूचनाओं की सूची में जुड़ गए हैं।", { type: "success", title: "जुड़ाव सफल 🚩" });
        form.reset();
    });
}

/* ---------- Gallery filters ---------- */
function initGalleryFilters() {
    const btns = document.querySelectorAll(".filter-btn");
    if (!btns.length) return;
    btns.forEach((btn) =>
        btn.addEventListener("click", () => {
            btns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            const cat = btn.dataset.filter;
            document.querySelectorAll(".gallery-item").forEach((item) => {
                item.classList.toggle("hidden", !(cat === "all" || item.dataset.category === cat));
            });
        })
    );
}

/* ---------- Share (Web Share API) ---------- */
function initShare() {
    document.querySelectorAll("[data-share]").forEach((btn) =>
        btn.addEventListener("click", async () => {
            const data = { title: document.title, text: "श्री प्रगट हनुमान जी देवस्थानम् — जय श्री राम 🚩", url: location.href };
            if (navigator.share) { try { await navigator.share(data); } catch (e) {} }
            else { try { await navigator.clipboard.writeText(location.href); Toast.show("लिंक कॉपी हो गया है, अब आप इसे साझा कर सकते हैं।", { type: "success" }); } catch (e) {} }
        })
    );
}

/* ---------- Scroll reveal ---------- */
function initReveal() {
    const items = document.querySelectorAll(".reveal");
    if (!items.length || !("IntersectionObserver" in window)) { items.forEach((i) => i.classList.add("visible")); return; }
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("visible"); io.unobserve(entry.target); } });
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
            const dur = 1600, start = performance.now();
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
    window.addEventListener("scroll", () => btn.classList.toggle("show", window.scrollY > 500), { passive: true });
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/* ---------- Lightbox ---------- */
function initLightbox() {
    const lb = document.getElementById("lightbox");
    if (!lb) return;
    const img = lb.querySelector("img");
    document.querySelectorAll("[data-lightbox]").forEach((el) =>
        el.addEventListener("click", () => {
            img.src = el.dataset.lightbox || el.querySelector("img").src;
            lb.classList.add("open");
            document.body.style.overflow = "hidden";
        })
    );
    const close = () => { lb.classList.remove("open"); document.body.style.overflow = ""; };
    lb.addEventListener("click", (e) => { if (e.target !== img) close(); });
    document.addEventListener("keydown", (e) => e.key === "Escape" && close());
}

/* ---------- PWA registration ---------- */
function initPWA() {
    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW registration failed:", e)));
    }
}

/* ---------- Boot ---------- */
initPreloader();
initTheme();
document.addEventListener("DOMContentLoaded", () => {
    initScrollProgress();
    initLanguage();
    initNavigation();
    initTyping();
    initPetals();
    initAartiStatus();
    initFestivalCountdown();
    initThermometer();
    initTestimonials();
    initFAQ();
    initModals();
    initAudio();
    initDonationForm();
    initBookingForm();
    initNewsletter();
    initGalleryFilters();
    initShare();
    initReveal();
    initCounters();
    initToTop();
    initLightbox();
    initPWA();
});
