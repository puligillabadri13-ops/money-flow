/**
 * MoneyFlow — Modern Personal Expense Tracker & Financial Dashboard
 * Main Application Logic: script.js
 */

(function() {
  'use strict';

  // ─── Configuration & Constants ──────────────────────────────────────────
  const CUR = '₹';
  const DEFAULT_CATS = ['Travel', 'Household', 'Food', 'Entertainment'];
  const EXTRA_ICONS = ['🏷️', '🌟', '💡', '🎯', '🚗', '💼', '🎨', '🏋️'];
  const MIN_PASSWORD = 6;

  const CAT_STYLE = {
    Travel:        { icon: '✈️', color: '#6366f1', light: '#eef2ff', bar: '#6366f1' },
    Household:     { icon: '🏠', color: '#7c3aed', light: '#f5f3ff', bar: '#7c3aed' },
    Food:          { icon: '🍔', color: '#f59e0b', light: '#fffbeb', bar: '#f59e0b' },
    Entertainment: { icon: '🎮', color: '#ec4899', light: '#fdf2f8', bar: '#ec4899' },
    Shopping:      { icon: '🛒', color: '#10b981', light: '#ecfdf5', bar: '#10b981' },
    Health:        { icon: '💊', color: '#ef4444', light: '#fff1f2', bar: '#ef4444' },
    Education:     { icon: '📚', color: '#3b82f6', light: '#eff6ff', bar: '#3b82f6' },
    Utilities:     { icon: '⚡', color: '#d97706', light: '#fffbeb', bar: '#d97706' }
  };

  const FULL_MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const MONTH_COLORS = [
    { name: 'Jan', grad: ['#38bdf8', '#0284c7'], text: '#38bdf8', glow: 'rgba(56, 189, 248, 0.4)' },
    { name: 'Feb', grad: ['#a78bfa', '#7c3aed'], text: '#a78bfa', glow: 'rgba(167, 139, 250, 0.4)' },
    { name: 'Mar', grad: ['#34d399', '#059669'], text: '#34d399', glow: 'rgba(52, 211, 153, 0.4)' },
    { name: 'Apr', grad: ['#fbbf24', '#d97706'], text: '#fbbf24', glow: 'rgba(251, 191, 36, 0.4)' },
    { name: 'May', grad: ['#f472b6', '#db2777'], text: '#f472b6', glow: 'rgba(244, 114, 182, 0.4)' },
    { name: 'Jun', grad: ['#818cf8', '#4f46e5'], text: '#818cf8', glow: 'rgba(129, 140, 248, 0.4)' },
    { name: 'Jul', grad: ['#fb7185', '#e11d48'], text: '#fb7185', glow: 'rgba(251, 113, 133, 0.4)' },
    { name: 'Aug', grad: ['#a3e635', '#65a30d'], text: '#a3e635', glow: 'rgba(163, 230, 53, 0.4)' },
    { name: 'Sep', grad: ['#fb923c', '#ea580c'], text: '#fb923c', glow: 'rgba(251, 146, 60, 0.4)' },
    { name: 'Oct', grad: ['#e879f9', '#c026d3'], text: '#e879f9', glow: 'rgba(232, 121, 249, 0.4)' },
    { name: 'Nov', grad: ['#60a5fa', '#2563eb'], text: '#60a5fa', glow: 'rgba(96, 165, 250, 0.4)' },
    { name: 'Dec', grad: ['#f43f5e', '#9f1239'], text: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)' }
  ];

  // ─── Application State ───────────────────────────────────────────────────
  let S = { balance: 0, expenses: { Travel: [], Household: [], Food: [], Entertainment: [] } };
  let activeCat = null;
  let expandedCat = null;
  let lastLevel = 0;
  let toastTimer = null;

  let selectedYear = new Date().getFullYear();
  let selectedMonth = new Date().getMonth();
  let currentGraphView = 'bars'; // 'bars' | 'wave' | 'donut'

  // ─── DOM Helpers ─────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const esc = t => String(t || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const money = n => CUR + Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function getStyle(name) {
    if (CAT_STYLE[name]) return CAT_STYLE[name];
    const keys = Object.keys(S.expenses || {});
    const idx = Math.max(0, keys.indexOf(name)) % EXTRA_ICONS.length;
    const colors = ['#06b6d4', '#8b5cf6', '#f97316', '#14b8a6', '#a855f7', '#0ea5e9'];
    const c = colors[idx % colors.length];
    return { icon: EXTRA_ICONS[idx] || '🏷️', color: c, light: '#f8fafc', bar: c };
  }

  function toast(msg, ms = 2500) {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  // ─── Theme Management (Dark / Light) ────────────────────────────────────
  function applyTheme(theme) {
    const isDark = theme === 'dark';
    if (isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('mf_theme', theme);

    const icon = isDark ? '☀️' : '🌙';
    const text = isDark ? 'Light' : 'Dark';
    const dropText = isDark ? 'Light Theme' : 'Dark Theme';

    if ($('theme-btn-icon')) $('theme-btn-icon').textContent = icon;
    if ($('theme-btn-text')) $('theme-btn-text').textContent = text;
    if ($('drop-theme-icon')) $('drop-theme-icon').textContent = icon;
    if ($('drop-theme-text')) $('drop-theme-text').textContent = dropText;
  }

  function toggleTheme() {
    const current = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    toast(next === 'dark' ? '🌙 Dark theme enabled' : '☀️ Light theme enabled');
  }

  // ─── Multi-User Local Vault (Offline & GitHub Pages) ─────────────────────
  function getLocalUsers() {
    try {
      return JSON.parse(localStorage.getItem('mf_local_users') || '{}');
    } catch(e) {
      return {};
    }
  }

  function saveLocalUsers(users) {
    try {
      localStorage.setItem('mf_local_users', JSON.stringify(users));
    } catch(e) {
      console.warn('Could not save local users:', e);
    }
  }

  function localAuth(username, password, isRegister) {
    const users = getLocalUsers();
    const key = username.toLowerCase().trim();

    if (isRegister) {
      if (users[key]) {
        return { success: false, error: 'Username already exists. Please choose another or sign in.' };
      }
      users[key] = {
        username: username.trim(),
        password: password,
        avatar: '',
        balance: 0.0,
        expenses: { Travel: [], Household: [], Food: [], Entertainment: [] }
      };
      saveLocalUsers(users);
      return { success: true, token: 'local_' + key, username: username.trim(), avatar: '' };
    } else {
      if (!users[key]) {
        return { success: false, error: 'Account not found. Please create an account first.' };
      }
      if (users[key].password !== password) {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }
      return {
        success: true,
        token: 'local_' + key,
        username: users[key].username,
        avatar: users[key].avatar || ''
      };
    }
  }

  function localApiFallback(url, body) {
    const user = localStorage.getItem('mf_username') || 'User';
    const key = user.toLowerCase().trim();
    const users = getLocalUsers();

    if (!users[key]) {
      users[key] = {
        username: user,
        avatar: localStorage.getItem('mf_avatar') || '',
        balance: 0.0,
        expenses: { Travel: [], Household: [], Food: [], Entertainment: [] }
      };
    }
    const u = users[key];

    if (url === '/api/state') {
      return {
        username: u.username,
        avatar: u.avatar || '',
        balance: u.balance || 0.0,
        expenses: u.expenses || {}
      };
    }
    if (url === '/api/balance') {
      u.balance = Math.max(0, parseFloat(body.balance) || 0);
    } else if (url === '/api/category') {
      const n = (body.name || '').trim();
      if (n && !u.expenses[n]) u.expenses[n] = [];
    } else if (url === '/api/category/delete') {
      delete u.expenses[body.name];
    } else if (url === '/api/add') {
      if (!u.expenses[body.category]) u.expenses[body.category] = [];
      u.expenses[body.category].push({
        name: body.item,
        price: parseFloat(body.price) || 0,
        date: body.date || new Date().toISOString().split('T')[0]
      });
    } else if (url === '/api/delete') {
      if (u.expenses[body.category] && Array.isArray(u.expenses[body.category])) {
        u.expenses[body.category].splice(body.index, 1);
      }
    } else if (url === '/api/avatar') {
      u.avatar = body.avatar || '';
      if (u.avatar) localStorage.setItem('mf_avatar', u.avatar);
      else localStorage.removeItem('mf_avatar');
    } else if (url === '/api/reset') {
      u.balance = 0.0;
      u.expenses = { Travel: [], Household: [], Food: [], Entertainment: [] };
    }

    saveLocalUsers(users);
    return {
      username: u.username,
      avatar: u.avatar || '',
      balance: u.balance || 0.0,
      expenses: u.expenses || {}
    };
  }

  async function api(url, body) {
    const isStatic = window.location.protocol === 'file:' || window.location.hostname.endsWith('github.io');
    if (isStatic) {
      return localApiFallback(url, body);
    }

    const token = localStorage.getItem('mf_token') || '';
    try {
      const opts = {
        method: body ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
          'X-Auth-Token': token
        }
      };
      if (body) opts.body = JSON.stringify(body);

      const r = await fetch(url, opts);
      if (r.status === 401) {
        logoutUser();
        return S;
      }
      if (!r.ok) throw new Error('API status: ' + r.status);
      return await r.json();
    } catch(err) {
      return localApiFallback(url, body);
    }
  }

  // ─── View Switching: Auth Screen vs Tracker Screen ───────────────────────
  function showAuthView() {
    document.body.classList.add('auth-mode');
    const authView = $('auth-view');
    const trackerView = $('tracker-view');
    const b1 = $('blob1');
    const b2 = $('blob2');

    if (authView) authView.style.display = 'grid';
    if (trackerView) trackerView.style.display = 'none';
    if (b1) b1.style.display = 'block';
    if (b2) b2.style.display = 'block';

    showAuthSubView('loginView');
  }

  function showTrackerView() {
    document.body.classList.remove('auth-mode');
    const authView = $('auth-view');
    const trackerView = $('tracker-view');
    const b1 = $('blob1');
    const b2 = $('blob2');

    if (authView) authView.style.display = 'none';
    if (trackerView) trackerView.style.display = 'block';
    if (b1) b1.style.display = 'none';
    if (b2) b2.style.display = 'none';

    // Apply saved theme to dashboard
    const savedTheme = localStorage.getItem('mf_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);

    const user = localStorage.getItem('mf_username') || 'User';
    const titleEl = $('header-title');
    if (titleEl) titleEl.innerHTML = `<span>${esc(user)}</span>'s MoneyFlow`;

    loadAvatar();
    triggerWelcomePopup();

    if ($('item-date')) {
      $('item-date').value = new Date().toISOString().split('T')[0];
    }

    // Fetch user data
    api('/api/state').then(d => {
      if (d) {
        S = d;
        if (d.avatar) {
          localStorage.setItem('mf_avatar', d.avatar);
          loadAvatar();
        }
        render();
      }
    });
  }

  function logoutUser() {
    api('/api/auth/logout', {}).catch(() => {});
    localStorage.removeItem('mf_token');
    localStorage.removeItem('mf_username');
    localStorage.removeItem('mf_avatar');
    showAuthView();
    toast('Logged out successfully.');
  }

  // ─── Sub-View Switching (Login vs Register) ──────────────────────────────
  function showAuthSubView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = $(viewId);
    if (target) target.classList.add('active');

    // Clear messages and errors
    const lMsg = $('loginMsg');
    const rMsg = $('regMsg');
    if (lMsg) { lMsg.textContent = ''; lMsg.className = 'msg'; }
    if (rMsg) { rMsg.textContent = ''; rMsg.className = 'msg'; }
    ['rUserErr', 'rPassErr', 'rConfErr'].forEach(id => {
      if ($(id)) $(id).textContent = '';
    });
  }

  function setAuthMessage(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = 'msg show ' + type;
  }

  function setFormLoading(form, on) {
    const btn = form.querySelector('.btn.primary');
    if (!btn) return;
    btn.disabled = on;
    btn.classList.toggle('loading', on);
  }

  // ─── Welcome Greeting Popup Banner ───────────────────────────────────────
  function triggerWelcomePopup() {
    const user = localStorage.getItem('mf_username') || 'User';
    const now = new Date();
    const hour = now.getHours();

    let greeting = 'Good Morning!';
    let emoji = '🌞';

    if (hour >= 12 && hour < 17) {
      greeting = 'Good Afternoon!';
      emoji = '☀️';
    } else if (hour >= 17 && hour < 21) {
      greeting = 'Good Evening!';
      emoji = '🌆';
    } else if (hour >= 21 || hour < 5) {
      greeting = 'Good Night!';
      emoji = '🌙';
    }

    if ($('welcome-time-text')) $('welcome-time-text').textContent = greeting;
    if ($('welcome-time-emoji')) $('welcome-time-emoji').textContent = emoji;
    if ($('welcome-username')) $('welcome-username').textContent = user;

    const popup = $('welcome-popup');
    if (!popup) return;
    popup.style.display = 'flex';

    const timer = setTimeout(() => {
      popup.style.animation = 'fadeOut .3s ease forwards';
      setTimeout(() => { popup.style.display = 'none'; popup.style.animation = ''; }, 300);
    }, 7000);

    if ($('welcome-close-btn')) {
      $('welcome-close-btn').onclick = () => {
        clearTimeout(timer);
        popup.style.display = 'none';
      };
    }
  }

  // ─── Profile Avatar & Management ─────────────────────────────────────────
  function loadAvatar() {
    const avatar = localStorage.getItem('mf_avatar');
    const user = localStorage.getItem('mf_username') || 'User';
    const initial = user.trim().charAt(0).toUpperCase() || 'U';

    const avatarImg = $('avatar-img');
    const avatarInit = $('avatar-initial');
    const dropImg = $('dropdown-avatar-img');
    const dropInit = $('dropdown-avatar-initial');
    const removeBtn = $('remove-photo-btn');
    const nameLabel = $('profile-name-label');
    const dropName = $('dropdown-username');

    if (nameLabel) nameLabel.textContent = user;
    if (dropName) dropName.textContent = user;

    if (avatar) {
      if (avatarImg) { avatarImg.src = avatar; avatarImg.style.display = 'block'; }
      if (avatarInit) avatarInit.style.display = 'none';
      if (dropImg) { dropImg.src = avatar; dropImg.style.display = 'block'; }
      if (dropInit) dropInit.style.display = 'none';
      if (removeBtn) removeBtn.style.display = 'flex';
    } else {
      if (avatarImg) avatarImg.style.display = 'none';
      if (avatarInit) { avatarInit.textContent = initial; avatarInit.style.display = 'inline'; }
      if (dropImg) dropImg.style.display = 'none';
      if (dropInit) { dropInit.textContent = initial; dropInit.style.display = 'inline'; }
      if (removeBtn) removeBtn.style.display = 'none';
    }
  }

  // ─── Main Dashboard Render ───────────────────────────────────────────────
  function render() {
    const cats = Object.keys(S.expenses || {});
    const totals = cats.map(c => (S.expenses[c] || []).reduce((a, i) => a + Number(i.price || 0), 0));
    const spent = totals.reduce((a, b) => a + b, 0);
    const left = S.balance - spent;
    const pct = S.balance > 0 ? Math.max(0, Math.min(1, left / S.balance)) : 0;
    const spentPct = S.balance > 0 ? Math.min(100, (spent / S.balance) * 100) : 0;

    // Gauge (radius 62 -> circumference ≈ 390)
    const C = 2 * Math.PI * 62;
    const gf = $('gauge-fill');
    if (gf) {
      gf.style.strokeDasharray = C;
      gf.style.strokeDashoffset = C * (1 - pct);
      gf.style.stroke = pct <= 0.2 && S.balance > 0 ? '#f43f5e' : '#6366f1';
    }
    if ($('g-left')) $('g-left').textContent = money(left);
    if ($('g-pct')) $('g-pct').textContent = S.balance > 0 ? Math.round(pct * 100) + '% remaining' : 'Set a balance to begin';

    // Budget Pills
    const budgetPills = $('budget-pills');
    if (budgetPills) {
      if (S.balance > 0) {
        budgetPills.style.display = '';
        if ($('bp-bal')) $('bp-bal').textContent = money(S.balance);
        if ($('bp-spent')) $('bp-spent').textContent = money(spent);
        if ($('bp-left')) $('bp-left').textContent = money(left);
      } else {
        budgetPills.style.display = 'none';
      }
    }

    // Summary Strip
    const strip = $('summary-strip');
    if (strip) {
      if (S.balance > 0) {
        strip.style.display = '';
        if ($('s-budget')) $('s-budget').textContent = money(S.balance);
        if ($('s-spent')) $('s-spent').textContent = money(spent);
        if ($('s-left')) $('s-left').textContent = money(left);
        if ($('s-cats')) $('s-cats').textContent = cats.length;
      } else {
        strip.style.display = 'none';
      }
    }

    // Alert Banner
    const level = S.balance > 0 && spent >= S.balance ? 2 : (S.balance > 0 && spentPct >= 80 ? 1 : 0);
    const banner = $('alert-banner');
    if (banner) {
      if (level === 0) {
        banner.style.display = 'none';
      } else {
        banner.style.display = 'flex';
        banner.className = level === 2 ? 'danger' : 'warn';
        if ($('alert-icon')) $('alert-icon').textContent = level === 2 ? '🚨' : '⚠️';
        if ($('alert-pct')) $('alert-pct').textContent = Math.round(spentPct) + '% spent';
        if ($('alert-text')) {
          $('alert-text').textContent = level === 2
            ? (spent > S.balance
                ? `You are over budget by ${money(spent - S.balance)}. Consider reviewing your expenses.`
                : 'Your expenses have reached your full balance!')
            : `Heads up! You have used ${Math.round(spentPct)}% of your budget. Only ${money(left)} remaining.`;
        }
      }
    }
    if (level > lastLevel) {
      toast(level === 2 ? '🚨 Budget fully used!' : '⚠️ 80% of budget spent!', 4000);
    }
    lastLevel = level;

    // Category Chips
    if (!activeCat || !cats.includes(activeCat)) activeCat = cats[0] || null;
    const chipsEl = $('chips');
    if (chipsEl) {
      chipsEl.innerHTML = cats.map(c => {
        const st = getStyle(c);
        const isDefault = DEFAULT_CATS.includes(c);
        return `<button class="chip ${c === activeCat ? 'active' : ''}" data-cat="${esc(c)}">
          ${st.icon} ${esc(c)}
          ${!isDefault ? `<span class="chip-del" title="Delete category" onclick="event.stopPropagation();window.delCat('${esc(c)}')">✕</span>` : ''}
        </button>`;
      }).join('');
    }

    const toCatLabel = $('to-cat-label');
    if (toCatLabel) {
      toCatLabel.textContent = activeCat ? `${getStyle(activeCat).icon} ${activeCat}` : 'Pick a category ↑';
      toCatLabel.style.color = activeCat ? getStyle(activeCat).color : '#94a3b8';
    }

    // Category Cards Grid
    const catsGrid = $('cats-grid');
    if (catsGrid) {
      catsGrid.innerHTML = cats.map((c, k) => {
        const st = getStyle(c);
        const items = S.expenses[c] || [];
        const total = totals[k];
        const share = spent > 0 ? (total / spent) * 100 : 0;
        const isExp = expandedCat === c;

        const rows = items.length
          ? items.map((it, i) => `
            <div class="item-row">
              <span class="item-name">${esc(it.name)}</span>
              <span class="item-price">${money(it.price)}</span>
              <button class="item-del" title="Remove" onclick="event.stopPropagation();window.delItem('${esc(c)}', ${i})">✕</button>
            </div>`).join('')
          : `<div class="empty-msg">No expenses yet — add your first ${esc(c).toLowerCase()} expense above.</div>`;

        return `
        <div class="cat-card ${isExp ? 'expanded' : ''}" onclick="window.toggleCat('${esc(c)}')">
          <div class="card-header">
            <div class="cat-left">
              <div class="cat-icon" style="background:${st.light};border:1.5px solid ${st.color}30">${st.icon}</div>
              <div>
                <div class="cat-name">${esc(c)}</div>
                <div class="cat-count">${items.length} item${items.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <div class="cat-right">
              <span class="cat-total-val" style="color:${st.color}">${money(total)}</span>
              <span class="cat-total-lbl">total</span>
            </div>
          </div>
          <div class="card-bar">
            <div class="bar-track">
              <div class="bar-fill" style="width:${share}%;background:${st.bar}"></div>
            </div>
          </div>
          <div class="card-footer">
            <span>${Math.round(share)}% of total spend</span>
            <span>View items <span class="toggle-icon">▾</span></span>
          </div>
          <div class="card-body">
            <div class="items-list">${rows}</div>
            <div class="card-total-bar">
              <span>Total spent on ${esc(c)}</span>
              <strong style="color:${st.color}">${money(total)}</strong>
            </div>
          </div>
        </div>`;
      }).join('');
    }
  }

  // ─── Actions & Handlers ──────────────────────────────────────────────────
  window.toggleCat = function(name) {
    expandedCat = expandedCat === name ? null : name;
    activeCat = name;
    render();
  };

  window.delItem = async function(cat, idx) {
    S = await api('/api/delete', { category: cat, index: idx });
    render();
    toast('Item removed');
  };

  window.delCat = async function(name) {
    if (!confirm(`Delete "${name}" and all its expenses?`)) return;
    S = await api('/api/category/delete', { name });
    if (activeCat === name) activeCat = null;
    if (expandedCat === name) expandedCat = null;
    render();
    toast(`"${name}" deleted`);
  };

  // ─── Monthly Graph Feature ───────────────────────────────────────────────
  function getAllItems() {
    const all = [];
    if (!S || !S.expenses) return all;
    const todayStr = new Date().toISOString().split('T')[0];
    for (const [cat, items] of Object.entries(S.expenses)) {
      if (Array.isArray(items)) {
        items.forEach(it => {
          all.push({
            category: cat,
            name: it.name,
            price: Number(it.price) || 0,
            date: it.date || todayStr
          });
        });
      }
    }
    return all;
  }

  function openGraphModal() {
    const user = localStorage.getItem('mf_username') || 'User';
    if ($('m-user-title')) $('m-user-title').textContent = user;

    const allItems = getAllItems();
    const years = new Set([new Date().getFullYear()]);
    allItems.forEach(it => {
      if (it.date && it.date.includes('-')) {
        const y = parseInt(it.date.split('-')[0], 10);
        if (!isNaN(y)) years.add(y);
      }
    });
    const sortedYears = Array.from(years).sort((a,b) => b - a);
    if ($('year-select')) {
      $('year-select').innerHTML = sortedYears.map(y => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`).join('');
    }

    if ($('month-select')) {
      $('month-select').innerHTML = FULL_MONTH_NAMES.map((m, idx) =>
        `<option value="${idx}" ${idx === selectedMonth ? 'selected' : ''}>${m}</option>`
      ).join('');
    }

    renderMonthlyGraph();
    const modal = $('graph-modal');
    if (modal) modal.classList.add('open');
  }

  function closeGraphModal() {
    const modal = $('graph-modal');
    if (modal) modal.classList.remove('open');
    hideTooltip();
  }

  function showTooltip(html, x, y) {
    const tt = $('chart-tooltip');
    if (!tt) return;
    tt.innerHTML = html;
    tt.style.left = x + 'px';
    tt.style.top = y + 'px';
    tt.style.display = 'block';
  }

  function hideTooltip() {
    const tt = $('chart-tooltip');
    if (tt) tt.style.display = 'none';
  }

  function renderMonthlyGraph() {
    const allItems = getAllItems();
    const yearItems = allItems.filter(it => (it.date || '').startsWith(String(selectedYear)));

    const monthTotals = Array(12).fill(0);
    const monthCounts = Array(12).fill(0);
    const monthItems = Array(12).fill(null).map(() => []);

    yearItems.forEach(it => {
      const parts = (it.date || '').split('-');
      if (parts.length >= 2) {
        const mIdx = parseInt(parts[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          monthTotals[mIdx] += it.price;
          monthCounts[mIdx] += 1;
          monthItems[mIdx].push(it);
        }
      }
    });

    const annualTotal = monthTotals.reduce((a, b) => a + b, 0);
    if ($('chart-annual-total')) $('chart-annual-total').textContent = `Total: ${money(annualTotal)}`;

    const activeMonths = monthTotals.filter(v => v > 0);
    const avgSpend = activeMonths.length > 0 ? (annualTotal / activeMonths.length) : 0;
    const maxSpend = Math.max(...monthTotals, 100);
    const peakMonthIdx = monthTotals.indexOf(Math.max(...monthTotals));

    const viewLabels = {
      bars: 'Rainbow Glow Bars',
      wave: 'Neon Gradient Wave',
      donut: 'Category Donut Ring'
    };
    if ($('chart-view-label')) $('chart-view-label').textContent = viewLabels[currentGraphView] || 'Analysis';

    const svgW = 740;
    const svgH = 220;

    let defsSvg = `
      <defs>
        <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="waveAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.45" />
          <stop offset="50%" stop-color="#818cf8" stop-opacity="0.2" />
          <stop offset="100%" stop-color="#ec4899" stop-opacity="0.0" />
        </linearGradient>
        <linearGradient id="waveStrokeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="50%" stop-color="#a855f7" />
          <stop offset="100%" stop-color="#ec4899" />
        </linearGradient>
    `;
    MONTH_COLORS.forEach((mc, i) => {
      defsSvg += `
        <linearGradient id="barGrad_${i}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${mc.grad[0]}" />
          <stop offset="100%" stop-color="${mc.grad[1]}" />
        </linearGradient>
      `;
    });
    defsSvg += `</defs>`;

    let chartContent = '';

    if (currentGraphView === 'bars') {
      const padB = 32;
      const padT = 32;
      const drawH = svgH - padB - padT;
      const colW = 44;
      const gap = (svgW - (colW * 12)) / 13;

      let gridSvg = '';
      [0.25, 0.5, 0.75, 1.0].forEach(p => {
        const yLine = padT + drawH * (1 - p);
        gridSvg += `<line x1="12" y1="${yLine}" x2="${svgW - 12}" y2="${yLine}" stroke="rgba(255,255,255,0.07)" stroke-dasharray="4,4" stroke-width="1"/>`;
      });

      if (avgSpend > 0 && maxSpend > 0) {
        const avgY = padT + drawH * (1 - (avgSpend / maxSpend));
        gridSvg += `
          <line x1="12" y1="${avgY}" x2="${svgW - 12}" y2="${avgY}" stroke="#fbbf24" stroke-dasharray="5,3" stroke-width="1.5" opacity="0.75" />
          <rect x="${svgW - 88}" y="${avgY - 10}" width="78" height="18" rx="9" fill="#1e1b4b" stroke="#fbbf24" stroke-width="1" />
          <text x="${svgW - 49}" y="${avgY + 3}" font-size="10" font-weight="700" fill="#fbbf24" text-anchor="middle" font-family="'Inter', sans-serif">Avg ${money(avgSpend).replace('.00','')}</text>
        `;
      }

      let barsSvg = '';
      for (let i = 0; i < 12; i++) {
        const x = gap + i * (colW + gap);
        const spentVal = monthTotals[i];
        const barH = spentVal > 0 ? Math.max(8, (spentVal / maxSpend) * drawH) : 4;
        const y = padT + drawH - barH;
        const isSel = i === selectedMonth;
        const isPeak = i === peakMonthIdx && spentVal > 0;
        const mc = MONTH_COLORS[i];
        const barFill = spentVal > 0 ? `url(#barGrad_${i})` : 'rgba(255,255,255,0.1)';

        const labelVal = spentVal > 0
          ? (spentVal >= 1000 ? `₹${(spentVal/1000).toFixed(1)}k` : `₹${Math.round(spentVal)}`)
          : '';

        barsSvg += `
          <g class="chart-bar" onclick="window.selectGraphMonth(${i})"
             onmouseenter="window.hoverMonthBar(event, ${i}, ${spentVal}, ${monthCounts[i]})"
             onmouseleave="window.hideTooltip()">
            ${isPeak ? `
              <rect x="${x + colW/2 - 20}" y="${y - 24}" width="40" height="15" rx="7.5" fill="#e11d48" />
              <text x="${x + colW/2}" y="${y - 13}" font-size="9" font-weight="800" fill="#ffffff" text-anchor="middle" font-family="'Inter', sans-serif">🔥 PEAK</text>
            ` : ''}
            ${labelVal && !isPeak ? `
              <text x="${x + colW/2}" y="${y - 7}" font-size="11" font-weight="700" fill="${isSel ? '#ffffff' : mc.text}" text-anchor="middle" font-family="'Inter', sans-serif">${labelVal}</text>
            ` : ''}
            <rect x="${x}" y="${y}" width="${colW}" height="${barH}" rx="8"
                  fill="${barFill}"
                  filter="${isSel ? 'url(#neonGlow)' : 'none'}"
                  stroke="${isSel ? '#ffffff' : 'none'}" stroke-width="${isSel ? 2 : 0}"/>
            <text x="${x + colW/2}" y="${svgH - 12}" font-size="12" font-weight="${isSel ? '800' : '600'}"
                  fill="${isSel ? '#ffffff' : (spentVal > 0 ? mc.text : '#64748b')}"
                  text-anchor="middle" font-family="'Inter', sans-serif">${mc.name}</text>
            ${isSel ? `<circle cx="${x + colW/2}" cy="${svgH - 4}" r="3" fill="#ffffff"/>` : ''}
          </g>
        `;
      }
      chartContent = gridSvg + barsSvg;

    } else if (currentGraphView === 'wave') {
      const padB = 32;
      const padT = 32;
      const drawH = svgH - padB - padT;
      const colW = 44;
      const gap = (svgW - (colW * 12)) / 13;
      const baseY = padT + drawH;

      const points = [];
      for (let i = 0; i < 12; i++) {
        const cx = gap + i * (colW + gap) + colW / 2;
        const spentVal = monthTotals[i];
        const cy = spentVal > 0 ? (padT + drawH - (spentVal / maxSpend) * drawH) : baseY;
        points.push({ x: cx, y: cy, spent: spentVal, idx: i });
      }

      let gridSvg = '';
      [0.25, 0.5, 0.75, 1.0].forEach(p => {
        const yLine = padT + drawH * (1 - p);
        gridSvg += `<line x1="12" y1="${yLine}" x2="${svgW - 12}" y2="${yLine}" stroke="rgba(255,255,255,0.07)" stroke-dasharray="4,4" stroke-width="1"/>`;
      });

      let splineD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const cpx1 = p0.x + (p1.x - p0.x) * 0.45;
        const cpy1 = p0.y;
        const cpx2 = p0.x + (p1.x - p0.x) * 0.55;
        const cpy2 = p1.y;
        splineD += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${p1.x} ${p1.y}`;
      }

      const areaD = splineD + ` L ${points[11].x} ${baseY} L ${points[0].x} ${baseY} Z`;

      let waveNodesSvg = '';
      points.forEach(p => {
        const isSel = p.idx === selectedMonth;
        const mc = MONTH_COLORS[p.idx];
        const labelVal = p.spent > 0 ? (p.spent >= 1000 ? `₹${(p.spent/1000).toFixed(1)}k` : `₹${Math.round(p.spent)}`) : '';
        waveNodesSvg += `
          <g class="chart-bar" onclick="window.selectGraphMonth(${p.idx})"
             onmouseenter="window.hoverMonthBar(event, ${p.idx}, ${p.spent}, ${monthCounts[p.idx]})"
             onmouseleave="window.hideTooltip()">
            ${isSel ? `<circle cx="${p.x}" cy="${p.y}" r="12" fill="${mc.glow}" filter="url(#neonGlow)"/>` : ''}
            <circle cx="${p.x}" cy="${p.y}" r="${isSel ? 7 : (p.spent > 0 ? 5 : 3)}"
                    fill="${p.spent > 0 ? mc.grad[0] : '#334155'}"
                    stroke="${isSel ? '#ffffff' : '#0f172a'}" stroke-width="${isSel ? 2.5 : 1.5}" />
            ${labelVal ? `<text x="${p.x}" y="${p.y - 12}" font-size="10" font-weight="700" fill="${isSel ? '#ffffff' : mc.text}" text-anchor="middle" font-family="'Inter', sans-serif">${labelVal}</text>` : ''}
            <text x="${p.x}" y="${svgH - 12}" font-size="12" font-weight="${isSel ? '800' : '600'}"
                  fill="${isSel ? '#ffffff' : (p.spent > 0 ? mc.text : '#64748b')}"
                  text-anchor="middle" font-family="'Inter', sans-serif">${mc.name}</text>
            ${isSel ? `<circle cx="${p.x}" cy="${svgH - 4}" r="3" fill="#ffffff"/>` : ''}
          </g>
        `;
      });

      chartContent = `${gridSvg}<path d="${areaD}" fill="url(#waveAreaGrad)" /><path d="${splineD}" fill="none" stroke="url(#waveStrokeGrad)" stroke-width="3.5" stroke-linecap="round" filter="url(#neonGlow)" />${waveNodesSvg}`;

    } else if (currentGraphView === 'donut') {
      const catSums = {};
      yearItems.forEach(it => {
        catSums[it.category] = (catSums[it.category] || 0) + it.price;
      });
      const catEntries = Object.entries(catSums).sort((a,b) => b[1] - a[1]);

      const cx = 220;
      const cy = 110;
      const r = 70;
      const circ = 2 * Math.PI * r;

      let accumPct = 0;
      let ringSegmentsSvg = '';
      catEntries.forEach(([cName, cTotal]) => {
        const share = annualTotal > 0 ? (cTotal / annualTotal) : 0;
        const strokeLen = share * circ;
        const offset = -accumPct * circ;
        const st = getStyle(cName);

        ringSegmentsSvg += `
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
                  stroke="${st.color}" stroke-width="26"
                  stroke-dasharray="${strokeLen} ${circ}"
                  stroke-dashoffset="${offset}"
                  style="transition:stroke-width .2s;"
                  onmouseenter="this.setAttribute('stroke-width', '32')"
                  onmouseleave="this.setAttribute('stroke-width', '26')" />
        `;
        accumPct += share;
      });

      let legendSvg = '';
      const legX = 400;
      const legStartY = 40;
      catEntries.slice(0, 5).forEach(([cName, cTotal], idx) => {
        const st = getStyle(cName);
        const share = annualTotal > 0 ? Math.round((cTotal / annualTotal) * 100) : 0;
        const ly = legStartY + idx * 30;
        legendSvg += `
          <g>
            <circle cx="${legX}" cy="${ly + 6}" r="6" fill="${st.color}" />
            <text x="${legX + 16}" y="${ly + 10}" font-size="12" font-weight="700" fill="#f8fafc" font-family="'Inter', sans-serif">${st.icon} ${esc(cName)}</text>
            <text x="${legX + 170}" y="${ly + 10}" font-size="12" font-weight="600" fill="#94a3b8" font-family="'Inter', sans-serif">${share}%</text>
            <text x="${legX + 270}" y="${ly + 10}" font-size="12" font-weight="800" fill="${st.color}" text-anchor="end" font-family="'Inter', sans-serif">${money(cTotal)}</text>
          </g>
        `;
      });

      chartContent = `
        <g>
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="26"/>
          <g transform="rotate(-90 ${cx} ${cy})">
            ${ringSegmentsSvg}
          </g>
          <circle cx="${cx}" cy="${cy}" r="${r - 18}" fill="#0f172a" />
          <text x="${cx}" y="${cy - 6}" font-size="10" font-weight="700" fill="#94a3b8" text-anchor="middle" font-family="'Inter', sans-serif">TOTAL SPEND</text>
          <text x="${cx}" y="${cy + 15}" font-size="15" font-weight="800" fill="#38bdf8" text-anchor="middle" font-family="'Inter', sans-serif">${money(annualTotal)}</text>
        </g>
        ${legendSvg}
      `;
    }

    if ($('chart-container')) {
      $('chart-container').innerHTML = `
        <svg viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="xMidYMid meet">
          ${defsSvg}
          ${chartContent}
        </svg>
      `;
    }

    // Detail metrics for selected month
    const curMonthName = FULL_MONTH_NAMES[selectedMonth];
    const curSpent = monthTotals[selectedMonth];
    const curItems = monthItems[selectedMonth];
    const curCount = curItems.length;
    const mc = MONTH_COLORS[selectedMonth];

    if ($('stat-month-label')) $('stat-month-label').textContent = `Spent in ${curMonthName} ${selectedYear}`;
    if ($('stat-month-spent')) {
      $('stat-month-spent').textContent = money(curSpent);
      $('stat-month-spent').style.color = curSpent > 0 ? mc.text : '#6366f1';
    }
    if ($('stat-month-count')) $('stat-month-count').textContent = `${curCount} transaction${curCount !== 1 ? 's' : ''}`;
    if ($('stat-month-share')) $('stat-month-share').textContent = annualTotal > 0 ? `${Math.round((curSpent / annualTotal) * 100)}%` : '0%';

    const insightEl = $('chart-insight-badge');
    if (insightEl) {
      if (curSpent === 0) {
        insightEl.textContent = `🌱 No expenses recorded for ${curMonthName}`;
        insightEl.style.background = 'rgba(148, 163, 184, 0.15)';
        insightEl.style.color = '#94a3b8';
      } else if (avgSpend > 0 && curSpent > avgSpend * 1.25) {
        insightEl.textContent = `🔥 High spend month (+${Math.round((curSpent/avgSpend - 1)*100)}% vs avg)`;
        insightEl.style.background = 'rgba(239, 68, 68, 0.2)';
        insightEl.style.color = '#f87171';
      } else if (avgSpend > 0 && curSpent < avgSpend * 0.75) {
        insightEl.textContent = `🟢 Frugal month (-${Math.round((1 - curSpent/avgSpend)*100)}% vs avg)`;
        insightEl.style.background = 'rgba(16, 185, 129, 0.2)';
        insightEl.style.color = '#34d399';
      } else {
        insightEl.textContent = `⚡ Balanced spending month`;
        insightEl.style.background = 'rgba(99, 102, 241, 0.2)';
        insightEl.style.color = '#a5b4fc';
      }
    }

    const catSums = {};
    curItems.forEach(it => {
      catSums[it.category] = (catSums[it.category] || 0) + it.price;
    });
    let topCat = '—';
    let topCatVal = 0;
    for (const [c, val] of Object.entries(catSums)) {
      if (val > topCatVal) {
        topCatVal = val;
        const st = getStyle(c);
        topCat = `${st.icon} ${c}`;
      }
    }
    if ($('stat-month-top')) $('stat-month-top').textContent = topCat;

    if ($('m-detail-title')) $('m-detail-title').innerHTML = `<span>🎨</span> ${curMonthName} Category Breakdown`;
    if ($('m-detail-count')) $('m-detail-count').textContent = `${curCount} item${curCount !== 1 ? 's' : ''}`;

    const catRows = Object.keys(catSums).length
      ? Object.entries(catSums).sort((a,b) => b[1] - a[1]).map(([cat, total]) => {
          const st = getStyle(cat);
          const pct = curSpent > 0 ? Math.round((total / curSpent) * 100) : 0;
          return `
            <div class="m-cat-row">
              <div style="flex:1;min-width:140px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                  <span style="font-size:1.15rem;">${st.icon}</span>
                  <strong style="color:#1e293b;">${esc(cat)}</strong>
                </div>
                <div style="height:6px;background:#f1f5f9;border-radius:6px;overflow:hidden;width:90%;">
                  <div style="height:100%;width:${pct}%;background:${st.bar};border-radius:6px;transition:width .5s ease;"></div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-size:.8rem;color:#94a3b8;font-weight:700;background:#f8fafc;padding:3px 9px;border-radius:20px;border:1px solid #e2e8f0;">${pct}%</span>
                <span style="font-weight:800;color:${st.color};font-size:.95rem;">${money(total)}</span>
              </div>
            </div>
          `;
        }).join('')
      : `<div class="empty-msg" style="background:#fff;">No expenses recorded in ${curMonthName} ${selectedYear}.</div>`;
    if ($('m-cats-list')) $('m-cats-list').innerHTML = catRows;

    const itemRows = curItems.length
      ? curItems.map(it => {
          const st = getStyle(it.category);
          return `
            <div class="item-row" style="background:#fff;">
              <div style="display:flex;align-items:center;gap:8px;overflow:hidden;">
                <span>${st.icon}</span>
                <span class="item-name" title="${esc(it.name)}">${esc(it.name)}</span>
                <span style="font-size:.72rem;background:#f1f5f9;color:#64748b;padding:2px 7px;border-radius:6px;font-weight:600;">${it.date || ''}</span>
              </div>
              <span class="item-price" style="color:${st.color};">${money(it.price)}</span>
            </div>
          `;
        }).join('')
      : `<div class="empty-msg" style="background:#fff;">No transactions to show.</div>`;
    if ($('m-items-list')) $('m-items-list').innerHTML = itemRows;
  }

  window.selectGraphMonth = function(mIdx) {
    selectedMonth = mIdx;
    if ($('month-select')) $('month-select').value = mIdx;
    renderMonthlyGraph();
  };

  window.hoverMonthBar = function(e, mIdx, spent, count) {
    const chartBox = $('chart-container');
    if (!chartBox) return;
    const rect = chartBox.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const mName = FULL_MONTH_NAMES[mIdx];
    const mc = MONTH_COLORS[mIdx];
    const html = `
      <div style="font-weight:700;color:${mc.text};margin-bottom:2px;">${mName} ${selectedYear}</div>
      <div style="font-size:.85rem;font-weight:800;">${money(spent)}</div>
      <div style="color:#94a3b8;font-size:.7rem;">${count} transaction${count !== 1 ? 's' : ''}</div>
    `;
    showTooltip(html, x, y);
  };
  window.hideTooltip = hideTooltip;

  // ─── Event Listeners Initialization ──────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {

    // 1. View Toggles ([data-go])
    document.querySelectorAll('[data-go]').forEach(el => {
      el.addEventListener('click', () => showAuthSubView(el.dataset.go));
    });

    // 2. Eye Password Toggles (.eye[data-target])
    document.querySelectorAll('.eye').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = $(btn.dataset.target);
        if (!input) return;
        const hidden = input.type === 'password';
        input.type = hidden ? 'text' : 'password';
        btn.textContent = hidden ? '🙈' : '👁️';
      });
    });

    // 3. Login Form Submit
    const loginForm = $('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        const username = $('lUser').value.trim();
        const password = $('lPass').value;
        const msgEl = $('loginMsg');

        if (!username || !password) {
          return setAuthMessage(msgEl, 'Please enter your username and password.', 'error');
        }

        setFormLoading(loginForm, true);

        const isStatic = window.location.protocol === 'file:' || window.location.hostname.endsWith('github.io');

        if (isStatic) {
          const res = localAuth(username, password, false);
          if (res.success) {
            localStorage.setItem('mf_token', res.token);
            localStorage.setItem('mf_username', res.username);
            if (res.avatar) localStorage.setItem('mf_avatar', res.avatar);
            else localStorage.removeItem('mf_avatar');
            setAuthMessage(msgEl, `Welcome back, ${res.username}! Redirecting…`, 'ok');
            setTimeout(() => {
              setFormLoading(loginForm, false);
              showTrackerView();
            }, 600);
          } else {
            setAuthMessage(msgEl, res.error, 'error');
            setFormLoading(loginForm, false);
          }
          return;
        }

        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          const data = await res.json();

          if (res.ok && data.success) {
            localStorage.setItem('mf_token', data.token);
            localStorage.setItem('mf_username', data.username);
            if (data.avatar) localStorage.setItem('mf_avatar', data.avatar);
            else localStorage.removeItem('mf_avatar');
            setAuthMessage(msgEl, `Welcome back, ${data.username}! Redirecting…`, 'ok');
            setTimeout(() => {
              setFormLoading(loginForm, false);
              showTrackerView();
            }, 600);
          } else {
            setAuthMessage(msgEl, data.error || 'Authentication failed. Please try again.', 'error');
            setFormLoading(loginForm, false);
          }
        } catch(err) {
          // Offline fallback
          const res = localAuth(username, password, false);
          if (res.success) {
            localStorage.setItem('mf_token', res.token);
            localStorage.setItem('mf_username', res.username);
            if (res.avatar) localStorage.setItem('mf_avatar', res.avatar);
            else localStorage.removeItem('mf_avatar');
            setAuthMessage(msgEl, `Welcome back, ${res.username}! Redirecting…`, 'ok');
            setTimeout(() => {
              setFormLoading(loginForm, false);
              showTrackerView();
            }, 600);
          } else {
            setAuthMessage(msgEl, res.error || 'Connection error. Please try again.', 'error');
            setFormLoading(loginForm, false);
          }
        }
      });
    }

    // 4. Registration Form Submit
    const regForm = $('regForm');
    if (regForm) {
      function validateRegister() {
        let ok = true;
        const u = $('rUser').value.trim();
        const p = $('rPass').value;
        const c = $('rConf').value;

        $('rUserErr').textContent = '';
        $('rPassErr').textContent = '';
        $('rConfErr').textContent = '';

        if (u.length < 3) {
          $('rUserErr').textContent = 'Username must be at least 3 characters.';
          ok = false;
        }
        if (p.length < MIN_PASSWORD) {
          $('rPassErr').textContent = `Password must be at least ${MIN_PASSWORD} characters.`;
          ok = false;
        }
        if (c !== p) {
          $('rConfErr').textContent = 'Passwords do not match.';
          ok = false;
        }
        return ok;
      }

      regForm.addEventListener('submit', async e => {
        e.preventDefault();
        if (!validateRegister()) return;

        setFormLoading(regForm, true);
        const username = $('rUser').value.trim();
        const password = $('rPass').value;
        const msgEl = $('regMsg');

        const isStatic = window.location.protocol === 'file:' || window.location.hostname.endsWith('github.io');

        if (isStatic) {
          const res = localAuth(username, password, true);
          if (res.success) {
            regForm.reset();
            showAuthSubView('loginView');
            $('lUser').value = username;
            setAuthMessage($('loginMsg'), 'Account created! Please sign in with your password.', 'ok');
          } else {
            setAuthMessage(msgEl, res.error, 'error');
          }
          setFormLoading(regForm, false);
          return;
        }

        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          const data = await res.json();

          if (res.ok && data.success) {
            regForm.reset();
            showAuthSubView('loginView');
            $('lUser').value = username;
            setAuthMessage($('loginMsg'), 'Account created! Please sign in with your password.', 'ok');
          } else {
            setAuthMessage(msgEl, data.error || 'Registration failed.', 'error');
          }
        } catch(err) {
          const res = localAuth(username, password, true);
          if (res.success) {
            regForm.reset();
            showAuthSubView('loginView');
            $('lUser').value = username;
            setAuthMessage($('loginMsg'), 'Account created! Please sign in with your password.', 'ok');
          } else {
            setAuthMessage(msgEl, res.error || 'Connection error. Please try again.', 'error');
          }
        }
        setFormLoading(regForm, false);
      });
    }

    // 5. Dashboard Theme Toggles
    const themeToggleBtn = $('themeToggleBtn');
    if (themeToggleBtn) themeToggleBtn.onclick = toggleTheme;
    const dropdownThemeBtn = $('dropdownThemeBtn');
    if (dropdownThemeBtn) dropdownThemeBtn.onclick = toggleTheme;

    // 6. Category Chip Click
    document.addEventListener('click', e => {
      const chip = e.target.closest('.chip[data-cat]');
      if (chip && !e.target.classList.contains('chip-del')) {
        activeCat = chip.dataset.cat;
        expandedCat = activeCat;
        render();
      }
    });

    // 7. Set Balance
    if ($('bal-btn')) {
      $('bal-btn').onclick = async () => {
        const v = parseFloat($('bal-input').value);
        if (!(v >= 0)) return toast('Please enter a valid amount.');
        S = await api('/api/balance', { balance: v });
        $('bal-input').value = '';
        render();
        toast('Balance set to ' + money(v));
      };
    }
    if ($('bal-input')) {
      $('bal-input').addEventListener('keydown', e => { if (e.key === 'Enter') $('bal-btn') && $('bal-btn').click(); });
    }

    // Quick amounts
    document.querySelectorAll('.qbtn[data-v]').forEach(btn => {
      btn.onclick = () => { if ($('bal-input')) $('bal-input').value = btn.dataset.v; };
    });

    // 8. Add Category
    if ($('add-cat-btn')) {
      $('add-cat-btn').onclick = async () => {
        const name = $('new-cat').value.trim();
        if (!name) return toast('Please enter a category name.');
        S = await api('/api/category', { name });
        $('new-cat').value = '';
        activeCat = name;
        render();
        toast(`Category "${name}" added`);
      };
    }
    if ($('new-cat')) {
      $('new-cat').addEventListener('keydown', e => { if (e.key === 'Enter') $('add-cat-btn') && $('add-cat-btn').click(); });
    }

    // 9. Add Expense
    if ($('add-btn')) {
      $('add-btn').onclick = async () => {
        const item = $('item-name').value.trim();
        const price = parseFloat($('item-price').value);
        const date = $('item-date').value || new Date().toISOString().split('T')[0];
        if (!activeCat) return toast('Please select a category first.');
        if (!item) return toast('Please enter an item name.');
        if (!(price > 0)) return toast('Please enter a price greater than 0.');

        S = await api('/api/add', { category: activeCat, item, price, date });
        $('item-name').value = '';
        $('item-price').value = '';
        $('item-name').focus();
        expandedCat = activeCat;
        render();
        toast(`"${item}" added to ${activeCat}`);
      };
    }
    if ($('item-price')) {
      $('item-price').addEventListener('keydown', e => { if (e.key === 'Enter') $('add-btn') && $('add-btn').click(); });
    }

    // 10. Reset All
    if ($('resetBtn')) {
      $('resetBtn').onclick = async () => {
        if (!confirm('Reset all expenses and balance? This cannot be undone.')) return;
        S = await api('/api/reset', {});
        activeCat = null;
        expandedCat = null;
        lastLevel = 0;
        render();
        toast('All data has been reset.');
      };
    }

    // 11. Profile Dropdown & Avatar Handling
    const profileBtn = $('profileBtn');
    const profileWrap = $('profile-wrap');
    const profileDropdown = $('profile-dropdown');
    if (profileBtn) {
      profileBtn.onclick = (e) => {
        e.stopPropagation();
        const isOpen = profileDropdown && profileDropdown.classList.contains('open');
        if (isOpen) {
          if (profileDropdown) profileDropdown.classList.remove('open');
          if (profileWrap) profileWrap.classList.remove('open');
        } else {
          if (profileDropdown) profileDropdown.classList.add('open');
          if (profileWrap) profileWrap.classList.add('open');
        }
      };
    }

    document.addEventListener('click', (e) => {
      if (profileWrap && !profileWrap.contains(e.target)) {
        if (profileDropdown) profileDropdown.classList.remove('open');
        profileWrap.classList.remove('open');
      }
    });

    const avatarInput = $('avatar-input');
    if (avatarInput) {
      avatarInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
          return toast('Please select an image file (PNG, JPG, etc.).');
        }

        const reader = new FileReader();
        reader.onload = function(evt) {
          const img = new Image();
          img.onload = function() {
            const canvas = document.createElement('canvas');
            const maxDim = 200;
            let w = img.width;
            let h = img.height;
            if (w > h) {
              if (w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; }
            } else {
              if (h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim; }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

            try {
              localStorage.setItem('mf_avatar', dataUrl);
              loadAvatar();
              api('/api/avatar', { avatar: dataUrl });
              toast('Profile photo updated! 📷');
            } catch(err) {
              toast('Image is too large to save.');
            }
          };
          img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
        avatarInput.value = '';
      });
    }

    if ($('change-photo-btn')) {
      $('change-photo-btn').onclick = () => {
        if ($('avatar-input')) $('avatar-input').click();
      };
    }

    if ($('remove-photo-btn')) {
      $('remove-photo-btn').onclick = () => {
        localStorage.removeItem('mf_avatar');
        loadAvatar();
        api('/api/avatar', { avatar: '' });
        toast('Profile photo removed.');
      };
    }

    if ($('logoutBtn')) {
      $('logoutBtn').onclick = () => {
        if (confirm('Log out? Your data will be saved.')) {
          logoutUser();
        }
      };
    }

    // 12. Monthly Graph Controls
    if ($('graphBtn')) $('graphBtn').onclick = openGraphModal;
    if ($('close-modal-btn')) $('close-modal-btn').onclick = closeGraphModal;
    if ($('year-select')) {
      $('year-select').onchange = (e) => {
        selectedYear = parseInt(e.target.value, 10);
        renderMonthlyGraph();
      };
    }
    if ($('month-select')) {
      $('month-select').onchange = (e) => {
        selectedMonth = parseInt(e.target.value, 10);
        renderMonthlyGraph();
      };
    }
    const graphModal = $('graph-modal');
    if (graphModal) {
      graphModal.onclick = (e) => {
        if (e.target === graphModal) closeGraphModal();
      };
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && graphModal && graphModal.classList.contains('open')) {
        closeGraphModal();
      }
    });

    document.querySelectorAll('.vtab').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.vtab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentGraphView = btn.dataset.view;
        renderMonthlyGraph();
      };
    });

    if ($('sample-data-btn')) {
      $('sample-data-btn').onclick = async () => {
        const currentY = selectedYear;
        const samples = [
          { cat: 'Food', item: 'Organic Supermarket', price: 3400, month: 1 },
          { cat: 'Travel', item: 'Flight Booking & Commute', price: 5800, month: 2 },
          { cat: 'Household', item: 'High Speed WiFi & Utilities', price: 2400, month: 3 },
          { cat: 'Entertainment', item: 'Concert & Weekend Dinner', price: 3100, month: 4 },
          { cat: 'Food', item: 'Weekly Groceries & Snacks', price: 2900, month: 5 },
          { cat: 'Travel', item: 'Train Tickets & Fuel', price: 2150, month: 6 },
          { cat: 'Household', item: 'Electricity & Maintenance', price: 3800, month: 7 },
          { cat: 'Entertainment', item: 'Gaming & Cinema', price: 1750, month: 8 },
          { cat: 'Shopping', item: 'Autumn Wardrobe', price: 4600, month: 9 },
          { cat: 'Food', item: 'Family Dinners & Cafes', price: 4200, month: 10 },
          { cat: 'Travel', item: 'Holiday Travel Booking', price: 6500, month: 11 },
          { cat: 'Shopping', item: 'Gifts & Celebrations', price: 5200, month: 12 }
        ];
        for (const s of samples) {
          const mStr = String(s.month).padStart(2, '0');
          const dateStr = `${currentY}-${mStr}-15`;
          await api('/api/add', { category: s.cat, item: s.item, price: s.price, date: dateStr });
        }
        S = await api('/api/state');
        render();
        renderMonthlyGraph();
        toast('12 Months of colorful sample data added!');
      };
    }

    // 13. Initial Authentication Check
    const token = localStorage.getItem('mf_token');
    const user = localStorage.getItem('mf_username');
    if (token && user) {
      showTrackerView();
    } else {
      showAuthView();
    }
  });

})();
