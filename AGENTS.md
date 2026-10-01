# Project Instructions

Backend integration is active. The frontend supports both local and remote backend connections:

### Local Endpoints (C:\Src\Horeca):
- AuthService (Auth local): http://localhost:5273/
- Sinko Core Service (Sinko local): http://localhost:5206/

### Remote Endpoints (Azure Cloud):
- AuthService: https://syncoauthservice-f0e9fkaqgyczegas.swedencentral-01.azurewebsites.net
- Sinko Core Service: https://synco-h4etbseqg4h2ewcw.swedencentral-01.azurewebsites.net

### Commands:
- `npm run use:local`: Switch active target to local backend (http://localhost:5273/ and http://localhost:5206/)
- `npm run use:remote`: Switch active target to remote Azure backend
- `npm run backend:status`: Display current target mode and active endpoints
