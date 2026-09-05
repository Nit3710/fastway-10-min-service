import { useEffect, useState, useRef } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { updateDeliveryLocation } from '../api/deliveryApi';

export const useLocationTracking = (hasActiveAssignments: boolean) => {
  const [isTracking, setIsTracking] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      const auth = await Geolocation.requestAuthorization('whenInUse');
      return auth === 'granted';
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Fastway Delivery needs location access to track your active deliveries.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    return false;
  };

  const sendLocationUpdate = (): Promise<void> => {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            await updateDeliveryLocation(latitude, longitude);
            setErrorMsg(null);
            setIsTracking(true);
          } catch (err: any) {
            console.warn('Location sync to backend failed:', err.message);
          }
          resolve();
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          resolve();
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  };

  const startTracking = async () => {
    try {
      setErrorMsg(null);
      const granted = await requestPermission();
      setPermissionGranted(granted);

      if (!granted) {
        setErrorMsg('Location permission is required to track active deliveries.');
        setIsTracking(false);
        return;
      }

      setIsTracking(true);
      // Run once immediately
      await sendLocationUpdate();

      // Set up periodic tracking loop every 25 seconds
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(async () => {
        await sendLocationUpdate();
      }, 25000);
    } catch (err: any) {
      setErrorMsg('Failed to initialize location tracking: ' + err.message);
      setIsTracking(false);
    }
  };

  const stopTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);
  };

  useEffect(() => {
    if (hasActiveAssignments) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [hasActiveAssignments]);

  return {
    isTracking,
    permissionGranted,
    errorMsg,
    requestPermission: startTracking,
  };
};
