import { useEffect, useState } from "react";
import api from "./services/api";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./styles/App.css";
import "./styles/admin.css";
import "./styles/admin-catalogue.css";
import "./styles/motion.css";
import { categories } from "./constants/categories";

function App() {
  const [places, setPlaces] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState([]);
  const [activePlace, setActivePlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [showPlanner, setShowPlanner] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("quiktrail-theme") === "dark",
  );
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("quiktrail-user") || "null"),
  );
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [showAdmin, setShowAdmin] = useState(false);
  const [pendingPlace, setPendingPlace] = useState(null);

  useEffect(() => {
    async function loadPlaces() {
      try {
        const response = await api.get("/places", { params: { radius: 25 } });
        setPlaces(response.data.places);
      } catch {
        setNotice(
          "The API is offline. Start the backend to load the verified place directory.",
        );
      } finally {
        setLoading(false);
      }
    }
    loadPlaces();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    localStorage.setItem("quiktrail-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    function guardRestoredPage(event) {
      if (event.persisted && window.location.pathname === "/admin" && !localStorage.getItem("quiktrail-token")) {
        window.location.replace("/login");
      }
    }
    window.addEventListener("pageshow", guardRestoredPage);
    return () => window.removeEventListener("pageshow", guardRestoredPage);
  }, []);

  const filteredPlaces = places.filter((place) => {
    const matchesCategory =
      selectedCategory === "All" || place.category === selectedCategory;
    const query = search.toLowerCase();
    return (
      matchesCategory &&
      (!query ||
        `${place.name} ${place.description} ${place.location} ${place.category}`
          .toLowerCase()
          .includes(query))
    );
  });

  function requestAuth(place = null) {
    setPendingPlace(place);
    setAuthMode("login");
    setShowAuth(true);
  }

  function togglePlan(place) {
    if (!user) {
      requestAuth(place);
      return;
    }
    setPlan((currentPlan) =>
      currentPlan.some((item) => item.id === place.id)
        ? currentPlan.filter((item) => item.id !== place.id)
        : [...currentPlan, place],
    );
  }

  function handleAuthSuccess(authResponse) {
    localStorage.setItem("quiktrail-token", authResponse.token);
    localStorage.setItem("quiktrail-user", JSON.stringify(authResponse.user));
    setUser(authResponse.user);
    setShowAuth(false);
    if (authResponse.user.role === "admin") {
      window.location.replace("/admin");
      return;
    }
    if (pendingPlace) {
      setPlan((currentPlan) =>
        currentPlan.some((item) => item.id === pendingPlace.id)
          ? currentPlan
          : [...currentPlan, pendingPlace],
      );
      setPendingPlace(null);
    }
    window.location.replace("/");
  }

  function logout() {
    localStorage.removeItem("quiktrail-token");
    localStorage.removeItem("quiktrail-user");
    setUser(null);
    window.location.replace("/login");
  }

  async function savePlan(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      date: form.get("date"),
      startTime: form.get("startTime"),
      pace: form.get("pace"),
      places: plan.map((place) => place.id),
    };
    try {
      const response = await api.post("/plans", payload, {
        headers: user
          ? {
              Authorization: `Bearer ${localStorage.getItem("quiktrail-token")}`,
            }
          : {},
      });
      setPlanResult(response.data);
      setNotice("Your one-day trail is ready. Review the route summary below.");
      setShowPlanner(false);
      event.currentTarget.reset();
    } catch {
      setNotice(
        "The plan could not be saved. Please make sure the backend is running.",
      );
    }
  }

  if (window.location.pathname === "/login") {
    return (
      <div className="app-shell admin-gate">
        <AuthModal
          mode="login"
          onModeChange={setAuthMode}
          onSuccess={handleAuthSuccess}
          onClose={() => window.location.replace("/")}
        />
      </div>
    );
  }

  if (window.location.pathname === "/admin") {
    return (
      <AdminRoute
        user={user}
        onRequestAuth={() => requestAuth()}
        onAuthSuccess={handleAuthSuccess}
        showAuth={showAuth}
        authMode={authMode}
        onModeChange={setAuthMode}
        onCloseAuth={() => setShowAuth(false)}
        onLogout={logout}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#discover" aria-label="QuikTrail home">
          <span className="brand-mark">q</span>
          <span>QuikTrail</span>
        </a>
        <nav className="nav-links" aria-label="Primary navigation">
          <a className="active" href="#discover">
            Discover
          </a>
          <a href="#map">Map</a>
          <button
            className="plan-link"
            type="button"
            onClick={() => (user ? setShowPlanner(true) : requestAuth())}
          >
            My trail <span>{plan.length}</span>
          </button>
        </nav>
        <div className="header-actions">
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setDarkMode((value) => !value)}
            aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
          >
            {darkMode ? "☀" : "☾"}
          </button>
          {user ? (
            <div className="account-menu">
              <button
                className="avatar"
                type="button"
                aria-label="Open account"
              >
                {user.name.slice(0, 2).toUpperCase()}
              </button>
              <div className="account-popover">
                <strong>{user.name}</strong>
                <small>{user.role}</small>
                {user.role === "admin" && (
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = "/admin";
                    }}
                  >
                    Admin dashboard
                  </button>
                )}
                <button type="button" onClick={logout}>
                  Log out
                </button>
              </div>
            </div>
          ) : (
            <button
              className="sign-in-button"
              type="button"
              onClick={() => requestAuth()}
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      <main id="discover">
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">SAMMANTHURAI · WITHIN 25 KM</p>
            <h1>
              Find your <em>next</em> good day.
            </h1>
            <p className="hero-text">
              One place for local stories, practical details and a better way to
              plan a day around the Eastern Province.
            </p>
            <div className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search places, food, or experiences"
                aria-label="Search places"
              />
              <kbd>/</kbd>
            </div>
            <div className="hero-stats">
              <span>
                <strong>{places.length || "10+"}</strong> verified places
              </span>
              <span>
                <strong>25 km</strong> discovery radius
              </span>
            </div>
          </div>
          <div
            className="hero-art"
            aria-label="Illustration of a Sammanthurai landscape"
            role="img"
          >
            <div className="sun"></div>
            <div className="hill hill-back"></div>
            <div className="hill hill-front"></div>
            <div className="palm palm-one">♧</div>
            <div className="palm palm-two">♧</div>
            <span className="art-label">01 / EASTERN ESCAPE</span>
          </div>
        </section>
        <section className="content-section" aria-labelledby="places-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DISCOVER NEARBY</p>
              <h2 id="places-title">Take the scenic route</h2>
            </div>
            <p className="result-count">
              {filteredPlaces.length} places within 25 km
            </p>
          </div>
          <div
            className="category-row"
            role="tablist"
            aria-label="Place categories"
          >
            {categories.map((category) => (
              <button
                key={category}
                className={
                  selectedCategory === category ? "category active" : "category"
                }
                type="button"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="Dismiss notice"
              >
                ×
              </button>
            </div>
          )}
          <div className="place-grid">
            {loading ? (
              <p className="empty-state">Finding verified places...</p>
            ) : (
              filteredPlaces.map((place, index) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  index={index}
                  isPlanned={plan.some((item) => item.id === place.id)}
                  onTogglePlan={() => togglePlan(place)}
                  onOpen={() => setActivePlace(place)}
                />
              ))
            )}
            {!loading && filteredPlaces.length === 0 && (
              <p className="empty-state">No places match that search yet.</p>
            )}
          </div>
        </section>

        {planResult && (
          <ItinerarySummary
            result={planResult}
            onClear={() => setPlanResult(null)}
          />
        )}
        <section className="map-section" id="map" aria-labelledby="map-title">
          <div className="map-intro">
            <p className="eyebrow">GET YOUR BEARINGS</p>
            <h2 id="map-title">
              Everything is closer
              <br />
              <em>than you think.</em>
            </h2>
            <p>
              Explore places around Sammanthurai, from local markets and mosques
              to beaches, heritage sites and farmland views.
            </p>
            <a
              href="https://www.openstreetmap.org/"
              target="_blank"
              rel="noreferrer"
            >
              Open full map ↗
            </a>
          </div>
          <MapContainer
            className="map"
            center={[7.4744, 81.7964]}
            zoom={11}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {places.map((place) => (
              <CircleMarker
                key={place.id}
                center={place.coordinates}
                pathOptions={{
                  color: "#ef7e5c",
                  fillColor: "#ef7e5c",
                  fillOpacity: 0.9,
                }}
                radius={8}
              >
                <Popup>
                  <strong>{place.name}</strong>
                  <br />
                  {place.category} · {place.distanceFromHome} km
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </section>
      </main>

      <footer>
        <span>QuikTrail</span>
        <span>Made for slower, better days in Sammanthurai.</span>
        <span>© 2026</span>
      </footer>
      {activePlace && (
        <PlaceModal
          place={activePlace}
          isPlanned={plan.some((item) => item.id === activePlace.id)}
          onTogglePlan={() => togglePlan(activePlace)}
          onClose={() => setActivePlace(null)}
        />
      )}
      {showPlanner && (
        <PlannerModal
          plan={plan}
          onClose={() => setShowPlanner(false)}
          onSubmit={savePlan}
        />
      )}
      {showAuth && (
        <AuthModal
          mode={authMode}
          onModeChange={setAuthMode}
          onSuccess={handleAuthSuccess}
          onClose={() => setShowAuth(false)}
        />
      )}
      {showAdmin && (
        <AdminModal
          token={localStorage.getItem("quiktrail-token")}
          places={places}
          onPlacesChange={setPlaces}
          onClose={() => setShowAdmin(false)}
        />
      )}
    </div>
  );
}

function PlaceCard({ place, index, isPlanned, onTogglePlan, onOpen }) {
  return (
    <article
      className={`place-card ${place.color}`}
      style={{ "--delay": `${index * 60}ms` }}
    >
      <button
        className="card-image"
        type="button"
        onClick={onOpen}
        aria-label={`View ${place.name}`}
      >
        {place.images?.[0] ? (
          <img src={place.images[0]} alt="" />
        ) : (
          <span>{place.emoji}</span>
        )}
        <small>{place.category}</small>
        <i>↗</i>
      </button>
      <div className="card-body">
        <div className="card-title">
          <h3>{place.name}</h3>
          <span>{place.distanceFromHome} km</span>
        </div>
        <p>{place.description}</p>
        <div className="card-meta">
          <span>◷ {place.duration} min</span>
          <span>⌖ {place.bestVisitTime}</span>
          <strong>{place.entryFee}</strong>
        </div>
        <button
          className={isPlanned ? "add-button added" : "add-button"}
          type="button"
          onClick={onTogglePlan}
        >
          {isPlanned ? "✓ Added to trail" : "+ Add to my trail"}
        </button>
      </div>
    </article>
  );
}

function PlaceModal({ place, isPlanned, onTogglePlan, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="place-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="close-button"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        {place.images?.length > 0 ? (
          <div className="photo-strip">
            {place.images.map((image) => (
              <img key={image} src={image} alt={`${place.name} view`} />
            ))}
          </div>
        ) : (
          <div className={`modal-art ${place.color}`}>{place.emoji}</div>
        )}
        <p className="eyebrow">
          {place.category} · {place.location}
        </p>
        <h2 id="place-modal-title">{place.name}</h2>
        <p>{place.description}</p>
        <div className="detail-grid">
          <span>
            <b>Distance</b>
            {place.distanceFromHome} km
          </span>
          <span>
            <b>Open</b>
            {place.openingTime}–{place.closingTime}
          </span>
          <span>
            <b>Visit</b>
            {place.duration} min
          </span>
          <span>
            <b>Best time</b>
            {place.bestVisitTime}
          </span>
        </div>
        <div className="tips">
          <b>Visitor guidance</b>
          <p>{place.travelTips}</p>
          <p>{place.culturalEtiquette}</p>
        </div>
        <div className="facilities">
          {place.facilities.map((facility) => (
            <span key={facility}>✓ {facility}</span>
          ))}
        </div>
        <div className="modal-actions">
          <button
            className="primary-button"
            type="button"
            onClick={onTogglePlan}
          >
            {isPlanned ? "Remove from my trail" : "Add to my trail"}
          </button>
          <a
            className="secondary-button"
            href={`https://www.google.com/maps/dir/?api=1&destination=${place.coordinates[0]},${place.coordinates[1]}`}
            target="_blank"
            rel="noreferrer"
          >
            Get directions ↗
          </a>
        </div>
      </div>
    </div>
  );
}

