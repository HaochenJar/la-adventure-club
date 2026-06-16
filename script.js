/* ===== LA Adventure Club — interactions ===== */
(function () {
  "use strict";

  /* ---- CONFIG ----
   * Where registrations are sent. This uses FormSubmit (https://formsubmit.co) —
   * a free service that forwards form posts to your email, no backend or signup.
   * The FIRST time someone registers, FormSubmit emails you a one-time link to
   * confirm activation. After that, submissions arrive straight in your inbox.
   * To change the destination, just edit the email below.
   * (Tip: for less spam exposure you can swap this for FormSubmit's hashed
   *  endpoint — get the hash at formsubmit.co, then use it in place of the email.)
   */
  var REGISTRATION_EMAIL = "jarrr23d@gmail.com";
  var FORMSUBMIT_ENDPOINT = "https://formsubmit.co/ajax/" + REGISTRATION_EMAIL;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---- Sticky nav state ---- */
  var nav = $("#nav");
  var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 40); };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- Mobile menu ---- */
  var toggle = $("#navToggle");
  var links = $("#navLinks");
  var setMenu = function (open) {
    links.classList.toggle("open", open);
    document.body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  toggle.addEventListener("click", function () {
    setMenu(!links.classList.contains("open"));
  });
  $$("#navLinks a").forEach(function (a) {
    a.addEventListener("click", function () { setMenu(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && links.classList.contains("open")) setMenu(false);
  });

  /* ---- Current year ---- */
  var yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Keep the trip dropdown in sync with the Upcoming Trips cards ---- */
  var tripSelect = $("#tripSelect");
  var tripCards = $$("#upcomingList .trip");
  if (tripSelect && tripCards.length) {
    // rebuild options from the cards so editing the HTML cards is enough
    tripSelect.innerHTML =
      '<option value="" disabled selected>Choose an adventure…</option>';
    tripCards.forEach(function (card) {
      var label = card.getAttribute("data-trip");
      var opt = document.createElement("option");
      opt.textContent = label;
      tripSelect.appendChild(opt);
    });
    var notSure = document.createElement("option");
    notSure.textContent = "Not sure yet — add me to the list";
    tripSelect.appendChild(notSure);
  }

  /* ---- "Register" buttons on trip cards pre-select that trip ---- */
  $$("[data-pick]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var label = btn.getAttribute("data-pick");
      if (!tripSelect) return;
      $$("option", tripSelect).forEach(function (o) {
        if (o.textContent === label) o.selected = true;
      });
    });
  });

  /* ---- Reveal-on-scroll ---- */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealEls = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---- Lightbox gallery ---- */
  var lb = $("#lightbox");
  var lbImg = $("#lightboxImg");
  var lbClose = $("#lightboxClose");
  var openLightbox = function (src, alt) {
    lbImg.src = src; lbImg.alt = alt || "";
    lb.classList.add("open"); lb.setAttribute("aria-hidden", "false");
  };
  var closeLightbox = function () {
    lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); lbImg.src = "";
  };
  $$(".thumb").forEach(function (t) {
    t.addEventListener("click", function () {
      var img = $("img", t);
      openLightbox(t.getAttribute("data-full"), img ? img.alt : "");
    });
  });
  lbClose.addEventListener("click", closeLightbox);
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLightbox(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLightbox(); });

  /* ---- Registration form ---- */
  var form = $("#registerForm");
  var status = $("#formStatus");

  var setStatus = function (msg, kind) {
    status.textContent = msg;
    status.className = "form__status" + (kind ? " " + kind : "");
  };

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    setStatus("", "");

    // basic validation
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    // honeypot
    if (form._honey && form._honey.value) return;

    var data = new FormData(form);
    data.append("_subject", "New trip registration — LA Adventure Club");
    data.append("_template", "table");

    form.classList.add("sending");
    setStatus("Sending your registration…");

    fetch(FORMSUBMIT_ENDPOINT, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: data
    })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (res) {
        form.classList.remove("sending");
        // FormSubmit returns { success: "true" } (string) on success
        var ok = res && (res.success === "true" || res.success === true);
        if (ok) {
          form.reset();
          setStatus("🎉 You're on the list! Check your email for trip details soon.", "ok");
        } else {
          mailtoFallback(data);
        }
      })
      .catch(function () {
        form.classList.remove("sending");
        mailtoFallback(data);
      });
  });

  /* If the form service is unreachable, fall back to opening the user's email app */
  function mailtoFallback(data) {
    var lines = [];
    data.forEach(function (v, k) {
      if (k.charAt(0) === "_" || k === "waiver") return;
      lines.push(k.charAt(0).toUpperCase() + k.slice(1) + ": " + v);
    });
    var body = encodeURIComponent(
      "Hi! I'd like to register for a trip.\n\n" + lines.join("\n")
    );
    var subject = encodeURIComponent("Trip registration — LA Adventure Club");
    setStatus("Opening your email app to finish — just hit send.", "ok");
    window.location.href =
      "mailto:" + REGISTRATION_EMAIL + "?subject=" + subject + "&body=" + body;
  }
})();
