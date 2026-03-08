# Home Poker Chip Management App

A lightweight browser app for running a home poker league with:

- Group creation + secret-word join.
- User management (add / activate / deactivate).
- Game management with banker assignment.
- Chip tracking per game (buy-in, cash-out, manual adjustments).
- Account carry-forward and simplified settlements.
- Closed-game history.

## Run locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Notes

- Data is persisted in browser `localStorage` using key `home-poker-chip-manager-v1`.
- Settlement entries are logged against the currently open game.
