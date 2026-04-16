# 🍞 TOASTER SURVIVORS: Breakfast Protocol

![Gamedev.js Jam 2026](https://img.shields.io/badge/Gamedev.js_Jam-2026-blue?style=for-the-badge)
![Phaser 3](https://img.shields.io/badge/Phaser-3-black?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Fast-646CFF?style=for-the-badge&logo=vite&logoColor=white)

> *"Day 3 of the smart device uprising. I'm just a toaster, but I've got firepower."*

**Toaster Survivors** is an action survival game in the Bullet Heaven / Reverse Bullet Hell style, developed in 13 days for the **[Gamedev.js Jam 2026](https://gamedevjs.com/jam/2026/)** event with the theme **MACHINES**.

Players control a malfunctioning toaster with military-grade AI chip, battling an army of rebellious household appliances (robot vacuums, kamikaze microwaves, rogue blenders...).

🎮 **Play the web version live (Coming soon on Wavedash / Itch.io)**

---

## ✨ Key Features

* **High-Octane Survival:** Endless waves of enemies with escalating difficulty and quantity.
* **Auto-attack:** Players focus entirely on movement (WASD / Arrows) to dodge.
* **Roguelite Upgrade System:** Collect "Screws" (XP) to level up. Each level-up offers random upgrades: Piercing burnt toast, slow-inducing hot butter, chain lightning...
* **Modern UI/UX:** Leveraging React + TailwindCSS + Shadcn/UI for professional menus and upgrade panels overlaid on the game engine.

---

## 🛠 Tech Stack

The project combines a Web Framework with a Game Engine architecture:

* **Game Engine:** [Phaser 3](https://phaser.io/) (Physics, Rendering, Game Loop)
* **UI Framework:** [React 18](https://react.dev/) + [Shadcn/ui](https://ui.shadcn.com/) (Overlay, HUD, Menu management)
* **Language:** [TypeScript](https://www.typescriptlang.org/) (OOP and Design Patterns)
* **Build Tool:** [Vite](https://vitejs.dev/) (Lightning-fast builds and HMR)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)

---

## 🚀 Installation & Local Setup

### 1. Requirements
* [Node.js](https://nodejs.org/) (v18.x or latest recommended)
* NPM or Yarn

### 2. Installation
Clone the repository:
```bash
git clone https://github.com/MinhQuan1563/Toaster-Survivors-Jam.git
cd Toaster-Survivors-Jam
```

Install dependencies:
```bash
npm install
```

### 3. Development Server
```bash
npm run dev
```
Open http://localhost:5173 in your browser. Game supports Hot Module Replacement (HMR).

### 4. Production Build
```bash
npm run build
```
The `/dist` folder contains optimized static files ready for deployment.

---

## 📂 Folder Structure

```
Toaster-Survivors-Jam/
├── public/                # Static assets (images, audio .mp3, .png)
├── src/
│   ├── components/        # React Components (UI, Menu, Upgrade panels)
│   ├── game/              # All Phaser game logic
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and helpers
│   ├── pages/             # Page components
│   ├── App.tsx            # Root component wrapping Phaser Canvas and UI
│   └── main.tsx           # React + Vite entry point
├── tailwind.config.js     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
└── package.json           # Project dependencies
```

---

## 👥 Development Team

|     Member     |      Member      |
|----------------|------------------|
| Đỗ Minh Quân   | Koong Chấn Phong |

#### Contact email:

- [dominhquan15623@gmail.com](mailto:dominhquan15623@gmail.com)
- [koongchanphong0712@gmail.com](mailto:koongchanphong0712@gmail.com)