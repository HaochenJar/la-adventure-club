/* ============================================================================
 *  LA Adventure Club — member portal logic (Supabase)
 *  Handles: Google sign-in → profile questionnaire → event registration.
 * ========================================================================== */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---- year ---- */
  var yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- config check ---- */
  var cfg = window.LAAC_CONFIG || {};
  var configured =
    cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    cfg.SUPABASE_URL.indexOf("YOUR_") === -1 &&
    cfg.SUPABASE_ANON_KEY.indexOf("YOUR_") === -1 &&
    window.supabase && typeof window.supabase.createClient === "function";

  /* ---- show exactly one portal state ---- */
  function show(id) {
    $$(".pstate").forEach(function (el) {
      el.classList.toggle("hidden", el.id !== id);
    });
  }

  if (!configured) {
    show("portalNotConfigured");
    return;
  }

  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  var signOutBtn = $("#signOutBtn");
  var currentUser = null;

  /* ---- helpers ---- */
  function setStatus(el, msg, kind) {
    if (!el) return;
    el.textContent = msg || "";
    el.className = "form__status" + (kind ? " " + kind : "");
  }
  function initials(name) {
    if (!name) return "?";
    var p = name.trim().split(/\s+/);
    return (p[0][0] + (p[1] ? p[1][0] : "")).toUpperCase();
  }
  function param(name) {
    return new URLSearchParams(location.search).get(name);
  }
  function fmtDate(iso) {
    if (!iso) return { day: "—", mon: "" };
    var p = iso.split("-"); // YYYY-MM-DD, no timezone surprises
    var months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    return { day: String(parseInt(p[2], 10)), mon: months[parseInt(p[1], 10) - 1] || "" };
  }
  var ACTIVITY_ICON = { hiking: "#i-mountain", paddle: "#i-waves", walk: "#i-waves" };

  /* ---- sign in / out ---- */
  $("#googleSignIn").addEventListener("click", function () {
    sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin + location.pathname + location.search }
    });
  });
  signOutBtn.addEventListener("click", function () {
    sb.auth.signOut();
  });

  /* ---- profile form ---- */
  var profileForm = $("#profileForm");
  profileForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!profileForm.checkValidity()) { profileForm.reportValidity(); return; }
    var statusEl = $("#profileStatus");
    var btn = $("#profileSubmit");
    btn.disabled = true;
    setStatus(statusEl, "Saving…");

    var fd = new FormData(profileForm);
    var row = {
      id: currentUser.id,
      email: currentUser.email,
      full_name: (fd.get("full_name") || "").trim(),
      age_range: fd.get("age_range"),
      gender: fd.get("gender"),
      phone: (fd.get("phone") || "").trim() || null,
      emergency_contact_name: (fd.get("emergency_contact_name") || "").trim() || null,
      emergency_contact_phone: (fd.get("emergency_contact_phone") || "").trim() || null,
      experience_level: fd.get("experience_level"),
      waiver_accepted: true,
      profile_complete: true
    };

    sb.from("profiles").upsert(row).select().single().then(function (res) {
      btn.disabled = false;
      if (res.error) { setStatus(statusEl, "Couldn't save: " + res.error.message, "err"); return; }
      goToDashboard(res.data);
    });
  });

  /* ---- prefill the profile form from the Google account ---- */
  function prefillProfile(profile) {
    var name = (profile && profile.full_name) ||
      (currentUser.user_metadata && (currentUser.user_metadata.full_name || currentUser.user_metadata.name)) || "";
    if (name) profileForm.full_name.value = name;
    if (profile) {
      if (profile.age_range) profileForm.age_range.value = profile.age_range;
      if (profile.gender) profileForm.gender.value = profile.gender;
      if (profile.phone) profileForm.phone.value = profile.phone;
      if (profile.emergency_contact_name) profileForm.emergency_contact_name.value = profile.emergency_contact_name;
      if (profile.emergency_contact_phone) profileForm.emergency_contact_phone.value = profile.emergency_contact_phone;
      if (profile.experience_level) profileForm.experience_level.value = profile.experience_level;
      if (profile.waiver_accepted) profileForm.waiver.checked = true;
    }
  }

  $("#editProfileBtn").addEventListener("click", function () {
    loadProfile().then(function (p) { prefillProfile(p); show("portalProfile"); });
  });

  /* ---- data loads ---- */
  function loadProfile() {
    return sb.from("profiles").select("*").eq("id", currentUser.id).maybeSingle()
      .then(function (res) { return res.data; });
  }

  function goToDashboard(profile) {
    $("#dashGreeting").textContent = "Hey " + ((profile.full_name || "").split(" ")[0] || "there") + " 👋";
    $("#dashAvatar").textContent = initials(profile.full_name);
    $("#dashName").textContent = profile.full_name || currentUser.email;
    var bits = [];
    if (profile.age_range) bits.push("Age " + profile.age_range);
    if (profile.experience_level) bits.push({ first_timer: "First-timer", some: "Some experience", experienced: "Experienced" }[profile.experience_level]);
    bits.push(currentUser.email);
    $("#dashMeta").textContent = bits.join(" · ");
    show("portalDashboard");
    loadEvents();
  }

  function loadEvents() {
    var list = $("#eventsList");
    list.innerHTML = '<p class="muted">Loading trips…</p>';
    sb.rpc("events_with_status").then(function (res) {
      if (res.error) { list.innerHTML = '<p class="muted">Couldn\'t load trips: ' + res.error.message + "</p>"; return; }
      var events = res.data || [];
      if (!events.length) { list.innerHTML = '<p class="muted">No upcoming trips posted yet — check back soon.</p>'; return; }
      list.innerHTML = "";
      var preselect = param("event");
      events.forEach(function (ev) {
        list.appendChild(eventCard(ev, ev.slug && ev.slug === preselect));
      });
    });
  }

  /* ---- one event card ---- */
  function eventCard(ev, highlight) {
    var d = fmtDate(ev.event_date);
    var el = document.createElement("article");
    el.className = "ecard" + (highlight ? " ecard--focus" : "");

    var icon = ACTIVITY_ICON[ev.activity] || "#i-compass";
    var availability;
    if (ev.capacity == null) availability = "Open";
    else if (ev.spots_left > 0) availability = ev.spots_left + " spot" + (ev.spots_left === 1 ? "" : "s") + " left";
    else availability = "Full — waitlist open";

    var head =
      '<div class="ecard__date"><b>' + d.day + "</b><span>" + d.mon + "</span></div>" +
      '<div class="ecard__main">' +
        '<p class="ecard__tag"><svg aria-hidden="true"><use href="' + icon + '"/></svg> ' +
          esc(cap(ev.activity || "Trip")) + (ev.difficulty ? " · " + esc(ev.difficulty) : "") + "</p>" +
        "<h3>" + esc(ev.title) + "</h3>" +
        '<p class="ecard__meta">' +
          (ev.location ? '<span><svg aria-hidden="true"><use href="#i-pin"/></svg> ' + esc(ev.location) + "</span>" : "") +
          (ev.start_time ? '<span><svg aria-hidden="true"><use href="#i-clock"/></svg> ' + esc(ev.start_time) + "</span>" : "") +
          '<span><svg aria-hidden="true"><use href="#i-user"/></svg> ' + availability + "</span>" +
        "</p>" +
        (ev.description ? "<p class=\"ecard__desc\">" + esc(ev.description) + "</p>" : "") +
      "</div>";

    var action = document.createElement("div");
    action.className = "ecard__action";

    if (ev.i_registered) {
      var badge = ev.my_status === "waitlist" ? '<span class="rbadge rbadge--wait">Waitlisted</span>'
                                              : '<span class="rbadge rbadge--ok"><svg aria-hidden="true"><use href="#i-check"/></svg> You\'re in</span>';
      action.innerHTML = badge +
        (ev.my_guests ? '<span class="ecard__guests">+' + ev.my_guests + " guest" + (ev.my_guests === 1 ? "" : "s") + "</span>" : "") +
        '<button class="linkbtn linkbtn--danger" type="button">Cancel</button>';
      action.querySelector("button").addEventListener("click", function () { doCancel(ev); });
    } else {
      action.innerHTML =
        '<label class="ecard__guestsel"><span>Guests</span>' +
          '<select><option value="0">Just me</option><option value="1">+1</option><option value="2">+2</option><option value="3">+3</option></select>' +
        "</label>" +
        '<button class="btn btn--accent btn--sm" type="button">Register <svg aria-hidden="true"><use href="#i-arrow"/></svg></button>';
      var sel = action.querySelector("select");
      action.querySelector("button").addEventListener("click", function () { doRegister(ev, parseInt(sel.value, 10)); });
    }

    el.innerHTML = head;
    el.appendChild(action);
    return el;
  }

  function doRegister(ev, guests) {
    sb.rpc("register_for_event", { p_event: ev.id, p_guests: guests || 0, p_notes: null })
      .then(function (res) {
        if (res.error) { alert(res.error.message); return; }
        loadEvents();
      });
  }
  function doCancel(ev) {
    sb.rpc("cancel_registration", { p_event: ev.id }).then(function (res) {
      if (res.error) { alert(res.error.message); return; }
      loadEvents();
    });
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /* ---- route after auth state is known ---- */
  function route() {
    if (!currentUser) {
      signOutBtn.classList.add("hidden");
      show("portalSignedOut");
      return;
    }
    signOutBtn.classList.remove("hidden");
    loadProfile().then(function (profile) {
      if (profile && profile.profile_complete) {
        goToDashboard(profile);
      } else {
        prefillProfile(profile);
        show("portalProfile");
      }
    });
  }

  /* ---- boot ---- */
  sb.auth.onAuthStateChange(function (_event, session) {
    currentUser = session ? session.user : null;
    route();
  });
  sb.auth.getSession().then(function (res) {
    currentUser = res.data.session ? res.data.session.user : null;
    route();
  });
})();
