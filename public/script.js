(function () {
  "use strict";

  var PROPERTIES = [
    {
      id: "tropical-pavilion-villa", name: "Tropical Pavilion Villa", purpose: "buy", type: "Villa",
      location: "Coastal Ridge", price: 4250000, beds: 5, baths: 6, area: 620, parking: 4, year: 2024,
      listed: "2026-10-02", furnished: "", available: "",
      images: ["images/property-landscape-05.jpg", "images/property-square-02.jpg", "images/property-square-01.jpg"],
      alt: "White modern villa with teak loungers beside a turquoise pool",
      description: "A calm, light-filled residence set among palms, with open living spaces that flow onto a long infinity pool and a shaded terrace. The waterfall wall and private gardens give the house a resort feel every day of the year.",
      features: ["Infinity swimming pool", "Covered outdoor dining terrace", "Staff quarters and utility suite", "Rooftop garden with solar-ready roof"]
    },
    {
      id: "lakeside-modern-house", name: "Lakeside Modern House", purpose: "buy", type: "Residence",
      location: "Lakeshore Estate", price: 3900000, beds: 4, baths: 4, area: 540, parking: 3, year: 2022,
      listed: "2026-09-15", furnished: "", available: "",
      images: ["images/property-square-05.jpg", "images/property-square-02.jpg", "images/property-square-01.jpg"],
      alt: "Glass-walled lakeside house lit warmly at dusk",
      description: "A low-profile glass residence designed to sit quietly within the tree line. Floor-to-ceiling windows frame the water from the dining room, the lounge and the main bedroom, while a stone terrace steps down to the lake edge.",
      features: ["Floor-to-ceiling glazing", "Lake-facing master suite", "Heated stone terrace", "Private boat landing"]
    },
    {
      id: "tuscan-hill-villa", name: "Tuscan Hill Villa", purpose: "buy", type: "Villa",
      location: "Hillside Village", price: 3250000, beds: 5, baths: 5, area: 480, parking: 2, year: 2018,
      listed: "2026-08-20", furnished: "", available: "",
      images: ["images/property-square-03.jpg", "images/property-landscape-01.jpg", "images/property-square-02.jpg"],
      alt: "Stone villa with cypress trees and a hilltop village in the distance",
      description: "A traditional stone villa restored with modern systems, set on a terraced olive grove. Sunsets over the valley are the highlight of the south terrace, and the thick stone walls keep the interiors cool through the summer.",
      features: ["Restored stone walls and timber beams", "Olive grove with forty mature trees", "Wine cellar and tasting room", "Separate guest cottage"]
    },
    {
      id: "skyline-penthouse", name: "Skyline Penthouse", purpose: "buy", type: "Penthouse",
      location: "City Heights", price: 1950000, beds: 3, baths: 3, area: 280, parking: 2, year: 2023,
      listed: "2026-11-05", furnished: "", available: "",
      images: ["images/property-landscape-02.jpg", "images/property-square-01.jpg", "images/property-square-05.jpg"],
      alt: "Rooftop penthouse with glass balconies and planted terraces",
      description: "Top-floor living with wraparound terraces and views across the city skyline. Planted roof gardens, a private lift lobby and integrated smart lighting make this one of the most private homes in the district.",
      features: ["Wraparound terraces", "Private lift lobby", "Smart lighting and climate control", "Two secure parking bays"]
    },
    {
      id: "cliffside-residence", name: "Cliffside Residence", purpose: "rent", type: "Villa",
      location: "Coastal Ridge", price: 14000, beds: 4, baths: 4, area: 450, parking: 3, year: 2021,
      listed: "2026-11-10", furnished: "Furnished", available: "1 December 2026",
      images: ["images/property-landscape-01.jpg", "images/property-square-03.jpg", "images/property-landscape-05.jpg"],
      alt: "Cliffside modern villa with an infinity pool overlooking the sea",
      description: "A modern cliffside home with stone terraces and a pool that appears to meet the sea. Available furnished on a flexible lease, with an optional housekeeping service and concierge support on request.",
      features: ["Furnished with designer pieces", "Infinity pool over the sea", "Optional housekeeping", "Concierge service on request"]
    },
    {
      id: "alpine-timber-chalet", name: "Alpine Timber Chalet", purpose: "rent", type: "Chalet",
      location: "Mountain Valley", price: 6500, beds: 4, baths: 3, area: 410, parking: 2, year: 2019,
      listed: "2026-10-22", furnished: "Unfurnished", available: "15 December 2026",
      images: ["images/property-landscape-04.jpg", "images/property-square-05.jpg", "images/property-landscape-02.jpg"],
      alt: "Alpine timber chalet with balconies among pine trees",
      description: "A warm timber chalet on a forested hillside, with balconies facing the mountains and a stone fireplace in the great room. Well suited to families and long winter stays, with ski storage and a heated boot room.",
      features: ["Stone fireplace", "Heated boot room and ski storage", "Mountain-view balconies", "Pet friendly"]
    },
    {
      id: "desert-modernist-residence", name: "Desert Modernist Residence", purpose: "rent", type: "Residence",
      location: "Desert Ridge", price: 5200, beds: 3, baths: 3, area: 360, parking: 2, year: 2023,
      listed: "2026-11-14", furnished: "Unfurnished", available: "1 January 2027",
      images: ["images/property-landscape-03.jpg", "images/property-square-01.jpg", "images/property-square-02.jpg"],
      alt: "Rammed earth desert residence with a pool reflecting the sunset",
      description: "Rammed earth walls, a courtyard olive tree and a long reflecting pool define this low-slung home. Interiors stay cool and quiet, and sliding glass walls open the living room onto the terrace.",
      features: ["Rammed earth construction", "Courtyard with olive tree", "Lap pool", "Air-conditioned throughout"]
    },
    {
      id: "garden-penthouse-suite", name: "Garden Penthouse Suite", purpose: "rent", type: "Penthouse",
      location: "City Heights", price: 3400, beds: 2, baths: 2, area: 190, parking: 1, year: 2020,
      listed: "2026-11-16", furnished: "Furnished", available: "Immediately",
      images: ["images/property-square-05.jpg", "images/property-landscape-02.jpg", "images/property-square-03.jpg"],
      alt: "Penthouse terrace with planted planters and city views",
      description: "A compact upper-floor suite with a private planted terrace, ideal for professionals who want space and light without the upkeep. Includes a concierge desk, secure parking and optional furnishing.",
      features: ["Private planted terrace", "Concierge desk", "Secure parking", "Furnished on request"]
    }
  ];

  var PRICE_BANDS = {
    buy: [
      ["Any price", null],
      ["Under $2M", [0, 2000000]],
      ["$2M to $3.5M", [2000000, 3500000]],
      ["$3.5M to $5M", [3500000, 5000000]],
      ["Above $5M", [5000000, Infinity]]
    ],
    rent: [
      ["Any monthly budget", null],
      ["Under $4,000 / month", [0, 4000]],
      ["$4,000 to $7,000 / month", [4000, 7000]],
      ["$7,000 to $12,000 / month", [7000, 12000]],
      ["Above $12,000 / month", [12000, Infinity]]
    ]
  };

  var INSPIRATION = [
    { img: "images/property-square-02.jpg", alt: "Sunlit living room with a travertine fireplace and white sofas", style: "Luxury", title: "Travertine living room", text: "Warm stone, layered textiles and a fireplace as the focal point." },
    { img: "images/property-landscape-03.jpg", alt: "Rammed earth desert residence with a reflecting pool", style: "Minimalist", title: "Rammed earth courtyard", text: "Quiet, honest materials with a courtyard that brings the landscape in." },
    { img: "images/property-landscape-05.jpg", alt: "White modern villa with teak loungers beside a turquoise pool", style: "Modern", title: "Pavilion by the pool", text: "Clean white volumes, timber screens and open living on the water." },
    { img: "images/property-landscape-04.jpg", alt: "Alpine timber chalet among pine trees", style: "Traditional", title: "Alpine timber chalet", text: "Pitched roofs, exposed timber and a stone base that feels rooted." },
    { img: "images/property-landscape-02.jpg", alt: "Rooftop penthouse with planted terraces", style: "Contemporary", title: "Terraced skyline home", text: "Layered terraces, glass and planting that soften a city setting." },
    { img: "images/property-landscape-01.jpg", alt: "Cliffside modern villa overlooking the sea", style: "Luxury", title: "Cliffside terrace", text: "Stone terraces and an infinity pool that frame the horizon." }
  ];

  var state = { purpose: "all", location: "", type: "", price: "", beds: "", baths: "", area: "", furnished: "", sort: "latest" };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function money(n) {
    return "$" + n.toLocaleString("en-US");
  }

  function priceText(p) {
    return p.purpose === "rent" ? money(p.price) + " / month" : money(p.price);
  }

  function findById(id) {
    for (var i = 0; i < PROPERTIES.length; i++) {
      if (PROPERTIES[i].id === id) return PROPERTIES[i];
    }
    return null;
  }

  function unique(key) {
    var seen = {};
    var out = [];
    PROPERTIES.forEach(function (p) {
      if (!seen[p[key]]) {
        seen[p[key]] = true;
        out.push(p[key]);
      }
    });
    return out.sort();
  }

  function fillSelect(sel, options) {
    if (!sel) return;
    var current = sel.value;
    sel.innerHTML = "";
    options.forEach(function (o) {
      var opt = document.createElement("option");
      opt.value = o[1];
      opt.textContent = o[0];
      sel.appendChild(opt);
    });
    var values = options.map(function (o) { return o[1]; });
    sel.value = values.indexOf(current) > -1 ? current : "";
  }

  function fillHeroSelects() {
    $$("select[data-options]").forEach(function (sel) {
      var key = sel.getAttribute("data-options");
      var opts = [[key === "location" ? "All locations" : "All types", ""]];
      unique(key).forEach(function (v) { opts.push([v, v]); });
      fillSelect(sel, opts);
    });
  }

  function initFilterOptions() {
    fillSelect($("#f-location"), [["All locations", ""]].concat(unique("location").map(function (v) { return [v, v]; })));
    fillSelect($("#f-type"), [["All types", ""]].concat(unique("type").map(function (v) { return [v, v]; })));
    fillSelect($("#f-beds"), [["Any", ""], ["1+", "1"], ["2+", "2"], ["3+", "3"], ["4+", "4"], ["5+", "5"]]);
    fillSelect($("#f-baths"), [["Any", ""], ["1+", "1"], ["2+", "2"], ["3+", "3"], ["4+", "4"]]);
    fillSelect($("#f-area"), [["Any size", ""], ["150+ m²", "150"], ["250+ m²", "250"], ["400+ m²", "400"], ["600+ m²", "600"]]);
    fillSelect($("#f-furnished"), [["Any", ""], ["Furnished", "Furnished"], ["Unfurnished", "Unfurnished"]]);
    fillSelect($("#f-sort"), [["Latest", "latest"], ["Price: low to high", "low"], ["Price: high to low", "high"]]);
  }

  function cardHTML(p) {
    var rent = p.purpose === "rent";
    return (
      '<a class="listing" href="#property-' + p.id + '">' +
        '<div class="listing-media">' +
          '<img src="' + p.images[0] + '" alt="' + p.alt + '" loading="lazy" width="2048" height="1536">' +
          '<span class="listing-tag' + (rent ? " is-rent" : "") + '">' + (rent ? "For rent" : "For sale") + "</span>" +
        "</div>" +
        '<div class="listing-body">' +
          "<h3>" + p.name + "</h3>" +
          '<p class="listing-loc">' + p.location + " | " + p.type + "</p>" +
          '<p class="listing-price">' + priceText(p) + "</p>" +
          '<ul class="listing-meta">' +
            "<li>" + p.beds + " beds</li>" +
            "<li>" + p.baths + " baths</li>" +
            "<li>" + p.area + " m&sup2;</li>" +
            (rent ? "<li>" + p.furnished + "</li>" : "") +
          "</ul>" +
        "</div>" +
      "</a>"
    );
  }

  function renderFeatured() {
    var grid = $("#featured-grid");
    if (grid) grid.innerHTML = PROPERTIES.slice(0, 3).map(cardHTML).join("");
  }

  function priceBand(purpose) {
    return PRICE_BANDS[purpose] || [];
  }

  function syncFilterControls() {
    var isListing = state.purpose === "buy" || state.purpose === "rent";
    var priceSel = $("#f-price");
    var priceLabel = $("#f-price-label");
    var priceWrap = priceSel ? priceSel.parentNode : null;
    var furnishedWrap = $("#f-furnished-wrap");

    if (priceSel) {
      var bands = priceBand(state.purpose);
      if (priceSel.getAttribute("data-purpose") !== state.purpose) {
        fillSelect(priceSel, bands.map(function (b, i) { return [b[0], i === 0 ? "" : String(i)]; }));
        priceSel.setAttribute("data-purpose", state.purpose);
      }
      priceSel.value = state.price;
    }
    if (priceWrap) priceWrap.hidden = !isListing;
    if (priceLabel) priceLabel.textContent = state.purpose === "rent" ? "Monthly budget" : "Price";
    if (furnishedWrap) furnishedWrap.hidden = state.purpose !== "rent";

    $("#f-location").value = state.location;
    $("#f-type").value = state.type;
    $("#f-beds").value = state.beds;
    $("#f-baths").value = state.baths;
    $("#f-area").value = state.area;
    $("#f-furnished").value = state.furnished;
    $("#f-sort").value = state.sort;
  }

  function matchesPrice(p) {
    if (!state.price) return true;
    var band = priceBand(p.purpose)[parseInt(state.price, 10)];
    if (!band || !band[1]) return true;
    return p.price >= band[1][0] && p.price < band[1][1];
  }

  function filtered() {
    var list = PROPERTIES.filter(function (p) {
      if (state.purpose !== "all" && p.purpose !== state.purpose) return false;
      if (state.location && p.location !== state.location) return false;
      if (state.type && p.type !== state.type) return false;
      if (state.purpose !== "all" && !matchesPrice(p)) return false;
      if (state.beds && p.beds < parseInt(state.beds, 10)) return false;
      if (state.baths && p.baths < parseInt(state.baths, 10)) return false;
      if (state.area && p.area < parseInt(state.area, 10)) return false;
      if (state.purpose === "rent" && state.furnished && p.furnished !== state.furnished) return false;
      return true;
    });

    if (state.sort === "low") {
      list.sort(function (a, b) { return a.price - b.price; });
    } else if (state.sort === "high") {
      list.sort(function (a, b) { return b.price - a.price; });
    } else {
      list.sort(function (a, b) { return a.listed < b.listed ? 1 : a.listed > b.listed ? -1 : 0; });
    }
    return list;
  }

  function renderListings() {
    var titles = {
      all: ["All properties", "Browse every home we represent, for sale and for rent."],
      buy: ["Homes for sale", "Villas, residences and penthouses available to buy, each one verified and ready for a private viewing."],
      rent: ["Homes for rent", "Furnished and unfurnished homes on flexible terms, from city suites to mountain chalets."]
    };
    var list = filtered();
    var t = titles[state.purpose] || titles.all;
    $("#listings-title").textContent = t[0];
    $("#listings-lead").textContent = t[1];
    $("#listing-grid").innerHTML = list.map(cardHTML).join("");
    $("#result-count").textContent = list.length + (list.length === 1 ? " property" : " properties");
    $("#listing-empty").hidden = list.length > 0;

    $$("[data-tab]").forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("data-tab") === state.purpose);
    });
    syncFilterControls();
  }

  function initListingFilters() {
    var bindings = {
      "#f-location": "location",
      "#f-type": "type",
      "#f-price": "price",
      "#f-beds": "beds",
      "#f-baths": "baths",
      "#f-area": "area",
      "#f-furnished": "furnished",
      "#f-sort": "sort"
    };
    Object.keys(bindings).forEach(function (sel) {
      var el = $(sel);
      if (!el) return;
      el.addEventListener("change", function () {
        state[bindings[sel]] = el.value;
        renderListings();
      });
    });

    var reset = $("#f-reset");
    if (reset) {
      reset.addEventListener("click", function () {
        state.location = "";
        state.type = "";
        state.price = "";
        state.beds = "";
        state.baths = "";
        state.area = "";
        state.furnished = "";
        state.sort = "latest";
        renderListings();
      });
    }
  }

  /* Shared request summary: builds the review panel from visible field values */
  function collectRows(form, extraRows) {
    var rows = (extraRows || []).slice();
    $$("[name]", form).forEach(function (el) {
      if (el.type === "radio" && !el.checked) return;
      if (el.type === "checkbox" && !el.checked) return;
      if (el.type === "file") {
        if (el.files && el.files.length) {
          var names = Array.prototype.map.call(el.files, function (f) { return f.name; }).join(", ");
          rows.push([el.getAttribute("data-label") || el.name, el.files.length + " file(s): " + names]);
        }
        return;
      }
      var value = (el.value || "").trim();
      if (!value) return;
      rows.push([el.getAttribute("data-label") || el.name, value]);
    });
    return rows;
  }

  function showResult(result, rows, heading, intro) {
    result.innerHTML = "";
    result.hidden = false;

    var text = rows.map(function (r) { return r[0] + ": " + r[1]; }).join("\n");

    var h = document.createElement("h3");
    h.textContent = heading;
    var p = document.createElement("p");
    p.textContent = intro;

    var dl = document.createElement("dl");
    dl.className = "result-list";
    rows.forEach(function (r) {
      var row = document.createElement("div");
      var dt = document.createElement("dt");
      var dd = document.createElement("dd");
      dt.textContent = r[0];
      dd.textContent = r[1];
      row.appendChild(dt);
      row.appendChild(dd);
      dl.appendChild(row);
    });

    var actions = document.createElement("div");
    actions.className = "result-actions";
    var copy = document.createElement("button");
    copy.type = "button";
    copy.className = "btn btn-dark btn-small";
    copy.textContent = "Copy summary";
    copy.addEventListener("click", function () {
      var done = function (ok) {
        copy.textContent = ok ? "Copied" : "Copy failed";
        setTimeout(function () { copy.textContent = "Copy summary"; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else {
        done(false);
      }
    });
    var note = document.createElement("p");
    note.textContent = "Or call +92 300 0000000 or write to hello@crest-haven.example";
    actions.appendChild(copy);
    actions.appendChild(note);

    result.appendChild(h);
    result.appendChild(p);
    result.appendChild(dl);
    result.appendChild(actions);
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function apiBase() {
    var cfg = window.CRESTHAVEN_CONFIG || {};
    return cfg.apiBase || "/api";
  }

  function postJSON(path, body) {
    return fetch(apiBase() + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
      .then(function (res) {
        return res.json().catch(function () {
          return { ok: false, error: "Unexpected response from the server." };
        });
      })
      .catch(function () {
        return { ok: false, error: "We could not reach the server. Please check your connection or call us directly." };
      });
  }

  function fieldValue(form, name) {
    var el = form.elements.namedItem(name);
    return el && typeof el.value === "string" ? el.value.trim() : "";
  }

  function sendToCRM(form, type, rows) {
    return postJSON("/requests", {
      type: type,
      name: fieldValue(form, "name"),
      email: fieldValue(form, "email"),
      phone: fieldValue(form, "phone"),
      fields: rows.map(function (r) { return [r[0], r[1]]; })
    });
  }

  function showStatus(result, data) {
    var p = document.createElement("p");
    p.className = "request-status " + (data.ok ? "is-ok" : "is-error");
    p.setAttribute("role", "status");
    p.textContent = data.ok
      ? "Sent to our team. An advisor will contact you within one business day."
      : (data.error || "We could not send your request right now.") + " Your details are shown below, so you can copy them.";
    result.insertBefore(p, result.firstChild);
  }

  function attachRequestForm(form, result, extraRows, heading, intro) {
    if (!form || !result) return;
    form.addEventListener("submit", function (event) {
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      event.preventDefault();
      var rows = collectRows(form, extraRows);
      var button = form.querySelector('button[type="submit"]');
      var original = button ? button.textContent : "";
      if (button) {
        button.disabled = true;
        button.textContent = "Sending...";
      }
      sendToCRM(form, form.getAttribute("data-type") || "contact", rows).then(function (data) {
        if (button) {
          button.disabled = false;
          button.textContent = original;
        }
        showResult(result, rows, heading, intro);
        showStatus(result, data);
      });
    });
  }

  function favorites() {
    if (window.CrestHavenFavorites) return window.CrestHavenFavorites.list();
    try {
      return JSON.parse(window.localStorage.getItem("crest-favorites") || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveFavorites(list) {
    try {
      window.localStorage.setItem("crest-favorites", JSON.stringify(list));
    } catch (e) {}
  }

  function renderProperty(p) {
    var rent = p.purpose === "rent";
    var back = rent ? "#rent" : "#buy";
    var backLabel = rent ? "Back to homes for rent" : "Back to homes for sale";
    var root = $("#property-detail");
    var saved = favorites().indexOf(p.id) > -1;
    var adv = advisorFor(p);

    var thumbs = p.images.map(function (src, i) {
      return '<button class="thumb' + (i === 0 ? " is-active" : "") + '" type="button" data-index="' + i + '" aria-label="Show image ' + (i + 1) + '">' +
        '<img src="' + src + '" alt="" loading="lazy" width="1024" height="768"></button>';
    }).join("");

    var features = p.features.map(function (f) { return "<li>" + f + "</li>"; }).join("");

    var requestTypes = rent
      ? ["Book a private viewing", "Apply to rent", "Ask a question"]
      : ["Book a private viewing", "Make an offer", "Ask a question"];
    var typeOptions = requestTypes.map(function (t) { return "<option>" + t + "</option>"; }).join("");

    var extraField = rent
      ? '<label class="field"><span class="field-label">Move-in date</span><input name="movein" type="date" data-label="Move-in date" required></label>' +
        '<label class="field"><span class="field-label">Lease length</span><select name="lease" data-label="Lease length" required>' +
          '<option value="">Select length</option><option>6 months</option><option>12 months</option><option>24 months</option></select></label>'
      : '<label class="field"><span class="field-label">Preferred viewing date</span><input name="viewing" type="date" data-label="Preferred viewing date"></label>';

    var rentSpecs = rent
      ? "<div><dt>Furnishing</dt><dd>" + p.furnished + "</dd></div>" +
        "<div><dt>Available from</dt><dd>" + p.available + "</dd></div>"
      : "";

    var similar = PROPERTIES.filter(function (x) {
      return x.id !== p.id && x.purpose === p.purpose;
    }).slice(0, 3);

    var mapQuery = encodeURIComponent(p.name + ", " + p.location);

    root.innerHTML =
      '<nav class="back-nav" aria-label="Breadcrumb"><a href="' + back + '">' + backLabel + "</a></nav>" +
      '<header class="detail-head">' +
        "<div>" +
          '<p class="eyebrow">' + (rent ? "For rent" : "For sale") + "</p>" +
          "<h1>" + p.name + "</h1>" +
          '<p class="detail-loc">' + p.location + " | " + p.type + "</p>" +
        "</div>" +
        '<div class="detail-actions">' +
          '<p class="detail-price">' + priceText(p) + "</p>" +
          '<button class="fav-btn" type="button" id="fav-btn" aria-pressed="' + saved + '">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.5-9.3-9A5.2 5.2 0 0 1 12 6.6 5.2 5.2 0 0 1 21.3 12c-2.3 4.5-9.3 9-9.3 9z" stroke-linejoin="round"/></svg>' +
            '<span id="fav-label">' + (saved ? "Saved" : "Save to favorites") + "</span>" +
          "</button>" +
        "</div>" +
      "</header>" +
      '<div class="detail-grid">' +
        '<div class="detail-main">' +
          '<figure class="gallery"><img id="gallery-main" class="gallery-main" src="' + p.images[0] + '" alt="' + p.alt + '" width="2048" height="1536"></figure>' +
          '<div class="thumbs">' + thumbs + "</div>" +
          '<dl class="specs">' +
            "<div><dt>Property type</dt><dd>" + p.type + "</dd></div>" +
            "<div><dt>Bedrooms</dt><dd>" + p.beds + "</dd></div>" +
            "<div><dt>Bathrooms</dt><dd>" + p.baths + "</dd></div>" +
            "<div><dt>Area</dt><dd>" + p.area + " m&sup2;</dd></div>" +
            (p.parking ? "<div><dt>Parking</dt><dd>" + p.parking + " spaces</dd></div>" : "") +
            (p.year ? "<div><dt>Year built</dt><dd>" + p.year + "</dd></div>" : "") +
            rentSpecs +
          "</dl>" +
          "<div>" +
            '<h2 class="detail-h2">About this property</h2>' +
            '<p class="detail-description">' + p.description + "</p>" +
          "</div>" +
          "<div>" +
            '<h2 class="detail-h2">Amenities and highlights</h2>' +
            '<ul class="features">' + features + "</ul>" +
          "</div>" +
          '<div class="location-block">' +
            '<h2 class="detail-h2">Location</h2>' +
            "<p>" + p.location + ", " + p.type + " listing</p>" +
            '<a class="map-link" href="https://www.google.com/maps/search/?api=1&amp;query=' + mapQuery + '" target="_blank" rel="noopener">Open in Google Maps</a>' +
            '<p class="map-note">The exact address is shared after your viewing request is confirmed.</p>' +
          "</div>" +
        "</div>" +
        '<aside class="booking-column">' +
          '<section class="agent-card" aria-labelledby="agent-title">' +
            '<p class="eyebrow">Listing advisor</p>' +
            '<h3 id="agent-title">' + adv.name + '</h3>' +
            '<p class="advisor-role">' + adv.role + '</p>' +
            "<p>Office 12, Crest Plaza, Main Boulevard</p>" +
            '<p class="contact-line"><span>' + adv.phone + '</span></p>' +
            '<div class="advisor-links">' +
              '<a class="btn btn-dark btn-small" href="tel:' + adv.phone.replace(/\s/g, "") + '">Call</a>' +
              '<a class="btn btn-outline-dark btn-small" href="https://wa.me/' + adv.whatsapp + '" target="_blank" rel="noopener">WhatsApp</a>' +
              '<a class="btn btn-outline-dark btn-small" href="mailto:' + adv.email + '">Email</a>' +
            '</div>' +
                        '<div class="agent-actions">' +
              '<button class="btn btn-dark" type="button" data-prefill="Ask a question">Contact seller</button>' +
              '<button class="btn btn-outline-dark" type="button" data-prefill="Book a private viewing">Schedule a visit</button>' +
            "</div>" +
          "</section>" +
          '<div class="booking" aria-labelledby="booking-title">' +
            '<p class="booking-price">' + priceText(p) + "</p>" +
            '<h2 id="booking-title">' + (rent ? "Book or apply to rent" : "Book or make an offer") + "</h2>" +
            '<p class="booking-note">Share your details and preferred timing. An advisor will confirm the next steps within one business day.</p>' +
            '<form class="request-form" id="booking-form" data-type="booking" novalidate>' +
              '<label class="field"><span class="field-label">Full name</span><input name="name" type="text" autocomplete="name" data-label="Full name" required></label>' +
              '<label class="field"><span class="field-label">Email</span><input name="email" type="email" autocomplete="email" data-label="Email" required></label>' +
              '<label class="field"><span class="field-label">Phone</span><input name="phone" type="tel" autocomplete="tel" data-label="Phone" required></label>' +
              '<label class="field"><span class="field-label">Request type</span><select name="request" id="request-type" data-label="Request type" required>' +
                '<option value="">Select an option</option>' + typeOptions + "</select></label>" +
              extraField +
              '<label class="field"><span class="field-label">Message</span><textarea name="message" rows="4" data-label="Message"></textarea></label>' +
              '<button class="btn btn-gold" type="submit">' + (rent ? "Review application" : "Review request") + "</button>" +
            "</form>" +
            '<div class="request-result" id="booking-result" hidden></div>' +
          "</div>" +
        "</aside>" +
      "</div>" +
      '<section class="similar" aria-labelledby="similar-title">' +
        '<div class="section-head"><p class="eyebrow">Similar homes</p><h2 id="similar-title">More ' + (rent ? "homes for rent" : "homes for sale") + "</h2></div>" +
        '<div class="card-grid" id="similar-grid"></div>' +
      "</section>";

    $("#similar-grid").innerHTML = similar.map(cardHTML).join("");

    var main = $("#gallery-main");
    $$(".thumb", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = parseInt(btn.getAttribute("data-index"), 10);
        main.src = p.images[i];
        $$(".thumb", root).forEach(function (t) { t.classList.toggle("is-active", t === btn); });
      });
    });

    var fav = $("#fav-btn", root);
    fav.addEventListener("click", function () {
      var list = favorites();
      var idx = list.indexOf(p.id);
      if (idx > -1) {
        list.splice(idx, 1);
      } else {
        list.push(p.id);
      }
      var nowSaved = list.indexOf(p.id) > -1;
      if (window.CrestHavenFavorites) {
        window.CrestHavenFavorites.set(p.id, nowSaved);
      } else {
        saveFavorites(list);
      }
      fav.setAttribute("aria-pressed", String(nowSaved));
      $("#fav-label", root).textContent = nowSaved ? "Saved" : "Save to favorites";
    });

    $$("[data-prefill]", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var select = $("#request-type", root);
        if (select) select.value = btn.getAttribute("data-prefill");
        var form = $("#booking-form", root);
        if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    $$("[data-copy]", root).forEach(function (button) {
      var label = button.querySelector(".copy-label");
      button.addEventListener("click", function () {
        var text = button.getAttribute("data-copy");
        var done = function (ok) {
          if (label) label.textContent = ok ? "Copied" : "Copy failed";
          setTimeout(function () { if (label) label.textContent = "Copy"; }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
        } else {
          done(false);
        }
      });
    });

    attachRequestForm($("#booking-form", root), $("#booking-result", root), [
      ["Property", p.name],
      ["Listing", rent ? "For rent" : "For sale"]
    ], "Your request summary", "Review the details below. Copy the summary and send it to our advisor, or contact us directly using the details on this page.");
  }

  /* Sell Property: four-step wizard */
  function initSellWizard() {
    var form = $("#sell-form");
    if (!form) return;
    var steps = $$("[data-step]", form);
    var indicators = $$("[data-step-ind]");
    var back = $("#sell-back");
    var next = $("#sell-next");
    var submit = $("#sell-submit");
    var progress = $("#sell-progress");
    var result = $("#sell-result");
    var photoInput = $("#photo-input");
    var photoCount = $("#photo-count");
    var current = 0;

    function show(i) {
      current = i;
      steps.forEach(function (s, k) { s.hidden = k !== i; });
      indicators.forEach(function (li, k) {
        li.classList.toggle("is-active", k === i);
        li.classList.toggle("is-done", k < i);
      });
      back.hidden = i === 0;
      next.hidden = i === steps.length - 1;
      submit.hidden = i !== steps.length - 1;
      progress.textContent = "Step " + (i + 1) + " of " + steps.length;
      result.hidden = true;
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function firstInvalid(i) {
      var fields = $$("input, select, textarea", steps[i]);
      for (var k = 0; k < fields.length; k++) {
        if (!fields[k].checkValidity()) return fields[k];
      }
      return null;
    }

    next.addEventListener("click", function () {
      var bad = firstInvalid(current);
      if (bad) {
        bad.reportValidity();
        return;
      }
      show(current + 1);
    });

    back.addEventListener("click", function () {
      show(current - 1);
    });

    if (photoInput && photoCount) {
      photoInput.addEventListener("change", function () {
        var count = photoInput.files ? photoInput.files.length : 0;
        if (count > 12) {
          photoInput.value = "";
          photoCount.textContent = "Please upload no more than 12 photos.";
          return;
        }
        photoCount.textContent = count ? count + " photo(s) selected." : "Upload up to 12 photos (JPG or PNG, 10 MB each). Use bright, straight-on shots of every main room.";
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      for (var i = 0; i < steps.length; i++) {
        var bad = firstInvalid(i);
        if (bad) {
          show(i);
          bad.reportValidity();
          return;
        }
      }
      if (window.CrestHavenExt && window.CrestHavenExt.submitListing) {
        window.CrestHavenExt.submitListing(form, result);
        progress.textContent = "Review your listing";
        return;
      }
      var rows = collectRows(form, []);
      showResult(
        result,
        rows,
        "Your listing summary",
        "This listing has not been published yet. Copy the summary and send it to our team, or contact us directly to start the review."
      );
      result.hidden = false;
      sendToCRM(form, "sell", rows).then(function (data) {
        showStatus(result, data);
      });
      progress.textContent = "Review your listing";
      indicators.forEach(function (li) {
        li.classList.add("is-done");
        li.classList.remove("is-active");
      });
    });

    show(0);
  }

  /* Design studio inspiration */
  function renderInspiration() {
    var grid = $("#inspo-grid");
    if (!grid) return;
    grid.innerHTML = INSPIRATION.map(function (item) {
      return (
        '<article class="inspo-card">' +
          '<img src="' + item.img + '" alt="' + item.alt + '" loading="lazy" width="2048" height="1536">' +
          '<p class="inspo-tag">' + item.style + "</p>" +
          "<h3>" + item.title + "</h3>" +
          "<p>" + item.text + "</p>" +
          '<button class="btn btn-outline-dark btn-small" type="button" data-style="' + item.style + '">Use this style</button>' +
        "</article>"
      );
    }).join("");

    $$("[data-style]", grid).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var radio = $('#design-form input[name="style"][value="' + btn.getAttribute("data-style") + '"]');
        if (radio) radio.checked = true;
        var form = $("#design-form");
        if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function renderSaved() {
    var ids = favorites();
    var list = PROPERTIES.filter(function (p) { return ids.indexOf(p.id) > -1; });
    var grid = $("#saved-grid");
    var empty = $("#saved-empty");
    var count = $("#saved-count");
    if (grid) grid.innerHTML = list.map(cardHTML).join("");
    if (count) count.textContent = list.length + (list.length === 1 ? " saved home" : " saved homes");
    if (empty) empty.hidden = list.length > 0;
  }

  function advisorFor(p) {
    // An advisor assigned in the admin panel always wins.
    if (p.advisor && p.advisor.name) return p.advisor;
    var cfg = window.CRESTHAVEN_CONFIG || {};
    var list = cfg.advisors && cfg.advisors.length ? cfg.advisors : [];
    if (!list.length) {
      list = [{ name: "CrestHaven Advisory Desk", role: "Property advisors", phone: "+92 300 0000000", whatsapp: "923000000000", email: "hello@crest-haven.example" }];
    }
    return list[PROPERTIES.indexOf(p) % list.length];
  }

  function showView(name) {
    $$("[data-view]").forEach(function (v) {
      v.hidden = v.getAttribute("data-view") !== name;
    });
  }

  function setActiveNav(key) {
    $$("[data-nav]").forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("data-nav") === key);
    });
  }

  function closeMenu() {
    var nav = $("#site-nav");
    var toggle = $("#nav-toggle");
    if (nav) nav.classList.remove("is-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }

  function route() {
    var raw = window.location.hash.slice(1);
    var h = raw ? decodeURIComponent(raw) : "home";
    var view = "home";
    var navKey = "home";
    var scrollId = null;

    if (window.CrestHavenExt && window.CrestHavenExt.handle(h)) {
      window.scrollTo(0, 0);
      closeMenu();
      return;
    }

    if (h.indexOf("property-") === 0) {
      var p = findById(h.slice("property-".length));
      if (p) {
        view = "property";
        navKey = p.purpose;
        renderProperty(p);
      } else {
        view = "listings";
        state.purpose = "all";
        navKey = "";
      }
    } else if (h === "buy" || h === "rent" || h === "properties") {
      view = "listings";
      state.purpose = h === "properties" ? "all" : h;
      navKey = h === "properties" ? "" : h;
    } else if (h === "sell") {
      view = "sell";
      navKey = "sell";
    } else if (h === "design") {
      view = "design";
      navKey = "design";
    } else if (h === "architect") {
      view = "architect";
      navKey = "architect";
    } else if (h === "saved") {
      view = "saved";
      navKey = "";
    } else if (h === "contact") {
      view = "contact";
      navKey = "";
    } else if (h === "about" || h === "featured" || h === "process" || h === "services") {
      view = "home";
      navKey = h === "about" ? "about" : "home";
      scrollId = h;
    } else {
      view = "home";
      navKey = "home";
    }

    if (view === "listings") renderListings();
    if (view === "home") renderFeatured();
    if (view === "saved") renderSaved();
    showView(view);
    setActiveNav(navKey);

    if (scrollId) {
      var target = document.getElementById(scrollId);
      if (target) target.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
    closeMenu();
  }

  function initHeroSearch() {
    var form = $("#hero-search");
    if (!form) return;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var fd = new FormData(form);
      state.location = fd.get("location") || "";
      state.type = fd.get("type") || "";
      state.price = "";
      state.beds = "";
      state.baths = "";
      state.area = "";
      state.furnished = "";
      window.location.hash = fd.get("purpose") === "rent" ? "rent" : "buy";
      route();
    });
  }

  function initContactForm() {
    attachRequestForm($("#contact-form"), $("#contact-result"), [],
      "Your enquiry summary", "Review the details below. Copy the summary and send it to our advisor, or contact us directly using the details on this page.");
  }

  function initDesignForm() {
    attachRequestForm($("#design-form"), $("#design-result"), [],
      "Your design brief summary", "Your brief is structured and ready for an advisor or for an AI design assistant once one is connected. Copy the summary to share it.");
  }

  function initArchitectForm() {
    attachRequestForm($("#architect-form"), $("#architect-result"), [],
      "Your consultation request summary", "Copy the summary and send it to our team, or contact us directly. A suitable architect or interior designer will be matched to your brief.");
  }

  function initAI() {
    var btn = $("#ai-suggest");
    var form = $("#design-form");
    var out = $("#ai-result");
    if (!btn || !form || !out) return;
    btn.addEventListener("click", function () {
      var chosen = form.querySelector('input[name="style"]:checked');
      out.hidden = false;
      out.innerHTML = "";
      if (!chosen) {
        var warn = document.createElement("p");
        warn.className = "request-status is-error";
        warn.textContent = "Please choose an architectural style in the brief below first.";
        out.appendChild(warn);
        return;
      }
      var rows = collectRows(form, []);
      var original = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Creating suggestions...";
      postJSON("/design-suggestions", { fields: rows }).then(function (data) {
        btn.disabled = false;
        btn.textContent = original;
        out.innerHTML = "";
        var h = document.createElement("h3");
        h.textContent = data.ok ? "Your AI design suggestions" : "Suggestions unavailable";
        out.appendChild(h);
        var p = document.createElement("p");
        p.className = data.ok ? "note" : "request-status is-error";
        p.textContent = data.ok
          ? "AI-generated starting points. An architect will review every idea with you before any design work begins."
          : (data.error || "Please try again later.");
        out.appendChild(p);
        if (data.ok) {
          var body = document.createElement("div");
          body.className = "ai-text";
          body.textContent = data.suggestions;
          out.appendChild(body);
        }
      });
    });
  }

  function initPopup() {
    var popup = $("#popup");
    if (!popup) return;
    var key = "crest-popup-dismissed";
    var dismissed = false;
    try {
      dismissed = window.localStorage.getItem(key) === "1";
    } catch (e) {
      dismissed = false;
    }
    if (dismissed) return;

    function close() {
      popup.hidden = true;
      try {
        window.localStorage.setItem(key, "1");
      } catch (e) {}
    }

    $$("[data-popup-close]", popup).forEach(function (el) {
      el.addEventListener("click", close);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !popup.hidden) close();
    });

    setTimeout(function () {
      if (!popup.hidden) return;
      popup.hidden = false;
      var focusTarget = $(".popup-close", popup);
      if (focusTarget) focusTarget.focus();
    }, 8000);
  }

  function initNav() {
    var toggle = $("#nav-toggle");
    var nav = $("#site-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  function initVideo() {
    var video = $(".hero-video");
    if (!video) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      video.pause();
      return;
    }
    var playing = video.play();
    if (playing && playing.catch) playing.catch(function () {});
  }

  function initCopyButtons() {
    $$("[data-copy]").forEach(function (button) {
      var label = button.querySelector(".copy-label");
      button.addEventListener("click", function () {
        var text = button.getAttribute("data-copy");
        var done = function (ok) {
          if (label) label.textContent = ok ? "Copied" : "Copy failed";
          setTimeout(function () { if (label) label.textContent = "Copy"; }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
        } else {
          done(false);
        }
      });
    });
  }

  function init() {
    fillHeroSelects();
    initFilterOptions();
    initListingFilters();
    initHeroSearch();
    initSellWizard();
    renderInspiration();
    initDesignForm();
    initAI();
    initArchitectForm();
    initContactForm();
    initNav();
    initVideo();
    initCopyButtons();
    initPopup();

    var year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());

    window.addEventListener("hashchange", route);
    route();
  }

  // Adds listings approved on the server to the site (called by dashboard.js).
  function addProperties(list) {
    list.forEach(function (p) {
      if (!findById(p.id)) PROPERTIES.push(p);
    });
    initFilterOptions();
    renderFeatured();
    if ($("#listing-grid")) renderListings();
  }

  // Small public API for dashboard.js.
  window.CrestHaven = {
    showView: showView,
    setActiveNav: setActiveNav,
    closeMenu: closeMenu,
    route: route,
    addProperties: addProperties,
    cardHTML: cardHTML,
    money: money,
    PROPERTIES: PROPERTIES
  };

  init();
})();