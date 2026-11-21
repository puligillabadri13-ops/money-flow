# MoneyFlow — Smart Personal Expense Tracker & Financial Dashboard

A sleek, responsive, and feature-rich personal finance application built with clean HTML5, CSS3, and JavaScript. 

It is structured with **`index.html`**, **`style.css`**, and **`script.js`** so it works directly on **GitHub Pages** (`https://<username>.github.io/<repo>`) as well as with the included zero-dependency Python server for full backend persistence.

---

## 🚀 Key Features

- **Standard 3-File Architecture**:
  - `index.html`: Master markup containing the Auth screen and the Financial Dashboard.
  - `style.css`: Clean, modern styling with full Dark & Light theme support.
  - `script.js`: Complete application logic with local storage vaults and API sync.
- **Official App Logo (`logo.png`)**:
  - Prominently featured above the username on the login screen.
  - Displayed inside the application header and welcome greeting banner.
  - Used as the browser tab favicon.
- **Multi-User Account Vaults**:
  - Sign in or create an account with username & password.
  - Each user has separate, private budgets, categories, and expenses.
  - When you log in with your credentials, all your previous data is preserved and displayed.
- **Greeting Banner**:
  - Dynamic time-of-day greeting (`🌞 Good Morning!`, `☀️ Good Afternoon!`, `🌆 Good Evening!`, `🌙 Good Night!`).
  - Personalized with user's name and slogan (*"Your money, your goals, your future. ✨"*).
- **Theme Customization (Dark / Light Mode)**:
  - Toggle between sleek deep-space dark mode and clean light mode.
  - Remembers user theme preferences across visits.
- **Custom Profile Picture & Avatar**:
  - Upload custom profile pictures (`.png`, `.jpg`, `.jpeg`).
  - Automatic thumbnail compression to maintain optimal browser storage performance.
  - Change photo or remove photo options with quick dropdown menu.
- **Budget & Category Expense Management**:
  - Set total budget with quick-pick chips (₹5K, ₹10K, ₹25K, ₹50K, ₹1 Lakh).
  - Animated SVG circular gauge indicating remaining balance percentage and warning states.
  - Add expenses with description, price in ₹ (INR), and date picker.
  - Create and delete custom categories.
- **Innovative Colorful Monthly Graph**:
  - Month & Year selector with spending metrics.
  - 3 interactive visual views:
    - 📊 **Rainbow Glow Bars**: Individual monthly spending bars with peak badges and hover tooltips.
    - 🌊 **Neon Wave**: Cubic bezier spline area chart with glowing gradient curves.
    - 🍩 **Category Donut**: Circular ring chart breaking down annual category shares.
  - Itemized transaction history for the selected month.
  - ⚡ **Demo Past Months**: One-click demo data population to instantly preview all 12 months.

---

## 📂 Project Structure

```
├── index.html          # Main HTML entrypoint (GitHub Pages root)
├── style.css           # Complete styles for Auth, Dashboard, Graph & Themes
├── script.js           # Full JavaScript logic (Auth, Storage, Graph, UI)
├── logo.png            # Official MoneyFlow logo asset
├── app.py              # Zero-dependency Python WSGI server & API
├── tracker.html        # Clean redirect to index.html
├── data.json           # JSON database for server persistence
├── requirements.txt    # Optional production server dependencies
├── Procfile            # Deployment process definition
├── render.yaml         # Render deployment blueprint
└── README.md           # Documentation
```

---

## 🌐 Deploy to GitHub Pages (Get Your GitHub URL)

1. **Push files to your GitHub repository**:
   - `index.html`
   - `style.css`
   - `script.js`
   - `logo.png`
   - `README.md`

2. **Enable GitHub Pages**:
   - Go to your repository on GitHub.
   - Click **Settings** -> **Pages** (in the left sidebar).
   - Under **Build and deployment** -> **Branch**, select `main` (or `master`) and folder `/ (root)`.
   - Click **Save**.

3. **Visit your GitHub URL**:
   Your live application will be available at:
   ```
   https://<your-username>.github.io/<your-repository-name>/
   ```
   *(GitHub Pages works 100% client-side with isolated `localStorage` vaults for all user accounts, profile pictures, and expenses!)*

---

## 🛠️ Running Locally

Run directly with Python (standard library only, no pip installs required):
```bash
python app.py
```
Open **`http://127.0.0.1:5000`** in your browser.
Or double-click **`index.html`** to run directly in your browser.
