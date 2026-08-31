# ShaktiSecur — AI-powered daily tech news blog

Next.js + Prisma + Postgres (Neon) + Vercel. Har din cron job free RSS feeds se latest
tech news uthata hai, Claude se unique article likhwata hai, aur usko **draft** mein save
karta hai — publish karne se pehle human review zaroori hai.

## Kyun draft-first?

Google AdSense ka 2026 automated review AI-generated filler content ko flag karta hai.
Isliye pipeline seedha publish nahi karta — draft banata hai, aap ek baar padh/edit karke
publish button dabate ho. 5 minute ka kaam, but approval aur long-term account safety ke
liye zaroori hai.

## Setup

1. **Neon Postgres**: neon.tech par free account banao, ek project create karo,
   `DATABASE_URL` aur `DIRECT_URL` copy karo.
2. **Gemini API key**: aistudio.google.com se `GEMINI_API_KEY` lo (free tier, no credit card).
3. `.env.example` ko `.env` mein copy karo aur values bharo. `ADMIN_SECRET` aur
   `CRON_SECRET` khud koi random long string bana lo.
4. Install + DB push:
   ```bash
   npm install
   npx prisma db push
   ```
5. Local run: `npm run dev`

## Deploy (Vercel)

1. GitHub repo banao, push karo.
2. Vercel pe import karo, saare `.env` vars project settings mein daalo (including
   `CRON_SECRET` — Vercel isko automatically cron requests ke Authorization header mein
   attach kar deta hai).
3. `vercel.json` mein cron schedule already set hai (`0 6 * * *` = daily 6 AM UTC) —
   `/api/cron/generate` route ko hit karega, jo 3 draft posts banayega.

## Daily workflow

1. Cron chalta hai → 3 drafts DB mein ban jaate hain (`status: "draft"`).
2. `https://shaktisecur.in/admin` kholo, apna `ADMIN_SECRET` daalo (ek baar save ho jaata
   hai browser mein).
3. Draft pe click karo, title/excerpt/content edit karo, **Publish** dabao.
4. Published post turant `/blog/[slug]` pe live ho jaata hai (homepage 5 min mein refresh
   hota hai).

   Ye ek password-gate hai, real login/account system nahi — bas `ADMIN_SECRET` se
   protect hai taaki koi aur publish/edit/delete na kar sake.

## Images upload karna (cover image + content ke beech mein)

Images Vercel Blob storage mein save hoti hain — ek baar setup karna hai:

1. Vercel dashboard → apna project → **Storage** tab → **Create Database** → **Blob**
2. Naam do (jaise `shaktisecur-images`), **Create** dabao
3. Agle screen pe **Connect Project** karo (apna `shaktisecur` project select karo) —
   isse Vercel automatically `BLOB_READ_WRITE_TOKEN` env variable add kar dega
4. **Redeploy** karo (naya env var use karne ke liye zaroori hai)

Setup hone ke baad `/admin` mein "New Post" ya kisi bhi post ko edit karte waqt:
- **Cover image**: "Choose image" button se seedha apne phone/computer se koi bhi photo
  upload karo — link dene ki zaroorat nahi
- **Content ke beech mein image**: content box mein jahan image chahiye wahan click karo
  (cursor rakho), fir "📷 Insert image here" button dabao — image wahi cursor position
  pe insert ho jaayegi

## Long articles

AI generator ab 1200-1800 words ke lambe, detailed articles likhta hai (chhote summary
nahi). "New Post" se manually likhte waqt bhi content box mein koi length limit nahi hai —
jitna chaho utna lamba likh sakte ho.

## AdSense approval ke liye pehle ye karo

- [ ] Kam se kam 20-25 posts **publish** karo (draft nahi) before applying
- [ ] `/about`, `/privacy`, `/contact`, `/disclaimer` — real content se bharo (abhi
      placeholder text hai, wo replace karna zaroori hai)
- [ ] Custom domain lagao (`.com`/`.in`) — Vercel mein free mein connect hota hai
- [ ] Google Search Console mein site verify + sitemap submit karo
- [ ] Har article mein thoda manual edit/personal-angle add karo — pure AI dump avoid karo
- [ ] Site 1-2 mahine purani ho jaaye tab apply karo (official rule nahi hai but helps)

Sab ready hone ke baad adsense.google.com pe apply karo, ad code layout.tsx ke
`<head>` mein daal do (Vercel env var se conditionally load kar sakte ho).

## AI news sources

Abhi India-focused RSS feeds use ho rahe hain (`lib/news.ts`): Gadgets360, Mint
Technology, Economic Times Tech, MediaNama, Inc42 — plus TechCrunch aur The Verge sirf
major global stories ke liye (limited). Sources add/remove karne ke liye `FEEDS` array
edit karo — koi API key nahi chahiye.
