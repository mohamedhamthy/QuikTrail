# QuikTrail Project Structure

## Frontend

- `frontend/src/main.jsx`: Vite and React bootstrap
- `frontend/src/App.jsx`: application composition and page state
- `frontend/src/services/api.js`: shared Axios client for `/api` requests
- `frontend/src/constants/categories.js`: shared place-category configuration
- `frontend/src/styles/`: global, application, and admin styles
- `frontend/src/components/`: reserved boundary for extracting reusable UI components

## Backend

- `backend/src/server.js`: process entry point
- `backend/src/app.js`: Express application, middleware, and API composition
- `backend/src/config/database.js`: MongoDB connection lifecycle
- `backend/src/models/index.js`: User, Place, and Itinerary Mongoose schemas
- `backend/src/routes/health.js`: health-check route
- `backend/src/middleware/`: reserved boundary for reusable authorization middleware
- `backend/src/routes/`: API route modules

## Run Commands

```powershell
cd backend
npm run dev
```

```powershell
cd frontend
npm run dev
```

The frontend Vite proxy forwards `/api` requests to `http://localhost:5000`.
