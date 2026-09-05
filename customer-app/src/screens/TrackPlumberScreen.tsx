import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import THEME from '../theme/theme';
import { RootStackParamList } from '../types';
import Card from '../components/Card';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useToastStore } from '../store/toastStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'TrackPlumber'>;
type Route = RouteProp<RootStackParamList, 'TrackPlumber'>;

// Fixed Jaipur coordinates for simulation
const HOUSE_COORDS = { latitude: 26.9124, longitude: 75.7873 };
const PLUMBER_START_COORDS = { latitude: 26.8984, longitude: 75.7723 };

export const TrackPlumberScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const route = useRoute<Route>();
  const { bookingId } = route.params;
  const showToast = useToastStore((s) => s.showToast);

  const mapViewRef = useRef<MapView>(null);
  
  const [plumberCoords, setPlumberCoords] = useState(PLUMBER_START_COORDS);
  const [distance, setDistance] = useState(2.2); // km
  const [eta, setEta] = useState(12); // min
  const [speed, setSpeed] = useState(32); // km/h
  const [statusText, setStatusText] = useState('PLUMBER ON THE WAY');
  const [statusColor, setStatusColor] = useState('#4CAF50'); // green

  // Simulate plumber moving towards house
  useEffect(() => {
    let steps = 0;
    const maxSteps = 10;
    const interval = setInterval(() => {
      steps += 1;
      
      // Calculate linear interpolation coordinates
      const ratio = steps / maxSteps;
      const nextLat = PLUMBER_START_COORDS.latitude + (HOUSE_COORDS.latitude - PLUMBER_START_COORDS.latitude) * ratio;
      const nextLng = PLUMBER_START_COORDS.longitude + (HOUSE_COORDS.longitude - PLUMBER_START_COORDS.longitude) * ratio;
      
      setPlumberCoords({ latitude: nextLat, longitude: nextLng });
      
      // Reduce distance and ETA
      const nextDist = Math.max(0, 2.2 * (1 - ratio));
      setDistance(nextDist);

      const nextEta = Math.max(0, Math.ceil(12 * (1 - ratio)));
      setEta(nextEta);

      if (steps >= maxSteps) {
        clearInterval(interval);
        setStatusText('ARRIVED AT SITE');
        setStatusColor(THEME.colors.brass);
        setSpeed(0);
        showToast('Plumber has arrived at your address!', 'success');
      } else if (nextDist < 0.5) {
        setStatusText('PLUMBER NEARBY');
        setStatusColor('#FFB300'); // amber
        setSpeed(18);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Recenter map viewport when coordinates update
  useEffect(() => {
    if (mapViewRef.current) {
      mapViewRef.current.animateToRegion({
        latitude: (HOUSE_COORDS.latitude + plumberCoords.latitude) / 2,
        longitude: (HOUSE_COORDS.longitude + plumberCoords.longitude) / 2,
        latitudeDelta: Math.abs(HOUSE_COORDS.latitude - plumberCoords.latitude) * 1.5 || 0.015,
        longitudeDelta: Math.abs(HOUSE_COORDS.longitude - plumberCoords.longitude) * 1.5 || 0.015,
      }, 800);
    }
  }, [plumberCoords]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.background} barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={THEME.colors.graphite} />
        </Pressable>
        <Text style={styles.headerTitle}>Live Plumber Feed</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.container}>
        <MapView
          ref={mapViewRef}
          style={styles.map}
          initialRegion={{
            latitude: (HOUSE_COORDS.latitude + PLUMBER_START_COORDS.latitude) / 2,
            longitude: (HOUSE_COORDS.longitude + PLUMBER_START_COORDS.longitude) / 2,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          {/* House Marker */}
          <Marker
            coordinate={HOUSE_COORDS}
            title="Service Location"
            description="Your Home Address"
            pinColor={THEME.colors.brass}
          />

          {/* Plumber Motorbike Marker */}
          <Marker
            coordinate={plumberCoords}
            title="Plumber"
            description="Rajesh Kumar is arriving"
          >
            <View style={styles.plumberMarker}>
              <Icon name="motorbike" size={16} color="#FFF" />
            </View>
          </Marker>
        </MapView>

        {/* Telemetry Dashboard Overlay */}
        <View style={styles.dashboardContainer}>
          {/* Live indicator tag */}
          <View style={styles.liveStatusRow}>
            <View style={[styles.ledIndicator, { backgroundColor: statusColor }]} />
            <Text style={[styles.liveStatusText, { color: statusColor }]}>{statusText}</Text>
            <Text style={styles.bookingIdText}>ID: {bookingId}</Text>
          </View>

          {/* Core Metrics Row */}
          <Card style={styles.metricsCard} elevation="none">
            <View style={styles.grid}>
              <View style={styles.col}>
                <Text style={styles.metricLabel}>ETA TO SITE</Text>
                <Text style={styles.metricValue}>{eta > 0 ? `${eta} MIN` : 'ARRIVED'}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.col}>
                <Text style={styles.metricLabel}>DISTANCE</Text>
                <Text style={styles.metricValue}>{distance > 0.05 ? `${distance.toFixed(1)} KM` : 'AT DOOR'}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.col}>
                <Text style={styles.metricLabel}>BIKE SPEED</Text>
                <Text style={styles.metricValue}>{speed} KM/H</Text>
              </View>
            </View>
          </Card>

          {/* Plumber Contact Footer */}
          <Card style={styles.plumberCard} elevation="none">
            <View style={styles.techRow}>
              <View style={styles.techAvatar}>
                <Icon name="account-wrench" size={24} color={THEME.colors.brass} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.techName}>Rajesh Kumar</Text>
                <Text style={styles.techRating}>Rating 4.9 ★ Plumber Expert</Text>
              </View>
              <Pressable
                onPress={() => Alert.alert('Dialing Plumber', 'Connecting call to Rajesh Kumar at +91 98765 43210')}
                style={styles.callBtn}
              >
                <Icon name="phone" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.callBtnText}>CALL</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderColor: THEME.colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.graphite,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  container: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  plumberMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.brass,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  dashboardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: THEME.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: THEME.borderRadius.lg,
    borderTopRightRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.heavy,
  },
  liveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  ledIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  liveStatusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
  },
  bookingIdText: {
    fontSize: 8,
    fontFamily: THEME.typography.price.fontFamily,
    color: THEME.colors.textMuted,
    fontWeight: '700',
  },
  metricsCard: {
    padding: THEME.spacing.md,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: THEME.borderRadius.sm,
    marginBottom: THEME.spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 7,
    fontWeight: '800',
    color: '#888888',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  metricValue: {
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 13,
    fontWeight: '800',
    color: '#4CAF50',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#333333',
  },
  plumberCard: {
    padding: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  techAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F9F8F6',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  techName: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.graphite,
  },
  techRating: {
    fontSize: 9,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    height: 34,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.xs,
  },
  callBtnText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default TrackPlumberScreen;
