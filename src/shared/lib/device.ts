import * as Device from 'expo-device';

const MAX_LENGTH = 100;

/**
 * Device name sent at login so the user can recognize their sessions. Only the manufacturer and
 * model ("samsung SM-A546E"), never `Device.deviceName`, which may contain the owner's name.
 */
export function deviceModelName(): string | undefined {
  const name = [Device.manufacturer, Device.modelName].filter(Boolean).join(' ').trim();
  return name ? name.slice(0, MAX_LENGTH) : undefined;
}
