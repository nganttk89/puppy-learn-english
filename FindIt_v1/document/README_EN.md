# Puppy Learn English - Game Documentation

Welcome to the documentation for **Puppy Learn English**, a fun and interactive educational game designed to help children learn English vocabulary through engaging mini-games.

## Overview
The game is structured around a **Map Screen** where players navigate through different Zones (Regions) and Topics (Levels). By completing various stages within a topic, players earn rewards (apples/coins) and unlock subsequent challenges.

## Game Stages
Each topic consists of up to 4 progressive stages:

1. **Flashcards (Quiz)**: The learning phase. Players are presented with images and words. They listen to the pronunciation and memorize the vocabulary.
2. **Matching**: A connection game where players draw lines to match images with their corresponding English words.
3. **Spelling**: A word puzzle where players drag and drop letters into the correct slots to form the vocabulary word. *(Note: This stage can be disabled for topics that use long sentences instead of single words).*
4. **2-Player Shuffle**: A competitive, fun cup-guessing game for two teams (Red vs. Blue). Cups shuffle, and players must guess which cup hides the target image. Winning a turn rewards the team with apples.

## Admin Interface
The system includes a powerful Admin Dashboard (`admin.html`) that allows teachers or parents to easily customize the game content without writing any code.

### Admin Features:
- **Level Management**: Create new Zones and Topics.
- **Difficulty Settings**: Set topics as Easy, Medium, or Hard.
- **Visuals**: Upload custom thumbnail avatars for topics and large background images for the hidden object scenes.
- **Vocabulary Setup**: Add words/sentences, upload thumbnail images, and define bounding boxes for hidden objects on the main background.
- **Disable Spelling**: A dedicated toggle to disable the Spelling stage for topics that contain full sentences, automatically routing players to the Shuffle game after Matching.

## Technical Details
- Built with standard Web Technologies: HTML5, CSS3, and Vanilla JavaScript.
- Uses `localStorage` and a lightweight Python backend (`server.py`) to persist game data (`zones.json`, `scenes.json`).
- Utilizes the Web Speech API (`window.speechSynthesis`) for automated English pronunciation.

## Getting Started
1. Start the local server by running `python3 server.py` (or your preferred local web server) in the root directory.
2. Open `index.html` in your web browser to play the game.
3. Open `admin.html` to manage the game content.
