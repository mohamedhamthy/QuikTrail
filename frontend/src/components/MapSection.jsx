import { Suspense, lazy, useEffect, useRef, useState } from "react";

const MapContents = lazy(() => import("./MapContents"));

function MapSection({ places }) {
  const sectionRef = useRef(null);
  const [shouldLoadMap, setShouldLoadMap] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (!("IntersectionObserver" in window)) {
      const timeoutId = window.setTimeout(() => setShouldLoadMap(true), 0);
      return () => window.clearTimeout(timeoutId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadMap(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      className="map-section"
      id="map"
      aria-labelledby="map-title"
      ref={sectionRef}
    >
      <div className="map-intro">
        <p className="eyebrow">GET YOUR BEARINGS</p>
        <h2 id="map-title">
          Everything is closer
          <br />
          <em>than you think.</em>
        </h2>
        <p>
          Explore places around Sammanthurai, from local markets and mosques to
          beaches, heritage sites and farmland views.
        </p>
        <a
          href="https://www.openstreetmap.org/"
          target="_blank"
          rel="noreferrer"
        >
          Open full map ↗
        </a>
      </div>
      {shouldLoadMap ? (
        <Suspense
          fallback={
            <div className="map map-placeholder" aria-label="Loading map" />
          }
        >
          <MapContents places={places} />
        </Suspense>
      ) : (
        <div className="map map-placeholder" aria-hidden="true" />
      )}
    </section>
  );
}

export default MapSection;
