# indiestateFrontend

Admin portal for Indieestate catalog data.

Admins can add, edit, and remove sell categories, service categories, and their subcategories. The app talks to the Indieestate backend on port 8080.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api` to the AWS UAT API at `http://indieestate-uat-alb-2128030952.ap-south-1.elb.amazonaws.com`.

Set `VITE_API_BASE_URL` when the API is on another host. See `.env.example`.
