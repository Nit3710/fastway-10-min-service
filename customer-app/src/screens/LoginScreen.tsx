import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Animated,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import useAuthStore from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { apiLogin, apiSendOtp, apiVerifyOtp } from '../api/authApi';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import THEME from '../theme/theme';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiGoogleLogin } from '../api/authApi';
import GradientHeader from '../components/GradientHeader';
import BrandLogo from '../components/BrandLogo';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { setAuth } = useAuthStore();
  const { showToast } = useToastStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isOtpLoading, setIsOtpLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!phone) {
      setErrors({ phone: 'Phone number is required' });
      return;
    } else if (phone.length < 10) {
      setErrors({ phone: 'Enter a valid 10-digit phone number' });
      return;
    }
    setIsOtpLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      await apiSendOtp(formattedPhone);
      setOtpSent(true);
      showToast('OTP sent successfully. Check backend console logs!', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to send OTP';
      showToast(msg, 'error');
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      showToast('Please enter a 6-digit OTP code', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const response = await apiVerifyOtp(formattedPhone, otpCode);
      await setAuth(response.token, response.user, response.refreshToken);
      showToast('Logged in successfully', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Invalid OTP. Please try again.';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '343830613593-nsbh91tqb5r52d3bouom5iq59grrlq7r.apps.googleusercontent.com',
      offlineAccess: false,
    });
  }, []);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!phone) {
      newErrors.phone = 'Phone number is required';
    } else if (phone.length < 10) {
      newErrors.phone = 'Enter a valid 10-digit phone number';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const response = await apiLogin({ phone, password });
      await setAuth(response.token, response.user, response.refreshToken);
      showToast('Logged in successfully', 'success');
    } catch (err: any) {
      let msg = 'Invalid credentials. Please try again.';
      if (err.response && err.response.data && err.response.data.message) {
        msg = err.response.data.message;
      } else if (err.message) {
        msg = err.message;
      }
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      const idToken = (result as any).idToken || (result as any).data?.idToken;
      if (!idToken) throw new Error('Google did not return an ID token. Check Firebase/Google Console configuration.');
      const response = await apiGoogleLogin(idToken);
      await setAuth(response.token, response.user, response.refreshToken);
      showToast('Logged in with Google successfully', 'success');
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) return;
      const errorDetail = err.code ? `[Code: ${err.code}] ${err.message || ''}` : err.message;
      const msg = err.response?.data?.message || errorDetail || 'Google sign-in failed. Please check SHA-1 registration.';
      showToast(msg, 'error');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.background} barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[
              styles.container,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.header}>
              <BrandLogo size={64} style={{ marginBottom: THEME.spacing.md }} />
              <Text style={styles.title}>Welcome to Fastway</Text>
              <Text style={styles.subtitle}>Order building &amp; plumbing hardware in minutes</Text>
            </View>

            <Card style={styles.card} elevation="none">
              <Input
                label="PHONE NUMBER"
                placeholder="Enter 10-digit number"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                editable={!otpSent}
                onChangeText={(text: string) => {
                  setPhone(text);
                  if (errors.phone) setErrors({ ...errors, phone: undefined });
                }}
                error={errors.phone}
                icon="phone-outline"
              />

              {!isOtpMode ? (
                <>
                  <Input
                    label="PASSWORD"
                    placeholder="Enter password"
                    isPassword
                    value={password}
                    onChangeText={(text: string) => {
                      setPassword(text);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    error={errors.password}
                    icon="lock-outline"
                  />

                  <Button
                    title="Log In"
                    onPress={handleLogin}
                    isLoading={isLoading}
                    style={styles.button}
                  />
                </>
              ) : (
                <>
                  {otpSent && (
                    <Input
                      label="ENTER 6-DIGIT OTP"
                      placeholder="Enter OTP code"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otpCode}
                      onChangeText={(text: string) => setOtpCode(text)}
                      icon="lock-open-outline"
                    />
                  )}

                  {!otpSent ? (
                    <Button
                      title="Send OTP"
                      onPress={handleSendOtp}
                      isLoading={isOtpLoading}
                      style={styles.button}
                    />
                  ) : (
                    <>
                      <Button
                        title="Verify & Log In"
                        onPress={handleVerifyOtp}
                        isLoading={isLoading}
                        style={styles.button}
                      />
                      <Pressable
                        onPress={() => {
                          setOtpSent(false);
                          setOtpCode('');
                        }}
                        style={{ alignSelf: 'center', marginTop: 12 }}
                      >
                        <Text style={{ color: THEME.colors.primary, fontSize: 13, fontWeight: '600' }}>
                          Edit Phone Number / Resend
                        </Text>
                      </Pressable>
                    </>
                  )}
                </>
              )}

              <Pressable
                onPress={() => {
                  setIsOtpMode(!isOtpMode);
                  setOtpSent(false);
                  setOtpCode('');
                  setErrors({});
                }}
                style={{ alignSelf: 'center', marginVertical: 12 }}
              >
                <Text style={{ color: THEME.colors.primary, fontSize: 13, fontWeight: '700' }}>
                  {isOtpMode ? 'Use Password instead' : 'Login via OTP'}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleGoogleLogin}
                disabled={isGoogleLoading || isLoading || isOtpLoading}
                style={({ pressed }) => [
                  styles.googleButton,
                  pressed && styles.googlePressed
                ]}
              >
                <Image
                  source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/120px-Google_%22G%22_logo.svg.png' }}
                  style={{ width: 18, height: 18, marginRight: 8 }}
                  resizeMode="contain"
                />
                <Text style={styles.googleButtonText}>
                  {isGoogleLoading ? 'Signing in with Google...' : 'Continue with Google'}
                </Text>
              </Pressable>
            </Card>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Pressable onPress={() => navigation.navigate('Signup')} hitSlop={8}>
                <Text style={styles.footerLink}>Sign Up</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: THEME.spacing.lg,
  },
  container: {
    alignItems: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: THEME.spacing.xl,
  },
  logoTiny: {
    width: 64,
    height: 64,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
    ...THEME.shadows.medium,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  card: {
    width: '100%',
    padding: THEME.spacing.lg,
    borderWidth: 1,
  },
  button: {
    marginTop: THEME.spacing.md,
  },
  googleButton: {
    marginTop: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.surface,
    flexDirection: 'row',
    ...THEME.shadows.light,
  },
  googlePressed: {
    backgroundColor: THEME.colors.background,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: THEME.spacing.xl,
  },
  footerText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  footerLink: {
    fontSize: 13,
    color: THEME.colors.primary,
    fontWeight: '800',
  },
});

export default LoginScreen;