function PlannerModal({ plan, onClose, onSubmit }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <form
        className="modal planner-modal"
        onSubmit={onSubmit}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="close-button"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <p className="eyebrow">YOUR ONE-DAY TRAIL</p>
        <h2>Make a day of it.</h2>
        <p>
          QuikTrail will order your stops and estimate travel time, visit time
          and finish time.
        </p>
        <label>
          Trail name
          <input name="name" placeholder="A quiet Saturday" required />
        </label>
        <div className="form-row">
          <label>
            Date
            <input name="date" type="date" required />
          </label>
          <label>
            Start time
            <input name="startTime" type="time" defaultValue="08:00" required />
          </label>
        </div>
        <label>
          Travel pace
          <select name="pace" defaultValue="Balanced">
            <option>Relaxed</option>
            <option>Balanced</option>
            <option>Fast</option>
          </select>
        </label>
        <div className="selected-stops">
          <strong>{plan.length} stops selected</strong>
          {plan.length > 0 ? (
            plan.map((place) => (
              <span key={place.id}>
                {place.emoji} {place.name}
              </span>
            ))
          ) : (
            <small>Add places from the discover cards first.</small>
          )}
        </div>
        <button
          className="primary-button"
          type="submit"
          disabled={plan.length === 0}
        >
          Generate my trail
        </button>
      </form>
    </div>
  );
}

