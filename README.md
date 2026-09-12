# 🎌 Kuro Anime

A modern desktop anime application built with Electron.

Kuro Anime provides a clean and simple interface for discovering anime, watching episodes, and managing your anime list with MyAnimeList.

---

## ✨ Features

- 🔎 Anime Search
- 🆕 Latest Anime
- 📺 New Releases
- 🔥 Most Viewed Anime
- ⏳ Upcoming Anime
- ▶️ Ongoing Anime
- ✅ Completed Anime
- 📅 Weekly Anime Schedule
- 🎬 AniChi Episode Playback
- 🖥️ Player-Only Fullscreen Mode
- 🌙 Modern Dark UI
- 📊 MyAnimeList Integration
- 🔗 MyAnimeList Anime Matching
- 👁️ Watched Episode Synchronization
- 📝 MyAnimeList Status Management
- 🗑️ Remove Anime from MyAnimeList
- 🎨 Custom Kuro Anime Application Icon

---


🛠️ Built With
Electron
Node.js
JavaScript
HTML
CSS
Axios
Cheerio
Electron Builder
📡 Anime Source

Kuro Anime uses AniChi as its anime source.

The application does not host or store anime video files itself.

Anime information, episodes, and playback depend on the external services used by the application.

📚 MyAnimeList Integration

Kuro Anime supports MyAnimeList integration.

You can:

Connect your MyAnimeList account
Match anime with MyAnimeList
View MyAnimeList information
Update watched episodes
Change anime list status
Remove anime from your MyAnimeList list
Supported Statuses
Watching
Completed
On Hold
Dropped
Plan to Watch

MyAnimeList authentication uses the MyAnimeList OAuth system.

💻 Installation

Download the latest Windows installer from the Releases section.

Steps
Open the Releases page.
Download the latest Kuro Anime Setup installer.
Run the installer.
Follow the installation instructions.
Launch Kuro Anime.
Search for an anime.
Select an episode and start watching.

An internet connection is required.

📥 Download

The latest Windows installer is available in the GitHub Releases section.

Windows

Download:

Kuro Anime Setup 1.0.0.exe

👨‍💻 Development

Requirements

Node.js
npm
Git

1. Clone the Repository
   
```bash
git clone https://github.com/Nithi-1/Kuro-Anime.git
cd Kuro-Anime
```

2. Install Dependencies

Install the required packages:

```bash
npm install
```

3. Run Kuro Anime

To run Kuro Anime during development:

```bash
npm start
```

4. Build the Windows Installer

When you are ready to create the Windows .exe installer:

```bash
npm run build
```

The installer will be generated inside:

```bash
dist/
```

The generated installer can be installed on Windows without Node.js or npm.

```bash
📁 Project Structure
Kuro-Anime/
│
├── electron/
│   │
│   ├── assets/
│   │   └── icon.ico
│   │
│   ├── main.js
│   ├── preload.js
│   ├── index.html
│   └── anime.html
│
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

🎬 Player Controls

Kuro Anime includes a player-only fullscreen mode.

Fullscreen

Press:

F11

to enter player fullscreen.

Press:

F11

again or:

Esc

to exit fullscreen.

The fullscreen mode expands only the anime player instead of putting the entire Electron application into Windows fullscreen.

🔐 Privacy & Authentication

MyAnimeList authentication is handled through the MyAnimeList OAuth system.

Kuro Anime does not require users to provide their MyAnimeList password directly to the application.

Authentication tokens are stored locally by the application.

⚠️ Disclaimer

Kuro Anime is an independent desktop application.

Kuro Anime does not host, upload, or store anime video files.

Anime information, episodes, and playback depend on external services.

The availability of anime content may change depending on those external services.

Users are responsible for complying with applicable laws and the terms of the services they use.

📄 License

This project is provided for educational and personal use.
