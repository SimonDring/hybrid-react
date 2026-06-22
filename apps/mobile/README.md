# Hybrid Training — React migration

React + Vite version of the Hybrid Training Plan PWA. This is Stage 2 of the migration roadmap.

## Quick start

```
npm install
npm run dev
```

Open `http://localhost:5173/hybrid-react/`.

## Deploy

```
git add .
git commit -m "your change"
git push
```

GitHub Actions builds and deploys automatically via `.github/workflows/deploy.yml`.

## File structure

```
.
├── index.html              # Vite shell
├── vite.config.js          # Vite + PWA plugin config
├── package.json
├── src/
│   ├── main.jsx            # Entry point
│   ├── App.jsx             # Root component with routing
│   ├── components/         # TopBar, TabBar, ScreenContainer
│   ├── screens/            # 16 screen components (.jsx)
│   ├── stores/             # Zustand store
│   ├── lib/                # Data layer (Storage, Database, Utils, SessionHelper)
│   ├── data/               # Static training plan content
│   └── styles/main.css     # Styles (carried over from v2.0)
└── public/icons/           # PWA icons
```

## See also

- `STAGE2-GUIDE.md` — step-by-step migration walkthrough
- Original v2.0 vanilla JS PWA in separate repo