function ItinerarySummary({ result, onClear }) {
  return (
    <section className="itinerary-section" aria-labelledby="itinerary-title">
      <div className="itinerary-heading">
        <div>
          <p className="eyebrow">YOUR GENERATED PLAN</p>
          <h2 id="itinerary-title">{result.name}</h2>
          <p>
            {result.date} · {result.pace} pace · finish around{" "}
            {result.expectedEndTime}
          </p>
        </div>
        <button className="close-plan" type="button" onClick={onClear}>
          Clear plan ×
        </button>
      </div>
      <div className="itinerary-stats">
        <span>
          <b>{result.places.length}</b> stops
        </span>
        <span>
          <b>{result.totalDistance} km</b> route
        </span>
        <span>
          <b>{result.totalVisitMinutes + result.totalTravelMinutes} min</b>{" "}
          total time
        </span>
      </div>
      <div className="route-list">
        {result.places.map((place, index) => (
          <div className="route-stop" key={place.id}>
            <strong>{String(index + 1).padStart(2, "0")}</strong>
            <span>{place.emoji}</span>
            <div>
              <b>{place.name}</b>
              <small>
                {place.category} · {place.duration} min visit · opens{" "}
                {place.openingTime}
              </small>
            </div>
          </div>
        ))}
      </div>
      {result.warnings.length > 0 && (
        <div className="warning">⚠ {result.warnings.join(" ")}</div>
      )}
    </section>
  );
}

