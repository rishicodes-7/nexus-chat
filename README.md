# Nexus Chat 💬

A real-time multi-room chat app where messages appear instantly across all connected users — no refresh needed.

## Live Demo
👉 https://nexus-chat-mocha.vercel.app/

## Features
- ⚡ Real-time messaging powered by Supabase Realtime
- 🔐 Auth — sign up and log in with email
- 💬 4 rooms — general, dev, random, jobs
- 🟢 Live online presence — see who's active
- 📱 Fully responsive on mobile

## Tech Stack
- **Frontend** — Next.js, Tailwind CSS
- **Database** — Supabase (PostgreSQL)
- **Realtime** — Supabase Realtime
- **Auth** — Supabase Auth
- **Deployment** — Vercel

## Getting Started
```bash
git clone https://github.com/rishicodes-7/nexus-chat
cd nexus-chat
npm install
```

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Run this SQL in Supabase:
```sql
create table messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  username text not null,
  content text not null,
  room text not null default 'general',
  created_at timestamp default now()
);

alter table messages enable row level security;

create policy "Anyone authenticated can read messages"
on messages for select to authenticated using (true);

create policy "Users can insert their own messages"
on messages for insert to authenticated
with check (auth.uid() = user_id);
```
```bash
npm run dev
```

## Author
Built by Rishi Codes — github.com/rishicodes-7