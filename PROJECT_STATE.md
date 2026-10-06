# HealthTrack — Project State

> Handoff document for continuing HealthTrack across ChatGPT, Claude, or another coding assistant.
> Read this file and inspect the actual repository before changing code.

## Project
HealthTrack — Personal Health & Habit Tracker

## Architecture
- Frontend: React + Vite
- Backend/data: Supabase
- Server-side AI: Supabase Edge Functions
- AI Analysis: Anthropic/Claude through `supabase/functions/analyze`
- AI Chat: Gemini through `supabase/functions/chat`
- Frontend variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- AI secrets stay server-side in Supabase.

## Existing app areas
- Dashboard
- Daily Check-in
- Habit Tracker
- AI Analysis
- AI Chat
- Supabase health data
- Smart Memory (`ai_memories`)

## Important files
- `src/App.jsx`
- `src/Chat.jsx`
- `src/CheckIn.jsx`
- `src/Habits.jsx`
- `src/Analysis.jsx`
- `src/storage.js`
- `src/habitStorage.js`
- `src/analysis.js`
- `src/aiAnalysis.js`
- `src/supabaseClient.js`
- `supabase/functions/chat/index.ts`
- `supabase/functions/analyze/index.ts`
- `supabase/migrations/001_init.sql`
- `AI_SETUP.md`

## AI Analysis
`src/aiAnalysis.js` calls the Supabase Edge Function `analyze`.

Documented setup:
- `ANTHROPIC_API_KEY` as a Supabase secret
- optional `ANTHROPIC_MODEL`
- documented default: `claude-sonnet-5-5`

The UI presents Summary, Trends, Strengths, Improvements, Recommendations, plus a non-medical-advice disclaimer.

## Current Chat architecture
`src/Chat.jsx` invokes the `chat` Edge Function.

The chat function:
1. Authenticates the Supabase user.
2. Loads recent health data.
3. Loads habits and recent habit logs.
4. Loads recent Smart Memory.
5. Sends context + user question to Gemini.
6. Gemini fallback chain is:
   - `GEMINI_MODEL` or `gemini-3.8-flash`
   - `gemini-3.7-flash`
   - `gemini-3.6-flash`
7. Current health data has priority over old Smart Memory.
8. The prompt forbids diagnosis and medication/supplement/treatment advice.

## Intended Chat behavior (verify before implementation)
Desired:
AI หลัก
→ AI รอง / fallback
→ if all AI options are exhausted, tell user honestly
  “ถึงลิมิตการใช้งาน AI แล้วครับ”
→ show symptom checklist
→ analyze symptoms against stored health data + Smart Memory
→ no diagnosis.

The available Chat source previously still had a generic error message, and the available chat Edge Function previously returned an error when all Gemini models failed. Verify the actual repository before assuming this remains true.

## Deployment
- Git initialized
- GitHub repository is Public
- Main branch is `main`
- Vercel deployment exists
- A deployment previously showed `Supabase is not configured`
- After adding Vercel variables, the latest reported error was:
  `Could not reach the database: Sign-in failed: Invalid API key`

## Supabase/auth blocker
Verify/fix Vercel → Supabase authentication first.
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` must belong to the same Supabase project.

Never put these in frontend code or Vercel frontend variables:
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- Supabase `service_role` key

## Git safety
`.gitignore` protects:
- `node_modules`
- `dist`
- `.env`
- `.env.local`
- `supabase/.temp/`

Never commit secrets.

## Recommended next order
1. Check actual repository state (`git status`, branch, latest commit).
2. Verify Vercel environment variable names/values without exposing secrets.
3. Confirm Supabase anonymous authentication on deployed site.
4. Test Dashboard / Check-in / Habits.
5. Test AI Analysis (Claude/Anthropic).
6. Test Chat (Gemini).
7. Implement/test Chat fallback + symptom checklist.
8. Only then consider changing Chat primary provider to Claude.

## Rules for coding assistants
- Inspect actual current files before editing.
- Do not overwrite working features based on an old conversation.
- Do not remove Smart Memory.
- Never expose API keys or service-role credentials.
- Do not diagnose medical conditions.
- Do not give medication, supplement, or treatment advice.
- Preserve existing functionality unless explicitly changing it.
- Run build/tests after significant changes.
- Update this file after architecture, blocker, or milestone changes.

## Last handoff
This project has progressed beyond some older chat context. This file is the handoff source so an assistant does not mistake an old conversation for the current source of truth.
