# Voxa

[![CI](https://github.com/mubarak-jimoh/Voxa/actions/workflows/ci.yml/badge.svg)](https://github.com/mubarak-jimoh/Voxa/actions/workflows/ci.yml)

Voxa is an AI companion app I've been building over the last few months.

I started this project because I wanted something that felt more personal than a normal AI chatbot. Instead of just answering questions, I wanted it to remember conversations, help me stay accountable, keep track of goals, save memories, and feel like it grows with you over time.

This has been my biggest software project so far and I've learned a lot while building it.

## What it can do

At the moment Voxa includes:

- AI conversations
- Memory that remembers important things
- Daily check-ins
- Goal tracking
- Notes and journaling
- Mood tracking
- Life Journey timeline
- Life Book
- Different companion personalities
- Challenge Me mode
- Companion Studio
- Saved memories
- Clean dark interface

## Why I built it

I realised I was using different apps for everything. One app for notes, another for goals, another for journaling, another for AI.

I wanted to see if I could build one app that brought everything together into a single experience.

More than anything, this project has been a way for me to improve my software development skills while building something I'd actually use every day.

## Built with

- React Native
- Expo
- TypeScript
- Supabase
- OpenAI
- React Navigation

## How it's put together

```
src/
  screens/      App screens (chat, goals, journal, check-ins and more)
  components/   Reusable UI components
  services/     AI, memory, billing and data services
  context/      Shared app state
  navigation/   React Navigation setup
supabase/
  migrations/   Database schema and Row Level Security policies
  functions/    Edge Functions, including the AI gateway
tests/          Automated tests
docs/           QA checklists and release notes
```

The app never talks to OpenAI directly. Every AI request goes through a Supabase Edge Function (the AI gateway), which checks the user is signed in and keeps the API key on the server, out of the app.

## Running it

You need Node.js 20 or newer.

```bash
git clone https://github.com/mubarak-jimoh/Voxa.git
cd Voxa
npm install
cp .env.example .env
npm start
```

Fill in `.env` with your own Supabase project details first. `npm start` opens the Expo dev server, where you can run the app on an iOS simulator, an Android emulator or your phone.

## Tests

```bash
npm run typecheck   # TypeScript
npm test            # 470+ automated tests
```

Both run automatically on every push with GitHub Actions.

## What I learned

Working on Voxa has helped me get better at:

- Mobile app development
- Building larger codebases
- Designing user interfaces
- Working with AI APIs
- Authentication
- Databases
- App architecture
- Problem solving

There's still plenty I want to improve, but I'm really happy with how far the project has come.

## Future plans

I'm planning to keep improving Voxa by making the conversations feel even more natural, improving the memory system, and adding more features based on feedback from people who use it.

## Author

Built by **Mubarak Jimoh**
