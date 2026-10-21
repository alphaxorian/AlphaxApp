/* ALPHAX Admin backend-ready version. Existing UI/CSS is preserved. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, setDoc, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js";
import { firebaseConfig, firebaseConfigReady } from "./firebase-config.js";

(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector); const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const screens = { overview: $("#dashboardScreen"), payments: $("#paymentsScreen"), licenses: $("#licensesScreen"), players: $("#playersScreen") };
  const pageNames = { overview: "Overview", payments: "Payments", licenses: "Licenses", players: "Players" };
  let currentView = "overview", activeFilter = "All", toastTimer, auth = null, db = null, functions = null, cloudMode = false;
  let requests = [];
  let licenses = [];
  let players = [];
  
  const money = value => "₹" + Number(value).toLocaleString("en-IN");
  const statusClass = status => String(status).toLowerCase().replace(/\s+/g, "-");
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  function toast(message) { const el = $("#toast"); el.textContent = message; el.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 3200); }
  function showScreen(view) { if (!screens[view]) return; currentView = view; $("#loginScreen").classList.add("hidden"); Object.entries(screens).forEach(([key, screen]) => screen.classList.toggle("hidden", key !== view)); $$(".nav-item[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === view)); $("#pageHeading").textContent = pageNames[view]; $("#sidebar").classList.remove("open"); renderAll(); }
  function requestCard(request) {
    const actions = request.status === "Pending" && cloudMode ? `<div class="request-actions"><button class="mini-btn approve" data-action="approve" data-id="${escapeHTML(request.id)}">✓ Approve payment</button><button class="mini-btn reject" data-action="reject" data-id="${escapeHTML(request.id)}">✕ Reject</button></div>` : (request.status === "Pending" ? `<div class="demo-disclaimer">Connect Firebase to review live requests.</div>` : (request.licenseId ? `<div class="request-utr">License: <strong>${escapeHTML(request.licenseId)}</strong></div>` : ""));
    return `<article class="request-card"><div class="request-main"><div class="request-logo">${escapeHTML(request.initials)}</div><div class="request-info"><div class="request-title">${escapeHTML(request.player)} <span class="status ${statusClass(request.status)}">${escapeHTML(request.status)}</span></div><div class="request-sub">${escapeHTML(request.id)} · ${escapeHTML(request.platform)} · ${escapeHTML(request.plan)} Plan</div><div class="request-utr">UTR: <strong>${escapeHTML(request.utr)}</strong>${request.utr2 ? ` · UTR 2: <strong>${escapeHTML(request.utr2)}</strong>` : ""} · ${escapeHTML(request.date)}</div>${actions}</div></div><div class="request-side"><div class="request-amount">${money(request.amount)}</div></div></article>`;
  }
  function getFilteredRequests(filter, search = "") { const query = search.trim().toLowerCase(); return requests.filter(item => (filter === "All" || item.status === filter) && (!query || [item.id, item.player, item.platform, item.plan, item.utr, item.utr2 || ""].some(value => value.toLowerCase().includes(query)))); }
  function renderRequestList(container, filter, search = "") { const list = $(container); if (!list) return; const rows = getFilteredRequests(filter, search); list.innerHTML = rows.length ? rows.map(requestCard).join("") : '<div class="empty-state">No matching requests found.</div>'; }
  function effectiveLicenseStatus(item) { if (item.status === "Active" && item.expiresAt && new Date(item.expiresAt).getTime() < Date.now()) return "Expired"; return item.status || "Not activated"; }
  function licenseDate(value) { if (!value) return "Not started"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }); }

  async function loadCloudLicenses() {
    if (!cloudMode || !db) return;
    const snapshot = await getDocs(collection(db, "licenses"));
    licenses = snapshot.docs.map(s => ({ ...s.data(), id: s.id }));
    renderLicenses(); renderStats();
  }
  async function loadCloudPayments() {
    if (!cloudMode || !db) return;
    const snapshot = await getDocs(query(collection(db, "payments"), orderBy("createdAt", "desc")));
    requests = snapshot.docs.map(s => { const d = s.data(); return { ...d, id: s.id, player: d.player || d.ownerUid || "Extension user", platform: d.platform || "ALPHAX", plan: d.plan || "Gold", amount: Number(d.amount || 0), utr: d.utr || "—", utr2: d.utr2 || "", date: d.createdAt?.toDate ? d.createdAt.toDate().toLocaleString() : (d.createdAt || "Submitted"), initials: String(d.plan || "AX").slice(0,2).toUpperCase() }; });
  }
  
  async function loadCloudPlayers() {
    if (!cloudMode || !db) return;
    const snapshot = await getDocs(collection(db, "players"));
    players = snapshot.docs.map(s => { const d = s.data(); return { ...d, id: s.id, name: d.name || "User", email: d.email || "", platform: d.platform || "ALPHAX", plan: d.plan || "Gold", initials: String(d.name || "AX").slice(0,2).toUpperCase() }; });
  }

  function renderLicenses() {
    const query = ($("#licenseSearch")?.value \vert{}\vert{} "").trim().toLowerCase(), filter = $("#licenseFilter")?.value || "All";
    const list = licenses.filter(item => { const status = effectiveLicenseStatus(item), text = [item.id, item.player, item.platform, item.plan].join(" ").toLowerCase(); return (!query || text.includes(query)) && (filter === "All" || status === filter); });
    $("#licensesList").innerHTML = list.length ? list.map(item => { const status = effectiveLicenseStatus(item), sc = status === "Active" ? "approved" : status === "Expired" ? "rejected" : "pending", validity = status === "Active" ? `Expires ${licenseDate(item.expiresAt)}` : status === "Expired" ? `Expired ${licenseDate(item.expiresAt)}` : `${Number(item.days || 30)} days · starts on activation`, activated = status === "Active" ? `Activated ${licenseDate(item.activatedAt)}` : status === "Expired" ? "Validity ended" : "Awaiting activation"; return `<article class="license-row"><div><div class="license-id">${escapeHTML(item.id)}</div><div class="license-meta">${escapeHTML(item.player)}<small>${escapeHTML(item.platform)}</small></div></div><div class="license-col"><div class="license-label">Plan</div><div class="license-value">${escapeHTML(item.plan || "Gold")}</div></div><div class="license-col"><div class="license-label">Validity</div><div class="license-value">${escapeHTML(validity)}<small>${escapeHTML(activated)}</small></div></div><div><span class="status ${sc}">${escapeHTML(status)}</span><div class="license-actions">${status === "Not activated" ? `<button class="license-action" data-license-action="activate" data-license-id="${escapeHTML(item.id)}">Activate</button>` : `<button class="license-action" data-license-action="copy" data-license-id="${escapeHTML(item.id)}">Copy ID</button>`}<button class="license-action danger" data-license-action="delete" data-license-id="${escapeHTML(item.id)}">Delete</button></div></div></article>`; }).join("") : '<div class="empty-state">No licenses match your search.</div>';
    const statuses = licenses.map(effectiveLicenseStatus); $("#licenseTotal").textContent = licenses.length; $("#licenseActive").textContent = statuses.filter(s => s === "Active").length; $("#licenseUnused").textContent = statuses.filter(s => s === "Not activated").length; $("#licenseExpired").textContent = statuses.filter(s => s === "Expired").length;
  }
  function renderPlayers() { const query = ($("#playerSearch")?.value || "").trim().toLowerCase(); const list = players.filter(p => [p.name, p.email || "", p.platform, p.plan].some(v => v.toLowerCase().includes(query))); $("#playersList").innerHTML = list.length ? list.map(p => `<article class="player-card"><div class="player-avatar">${escapeHTML(p.initials)}</div><div class="player-copy"><strong>${escapeHTML(p.name)}</strong><small>${p.email ? `${escapeHTML(p.email)} · ` : ""}${escapeHTML(p.platform)}</small></div><span class="player-plan">${escapeHTML(p.plan)}</span></article>`).join("") : '<div class="empty-state">No registered players.</div>'; }
  function renderStats() { $("#statPlayers").textContent = players.length; $("#statPending").textContent = requests.filter(r => r.status === "Pending").length; $("#statApproved").textContent = requests.filter(r => r.status === "Approved").length; $("#statLicenses").textContent = licenses.filter(l => effectiveLicenseStatus(l) === "Active").length; $("#navPending").textContent = requests.filter(r => r.status === "Pending").length; $("#pendingCount").textContent = requests.filter(r => r.status === "Pending").length; $("#allCount").textContent = requests.length; $("#paymentsTotal").innerHTML = `${String(requests.length).padStart(2, "0")} <small>REQUESTS</small>`; }
  function renderAll() { renderStats(); renderRequestList("#overviewRequestList", activeFilter); renderRequestList("#paymentsList", activeFilter, $("#paymentSearch")?.value \vert{}\vert{} ""); renderLicenses(); renderPlayers(); } function setFilter(filter, root) { activeFilter = filter; $$(".filter-tab", root).forEach(button => button.classList.toggle("active", button.dataset.filter === filter)); renderRequestList("#overviewRequestList", filter); renderRequestList("#paymentsList", filter, $("#paymentSearch")?.value || ""); }
  async function doLogin(email, password) {
    if (!firebaseConfigReady) { toast("Firebase configuration is missing or invalid."); return; }
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const adminDoc = await getDoc(doc(db, "admins", credential.user.uid));

      if (!adminDoc.exists() || adminDoc.data().role !== "admin") {
        await signOut(auth);
        throw new Error("This account is not approved as an ALPHAX admin.");
      }
      cloudMode = true; functions = getFunctions(); document.body.classList.remove("logged-out"); await Promise.all([loadCloudLicenses(), loadCloudPayments(), loadCloudPlayers()]); showScreen("overview"); toast("Secure admin sign-in successful.");
    } catch (error) { toast(error.message || "Login failed. Check your email and password."); }
  }
  $("#loginForm").addEventListener("submit", async event => { event.preventDefault(); const email = $("#email").value.trim(), password = $("#password").value; if (!email || !password) return toast("Enter your admin email and password."); await doLogin(email, password); });
  $("#togglePassword").addEventListener("click", () => { const input = $("#password"), show = input.type === "password"; input.type = show ? "text" : "password"; $("#togglePassword").textContent = show ? "Hide" : "Show"; });
  $("#logoutBtn").addEventListener("click", async () => { if (cloudMode && auth) { try { await signOut(auth); } catch (_) {} } cloudMode = false; $("#loginForm").reset(); document.body.classList.add("logged-out"); Object.values(screens).forEach(screen => screen.classList.add("hidden")); $("#loginScreen").classList.remove("hidden"); $("#pageHeading").textContent = "Sign in"; $$(".nav-item[data-view]").forEach(button => button.classList.remove("active")); $("#sidebar").classList.remove("open"); toast("Signed out."); });
  $$(".nav-item[data-view]").forEach(button => button.addEventListener("click", () => showScreen(button.dataset.view))); $$
('[data-goto]').forEach(button => button.addEventListener("click", () => showScreen(button.dataset.goto))); $("#menuBtn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $("#refreshBtn").addEventListener("click", async () => { if (cloudMode) { try { await Promise.all([loadCloudLicenses(), loadCloudPayments(), loadCloudPlayers()]); } catch (e) { toast("Could not refresh online data: " + (e.message || "error")); return; } } renderAll(); toast("Online data refreshed."); });
  $("#overviewFilters").addEventListener("click", event => { const b = event.target.closest("[data-filter]"); if (b) setFilter(b.dataset.filter, $("#overviewFilters")); }); $("#paymentsFilters").addEventListener("click", event => { const b = event.target.closest("[data-filter]"); if (b) setFilter(b.dataset.filter, $("#paymentsFilters")); }); $("#paymentSearch").addEventListener("input", () => renderRequestList("#paymentsList", activeFilter, $("#paymentSearch").value)); $("#playerSearch").addEventListener("input", renderPlayers);
  document.addEventListener("click", async event => { const button = event.target.closest("[data-action]"); if (!button) return; const item = requests.find(request => request.id === button.dataset.id); if (!item || item.status !== "Pending") return; if (!cloudMode || !functions) return toast("Live payment review requires Firebase admin sign-in."); if (!window.confirm(`${button.dataset.action === "approve" ? "Approve" : "Reject"} request ${item.id}? Verify the payment with your provider first.`)) return; button.disabled = true; try { const action = button.dataset.action === "approve" ? httpsCallable(functions, "approvePayment") : httpsCallable(functions, "rejectPayment"); await action({ paymentId: item.id }); await Promise.all([loadCloudPayments(), loadCloudLicenses()]); renderAll(); toast(button.dataset.action === "approve" ? `Approved. License issued.` : "Payment request rejected; no license issued."); } catch (error) { toast("Review failed: " + (error.message || "unknown error")); button.disabled = false; } });
  function openLicenseModal() { $("#licenseForm").reset(); $("#licenseModal").classList.remove("hidden"); setTimeout(() => $("#licensePlayer").focus(), 50); }
  function closeLicenseModal() { $("#licenseModal").classList.add("hidden"); }
  $("#generateDemoLicense").addEventListener("click", openLicenseModal); $("#closeLicenseModal").addEventListener("click", closeLicenseModal); $("#cancelLicense").addEventListener("click", closeLicenseModal); $("#licenseModal").addEventListener("click", event => { if (event.target === $("#licenseModal")) closeLicenseModal(); });
  $("#licenseForm").addEventListener("submit", async event => {
    event.preventDefault(); const player = $("#licensePlayer").value.trim(), platform = $("#licensePlatform").value, plan = $("#licensePlan").value, days = Number($("#licenseValidity").value) \vert{}\vert{} 30, status = $("#licenseInitialStatus").value;
    if (!player) return toast("Enter the player name.");
    if (status === "Active" && licenses.some(item => (item.player || "").trim().toLowerCase() === player.toLowerCase() && effectiveLicenseStatus(item) === "Active")) return toast("This player already has an active license.");
    const now = new Date(), id = `ALPHAX-${now.getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, activatedAt = status === "Active" ? now.toISOString() : null, expiresAt = status === "Active" ? new Date(now.getTime() + days * 86400000).toISOString() : null;
    const item = { id, player, platform, plan, days, status, createdAt: now.toISOString(), activatedAt, expiresAt, validity: `${status === "Active" ? "Active" : "Starts on activation"} · ${days} days` };
    try {
      if (cloudMode && db) { await setDoc(doc(db, "licenses", id), { ...item, createdAt: now.toISOString(), updatedAt: serverTimestamp() }); licenses.unshift(item); renderAll(); closeLicenseModal(); toast("License saved online."); }
      else { toast("You must be logged in as an admin to create licenses."); }
    } catch (error) { toast("Could not save license online: " + (error.message || "unknown error")); }
  });
  $("#licenseSearch").addEventListener("input", renderLicenses); $("#licenseFilter").addEventListener("change", renderLicenses);
  document.addEventListener("click", async event => { const button = event.target.closest("[data-license-action]"); if (!button) return; const item = licenses.find(license => license.id === button.dataset.licenseId); if (!item) return; const action = button.dataset.licenseAction;
    if (action === "activate") { if (effectiveLicenseStatus(item) !== "Not activated") return; if (!window.confirm(`Start ${Number(item.days || 30)}-day validity for ${item.id} now?`)) return; const now = new Date(), patch = { status: "Active", activatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + Number(item.days || 30) * 86400000).toISOString(), validity: `Active · ${Number(item.days || 30)} days` }; try { if (cloudMode && db) await updateDoc(doc(db, "licenses", item.id), { ...patch, updatedAt: serverTimestamp() }); Object.assign(item, patch); renderAll(); toast("Online license activated."); } catch (error) { toast("Could not update license: " + error.message); }
    } else if (action === "delete") { if (!window.confirm(`Delete license ${item.id}?`)) return; try { if (cloudMode && db) await deleteDoc(doc(db, "licenses", item.id)); licenses = licenses.filter(license => license.id !== item.id); renderAll(); toast("License deleted."); } catch (error) { toast("Could not delete license: " + error.message); }
    } else if (action === "copy") { try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(item.id); toast("License ID copied."); } else window.prompt("Copy license ID:", item.id); } catch (_) { window.prompt("Copy license ID:", item.id); } }
  });
  if (firebaseConfigReady) { try { const app = initializeApp(firebaseConfig); auth = getAuth(app); db = getFirestore(app); functions = getFunctions(app); onAuthStateChanged(auth, async user => { if (!user) return; try { const adminDoc = await getDoc(doc(db, "admins", user.uid)); if (!adminDoc.exists()) { await signOut(auth); toast("Account is not in the admin allowlist."); return; } cloudMode = true; document.body.classList.remove("logged-out"); await Promise.all([loadCloudLicenses(), loadCloudPayments(), loadCloudPlayers()]); showScreen("overview"); } catch (error) { toast("Backend connection error: " + error.message); } }); } catch (error) { console.error(error); toast("Firebase configuration is invalid."); } }
  renderAll();
})();