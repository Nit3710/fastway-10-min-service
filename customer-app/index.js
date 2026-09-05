import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';

// Register background/quit state FCM message handler
// This MUST be called before AppRegistry.registerComponent
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('FCM background message received:', remoteMessage);
  // Notification is displayed automatically by the system in background/quit state
});

// Must match MainActivity.getMainComponentName(). Keep the npm package name separate.
AppRegistry.registerComponent('FastwayCustomer', () => App);
