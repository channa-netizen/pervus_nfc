
const c = window.PERVUS_CONFIG || {};

const AUTH = `${c.supabaseUrl}/auth/v1`;
const REST = `${c.supabaseUrl}/rest/v1`;
const STORAGE = `${c.supabaseUrl}/storage/v1`;

const loginView = document.getElementById("loginView");
const adminView = document.getElementById("adminView");
const queue = document.getElementById("queue");
const commentQueue = document.getElementById("commentQueue");

let session = null;
let pendingAction = null;
let actionBusy = false;

function anonHeaders() {
  return {
    apikey: c.supabaseKey,
    "Content-Type": "application/json"
  };
}

function authHeaders(extra = {}) {
  return {
    ...anonHeaders(),
    Authorization: `Bearer ${session.access_token}`,
    ...extra
  };
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

function saveSession(s) {
  session = s;
  if (s) {
    localStorage.setItem("pervus_admin_session", JSON.stringify(s));
  } else {
    localStorage.removeItem("pervus_admin_session");
  }
}

function showLogin(msg = "") {
  loginView.hidden = false;
  adminView.hidden = true;
  document.getElementById("loginStatus").textContent = msg;
}

function showAdmin() {
  loginView.hidden = true;
  adminView.hidden = false;
  document.getElementById("adminEmail").textContent =
    session?.user?.email || "";
  loadQueue();
}

async function refreshSession() {
  if (!session?.refresh_token) return false;

  try {
    const r = await fetch(
      `${AUTH}/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: anonHeaders(),
        body: JSON.stringify({
          refresh_token: session.refresh_token
        })
      }
    );

    if (!r.ok) throw new Error("Session refresh failed");

    saveSession(await r.json());
    return true;
  } catch (e) {
    saveSession(null);
    return false;
  }
}

async function api(url, opts = {}, retry = true) {
  let r = await fetch(url, {
    ...opts,
    headers: authHeaders(opts.headers || {})
  });

  if (r.status === 401 && retry && await refreshSession()) {
    r = await fetch(url, {
      ...opts,
      headers: authHeaders(opts.headers || {})
    });
  }

  return r;
}

async function checked(r, label) {
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`${label}: ${body || r.status}`);
  }
  return r;
}

function setCount(id, message) {
  document.getElementById(id).textContent = message;
}

// LOGIN

document.getElementById("loginForm").addEventListener(
  "submit",
  async e => {
    e.preventDefault();

    const st = document.getElementById("loginStatus");
    const btn = document.getElementById("loginBtn");

    btn.disabled = true;
    st.textContent = "Verifying nervous credentials...";

    try {
      const r = await fetch(
        `${AUTH}/token?grant_type=password`,
        {
          method: "POST",
          headers: anonHeaders(),
          body: JSON.stringify({
            email: document.getElementById("email").value.trim(),
            password: document.getElementById("password").value
          })
        }
      );

      const data = await r.json();

      if (!r.ok) {
        throw new Error(
          data.error_description ||
          data.msg ||
          "Sign in failed"
        );
      }

      saveSession(data);
      showAdmin();

    } catch (err) {
      st.textContent = err.message || "Sign in failed.";
    } finally {
      btn.disabled = false;
    }
  }
);

// LOGOUT

document.getElementById("logoutBtn").onclick = async () => {
  try {
    await api(`${AUTH}/logout`, { method: "POST" });
  } catch (e) {}

  saveSession(null);
  showLogin("Signed out.");
};

document.getElementById("refreshBtn").onclick = loadQueue;

// PRIVATE PHOTOS

async function privateImage(path) {
  const r = await api(
    `${STORAGE}/object/pervus-pending/${encodeURIComponent(path)}`
  );

  if (!r.ok) throw new Error("Cannot read pending photo");

  return URL.createObjectURL(await r.blob());
}

// REFRESH BOTH QUEUES

async function loadQueue() {
  await Promise.all([
    loadSightings(),
    loadComments()
  ]);
}

// PHOTO SIGHTINGS

async function loadSightings() {
  queue.innerHTML =
    '<div class="empty-queue">Checking incoming sightings...</div>';

  try {
    const r = await api(
      `${REST}/pervus_sightings?select=id,display_name,location,caption,image_path,created_at&approved=eq.false&order=created_at.asc`
    );

    await checked(r, "Sightings queue failed");

    const rows = await r.json();

    setCount(
      "queueCount",
      `${rows.length} PENDING SIGHTING${rows.length === 1 ? "" : "S"}`
    );

    if (!rows.length) {
      queue.innerHTML =
        '<div class="empty-queue"><b>👽</b>NO PENDING SIGHTINGS</div>';
      return;
    }

    queue.innerHTML = "";

    for (const x of rows) {
      const card = document.createElement("article");
      card.className = "review-card";
      card.dataset.id = x.id;
      card.dataset.type = "sighting";

      let src = "";

      try {
        src = await privateImage(x.image_path);
      } catch (e) {}

      card.innerHTML = `
        ${
          src
            ? `<img class="review-image" src="${src}" alt="Pending Pervus sighting">`
            : '<div class="empty-queue">PHOTO UNAVAILABLE</div>'
        }
        <div class="review-body">
          <div class="review-top">
            <div>
              <strong>${esc(x.display_name)}</strong>
              <div class="review-location">
                ${esc(x.location || "Location classified")}
              </div>
            </div>
            <time>${new Date(x.created_at).toLocaleString()}</time>
          </div>

          ${
            x.caption
              ? `<p class="review-caption">${esc(x.caption)}</p>`
              : ""
          }

          <div class="review-actions">
            <button class="reject">✕ REJECT</button>
            <button class="approve">✓ APPROVE</button>
          </div>
        </div>
      `;

      card.querySelector(".approve").onclick =
        () => ask("approve", "sighting", x);

      card.querySelector(".reject").onclick =
        () => ask("reject", "sighting", x);

      queue.appendChild(card);
    }

  } catch (err) {
    setCount("queueCount", "SIGHTINGS ERROR");
    queue.innerHTML =
      `<div class="empty-queue">${esc(err.message)}</div>`;
  }
}

// GUESTBOOK COMMENTS

async function loadComments() {
  commentQueue.innerHTML =
    '<div class="empty-queue">Checking guestbook comments...</div>';

  try {
    const r = await api(
      `${REST}/guestbook?select=*&approved=eq.false&order=created_at.asc`
    );

    await checked(r, "Comments queue failed");

    const rows = await r.json();

    setCount(
      "commentCount",
      `${rows.length} PENDING COMMENT${rows.length === 1 ? "" : "S"}`
    );

    if (!rows.length) {
      commentQueue.innerHTML =
        '<div class="empty-queue"><b>💬</b>NO PENDING COMMENTS</div>';
      return;
    }

    commentQueue.innerHTML = "";

    for (const x of rows) {
      const card = document.createElement("article");
      card.className = "review-card";
      card.dataset.id = x.id;
      card.dataset.type = "comment";

      card.innerHTML = `
        <div class="review-body">
          <div class="review-top">
            <div>
              <strong>${esc(x.display_name || "Anonymous")}</strong>
              <div class="review-location">
                ${esc(x.location || "")}
              </div>
            </div>
            <time>
              ${x.created_at
                ? new Date(x.created_at).toLocaleString()
                : ""}
            </time>
          </div>

          <p class="review-caption">${esc(x.message || "")}</p>

          <div class="review-actions">
            <button class="reject">✕ REJECT</button>
            <button class="approve">✓ APPROVE</button>
          </div>
        </div>
      `;

      card.querySelector(".approve").onclick =
        () => ask("approve", "comment", x);

      card.querySelector(".reject").onclick =
        () => ask("reject", "comment", x);

      commentQueue.appendChild(card);
    }

  } catch (err) {
    setCount("commentCount", "COMMENTS ERROR");
    commentQueue.innerHTML =
      `<div class="empty-queue">${esc(err.message)}</div>`;
  }
}

// CONFIRMATION DIALOG

function ask(kind, type, x) {
  if (actionBusy) return;

  pendingAction = { kind, type, x };

  const isApprove = kind === "approve";
  const isComment = type === "comment";

  document.getElementById("confirmTitle").textContent =
    `${isApprove ? "Approve" : "Reject"} this ${
      isComment ? "comment" : "sighting"
    }?`;

  document.getElementById("confirmText").textContent =
    isApprove
      ? isComment
        ? "This comment will become visible in the public guestbook."
        : "The photo will be promoted to the public gallery."
      : isComment
        ? "This comment will be permanently deleted."
        : "The pending photo and its submission record will be permanently deleted.";

  const btn = document.getElementById("confirmAction");

  btn.textContent = isApprove ? "✓ APPROVE" : "✕ DELETE";
  btn.className = isApprove ? "good" : "danger";

  document.getElementById("confirmSheet").hidden = false;
}

document.getElementById("cancelAction").onclick = () => {
  pendingAction = null;
  document.getElementById("confirmSheet").hidden = true;
};

document.getElementById("confirmAction").onclick = async () => {
  if (!pendingAction || actionBusy) return;

  actionBusy = true;

  const { kind, type, x } = pendingAction;
  const confirmBtn = document.getElementById("confirmAction");
  confirmBtn.disabled = true;

  document.getElementById("confirmSheet").hidden = true;

  const card = [...document.querySelectorAll(".review-card")]
    .find(el =>
      el.dataset.id === String(x.id) &&
      el.dataset.type === type
    );

  if (card) card.classList.add("busy");

  try {
    if (type === "comment") {
      await moderateComment(kind, x);
      await loadComments();
    } else {
      if (kind === "approve") {
        await approveSighting(x);
      } else {
        await rejectSighting(x);
      }
      await loadSightings();
    }
  } catch (err) {
    alert(err.message || "Pervus control operation failed.");
    if (card) card.classList.remove("busy");
  } finally {
    pendingAction = null;
    actionBusy = false;
    confirmBtn.disabled = false;
  }
};

// APPROVE / DELETE COMMENTS

async function moderateComment(kind, x) {
  const url =
    `${REST}/guestbook?id=eq.${encodeURIComponent(x.id)}`;

  const opts = kind === "approve"
    ? {
        method: "PATCH",
        headers: {
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          approved: true
        })
      }
    : {
        method: "DELETE",
        headers: {
          Prefer: "return=representation"
        }
      };

  const r = await api(url, opts);

  await checked(r, `Could not ${kind} comment`);

  const changed = await r.json();

  if (!Array.isArray(changed) || changed.length !== 1) {
    throw new Error(
      "No comment was changed. Check your Supabase admin RLS policies."
    );
  }
}

// APPROVE PHOTO

async function approveSighting(x) {
  let r = await api(
    `${STORAGE}/object/pervus-pending/${encodeURIComponent(x.image_path)}`
  );

  if (!r.ok) {
    throw new Error("Could not retrieve pending photo.");
  }

  const blob = await r.blob();

  r = await api(
    `${STORAGE}/object/pervus-approved/${encodeURIComponent(x.image_path)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "image/jpeg",
        "x-upsert": "false"
      },
      body: blob
    }
  );

  if (!r.ok) {
    throw new Error("Could not promote photo.");
  }

  r = await api(
    `${REST}/pervus_sightings?id=eq.${encodeURIComponent(x.id)}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        approved: true
      })
    }
  );

  if (!r.ok) {
    await api(
      `${STORAGE}/object/pervus-approved/${encodeURIComponent(x.image_path)}`,
      { method: "DELETE" }
    ).catch(() => {});

    throw new Error("Could not approve database record.");
  }

  await api(
    `${STORAGE}/object/pervus-pending/${encodeURIComponent(x.image_path)}`,
    { method: "DELETE" }
  );
}

// REJECT PHOTO

async function rejectSighting(x) {
  let r = await api(
    `${STORAGE}/object/pervus-pending/${encodeURIComponent(x.image_path)}`,
    { method: "DELETE" }
  );

  if (!r.ok && r.status !== 404) {
    throw new Error("Could not delete pending photo.");
  }

  r = await api(
    `${REST}/pervus_sightings?id=eq.${encodeURIComponent(x.id)}`,
    {
      method: "DELETE",
      headers: {
        Prefer: "return=minimal"
      }
    }
  );

  if (!r.ok) {
    throw new Error("Could not delete sighting record.");
  }
}

// RESTORE LOGIN

(async () => {
  try {
    const raw = localStorage.getItem("pervus_admin_session");
    if (raw) session = JSON.parse(raw);
  } catch (e) {}

  if (session?.access_token) {
    try {
      const r = await api(`${AUTH}/user`);

      if (r.ok) {
        session.user = await r.json();
        showAdmin();
        return;
      }
    } catch (e) {}
  }

  showLogin();
})();