function AuthModal({ mode, onModeChange, onSuccess, onClose }) {
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isLogin = mode === "login";

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
    };
    try {
      const response = await api.post(
        `/auth/${isLogin ? "login" : "register"}`,
        payload,
      );
      onSuccess(response.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          (requestError.code === "ERR_NETWORK"
            ? "Cannot reach the QuikTrail API. Start the backend with npm run dev."
            : "Unable to complete this request."),
      );
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <form
        className="modal auth-modal"
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="close-button"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <p className="eyebrow">QUIKTRAIL ACCOUNT</p>
        <h2>{isLogin ? "Welcome back." : "Start exploring."}</h2>
        <p>
          {isLogin
            ? "Sign in to save your one-day trails."
            : "Create an account to keep your travel plans."}
        </p>
        {!isLogin && (
          <label>
            Name
            <input name="name" placeholder="Your name" required />
          </label>
        )}
        <label>
          Email
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
            required
          />
        </label>
        <label>
          Password
          <span className="password-field">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 6 characters"
              minLength="6"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </span>
        </label>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <button className="primary-button" type="submit">
          {isLogin ? "Sign in" : "Create account"}
        </button>
        <button
          className="switch-auth"
          type="button"
          onClick={() => {
            setError("");
            onModeChange(isLogin ? "register" : "login");
          }}
        >
          {isLogin
            ? "Need an account? Create one"
            : "Already registered? Sign in"}
        </button>
      </form>
    </div>
  );
}

