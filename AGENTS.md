# Project Instructions

Backend integration is active. The frontend supports both local and remote backend connections:

### Local Endpoints (C:\Src\synco-app\Horeca):
- AuthService (Auth local): http://localhost:5273
- Sinko Core Service (Sinko local): http://localhost:5206

### Remote Endpoints (DigitalOcean Cloud):
- AuthService: https://lobster-app-zhysf.ondigitalocean.app
- Sinko Core Service: https://octopus-app-bomx6.ondigitalocean.app

### Commands:
- `npm run use:local`: Switch active target to local backend (http://localhost:5273 and http://localhost:5206)
- `npm run use:remote`: Switch active target to remote DigitalOcean backend
- `npm run backend:status`: Display current target mode and active endpoints

### Internationalization (i18n) Rules:
- **Default Application Language:** Armenian (`hy`). Synko supports Armenian (`hy`), Russian (`ru`), and English (`en`).
- **Zero Hardcoded Strings:** NEVER hardcode user-facing strings (labels, button texts, toast titles/descriptions, notification drawer items, map controls, status badges, modal titles/descriptions) in Russian, English, or any single language.
- **Strict 4-Way Parity:** Whenever adding or updating any UI translation key, you MUST update all 4 files simultaneously:
  1. `app/shared/lib/i18n/types.ts` (TypeScript interface)
  2. `app/shared/lib/i18n/resources/hy.ts` (Armenian - default)
  3. `app/shared/lib/i18n/resources/ru.ts` (Russian)
  4. `app/shared/lib/i18n/resources/en.ts` (English)
- **Notification Translations:** Notifications and toasts displayed to users must use localized strings (`t(...)`) or dynamic multi-language formatting respecting the user's active language (`localStorage.getItem("synco_language") || "hy"`).
- **Formatters & Helpers:** Pure helper functions (such as `getNotificationTheme`, `formatNotificationTime`) that output text badges or time indicators must accept the translator function `t` and prioritize localized resources.

