import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function MapContents({ places }) {
  return (
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
            color: "#0f766e",
            fillColor: "#0f766e",
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
  );
}

export default MapContents;