function AdminModal({ token, places, onPlacesChange, onClose }) {
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    category: "Natural",
    description: "",
    location: "",
    openingTime: "06:00",
    closingTime: "18:00",
    duration: 60,
    entryFee: "Free",
  });

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }
  function editPlace(place) {
    setEditingId(place.id);
    setForm({
      name: place.name,
      category: place.category,
      description: place.description,
      location: place.location,
      openingTime: place.openingTime,
      closingTime: place.closingTime,
      duration: place.duration,
      entryFee: place.entryFee,
    });
  }

  async function savePlace(event) {
    event.preventDefault();
    try {
      const response = await api({
        method: editingId ? "put" : "post",
        url: editingId ? `/admin/places/${editingId}` : "/admin/places",
        data: form,
        headers: { Authorization: `Bearer ${token}` },
      });
      onPlacesChange((current) =>
        editingId
          ? current.map((place) =>
              place.id === editingId ? response.data : place,
            )
          : [...current, response.data],
      );
      setEditingId(null);
      setForm({
        name: "",
        category: "Natural",
        description: "",
        location: "",
        openingTime: "06:00",
        closingTime: "18:00",
        duration: 60,
        entryFee: "Free",
      });
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save place.");
    }
  }

  async function removePlace(id) {
    if (!window.confirm("Remove this place from the catalogue?")) return;
    try {
      await api.delete(`/admin/places/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onPlacesChange((current) => current.filter((place) => place.id !== id));
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to remove place.",
      );
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-heading">
          <div>
            <p className="eyebrow">ADMINISTRATION</p>
            <h2>Manage places</h2>
          </div>
          <button
            className="close-button"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="admin-layout">
          <form className="admin-form" onSubmit={savePlace}>
            <h3>{editingId ? "Edit place" : "Add a place"}</h3>
            <label>
              Name
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                required
              />
            </label>
            <label>
              Category
              <select
                name="category"
                value={form.category}
                onChange={updateField}
              >
                {categories.slice(1).map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={updateField}
                rows="3"
                required
              />
            </label>
            <label>
              Location
              <input
                name="location"
                value={form.location}
                onChange={updateField}
                required
              />
            </label>
            <div className="form-row">
              <label>
                Opens
                <input
                  name="openingTime"
                  type="time"
                  value={form.openingTime}
                  onChange={updateField}
                  required
                />
              </label>
              <label>
                Closes
                <input
                  name="closingTime"
                  type="time"
                  value={form.closingTime}
                  onChange={updateField}
                  required
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Visit minutes
                <input
                  name="duration"
                  type="number"
                  min="15"
                  value={form.duration}
                  onChange={updateField}
                  required
                />
              </label>
              <label>
                Entry fee
                <input
                  name="entryFee"
                  value={form.entryFee}
                  onChange={updateField}
                  required
                />
              </label>
            </div>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button className="primary-button" type="submit">
              {editingId ? "Update place" : "Add place"}
            </button>
            {editingId && (
              <button
                className="switch-auth"
                type="button"
                onClick={() => setEditingId(null)}
              >
                Cancel editing
              </button>
            )}
          </form>
          <div className="admin-list">
            <div className="admin-list-header">
              <h3>
                Catalogue <span>{places.length}</span>
              </h3>
              <small>Visitor data source</small>
            </div>
            {places.map((place) => (
              <div className="admin-place" key={place.id}>
                <span>{place.emoji}</span>
                <div>
                  <b>{place.name}</b>
                  <small>
                    {place.category} · {place.distanceFromHome} km
                  </small>
                </div>
                <button type="button" onClick={() => editPlace(place)}>
                  Edit
                </button>
                <button
                  className="danger-button"
                  type="button"
                  onClick={() => removePlace(place.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminRoute({
  user,
  onLogout,
}) {
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function verifyAdminSession() {
      try {
        const response = await api.get("/auth/me", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("quiktrail-token")}`,
          },
        });
        setVerifiedUser(response.data.user);
      } catch {
        setVerifiedUser(null);
      } finally {
        setChecking(false);
      }
    }
    verifyAdminSession();
  }, [user?.id]);

  useEffect(() => {
    if (!checking && !verifiedUser) window.location.replace("/login");
  }, [checking, verifiedUser]);

  if (checking)
    return (
      <div className="admin-gate">
        <p>Checking administrator session...</p>
      </div>
    );
  user = verifiedUser;
  if (!user)
    return (
      <div className="admin-gate">
        <p>Redirecting to sign in...</p>
      </div>
    );
  if (user.role !== "admin")
    return (
      <div className="app-shell admin-gate">
        <div className="admin-gate-card">
          <span className="brand-mark">q</span>
          <p className="eyebrow">ACCESS DENIED</p>
          <h1>Administrator access required.</h1>
          <p>Your visitor account cannot open this dashboard.</p>
          <button className="primary-button" type="button" onClick={onLogout}>
            Log out
          </button>
          <a href="/">Return to discover</a>
        </div>
      </div>
    );
  return <AdminDashboard user={user} onLogout={onLogout} />;
}

function AdminDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [places, setPlaces] = useState([]);
  const [users, setUsers] = useState([]);
  const [itineraries, setItineraries] = useState([]);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("quiktrail-theme") === "dark",
  );
  const token = localStorage.getItem("quiktrail-token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    localStorage.setItem("quiktrail-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    async function loadAdminData() {
      try {
        const authHeaders = { Authorization: `Bearer ${token}` };
        const [
          placeResponse,
          settingResponse,
          userResponse,
          itineraryResponse,
        ] = await Promise.all([
          api.get("/places?radius=25"),
          api.get("/admin/settings", { headers: authHeaders }),
          api.get("/admin/users", { headers: authHeaders }),
          api.get("/admin/itineraries", { headers: authHeaders }),
        ]);
        setPlaces(placeResponse.data.places);
        setSettings(settingResponse.data);
        setUsers(userResponse.data);
        setItineraries(itineraryResponse.data);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Unable to load administrator data.",
        );
      }
    }
    loadAdminData();
  }, [token]);

  async function saveSettings(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const response = await api.put(
        "/admin/settings",
        {
          homeCoordinates: [
            Number(form.get("latitude")),
            Number(form.get("longitude")),
          ],
          paceMultipliers: {
            Relaxed: Number(form.get("relaxed")),
            Balanced: Number(form.get("balanced")),
            Fast: Number(form.get("fast")),
          },
          categories: form
            .get("categories")
            .split(",")
            .map((category) => category.trim())
            .filter(Boolean),
          notificationsEnabled: form.get("notifications") === "on",
          features: {
            reviews: form.get("reviews") === "on",
            savedPlans: form.get("savedPlans") === "on",
          },
        },
        { headers },
      );
      setSettings(response.data);
      setError("Settings saved successfully.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to save settings.",
      );
    }
  }

  async function updateUser(id, changes) {
    try {
      const response = await api.patch(`/admin/users/${id}`, changes, {
        headers,
      });
      setUsers((current) =>
        current.map((item) =>
          item.id === id ? { ...item, ...response.data } : item,
        ),
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to update user.",
      );
    }
  }

  async function deletePlace(id) {
    try {
      await api.delete(`/admin/places/${id}`, { headers });
      setPlaces((current) => current.filter((place) => place.id !== id));
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to delete place.",
      );
    }
  }

  return (
    <div className="app-shell admin-shell">
      <header className="admin-topbar">
        <a className="brand" href="/" aria-label="Return to QuikTrail">
          <span className="brand-mark">q</span>
          <span>QuikTrail</span>
        </a>
        <div>
          <span className="admin-user">{user.name} · Administrator</span>
          <button
            className="admin-theme-toggle"
            type="button"
            onClick={() => setDarkMode((value) => !value)}
            aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
          >
            <span>{darkMode ? "☀" : "☾"}</span>
            <small>{darkMode ? "Light" : "Dark"} mode</small>
          </button>
          <button className="secondary-button" type="button" onClick={onLogout}>
            ↪ Log out
          </button>
        </div>
      </header>
      <main className="admin-page">
        <div className="admin-page-heading">
          <div>
            <p className="eyebrow">SYSTEM CONTROL CENTRE</p>
            <h1>Admin dashboard</h1>
            <p>Keep QuikTrail’s local information accurate and useful.</p>
          </div>
          <a className="secondary-button" href="/">
            View visitor site ↗
          </a>
        </div>
        <nav className="admin-tabs" aria-label="Admin sections">
          {[
            ["overview", "Overview"],
            ["places", "Places"],
            ["settings", "Settings"],
            ["users", "View users"],
            ["itineraries", "Itineraries"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              type="button"
              onClick={() => setTab(key)}
            >
              {label}
              <span>
                {key === "places"
                  ? places.length
                  : key === "users"
                    ? users.length
                    : key === "itineraries"
                      ? itineraries.length
                      : "•"}
              </span>
              {tab === key && (
                <i className="tab-indicator" aria-hidden="true" />
              )}
            </button>
          ))}
        </nav>
        {error && (
          <div className="notice" role="status">
            {error}
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}
        {tab === "overview" && (
          <AdminOverview
            places={places}
            users={users}
            itineraries={itineraries}
            onNavigate={setTab}
          />
        )}
        {tab === "places" && (
          <AdminPlaces
            places={places}
            setPlaces={setPlaces}
            headers={headers}
            onDelete={deletePlace}
          />
        )}
        {tab === "settings" && settings && (
          <AdminSettings settings={settings} onSave={saveSettings} />
        )}
        {tab === "users" && <AdminUsers users={users} onUpdate={updateUser} />}
        {tab === "itineraries" && (
          <AdminItineraries itineraries={itineraries} />
        )}
      </main>
    </div>
  );
}

function AdminOverview({ places, users, itineraries, onNavigate }) {
  return (
    <section className="admin-overview">
      <div className="overview-intro">
        <div>
          <p className="eyebrow">TODAY AT A GLANCE</p>
          <h2>Your system is ready.</h2>
          <p>
            Manage the destination catalogue and keep the visitor experience
            current.
          </p>
        </div>
        <button
          className="primary-button overview-primary"
          type="button"
          onClick={() => onNavigate("places")}
        >
          Add a place <span>+</span>
        </button>
      </div>
      <div className="overview-stats">
        <button type="button" onClick={() => onNavigate("places")}>
          <strong>
            <CountUp value={places.length} />
          </strong>
          <span>Places in catalogue</span>
          <small>Manage destinations ↗</small>
        </button>
        <button type="button" onClick={() => onNavigate("users")}>
          <strong>
            <CountUp value={users.length} />
          </strong>
          <span>Registered users</span>
          <small>View users ↗</small>
        </button>
        <button type="button" onClick={() => onNavigate("itineraries")}>
          <strong>
            <CountUp value={itineraries.length} />
          </strong>
          <span>Saved itineraries</span>
          <small>Review plans ↗</small>
        </button>
      </div>
      <div className="overview-actions">
        <button type="button" onClick={() => onNavigate("settings")}>
          <span>⚙</span>
          <b>System settings</b>
          <small>Coordinates, pace and feature flags</small>
        </button>
        <button type="button" onClick={() => onNavigate("users")}>
          <span>◉</span>
          <b>View user management</b>
          <small>Roles, account access and saved plans</small>
        </button>
      </div>
    </section>
  );
}

