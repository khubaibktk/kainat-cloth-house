# Kainat Cloth House: full stack website

## 1. Backend (server folder)
1. Copy your existing `.env` into `server/` (or copy `.env.example` to `.env` and fill it in).
2. Run:
   - `npm install`
   - `npm run dev`  (starts on http://localhost:5000)
3. Optional: `npm run seed` adds sample Men's and Women's products if the catalogue is empty.

Make a new admin password hash with:
`node -e "console.log(require('bcryptjs').hashSync('YourPassword',10))"`

## 2. Frontend (client folder)
- `npm install`
- `npm run dev`  (opens on http://localhost:5173)
- Admin login: http://localhost:5173/admin/login

## 3. Going live
- Deploy `server` to Render, Railway or similar. Set the same variables as `.env`, and set
  `CLIENT_ORIGIN` to your website address (for example https://kainatcloth.netlify.app).
- In Netlify set the environment variable `VITE_API_URL` to `https://YOUR-SERVER/api`, then redeploy.
- `client/public/_redirects` makes /admin/login work after a page refresh on Netlify.
- In MongoDB Atlas, allow your server's IP address under Network Access.

## Admin guide
- Overview: today's sales and profit, graphs, best sellers, low stock.
- Daily sales: record or delete sales. Recording a sale reduces stock; deleting it puts the stock back.
- Inventory: add, edit, restock or delete products. Set a cost price on every product so profit is correct.

## Adding products with photos from a phone
- Open `/admin/login` on the phone, go to Inventory, tap "Add photos". You can take a new photo or pick several from the gallery.
- Type the color under each photo. The first photo is the main one ("Main" button changes it). Up to 8 photos per product.
- Customers see small photo buttons on each product and can tap a color. Their color choice is included in the WhatsApp order.
- Photos are resized on the phone and stored in your MongoDB database. No other service is needed.

### Testing from your phone before going live (same Wi-Fi)
1. Find your PC's IP address (run `ipconfig`, look for IPv4, for example 192.168.1.20).
2. In `client`, copy `.env.example` to `.env` and set `VITE_API_URL=http://192.168.1.20:5000/api`.
3. Start the client with `npm run dev -- --host`, then open `http://192.168.1.20:5173` on the phone.
4. If `CLIENT_ORIGIN` is set in the server `.env`, add `http://192.168.1.20:5173` to it (or remove the line while testing).
