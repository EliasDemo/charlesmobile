import { Linking, Platform } from 'react-native';

/**
 * Opens the phone's maps app at a place ("Cómo llegar"). Works without any map key: it is the
 * system app, not the in-app map. Platform differences live here, not in screens.
 */
export function openDirections({
  latitude,
  longitude,
  label,
}: {
  latitude: number;
  longitude: number;
  label: string;
}) {
  const coords = `${latitude},${longitude}`;
  const name = encodeURIComponent(label);
  const url = Platform.OS === 'ios' ? `maps:?q=${name}&ll=${coords}` : `geo:${coords}?q=${coords}(${name})`;
  return Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${coords}`),
  );
}

/** Waze navigation to a place (its app if installed, otherwise its web page). */
export function openWaze({ latitude, longitude }: { latitude: number; longitude: number }) {
  return Linking.openURL(`https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`);
}

export function callPhone(phone: string) {
  return Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`);
}

/** Only real web links are opened; other values (e.g. "@usuario") are shown as text. */
export function isWebUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

export function openWebUrl(url: string) {
  return Linking.openURL(url.trim());
}
