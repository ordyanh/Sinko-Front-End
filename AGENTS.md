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
