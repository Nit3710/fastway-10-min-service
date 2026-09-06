import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Register background/quit state FCM message handler
// This MUST be called before AppRegistry.registerComponent
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('FCM background message received:', remoteMessage);
});

// Must match MainActivity.getMainComponentName() ("FastwayDelivery")
AppRegistry.registerComponent(appName, () => App); // FastwayDelivery from app.json
AppRegistry.registerComponent('FastwayDelivery', () => App);
AppRegistry.registerComponent('fastway-delivery-app', () => App);
