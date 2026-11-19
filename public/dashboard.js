// Accounts, user dashboard, property submissions and admin review.
// Loaded after script.js. Talks to the CrestHaven server (see server/index.js).
(function () {
  "use strict";

  var CH = window.CrestHaven;
  if (!CH) return;

  var cfg = window.CRESTHAVEN_CONFIG || {};
  var base = cfg.apiBase || "/api";
  var CATEGORIES = ["Villa", "Penthouse", "Residence", "Chalet", "Apartment"];
  var STATUS_LABEL = { pending: "Pending review", approved: "Live", rejected: "Needs changes" };
  var TABS = [
    ["overview", "Overview"],
    ["listings", "My properties"],
    ["add", "Add new property"],
    ["saved", "Saved properties"],
    ["design", "My design requests"],
    ["consult", "Consultation requests"],
    ["messages", "Messages"],
    ["profile", "Profile settings"]
  ];
  var MAX_PHOTOS = 12;

  var me = null;
  var favKeys = [];
  var myListings = [];
  var keepImages = [];
  var editingId = null;
  var authMessage = "";

  // ---------- Helpers ----------
  function $(sel, root) { return (root || document).querySelector(sel); }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fv(form, name) {
    var el = form.elements.namedItem(name);
    return el && el.value ? String(el.value).trim() : "";
  }

  function api(method, path, body) {
    var opts = { method: method, headers: {}, credentials: "same-origin" };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    return fetch(base + path, opts)
      .then(function (res) {
        return res.json().catch(function () {
          return { ok: false, error: "Unexpected response from the server." };
        });
      })
      .catch(function () {
        return { ok: false, error: "We could not reach the server. Please check your connection and try again." };
      });
  }

  function go(hash) {
    if (window.location.hash === "#" + hash) {
      CH.route();
    } else {
      window.location.hash = hash;
    }
  }

  function dateText(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function priceOf(n) {
    return CH.money ? CH.money(n) : String(n);
  }

  function options(list, selected) {
    return list.map(function (item) {
      var value = Array.isArray(item) ? item[0] : item;
      var label = Array.isArray(item) ? item[1] : item;
      return '<option value="' + esc(value) + '"' + (String(value) === String(selected) ? " selected" : "") + ">" + esc(label) + "</option>";
    }).join("");
  }

  function numberOptions(max, selected) {
    var list = [];
    for (var i = 0; i <= max; i++) list.push(String(i));
    return options(list, selected);
  }

  function statusBadge(status) {
    return '<span class="status-pill is-' + esc(status) + '">' + esc(STATUS_LABEL[status] || status) + "</span>";
  }

  function notice(text, ok) {
    return '<p class="request-status ' + (ok ? "is-ok" : "is-error") + '" role="status">' + esc(text) + "</p>";
  }

  // Compress a photo to a JPEG data URL, so uploads stay small.
  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file.type || file.type.indexOf("image/") !== 0) {
        reject(new Error(file.name + " is not an image."));
        return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var max = 1600;
        var scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read " + file.name + ". Please use JPG, PNG or WebP."));
      };
      img.src = url;
    });
  }

  function compressAll(files) {
    var list = Array.prototype.slice.call(files || []);
    var out = [];
    return list.reduce(function (chain, file) {
      return chain.then(function () {
        return compressImage(file).then(function (data) { out.push(data); });
      });
    }, Promise.resolve()).then(function () { return out; });
  }

  // ---------- Session and favourites ----------
  function setFavoriteHook() {
    if (me) {
      window.CrestHavenFavorites = {
        list: function () { return favKeys.slice(); },
        set: function (id, on) {
          if (on) {
            if (favKeys.indexOf(id) < 0) favKeys.push(id);
            return api("POST", "/favorites", { key: id });
          }
          favKeys = favKeys.filter(function (k) { return k !== id; });
          return api("DELETE", "/favorites/" + encodeURIComponent(id));
        }
      };
    } else {
      delete window.CrestHavenFavorites;
    }
  }

  function updateNav() {
    var link = document.getElementById("nav-account");
    if (!link) return;
    if (me) {
      link.textContent = "Dashboard";
      link.setAttribute("href", "#dashboard-overview");
    } else {
      link.textContent = "Log in";
      link.setAttribute("href", "#login");
    }
  }

  function loadFavorites() {
    if (!me) {
      favKeys = [];
      return Promise.resolve();
    }
    return api("GET", "/favorites").then(function (d) {
      favKeys = d.ok ? d.keys : [];
    });
  }

  function afterAuth(user) {
    me = user;
    updateNav();
    return loadFavorites().then(setFavoriteHook);
  }

  // ---------- Auth views ----------
  function showAuth(mode) {
    CH.showView("auth");
    CH.setActiveNav("");
    var body = $("#auth-body");
    var isLogin = mode !== "signup";
    var msg = authMessage;
    authMessage = "";
    body.innerHTML =
      '<div class="auth-card">' +
        '<p class="eyebrow">Your CrestHaven account</p>' +
        '<h1 class="dash-title">' + (isLogin ? "Log in" : "Create your account") + "</h1>" +
        '<p class="note">' + (isLogin
          ? "Manage your listings, saved homes, design requests and messages from one place."
          : "Create a free account to submit properties, save homes and track your requests.") + "</p>" +
        (msg ? notice(msg, false) : "") +
        '<form class="request-form" data-form="' + (isLogin ? "login" : "signup") + '" novalidate>' +
          (isLogin ? "" :
            '<label class="field"><span class="field-label">Full name</span><input name="name" type="text" autocomplete="name" maxlength="120" required></label>' +
            '<label class="field"><span class="field-label">Phone number</span><input name="phone" type="tel" autocomplete="tel" maxlength="40" placeholder="+92 300 0000000" required></label>') +
          '<label class="field"><span class="field-label">Email</span><input name="email" type="email" autocomplete="email" maxlength="160" required></label>' +
          '<label class="field"><span class="field-label">Password' + (isLogin ? "" : " (at least 8 characters)") + "</span>" +
            '<input name="password" type="password" autocomplete="' + (isLogin ? "current-password" : "new-password") + '" minlength="' + (isLogin ? 1 : 8) + '" required></label>' +
          '<button class="btn btn-dark" type="submit">' + (isLogin ? "Log in" : "Create account") + "</button>" +
          '<p class="request-status" data-form-status hidden></p>' +
        "</form>" +
        '<p class="note">' + (isLogin
          ? 'New to CrestHaven? <a href="#signup">Create an account</a>'
          : 'Already have an account? <a href="#login">Log in</a>') + "</p>" +
      "</div>";
  }

  function formStatus(form, text) {
    var el = $("[data-form-status]", form);
    if (!el) return;
    el.hidden = false;
    el.className = "request-status is-error";
    el.textContent = text;
  }

  function submitLogin(form) {
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    api("POST", "/auth/login", { email: fv(form, "email"), password: form.elements.namedItem("password").value }).then(function (d) {
      btn.disabled = false;
      if (!d.ok) { formStatus(form, d.error || "Could not log in."); return; }
      afterAuth(d.user).then(function () { go("dashboard-overview"); });
    });
  }

  function submitSignup(form) {
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    api("POST", "/auth/signup", {
      name: fv(form, "name"), email: fv(form, "email"), phone: fv(form, "phone"),
      password: form.elements.namedItem("password").value
    }).then(function (d) {
      btn.disabled = false;
      if (!d.ok) { formStatus(form, d.error || "Could not create the account."); return; }
      afterAuth(d.user).then(function () { go("dashboard-overview"); });
    });
  }

  function logout() {
    api("POST", "/auth/logout").then(function () {
      me = null;
      favKeys = [];
      setFavoriteHook();
      updateNav();
      go("home");
    });
  }

  // ---------- Dashboard shell ----------
  function renderNav(active) {
    var nav = $("#dash-nav");
    if (!nav) return;
    var html = TABS.map(function (t) {
      return '<a href="#dashboard-' + t[0] + '"' + (t[0] === active ? ' class="is-active" aria-current="page"' : "") + ">" + esc(t[1]) + "</a>";
    }).join("");
    if (me && me.role === "admin") html += '<a href="#admin-listings">Admin panel</a>';
    nav.innerHTML = html;
  }

  function renderTab(tab) {
    CH.showView("dashboard");
    CH.setActiveNav("");
    renderNav(tab);
    var body = $("#dash-body");
    body.innerHTML = '<p class="note">Loading...</p>';
    var panel = PANELS[tab] || PANELS.overview;
    panel(body);
  }

  function head(eyebrow, title, text) {
    return '<p class="eyebrow">' + esc(eyebrow) + '</p><h1 class="dash-title">' + esc(title) + "</h1>" +
      (text ? '<p class="note dash-lead">' + esc(text) + "</p>" : "");
  }

  function stat(label, value) {
    return '<div class="stat-box"><dt>' + esc(label) + "</dt><dd>" + esc(value || 0) + "</dd></div>";
  }

  // ---------- Listing cards ----------
  function ownCard(l) {
    var img = l.images && l.images[0]
      ? '<img src="' + esc(l.images[0]) + '" alt="" loading="lazy">'
      : '<div class="thumb-empty" aria-hidden="true"></div>';
    var view = l.status === "approved"
      ? '<a class="btn btn-outline-dark btn-small" href="#property-l-' + esc(l.id) + '">View live page</a>' : "";
    return '<article class="own-card">' +
      '<div class="own-media">' + img + "</div>" +
      '<div class="own-body">' +
        statusBadge(l.status) +
        "<h3>" + esc(l.title) + "</h3>" +
        '<p class="note">' + esc(l.location) + " · " + esc(l.type) + " · " + (l.purpose === "rent" ? "For rent" : "For sale") + "</p>" +
        '<p class="own-price">' + esc(priceOf(l.price)) + "</p>" +
        (l.adminNote ? '<p class="admin-note">Team note: ' + esc(l.adminNote) + "</p>" : "") +
        '<div class="own-actions">' +
          '<button class="btn btn-dark btn-small" type="button" data-action="edit" data-id="' + esc(l.id) + '">Edit</button>' +
          view +
          '<button class="btn btn-outline-dark btn-small" type="button" data-action="delete" data-id="' + esc(l.id) + '">Delete</button>' +
        "</div>" +
      "</div></article>";
  }

  function threadHTML(messages) {
    if (!messages || !messages.length) return '<p class="note">No messages yet.</p>';
    return messages.map(function (m) {
      return '<div class="msg is-' + esc(m.sender) + '"><p class="msg-meta">' +
        esc(m.sender === "admin" ? "CrestHaven team" : "You") + " · " + esc(dateText(m.createdAt)) +
        "</p><p>" + esc(m.body) + "</p></div>";
    }).join("");
  }

  function fieldsHTML(fields) {
    if (!fields || !fields.length) return "";
    return '<dl class="field-list">' + fields.slice(0, 12).map(function (f) {
      return "<div><dt>" + esc(f[0]) + "</dt><dd>" + esc(f[1]) + "</dd></div>";
    }).join("") + "</dl>";
  }

  function requestCard(r, withThread) {
    return '<article class="thread-card" data-request="' + esc(r.id) + '">' +
      '<div class="thread-head"><p class="eyebrow">' + esc(r.typeTitle) + "</p>" +
      '<p class="note">' + esc(dateText(r.createdAt)) + "</p></div>" +
      (withThread ? "" : fieldsHTML(r.fields)) +
      (withThread
        ? '<div class="thread">' + threadHTML(r.messages) + "</div>" +
          '<form class="reply-form" data-form="user-reply" data-id="' + esc(r.id) + '" novalidate>' +
            '<label class="field"><span class="field-label">Write a message to the team</span>' +
            '<textarea name="body" rows="3" maxlength="2000" required></textarea></label>' +
            '<button class="btn btn-dark btn-small" type="submit">Send message</button>' +
            '<p class="request-status" data-form-status hidden></p></form>'
        : "") +
      "</article>";
  }

  // ---------- Dashboard panels ----------
  var PANELS = {};

  PANELS.overview = function (body) {
    api("GET", "/dashboard/summary").then(function (d) {
      var s = d.summary || {};
      body.innerHTML = head("Welcome back", me.name, "Track your listings, saved homes, requests and messages from here.") +
        '<dl class="summary-grid">' +
          stat("Listings", s.listings) + stat("Live", s.approved) + stat("Pending review", s.pending) +
          stat("Saved homes", s.favorites) + stat("Requests", s.requests) + stat("Team replies", s.replies) +
        "</dl>" +
        '<div class="dash-actions">' +
          '<a class="btn btn-dark" href="#dashboard-add">Add a new property</a>' +
          '<a class="btn btn-outline-dark" href="#dashboard-messages">Open messages</a>' +
          '<a class="btn btn-outline-dark" href="#design">Start a design brief</a>' +
        "</div>";
    });
  };

  PANELS.listings = function (body) {
    api("GET", "/my/listings").then(function (d) {
      if (!d.ok) { body.innerHTML = notice(d.error, false); return; }
      myListings = d.listings;
      var intro = head("Dashboard", "My properties", "Listings stay pending until our team approves them. You can edit a listing at any time, and it goes back to review.");
      if (!myListings.length) {
        body.innerHTML = intro + '<p class="note">You have not added a property yet.</p>' +
          '<a class="btn btn-dark" href="#dashboard-add">Add your first property</a>';
        return;
      }
      body.innerHTML = intro + '<div class="own-grid">' + myListings.map(ownCard).join("") + "</div>";
    });
  };

  function ensureListings() {
    if (editingId && !myListings.some(function (l) { return l.id === editingId; })) {
      return api("GET", "/my/listings").then(function (d) {
        if (d.ok) myListings = d.listings;
      });
    }
    return Promise.resolve();
  }

  PANELS.add = function (body) {
    ensureListings().then(function () {
      var l = editingId ? myListings.filter(function (x) { return x.id === editingId; })[0] : null;
      if (editingId && !l) editingId = null;
      keepImages = l ? l.images.slice() : [];
      var v = function (key) { return l ? l[key] : ""; };
      var features = l ? l.features.join("\n") : "";
      var photoThumbs = keepImages.map(function (src) {
        return '<img src="' + esc(src) + '" alt="" loading="lazy">';
      }).join("");

      body.innerHTML = head("Dashboard", l ? "Edit property" : "Add a new property",
        "Submit the details below. Our team reviews every listing before it goes live, usually within one business day.") +
        '<form class="request-form dash-form" data-form="listing" novalidate>' +
          '<div class="field-row">' +
            '<label class="field"><span class="field-label">Property title</span><input name="title" type="text" maxlength="120" value="' + esc(v("title")) + '" required></label>' +
            '<label class="field"><span class="field-label">Listing type</span><select name="purpose">' +
              options([["buy", "For sale"], ["rent", "For rent"]], v("purpose") || "buy") + "</select></label>" +
            '<label class="field"><span class="field-label">Category</span><select name="type" required>' +
              '<option value="">Select a category</option>' + options(CATEGORIES, v("type")) + "</select></label>" +
            '<label class="field"><span class="field-label">Neighbourhood</span><input name="location" type="text" maxlength="120" value="' + esc(v("location")) + '" required></label>' +
            '<label class="field"><span class="field-label">Asking price</span><input name="price" type="number" min="1" step="1" value="' + esc(v("price")) + '" required></label>' +
            '<label class="field"><span class="field-label">Area (m²)</span><input name="area" type="number" min="1" step="1" value="' + esc(v("area")) + '" required></label>' +
            '<label class="field"><span class="field-label">Bedrooms</span><select name="beds">' + numberOptions(10, v("beds")) + "</select></label>" +
            '<label class="field"><span class="field-label">Bathrooms</span><select name="baths">' + numberOptions(10, v("baths")) + "</select></label>" +
          "</div>" +
          '<label class="field"><span class="field-label">Key features (one per line)</span><textarea name="features" rows="4" maxlength="1200">' + esc(features) + "</textarea></label>" +
          '<label class="field"><span class="field-label">Description</span><textarea name="description" rows="6" minlength="20" maxlength="3000" required>' + esc(v("description")) + "</textarea></label>" +
          (photoThumbs ? '<div class="photo-row" aria-label="Current photos">' + photoThumbs + "</div>" : "") +
          '<label class="field"><span class="field-label">Photos (up to ' + MAX_PHOTOS + ', JPG, PNG or WebP)</span>' +
            '<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple></label>' +
          '<div class="dash-actions">' +
            '<button class="btn btn-dark" type="submit">' + (l ? "Save and resubmit" : "Submit for review") + "</button>" +
            (l ? '<button class="btn btn-outline-dark" type="button" data-action="cancel-edit">Cancel editing</button>' : "") +
          "</div>" +
          '<p class="request-status" data-form-status hidden></p>' +
        "</form>";
    });
  };

  PANELS.saved = function (body) {
    var list = CH.PROPERTIES.filter(function (p) { return favKeys.indexOf(p.id) > -1; });
    var intro = head("Dashboard", "Saved properties", "Homes you have saved. Your list syncs to your account on every device.");
    if (!list.length) {
      body.innerHTML = intro + '<p class="note">No saved homes yet. Tap "Save to favorites" on any property page.</p>' +
        '<a class="btn btn-dark" href="#buy">Browse homes for sale</a>';
      return;
    }
    body.innerHTML = intro + '<div class="saved-grid">' + list.map(function (p) {
      return '<div class="saved-item">' + CH.cardHTML(p) +
        '<button class="btn btn-outline-dark btn-small" type="button" data-action="unsave" data-key="' + esc(p.id) + '">Remove from saved</button></div>';
    }).join("") + "</div>";
  };

  function loadRequests(filterFn, body, title, text, emptyText, emptyLink) {
    api("GET", "/my/requests").then(function (d) {
      if (!d.ok) { body.innerHTML = notice(d.error, false); return; }
      var list = d.requests.filter(filterFn);
      var intro = head("Dashboard", title, text);
      if (!list.length) {
        body.innerHTML = intro + '<p class="note">' + esc(emptyText) + "</p>" +
          '<a class="btn btn-dark" href="' + esc(emptyLink) + '">Start now</a>';
        return;
      }
      body.innerHTML = intro + list.map(function (r) { return requestCard(r, false); }).join("");
    });
  }

  PANELS.design = function (body) {
    loadRequests(function (r) { return r.type === "design"; }, body,
      "My design requests", "Your design briefs and the AI suggestions your team has reviewed with you.",
      "You have not sent a design brief yet.", "#design");
  };

  PANELS.consult = function (body) {
    loadRequests(function (r) { return r.type !== "design"; }, body,
      "Consultation requests", "Architect consultations, enquiries and bookings you have sent to our team.",
      "You have no consultation requests yet.", "#architect");
  };

  PANELS.messages = function (body) {
    api("GET", "/my/requests").then(function (d) {
      if (!d.ok) { body.innerHTML = notice(d.error, false); return; }
      var intro = head("Dashboard", "Messages", "Your requests and replies from the CrestHaven team. Reply here and we will respond in this thread.");
      if (!d.requests.length) {
        body.innerHTML = intro + '<p class="note">No messages yet. Enquiries you send from the site appear here.</p>';
        return;
      }
      body.innerHTML = intro + d.requests.map(function (r) { return requestCard(r, true); }).join("");
    });
  };

  PANELS.profile = function (body) {
    body.innerHTML = head("Dashboard", "Profile settings", "Keep your contact details up to date so our advisors can reach you.") +
      '<form class="request-form" data-form="profile" novalidate>' +
        '<label class="field"><span class="field-label">Full name</span><input name="name" type="text" maxlength="120" value="' + esc(me.name) + '" required></label>' +
        '<label class="field"><span class="field-label">Email</span><input name="email" type="email" value="' + esc(me.email) + '" readonly></label>' +
        '<label class="field"><span class="field-label">Phone number</span><input name="phone" type="tel" maxlength="40" value="' + esc(me.phone) + '"></label>' +
        '<label class="field"><span class="field-label">City</span><input name="city" type="text" maxlength="80" value="' + esc(me.city) + '"></label>' +
        '<div class="dash-actions"><button class="btn btn-dark" type="submit">Save changes</button>' +
        '<button class="btn btn-outline-dark" type="button" data-action="logout">Log out</button></div>' +
        '<p class="request-status" data-form-status hidden></p>' +
      "</form>";
  };

  // ---------- Admin ----------
  function showAdmin(tab) {
    CH.showView("admin");
    CH.setActiveNav("");
    var nav = $("#admin-nav");
    nav.innerHTML =
      '<a href="#admin-listings"' + (tab === "listings" ? ' class="is-active"' : "") + ">Property review</a>" +
      '<a href="#admin-requests"' + (tab === "requests" ? ' class="is-active"' : "") + ">Enquiries and replies</a>" +
      '<a href="#admin-advisors"' + (tab === "advisors" ? ' class="is-active"' : "") + ">Advisors</a>" +
      '<a href="#dashboard-overview">Back to dashboard</a>';
    var body = $("#admin-body");
    body.innerHTML = '<p class="note">Loading...</p>';
    if (tab === "advisors") {
      showAdvisors(body);
      return;
    }
    if (tab === "requests") {
      api("GET", "/admin/requests").then(function (d) {
        if (!d.ok) { body.innerHTML = notice(d.error, false); return; }
        body.innerHTML = head("Admin", "Enquiries and replies", "Every submission from the site. Reply here and the client sees it in their dashboard.") +
          (d.requests.length
            ? d.requests.map(function (r) {
                return '<article class="thread-card"><div class="thread-head"><p class="eyebrow">' + esc(r.typeTitle) + "</p>" +
                  '<p class="note">' + esc(r.name) + " · " + esc(r.email) + " · " + esc(r.phone) + " · " + esc(dateText(r.createdAt)) + "</p></div>" +
                  fieldsHTML(r.fields) +
                  '<div class="thread">' + threadHTML(r.messages) + "</div>" +
                  '<form class="reply-form" data-form="admin-reply" data-id="' + esc(r.id) + '" novalidate>' +
                    '<label class="field"><span class="field-label">Reply to client</span><textarea name="body" rows="3" maxlength="2000" required></textarea></label>' +
                    '<button class="btn btn-dark btn-small" type="submit">Send reply</button>' +
                    '<p class="request-status" data-form-status hidden></p></form></article>';
              }).join("")
            : '<p class="note">No submissions yet.</p>');
      });
      return;
    }
    Promise.all([api("GET", "/admin/listings"), api("GET", "/admin/advisors")]).then(function (res) {
      var d = res[0];
      var advisors = res[1].ok ? res[1].advisors : [];
      if (!d.ok) { body.innerHTML = notice(d.error, false); return; }
      body.innerHTML = head("Admin", "Property review", "Approve a listing to publish it on the site. Use a note to explain what the owner should change.") +
        (d.listings.length
          ? '<div class="own-grid">' + d.listings.map(function (l) {
              var img = l.images && l.images[0] ? '<img src="' + esc(l.images[0]) + '" alt="" loading="lazy">' : '<div class="thumb-empty" aria-hidden="true"></div>';
              return '<article class="own-card admin-card" data-listing="' + esc(l.id) + '">' +
                '<div class="own-media">' + img + "</div>" +
                '<div class="own-body">' + statusBadge(l.status) +
                  "<h3>" + esc(l.title) + "</h3>" +
                  '<p class="note">Owner: ' + esc(l.ownerName) + " (" + esc(l.ownerEmail) + ")</p>" +
                  '<p class="note">' + esc(l.location) + " · " + esc(l.type) + " · " + (l.purpose === "rent" ? "For rent" : "For sale") + " · " + esc(priceOf(l.price)) + "</p>" +
                  '<p class="note">' + esc(l.beds) + " beds · " + esc(l.baths) + " baths · " + esc(l.area) + " m²</p>" +
                  '<label class="field"><span class="field-label">Note to owner (optional)</span><textarea data-note rows="2" maxlength="300">' + esc(l.adminNote) + "</textarea></label>" +
                  '<label class="field"><span class="field-label">Assigned advisor</span><select data-advisor>' + advisorOptions(advisors, l.advisorId) + "</select></label>" +
                  '<button class="btn btn-outline-dark btn-small" type="button" data-action="assign-advisor" data-id="' + esc(l.id) + '">Save advisor</button>' +
                  '<div class="own-actions">' +
                    '<button class="btn btn-dark btn-small" type="button" data-action="set-status" data-status="approved" data-id="' + esc(l.id) + '">Approve</button>' +
                    '<button class="btn btn-outline-dark btn-small" type="button" data-action="set-status" data-status="rejected" data-id="' + esc(l.id) + '">Request changes</button>' +
                    '<button class="btn btn-outline-dark btn-small" type="button" data-action="set-status" data-status="pending" data-id="' + esc(l.id) + '">Mark pending</button>' +
                  "</div>" +
                "</div></article>";
            }).join("") + "</div>"
          : '<p class="note">No listings have been submitted yet.</p>');
    });
  }

  // ---------- Advisors (admin) ----------
  function advisorOptions(advisors, selected) {
    var list = [["", "Default (rotation)"]].concat(advisors.map(function (a) { return [String(a.id), a.name]; }));
    return options(list, selected == null ? "" : String(selected));
  }

  function advisorFields(a) {
    a = a || {};
    return '<div class="field-row">' +
      '<label class="field"><span class="field-label">Name</span><input name="name" maxlength="80" value="' + esc(a.name) + '" required></label>' +
      '<label class="field"><span class="field-label">Role</span><input name="role" maxlength="80" value="' + esc(a.role) + '" placeholder="Senior Property Advisor"></label>' +
      '<label class="field"><span class="field-label">Phone (with country code)</span><input name="phone" maxlength="30" value="' + esc(a.phone) + '" placeholder="+92 300 0000000" required></label>' +
      '<label class="field"><span class="field-label">Email (optional)</span><input name="email" type="email" maxlength="160" value="' + esc(a.email) + '"></label>' +
      "</div>";
  }

  function showAdvisors(body) {
    api("GET", "/admin/advisors").then(function (d) {
      if (!d.ok) { body.innerHTML = notice(d.error, false); return; }
      var existing = d.advisors.map(function (a) {
        return '<div class="thread-card"><form class="request-form" data-form="advisor-edit" data-id="' + esc(a.id) + '" novalidate>' +
          '<p class="eyebrow">' + esc(a.name) + "</p>" +
          advisorFields(a) +
          '<div class="dash-actions"><button class="btn btn-dark btn-small" type="submit">Save changes</button>' +
          '<button class="btn btn-outline-dark btn-small" type="button" data-action="advisor-remove" data-id="' + esc(a.id) + '">Remove advisor</button></div>' +
          '<p class="request-status" data-form-status hidden></p></form></div>';
      }).join("");
      body.innerHTML = head("Admin", "Advisors",
        "Add, edit or remove advisors. Then assign them to listings in Property review. A listing with no assigned advisor uses the default rotation.") +
        '<div class="thread-card"><form class="request-form" data-form="advisor-add" novalidate>' +
          '<p class="eyebrow">Add a new advisor</p>' + advisorFields(null) +
          '<button class="btn btn-dark btn-small" type="submit">Add advisor</button>' +
          '<p class="request-status" data-form-status hidden></p></form></div>' +
        (existing || '<p class="note">No advisors yet.</p>');
    });
  }

  function onAdvisorSubmit(form, kind) {
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var data = { name: fv(form, "name"), role: fv(form, "role"), phone: fv(form, "phone"), email: fv(form, "email") };
    var request = kind === "advisor-add"
      ? api("POST", "/admin/advisors", data)
      : api("PUT", "/admin/advisors/" + encodeURIComponent(form.getAttribute("data-id")), data);
    request.then(function (d) {
      if (!d.ok) { formStatus(form, d.error || "Could not save the advisor."); return; }
      showAdmin("advisors");
    });
  }

  // ---------- Listing submission (dashboard form and sell wizard) ----------
  function saveListing(id, body) {
    return id
      ? api("PUT", "/listings/" + encodeURIComponent(id), body)
      : api("POST", "/listings", body);
  }

  function onListingSubmit(form) {
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var btn = form.querySelector('button[type="submit"]');
    var files = form.elements.namedItem("photos").files;
    if (files.length + keepImages.length > MAX_PHOTOS) {
      formStatus(form, "Please keep to " + MAX_PHOTOS + " photos in total.");
      return;
    }
    var features = fv(form, "features").split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
    btn.disabled = true;
    btn.textContent = "Preparing photos...";
    compressAll(files).then(function (fresh) {
      var body = {
        title: fv(form, "title"), purpose: fv(form, "purpose"), type: fv(form, "type"),
        location: fv(form, "location"), price: fv(form, "price"), area: fv(form, "area"),
        beds: fv(form, "beds"), baths: fv(form, "baths"), description: fv(form, "description"),
        features: features, images: keepImages.concat(fresh)
      };
      return saveListing(editingId, body);
    }).then(function (d) {
      btn.disabled = false;
      btn.textContent = editingId ? "Save and resubmit" : "Submit for review";
      if (!d.ok) { formStatus(form, d.error || "Could not save the listing."); return; }
      editingId = null;
      keepImages = [];
      go("dashboard-listings");
    }).catch(function (err) {
      btn.disabled = false;
      btn.textContent = editingId ? "Save and resubmit" : "Submit for review";
      formStatus(form, err.message || "Could not prepare the photos.");
    });
  }

  // Called by the sell wizard in script.js.
  function submitFromWizard(form, result) {
    result.hidden = false;
    if (!me) {
      result.innerHTML = '<p class="request-status is-error">Please <a href="#login">log in</a> or <a href="#signup">create an account</a> to submit a listing. Our team reviews every listing before it goes live.</p>';
      return;
    }
    var type = form.querySelector('input[name="listing-type"]:checked');
    var body = {
      title: fv(form, "title"),
      purpose: type && type.value === "For rent" ? "rent" : "buy",
      type: fv(form, "category"),
      location: fv(form, "location"),
      price: fv(form, "price"),
      beds: fv(form, "beds"),
      baths: fv(form, "baths"),
      area: fv(form, "area"),
      description: fv(form, "description"),
      features: []
    };
    result.innerHTML = '<p class="note">Preparing your photos and submitting the listing...</p>';
    compressAll(form.elements.namedItem("photos").files).then(function (images) {
      body.images = images;
      return api("POST", "/listings", body);
    }).then(function (d) {
      if (!d.ok) {
        result.innerHTML = notice(d.error || "Could not submit the listing.", false);
        return;
      }
      result.innerHTML = notice("Thank you. Your listing was submitted and is waiting for approval. You can follow its status in your dashboard.", true) +
        '<a class="btn btn-outline-dark btn-small" href="#dashboard-listings">View my properties</a>';
    }).catch(function (err) {
      result.innerHTML = notice(err.message || "Could not prepare the photos.", false);
    });
  }

  // ---------- Delegated events ----------
  function onClick(event) {
    var el = event.target.closest("[data-action]");
    if (!el) return;
    var action = el.getAttribute("data-action");
    var id = el.getAttribute("data-id");

    if (action === "edit") {
      editingId = Number(id);
      go("dashboard-add");
    } else if (action === "cancel-edit") {
      editingId = null;
      keepImages = [];
      go("dashboard-listings");
    } else if (action === "delete") {
      if (!window.confirm("Delete this listing? This cannot be undone.")) return;
      api("DELETE", "/listings/" + encodeURIComponent(id)).then(function () { PANELS.listings($("#dash-body")); });
    } else if (action === "unsave") {
      var key = el.getAttribute("data-key");
      if (window.CrestHavenFavorites) window.CrestHavenFavorites.set(key, false);
      favKeys = favKeys.filter(function (k) { return k !== key; });
      PANELS.saved($("#dash-body"));
    } else if (action === "logout") {
      logout();
    } else if (action === "assign-advisor") {
      var adminCard = el.closest("[data-listing]");
      var select = adminCard ? adminCard.querySelector("[data-advisor]") : null;
      api("POST", "/admin/listings/" + encodeURIComponent(id) + "/advisor", {
        advisorId: select ? select.value : ""
      }).then(function (d) {
        if (!d.ok) { window.alert(d.error || "Could not assign the advisor."); return; }
        showAdmin("listings");
      });
    } else if (action === "advisor-remove") {
      if (!window.confirm("Remove this advisor? Listings assigned to them will use the default rotation.")) return;
      api("DELETE", "/admin/advisors/" + encodeURIComponent(id)).then(function () {
        showAdmin("advisors");
      });
    } else if (action === "set-status") {
      var card = el.closest("[data-listing]");
      var note = card ? card.querySelector("[data-note]") : null;
      api("POST", "/admin/listings/" + encodeURIComponent(id) + "/status", {
        status: el.getAttribute("data-status"),
        note: note ? note.value : ""
      }).then(function (d) {
        if (!d.ok) { window.alert(d.error || "Could not update the listing."); return; }
        showAdmin("listings");
      });
    }
  }

  function onSubmit(event) {
    var form = event.target;
    if (!form.matches || !form.hasAttribute("data-form")) return;
    event.preventDefault();
    var kind = form.getAttribute("data-form");

    if (kind === "login") return submitLogin(form);
    if (kind === "signup") return submitSignup(form);
    if (kind === "listing") return onListingSubmit(form);
    if (kind === "advisor-add" || kind === "advisor-edit") return onAdvisorSubmit(form, kind);

    if (!form.checkValidity()) { form.reportValidity(); return; }
    var btn = form.querySelector('button[type="submit"]');

    if (kind === "profile") {
      btn.disabled = true;
      api("PUT", "/me", { name: fv(form, "name"), phone: fv(form, "phone"), city: fv(form, "city") }).then(function (d) {
        btn.disabled = false;
        if (!d.ok) { formStatus(form, d.error); return; }
        me = d.user;
        updateNav();
        var status = $("[data-form-status]", form);
        if (status) {
          status.hidden = false;
          status.className = "request-status is-ok";
          status.textContent = "Your profile was saved.";
        }
      });
      return;
    }

    if (kind === "user-reply" || kind === "admin-reply") {
      var rid = form.getAttribute("data-id");
      var path = kind === "user-reply"
        ? "/my/requests/" + encodeURIComponent(rid) + "/messages"
        : "/admin/requests/" + encodeURIComponent(rid) + "/reply";
      var text = fv(form, "body");
      btn.disabled = true;
      api("POST", path, { body: text }).then(function (d) {
        btn.disabled = false;
        if (!d.ok) { formStatus(form, d.error); return; }
        if (kind === "admin-reply") {
          showAdmin("requests");
        } else {
          renderTab("messages");
        }
      });
    }
  }

  function onChange(event) {
    var input = event.target;
    if (input && input.name === "photos" && input.form && input.form.getAttribute("data-form") === "listing") {
      var note = $("#dash-photo-note", input.form);
      if (note) note.textContent = input.files.length + " photo(s) selected.";
    }
  }

  // ---------- Routing hook used by script.js ----------
  function handle(h) {
    if (h === "login" || h === "signup") {
      if (me) { go("dashboard-overview"); return true; }
      showAuth(h);
      return true;
    }
    if (h === "dashboard" || h.indexOf("dashboard-") === 0) {
      if (!me) {
        authMessage = "Please log in to open your dashboard.";
        showAuth("login");
        return true;
      }
      var tab = h === "dashboard" ? "overview" : h.slice("dashboard-".length);
      if (!PANELS[tab]) tab = "overview";
      if (tab !== "add") editingId = null;
      renderTab(tab);
      return true;
    }
    if (h === "admin" || h.indexOf("admin-") === 0) {
      if (!me || me.role !== "admin") {
        authMessage = "This page is for the CrestHaven admin team.";
        showAuth("login");
        return true;
      }
      showAdmin(h === "admin-requests" ? "requests" : h === "admin-advisors" ? "advisors" : "listings");
      return true;
    }
    return false;
  }

  // ---------- Boot ----------
  function boot() {
    var main = document.getElementById("app");
    if (main) {
      main.addEventListener("click", onClick);
      main.addEventListener("submit", onSubmit);
      main.addEventListener("change", onChange);
    }

    window.CrestHavenExt = {
      handle: handle,
      submitListing: submitFromWizard
    };

    Promise.all([api("GET", "/me"), api("GET", "/listings")]).then(function (r) {
      if (r[1].ok && r[1].listings.length) {
        CH.addProperties(r[1].listings);
      }
      return afterAuth(r[0].ok ? r[0].user : null);
    }).then(function () {
      CH.route();
    });
  }

  boot();
})();