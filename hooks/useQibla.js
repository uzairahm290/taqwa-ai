import { useState, useEffect, useRef } from 'react';
import { Magnetometer } from 'expo-sensors';
import { fetchQiblaDirection } from '../lib/aladhanClient';

export function useQibla(location) {
  const [qiblaAngle, setQiblaAngle] = useState(null);
  const [compassHeading, setCompassHeading] = useState(0);
  const [distance, setDistance] = useState(null);
  const [error, setError] = useState(null);
  const subRef = useRef(null);
  // Track smoothed heading to avoid jitter
  const smoothedRef = useRef(0);
  // Track cumulative angle for shortest-path animation (avoids 350°→10° long spin)
  const cumulativeNeedle = useRef(0);
  const [needleAngle, setNeedleAngle] = useState(0);

  useEffect(() => {
    if (!location?.lat || !location?.lng) return;
    (async () => {
      try {
        const data = await fetchQiblaDirection(location.lat, location.lng);
        setQiblaAngle(data.direction);

        const MECCA = { lat: 21.3891, lng: 39.8579 };
        const R = 6371;
        const dLat = ((MECCA.lat - location.lat) * Math.PI) / 180;
        const dLng = ((MECCA.lng - location.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((location.lat * Math.PI) / 180) *
            Math.cos((MECCA.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
        setDistance(Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))));
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [location]);

  useEffect(() => {
    Magnetometer.setUpdateInterval(100);
    subRef.current = Magnetometer.addListener(({ x, y }) => {
      // Correct compass heading formula: clockwise from North.
      // atan2(-x, y) → 0° when Y+ points North, increases clockwise.
      let raw = Math.atan2(-x, y) * (180 / Math.PI);
      if (raw < 0) raw += 360;

      // Low-pass filter to reduce magnetometer jitter (alpha = 0.2)
      let prev = smoothedRef.current;
      let diff = raw - prev;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      const smoothed = (prev + 0.2 * diff + 360) % 360;
      smoothedRef.current = smoothed;
      setCompassHeading(smoothed);
    });
    return () => subRef.current?.remove();
  }, []);

  // Compute needle angle with shortest-path tracking to prevent wrap-around spin
  useEffect(() => {
    if (qiblaAngle === null) return;
    const raw = ((qiblaAngle - compassHeading) + 360) % 360;
    const prev = cumulativeNeedle.current % 360;
    let diff = raw - prev;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    cumulativeNeedle.current += diff;
    setNeedleAngle(cumulativeNeedle.current);
  }, [qiblaAngle, compassHeading]);

  return { qiblaAngle, compassHeading, needleAngle, distance, error };
}
