# 📻 Web Radio Application 🎶

Welcome to the Public Radio Streaming Application! This project allows users to tune into a variety of public radio stations from around the globe, right from their device. 📱🌐

## Description
This project is a public radio streaming application designed to provide users with easy access to a wide array of live radio broadcasts. Whether you're looking for news, music, or talk shows, this application aims to be your go-to platform for public radio entertainment.

## 🌟 Features

### ✅ Core Features
- User Authentication (Login/Register)
- Browse and Stream Radio Stations (with search and genre filtering)
- Manage Favorite Stations
- Create and Manage Custom Station Lists
- View Recently Played Stations
- Dark/Light Theme Toggle

### 🚀 Planned Features
(A more detailed roadmap for these planned features will be available soon.)
- Sleep Timer
- Alarm Clock Functionality
- Offline Downloads (for podcasts or specific shows if applicable)
- Enhanced Song/Artist Information Display (currently basic)
- User Profile Management (e.g., change password, view detailed listening history)
- Social Sharing of Stations/Shows
- Admin panel for station management (for administrators)

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
- Node.js: ^18.0.0 (LTS recommended)
- npm (comes with Node.js)
- Expo CLI: `npm install -g expo-cli`
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

## 📻 Featured Radio Stations
Here are a few sample stations to get you started:

| Name                  | Genre        | Stream URL                             |
|-----------------------|--------------|----------------------------------------|
| Classic Rock Hits     | Rock         | http://stream.example.com/classic-rock |
| Jazz Vibes            | Jazz         | http://stream.example.com/jazz-vibes   |
| News Talk Central     | News/Talk    | http://stream.example.com/news-talk    |
| Electronic Beats      | Electronic   | http://stream.example.com/electronic   |

*Note: This is a sample list. More stations can be found within the application!*
