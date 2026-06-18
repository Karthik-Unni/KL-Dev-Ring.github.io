# ⚡ KL Dev-Ring — Kerala's Builder Network
https://klwebring.github.io/KL-Dev-Ring.github.io/

> **Ranked by what you ship. Connected by what you build. Kerala's open-source digital corridor.**

KL Dev-Ring is a community-driven webring and builder registry connecting developers, researchers, student hackers, founders, and open-source contributors across Kerala. 

No algorithms, no likes, no ads, no trackers. Just pure telemetry. The Git repository is the database, Pull Requests are the signup flow, and GitHub Pages serves the infrastructure.

---

## 🌟 Core Features

* 🚀 **Shipped Projects Showcase**: A visual gallery of the active projects launched by network builders.
* 🏆 **Dynamic Standings**: Filter builder rankings by **All-Time**, **Monthly**, **Weekly**, or **Daily** activity to see who is shipping right now.
* 🎓 **District & College Leagues**: Aggregate leagues ranking Kerala's 14 districts and student hubs, highlighting the **Top Builder** of each league.
* 💬 **In-App Community Chat**: A built-in chat channel staffed by our **Telemetry Bot** that greets new signups, announces project launches, and queries stats.
* 💼 **Recruiter Clipboard Utility**: A one-click tool inside builder passports that generates formatted contact cards for tech recruiters and sponsors.
* 🎫 **Weekly Challenges & Badges**: Earn visual badge tags like `AI Builder`, `FOSS Hero`, or `Student` by completing open-source sprints.

---

## 🛰️ How to Join the Ring (Step-by-Step)

Adding your signal to Kerala's builder network is done entirely via Git. Follow these steps:

### 1️⃣ Fork the Repository
Click the **Fork** button at the top right of this repository to create your own copy.

### 2️⃣ Create Your Profile JSON
In your fork, navigate to the `members/` directory:
1. Copy the template `members/_template.json` and name it `members/your-github-username.json`.
2. Fill in your details. For example:
   ```json
   {
     "handle": "your-github-username",
     "name": "Your Full Name",
     "github": "your-github-username",
     "site": "https://your-personal-website.com",
     "city": "Kochi",
     "district": "Ernakulam",
     "college": "Cochin University of Science and Technology",
     "country": "India",
     "tags": ["fullstack", "webdev", "opensource"],
     "bio": "Building the future of the decentralized web. Open-source maintainer.",
     "joined": "2026-06-08",
     "stats": {
       "contributions": 124,
       "mergedPRs": 12,
       "streak": 4,
       "daily": 15,
       "monthly": 120
     },
     "projects": [
       {
         "name": "MyAwesomeProject",
         "url": "https://github.com/your-username/my-awesome-project",
         "description": "An open-source library that parses telemetry logs in micro-seconds."
       }
     ]
   }
   ```
   > [!IMPORTANT]
   > Make sure your website uses `https://` and your bio is under **250 characters**. The tags must be lowercase kebab-case.

### 3️⃣ Test Your Changes Locally
Ensure your file structure and data format passes the validation checks:
```bash
# Install dependencies (only required for local test tooling)
npm install

# Run the validation suite and build
npm run check
```
If everything is green, your profile is ready!

### 4️⃣ Submit a Pull Request
Submit a Pull Request from your fork's `main` branch to this repository. Once approved and merged, the Telemetry Bot will automatically welcome you in the community chat, and your card will go live on the dashboard!

---

## 🎛️ Embedding the Navigation Widget

Showcase that you are part of Kerala's builder network by embedding the dynamic navigation widget on your personal website:

```html
<iframe
  src="https://klwebring.github.io/KL-Dev-Ring.github.io/widget.html?member=your-github-username"
  title="KL Dev-Ring Navigation"
  width="440"
  height="170"
  loading="lazy"
  style="border:0; max-width:100%;"
></iframe>
```

---

## 🛠️ Local Development

Requirements: **Node.js v20+** installed.

```bash
# Start the local development server
npm run dev
```
Open `http://localhost:4173` (or the configured port) in your browser. The server will hot-serve changes from the `dist/` directory built by scripts.

* `npm run validate` - Check member schema formatting.
* `npm test` - Run structural test cases.
* `npm run build` - Compile member registry, compute scores, and build profile pages.

---

## ⚖️ Governance & License

* **Code License**: MIT License. Feel free to fork and adapt the engine for other local network nodes!
* **Member Data**: Profile data remains owned by the respective builders and is published under Creative Commons Attribution 4.0 International (CC BY 4.0).
