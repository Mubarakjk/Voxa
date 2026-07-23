# Phase 10 — Play, Challenges & Daily Engagement

## New surfaces
- **Home:** `TodaysAdventureCard` — challenge, game, conversation, mission, surprise, spin
- **Journey:** `JourneyPlaySection` — XP, achievements, missions, links to arcade/decks
- **Stack routes:** `CompanionArcade`, `AchievementCentre`, `ConversationDecks`, `DailySpin`

## Local storage keys
- `arcadeStats`, `dailyChallenges`, `weeklyMissions`, `xpProfiles`, `achievements`, `dailySpin`, `dailySurprises`, `enjoymentProfile`, `companionRewards`

## Manual QA
1. Home loads with Today's Adventure and level/XP bar
2. Tap challenge → Talk opens with challenge prompt
3. Companion Arcade lists 20 games; play records stats + XP
4. Daily spin once per day; reward opens in Talk
5. Conversation decks → category chips → card opens Talk
6. Journey shows Play & growth section
7. Achievement Centre shows locked/unlocked trophies
8. Activities screen shows 60+ activities
9. `npx tsc --noEmit` passes
