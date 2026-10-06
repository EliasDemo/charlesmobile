import * as Location from 'expo-location';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * - `granted`: permission given.
 * - `undetermined`: never asked; explain first, then ask.
 * - `denied`: refused, the system can still ask again.
 * - `blocked`: refused for good; only the system settings can change it.
 */
export type LocationPermission = 'granted' | 'undetermined' | 'denied' | 'blocked';

function toPermission(response: Location.LocationPermissionResponse): LocationPermission {
  if (response.granted) return 'granted';
  if (response.status === Location.PermissionStatus.UNDETERMINED) return 'undetermined';
  return response.canAskAgain ? 'denied' : 'blocked';
}

export async function getLocationPermission(): Promise<LocationPermission> {
  return toPermission(await Location.getForegroundPermissionsAsync());
}

export async function requestLocationPermission(): Promise<LocationPermission> {
  return toPermission(await Location.requestForegroundPermissionsAsync());
}

/**
 * Current position with balanced accuracy (enough for "near me"). The result is only kept in
 * memory by the caller: never stored or logged (CLAUDE.md §5).
 */
export async function getCurrentCoordinates(): Promise<Coordinates> {
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}
