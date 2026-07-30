# 🎬 Paramount+ CXAS Virtual Assistant Web App

A high-performance, modern Paramount+ Customer Experience Assistant built with Google Cloud Customer Experience Studio (CXAS), GECX Chirp 3 HD Voice, and a custom Paramount design system.

![Paramount+ Assistant](logo.svg)

---

## ✨ Key Features
* 🌟 **100% Background Image Fit**: Full opacity, high-vibrancy screen-fitting background presentation (`bg.jpg`).
* 💎 **Paramount+ Design System**: Authentic vector logo (`logo.svg`), Paramount blue gradient accents, glassmorphic container, and interactive quick action chips.
* 🎙️ **Google Cloud CXAS Voice Integration**: Integrated with Google Cloud Text-to-Speech **Chirp 3 HD Erinome** (`en-US-Chirp3-HD-Erinome`).
* 🎯 **Deployment ID**: `03d74452-138d-4176-a6a3-4a2587f6956f`
* 📱 **Responsive UI**: Pure white launcher button icon, titlebar controls, and push-to-talk microphone support.

---

## 🌐 Deploying to GitHub Pages (Step-by-Step)

To host this app publicly on GitHub Pages:

### Step 1: Create a GitHub Repository
1. Go to [GitHub - Create a New Repository](https://github.com/new).
2. Set Repository Name: `paramount-cxas-web-app`
3. Set Visibility: **Public**
4. Click **Create repository**.

### Step 2: Push your Code to GitHub
Run the following commands in your terminal inside this project folder:

```bash
git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/paramount-cxas-web-app.git
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. On your GitHub repository page, navigate to **Settings** $\rightarrow$ **Pages**.
2. Under **Build and deployment** $\rightarrow$ **Branch**:
   * Select `main` branch.
   * Select `/ (root)` folder.
3. Click **Save**.
4. In 1–2 minutes, your live public URL will be generated at:
   `https://<YOUR-GITHUB-USERNAME>.github.io/paramount-cxas-web-app/`

---

## 💻 Running Locally

To run the application locally on `http://localhost:8200`:

```bash
python3 server.py
```

Open `http://localhost:8200` in your web browser.

---

## 📁 Repository Structure
```
paramount-cxas-web-app/
├── index.html        # Main web interface
├── style.css         # Paramount+ CSS design tokens & glassmorphism
├── app.js            # Frontend chat & audio interaction logic
├── server.py         # Backend proxy for Google Cloud CXAS APIs
├── logo.svg          # Official Paramount+ vector logo
├── bg.jpg            # Paramount+ 100% full opacity background image
└── README.md         # Deployment & documentation guide
```
