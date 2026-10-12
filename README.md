# Wayline Transit

A frontend-only overnight bus booking experience for South India. Search buses, select seats, enter passenger details, and save a printable ticket in your browser.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run dev` and open the local URL printed by Vite.
4. Run `npm run build` to create a production build in `dist/`.

Bookings are stored in localStorage on the current browser. The mock API adds a short delay and needs no server or credentials. Use **My bookings** to reopen a saved ticket. `vercel.json` and `public/_redirects` provide SPA fallbacks for Vercel and Netlify.