function CountUp({ value }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frame;
    const start = performance.now();
    function animate(now) {
      const progress = Math.min((now - start) / 650, 1);
      setCount(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return count;
}

function AdminPlaces({ places, setPlaces, headers, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const blank = {
    name: "",
    category: "Natural",
    description: "",
    location: "",
    openingTime: "06:00",
    closingTime: "18:00",
    duration: 60,
    entryFee: "Free",
    latitude: 7.4744,
    longitude: 81.7964,
    imageUrls: "",
    isActive: true,
  };
  const [form, setForm] = useState(blank);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  function change(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }
  async function uploadPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setUploadError("Choose an image smaller than 5 MB.");
      event.target.value = "";
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const response = await api.post(
        "/admin/uploads",
        { dataUrl, filename: file.name },
        { headers },
      );
      setForm((current) => ({
        ...current,
        imageUrls: current.imageUrls
          ? `${current.imageUrls}\n${response.data.url}`
          : response.data.url,
      }));
    } catch (requestError) {
      setUploadError(
        requestError.response?.data?.message || "Unable to upload this image.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }
  async function submit(event) {
    event.preventDefault();
    const payload = {
      ...form,
      coordinates: [Number(form.latitude), Number(form.longitude)],
      images: form.imageUrls
        .split("\n")
        .map((url) => url.trim())
        .filter(Boolean),
      duration: Number(form.duration),
    };
    const response = await api({
      method: editing ? "put" : "post",
      url: editing ? `/admin/places/${editing}` : "/admin/places",
      data: payload,
      headers,
    });
    setPlaces((current) =>
      editing
        ? current.map((place) => (place.id === editing ? response.data : place))
        : [...current, response.data],
    );
    setEditing(null);
    setForm(blank);
  }
  function beginEdit(place) {
    setEditing(place.id);
    setForm({
      name: place.name,
      category: place.category,
      description: place.description,
      location: place.location,
      openingTime: place.openingTime,
      closingTime: place.closingTime,
      duration: place.duration,
      entryFee: place.entryFee,
      latitude: place.coordinates?.[0] || 7.4744,
      longitude: place.coordinates?.[1] || 81.7964,
      imageUrls: place.images?.join("\n") || "",
      isActive: place.isActive !== false,
    });
  }
  async function toggleActive(place) {
    const response = await api.put(
      `/admin/places/${place.id}`,
      { isActive: place.isActive === false },
      { headers },
    );
    setPlaces((current) =>
      current.map((item) => (item.id === place.id ? response.data : item)),
    );
  }
  const pageCount = Math.max(1, Math.ceil(places.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visiblePlaces = places.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );
  return (
    <div className="admin-workspace">
      <form className="admin-form" onSubmit={submit}>
        <div className="form-heading">
          <p className="eyebrow">PLACE MANAGEMENT</p>
          <h2>{editing ? "Edit place" : "Add a place"}</h2>
          <p>
            Keep visitor information clear, accurate, and ready for a day out.
          </p>
        </div>
        <div className="form-section-label">Core information</div>
        {["name", "location", "description"].map((field) => (
          <label key={field}>
            {field
              .replace(/[A-Z]/g, (letter) => ` ${letter}`)
              .replace(/^./, (letter) => letter.toUpperCase())}
            {field === "description" ? (
              <textarea
                name={field}
                value={form[field]}
                onChange={change}
                rows="3"
                required
              />
            ) : (
              <input
                name={field}
                value={form[field]}
                onChange={change}
                required
              />
            )}
          </label>
        ))}
        <div className="form-section-label">Visit details</div>
        <div className="form-row">
          <label>
            Opening time
            <input
              name="openingTime"
              type="time"
              value={form.openingTime}
              onChange={change}
              required
            />
          </label>
          <label>
            Closing time
            <input
              name="closingTime"
              type="time"
              value={form.closingTime}
              onChange={change}
              required
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Duration
            <input
              name="duration"
              type="number"
              min="15"
              value={form.duration}
              onChange={change}
              required
            />
          </label>
          <label>
            Entry fee
            <input
              name="entryFee"
              value={form.entryFee}
              onChange={change}
              required
            />
          </label>
        </div>
        <label>
          Category
          <select name="category" value={form.category} onChange={change}>
            {categories.slice(1).map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <div className="form-section-label">Location and media</div>
        <div className="form-row">
          <label>
            Latitude
            <input
              name="latitude"
              type="number"
              step="any"
              value={form.latitude}
              onChange={change}
              required
            />
          </label>
          <label>
            Longitude
            <input
              name="longitude"
              type="number"
              step="any"
              value={form.longitude}
              onChange={change}
              required
            />
          </label>
        </div>
        <label>
          Photo URLs{" "}
          <small className="field-help">One image URL per line</small>
          <textarea
            name="imageUrls"
            value={form.imageUrls}
            onChange={change}
            rows="3"
            placeholder="https://example.com/place-photo.jpg"
          />
        </label>
        <label className="photo-upload-field">
          Upload from this PC
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadPhoto} disabled={uploading} />
          <small className="field-help">JPG, PNG, WEBP or GIF · max 5 MB</small>
        </label>
        {uploading && <p className="upload-status">Uploading image...</p>}
        {uploadError && <p className="form-error" role="alert">{uploadError}</p>}
        <div className="form-actions">
          <button className="primary-button" type="submit">
            {editing ? "Update place" : "Add place"} <span>↗</span>
          </button>
          {editing && (
            <button
              className="switch-auth"
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(blank);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      <div className="admin-data-panel catalogue-panel">
        <div className="catalogue-heading">
          <div>
            <p className="eyebrow">ACTIVE DIRECTORY</p>
            <h2>
              Place catalogue <span>{places.length}</span>
            </h2>
          </div>
          <small>
            Page {safePage} of {pageCount}
          </small>
        </div>
        {visiblePlaces.map((place) => (
          <div className="admin-row" key={place.id}>
            <span>
              {place.images?.length ? (
                <img className="admin-thumb" src={place.images[0]} alt="" />
              ) : (
                place.emoji
              )}
            </span>
            <div>
              <b>{place.name}</b>
              <small>
                {place.category} · {place.distanceFromHome} km ·{" "}
                {place.images?.length || 0} photos ·{" "}
                {place.isActive === false ? "Inactive" : "Active"}
              </small>
            </div>
            <button type="button" onClick={() => beginEdit(place)}>
              Edit
            </button>
            <button type="button" onClick={() => toggleActive(place)}>
              {place.isActive === false ? "Activate" : "Deactivate"}
            </button>
            <button type="button" onClick={() => onDelete(place.id)}>
              Delete
            </button>
          </div>
        ))}
        <div className="catalogue-pagination">
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            ← Previous
          </button>
          <span>
            {safePage} / {pageCount}
          </span>
          <button
            type="button"
            disabled={safePage === pageCount}
            onClick={() =>
              setPage((current) => Math.min(pageCount, current + 1))
            }
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminSettings({ settings, onSave }) {
  return (
    <form className="admin-settings admin-form" onSubmit={onSave}>
      <h2>Settings & configuration</h2>
      <p>These values control planning defaults and optional site features.</p>
      <div className="form-row">
        <label>
          Home latitude
          <input
            name="latitude"
            type="number"
            step="any"
            defaultValue={settings.homeCoordinates[0]}
            required
          />
        </label>
        <label>
          Home longitude
          <input
            name="longitude"
            type="number"
            step="any"
            defaultValue={settings.homeCoordinates[1]}
            required
          />
        </label>
      </div>
      <h3>Travel pace multipliers</h3>
      <div className="form-row">
        <label>
          Relaxed
          <input
            name="relaxed"
            type="number"
            step="0.05"
            defaultValue={settings.paceMultipliers.Relaxed}
            required
          />
        </label>
        <label>
          Balanced
          <input
            name="balanced"
            type="number"
            step="0.05"
            defaultValue={settings.paceMultipliers.Balanced}
            required
          />
        </label>
        <label>
          Fast
          <input
            name="fast"
            type="number"
            step="0.05"
            defaultValue={settings.paceMultipliers.Fast}
            required
          />
        </label>
      </div>
      <label>
        Categories (comma separated)
        <input
          name="categories"
          defaultValue={settings.categories.join(", ")}
        />
      </label>
      {[
        ["notifications", "Site notifications", settings.notificationsEnabled],
        ["reviews", "Reviews and ratings", settings.features.reviews],
        ["savedPlans", "Saved plans", settings.features.savedPlans],
      ].map(([name, label, enabled]) => (
        <label className="check-row" key={name}>
          <input name={name} type="checkbox" defaultChecked={enabled} />
          {label}
        </label>
      ))}
      <button className="primary-button" type="submit">
        Save settings
      </button>
    </form>
  );
}

function AdminUsers({ users, onUpdate }) {
  return (
    <div className="admin-data-panel">
      <h2>
        Registered users <span>{users.length}</span>
      </h2>
      {users.map((user) => (
        <div className="admin-row" key={user.id}>
          <span>◉</span>
          <div>
            <b>{user.name}</b>
            <small>
              {user.email} · {user.itineraryCount} saved plans ·{" "}
              {user.isActive === false ? "Blocked" : "Active"}
            </small>
          </div>
          <select
            value={user.role}
            onChange={(event) =>
              onUpdate(user.id, { role: event.target.value })
            }
          >
            <option value="visitor">Visitor</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="button"
            onClick={() =>
              onUpdate(user.id, { isActive: user.isActive === false })
            }
          >
            {user.isActive === false ? "Activate" : "Block"}
          </button>
        </div>
      ))}
    </div>
  );
}

function AdminItineraries({ itineraries }) {
  return (
    <div className="admin-data-panel">
      <h2>
        Saved itineraries <span>{itineraries.length}</span>
      </h2>
      {itineraries.length === 0 ? (
        <p>No saved itineraries yet.</p>
      ) : (
        itineraries.map((plan) => (
          <div className="admin-row" key={plan.id}>
            <span>↗</span>
            <div>
              <b>{plan.name}</b>
              <small>
                {plan.date} · {plan.pace} · {plan.places.length} stops ·{" "}
                {plan.totalDistance} km
              </small>
            </div>
            <span>{plan.expectedEndTime}</span>
          </div>
        ))
      )}
    </div>
  );
}

export default App;
