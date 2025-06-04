# 📻 Web Radio Application 🎶

Welcome to the Public Radio Streaming Application! This project allows users to tune into a variety of public radio stations from around the globe, right from their device. 📱🌐

## Description
This project is a public radio streaming application designed to provide users with easy access to a wide array of live radio broadcasts. Whether you're looking for news, music, or talk shows, this application aims to be your go-to platform for public radio entertainment.

## 🌟 Features
- Stream radio stations live
- Browse and search for available stations
- User authentication and profile management (planned)
- Admin panel for station management (planned)
- Favorites list for quick access to preferred stations (planned)

## 💻 Technologies Used
**Client (📱):**
- React Native (using Expo)
- TypeScript

**Server (🌐):**
- Node.js
- Express
- TypeScript

## 🚀 Getting Started
**Prerequisites:**
- Node.js and npm installed
- Expo CLI installed (`npm install -g expo-cli`)
- Git

**Setup and Run:**
1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```
2. **Install server dependencies:**
   ```bash
   cd server
   npm install
   ```
3. **Start the server:**
   ```bash
   npm start
   ```
   The server will typically run on `http://localhost:3000` (or the port specified in your server configuration).

4. **Install client dependencies:**
   ```bash
   cd ../client
   npm install
   ```
5. **Start the client (Expo development server):**
   ```bash
   npm start
   ```
   This will open the Expo developer tools in your browser. You can then run the app on:
   - An Android or iOS simulator/emulator.
   - Your physical Android or iOS device using the Expo Go app.

## 📂 Folder Structure
```
.
├── client/                 # React Native (using Expo) client application
│   ├── assets/             # Static assets (images, fonts, etc.)
│   ├── components/         # Reusable UI components
│   ├── navigation/         # Navigation setup (e.g., React Navigation)
│   ├── screens/            # Application screens (views)
│   ├── services/           # API service integrations
│   ├── App.js              # Main application component
│   └── ...                 # Other client-specific files and folders
├── server/                 # Node.js (Express) server application
│   ├── config/             # Configuration files (database, environment variables)
│   ├── controllers/        # Request handlers for different routes
│   ├── middleware/         # Custom middleware functions
│   ├── models/             # Database schemas/models
│   ├── routes/             # API route definitions
│   ├── services/           # Business logic services
│   ├── app.js              # Express application setup
│   └── server.js           # Server entry point
├── .gitignore              # Specifies intentionally untracked files that Git should ignore
└── README.md               # This file
```
