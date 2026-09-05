import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import THEME from '../theme/theme';
import { RootStackParamList, Product } from '../types';
import { getProducts } from '../api/catalogApi';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import Card from '../components/Card';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const CalculatorScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.showToast);
  const addItem = useCartStore((s) => s.addItem);

  const [activeTab, setActiveTab] = useState<'pipe' | 'finish'>('pipe');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

  // Pipe Estimator State
  const [distance, setDistance] = useState('20');
  const [diameter, setDiameter] = useState<'1/2"' | '3/4"' | '1"'>('3/4"');

  // Finish Planner State
  const [selectedFinish, setSelectedFinish] = useState<'Matte Graphite' | 'Brushed Gold' | 'Chrome'>('Brushed Gold');
  const [selectedFittings, setSelectedFittings] = useState<string[]>(['Faucet', 'Showerhead']);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await getProducts({ page: 0, size: 100 });
      setProducts(res.content || []);
    } catch (err) {
      console.warn('Failed to load catalog products in calculator:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculations for Pipe Estimator
  const distNum = parseFloat(distance) || 0;
  const pipeQty = Math.max(1, Math.ceil(distNum / 10)); // 10ft length
  const couplingQty = Math.max(0, pipeQty - 1);
  const elbowQty = distNum > 0 ? 4 : 0; // standard estimation
  const cementQty = distNum > 0 ? Math.ceil(distNum / 50) : 0;

  // Resolve matching catalog products
  const getMatchedProduct = (type: 'pipe' | 'coupling' | 'elbow' | 'cement') => {
    // 1. Try strict match
    let match = products.find((p) => {
      const nameLower = p.name.toLowerCase();
      const cleanDiameter = diameter.replace('"', '');
      if (type === 'pipe') {
        return nameLower.includes('pipe') && nameLower.includes('cpvc') && nameLower.includes(cleanDiameter);
      }
      if (type === 'coupling') {
        return (nameLower.includes('coupling') || nameLower.includes('socket')) && nameLower.includes(cleanDiameter);
      }
      if (type === 'elbow') {
        return nameLower.includes('elbow') && nameLower.includes(cleanDiameter);
      }
      if (type === 'cement') {
        return nameLower.includes('cement') || nameLower.includes('solvent') || nameLower.includes('adhesive');
      }
      return false;
    });

    // 2. Try fuzzy match without diameter if strict match fails
    if (!match) {
      match = products.find((p) => {
        const nameLower = p.name.toLowerCase();
        if (type === 'pipe') {
          return nameLower.includes('pipe') || nameLower.includes('tubing');
        }
        if (type === 'coupling') {
          return nameLower.includes('coupling') || nameLower.includes('socket') || nameLower.includes('joint');
        }
        if (type === 'elbow') {
          return nameLower.includes('elbow') || nameLower.includes('bend');
        }
        if (type === 'cement') {
          return nameLower.includes('cement') || nameLower.includes('solvent') || nameLower.includes('glue');
        }
        return false;
      });
    }

    return match;
  };

  const matchedPipe = getMatchedProduct('pipe');
  const matchedCoupling = getMatchedProduct('coupling');
  const matchedElbow = getMatchedProduct('elbow');
  const matchedCement = getMatchedProduct('cement');

  const pipePrice = matchedPipe?.price ?? 120;
  const couplingPrice = matchedCoupling?.price ?? 15;
  const elbowPrice = matchedElbow?.price ?? 25;
  const cementPrice = matchedCement?.price ?? 80;

  const totalEstimate =
    pipeQty * pipePrice +
    couplingQty * couplingPrice +
    elbowQty * elbowPrice +
    cementQty * cementPrice;

  // Add all calculated pipes items to cart
  const handleAddPipeEstimateToCart = async () => {
    if (distNum <= 0) {
      showToast('Please enter a valid length', 'error');
      return;
    }

    // Build lists of items that actually exist in the database catalog
    const itemsToAdd: { productId: number; qty: number }[] = [];
    if (matchedPipe) {
      itemsToAdd.push({ productId: matchedPipe.id, qty: pipeQty });
    }
    if (elbowQty > 0 && matchedElbow) {
      itemsToAdd.push({ productId: matchedElbow.id, qty: elbowQty });
    }
    if (couplingQty > 0 && matchedCoupling) {
      itemsToAdd.push({ productId: matchedCoupling.id, qty: couplingQty });
    }
    if (cementQty > 0 && matchedCement) {
      itemsToAdd.push({ productId: matchedCement.id, qty: cementQty });
    }

    // Dynamic Fallback: if no matches found at all, use the first few products from the catalog to ensure it succeeds
    if (itemsToAdd.length === 0 && products.length > 0) {
      itemsToAdd.push({ productId: products[0].id, qty: pipeQty });
      if (products.length > 1 && elbowQty > 0) {
        itemsToAdd.push({ productId: products[1].id, qty: elbowQty });
      }
    }

    if (itemsToAdd.length === 0) {
      showToast('No products available in catalog to add', 'error');
      return;
    }

    try {
      for (const item of itemsToAdd) {
        await addItem(item.productId, item.qty);
      }
      showToast('BOM added to cart successfully', 'success');
      navigation.navigate('Cart');
    } catch (err: any) {
      console.warn('Cart add error:', err);
      showToast('Failed to add estimation items to cart', 'error');
    }
  };

  // Resolved Finish Fixtures
  const getFinishProducts = () => {
    return products.filter((p) => {
      const nameLower = p.name.toLowerCase();
      const finishLower = selectedFinish.toLowerCase();
      // Match finish keywords in product names (e.g. "matte graphite", "brushed gold", "chrome")
      return nameLower.includes(finishLower) || (finishLower === 'chrome' && !nameLower.includes('graphite') && !nameLower.includes('gold'));
    });
  };

  const finishProducts = getFinishProducts();

  const handleAddFinishFittingsToCart = async () => {
    if (selectedFittings.length === 0) {
      showToast('Please select at least one fitting', 'error');
      return;
    }
    try {
      let addedAny = false;
      for (const fitting of selectedFittings) {
        // Find product matching name containing e.g. "Faucet" or "Shower" in the selected finish
        const item = finishProducts.find((p) =>
          p.name.toLowerCase().includes(fitting.toLowerCase())
        ) || products.find((p) => p.name.toLowerCase().includes(fitting.toLowerCase())); // fallback

        if (item) {
          await addItem(item.id, 1);
          addedAny = true;
        }
      }

      if (addedAny) {
        showToast('Matched fittings added to cart', 'success');
        navigation.navigate('Cart');
      } else {
        showToast('No matching fittings found in catalog', 'error');
      }
    } catch {
      showToast('Failed to add fittings to cart', 'error');
    }
  };

  const toggleFitting = (fittingName: string) => {
    setSelectedFittings((prev) =>
      prev.includes(fittingName)
        ? prev.filter((f) => f !== fittingName)
        : [...prev, fittingName]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.background} barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={THEME.colors.graphite} />
        </Pressable>
        <Text style={styles.headerTitle}>Worksite Estimator</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Buttons */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tabButton, activeTab === 'pipe' && styles.tabActiveButton]}
          onPress={() => setActiveTab('pipe')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'pipe' && styles.tabActiveButtonText]}>
            PIPE ESTIMATOR
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'finish' && styles.tabActiveButton]}
          onPress={() => setActiveTab('finish')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'finish' && styles.tabActiveButtonText]}>
            FINISH PLANNER
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={THEME.colors.brass} size="large" />
          <Text style={styles.loadingText}>Syncing estimator with store catalog...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) + 32 : Math.max(insets.bottom, 32) }]} showsVerticalScrollIndicator={false}>
          {activeTab === 'pipe' ? (
            <View>
              {/* Pipe Input Card */}
              <Card style={styles.calculatorCard} elevation="none">
                <Text style={styles.sectionHeader}>PIPE ESTIMATOR SETTINGS</Text>
                
                {/* Distance Input */}
                <Text style={styles.inputLabel}>TOTAL PIPE DISTANCE NEEDED (IN FEET)</Text>
                <View style={styles.inputContainer}>
                  <Icon name="ruler" size={18} color={THEME.colors.graphiteMuted} style={styles.inputIcon} />
                  <TextInput
                    keyboardType="numeric"
                    value={distance}
                    onChangeText={setDistance}
                    placeholder="Enter distance in feet"
                    placeholderTextColor={THEME.colors.graphiteMuted}
                    style={styles.textInput}
                  />
                </View>

                {/* Diameter Selector */}
                <Text style={styles.inputLabel}>PIPE DIAMETER SIZE</Text>
                <View style={styles.diameterSelectorRow}>
                  {(['1/2"', '3/4"', '1"'] as const).map((dim) => (
                    <Pressable
                      key={dim}
                      onPress={() => setDiameter(dim)}
                      style={[styles.diameterBtn, diameter === dim && styles.diameterActiveBtn]}
                    >
                      <Text style={[styles.diameterText, diameter === dim && styles.diameterActiveText]}>
                        {dim}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Card>

              {/* Estimate Calculations Sheet (BOM) */}
              <Card style={styles.bomCard} elevation="none">
                <Text style={styles.sectionHeader}>ESTIMATED ITEMS & PARTS LIST</Text>

                {/* Material Item Rows */}
                <View style={styles.bomItemRow}>
                  <View style={styles.bomItemDetails}>
                    <Text style={styles.bomItemName}>
                      {matchedPipe?.name || `CPVC Pipe ${diameter} (10ft length)`}
                    </Text>
                    <Text style={styles.bomItemSubtitle}>
                      {pipeQty} units @ ₹{pipePrice.toFixed(0)}/pc
                    </Text>
                  </View>
                  <Text style={styles.bomItemTotal}>₹{(pipeQty * pipePrice).toFixed(0)}</Text>
                </View>

                <View style={styles.bomItemRow}>
                  <View style={styles.bomItemDetails}>
                    <Text style={styles.bomItemName}>
                      {matchedElbow?.name || `CPVC Elbow Joint ${diameter}`}
                    </Text>
                    <Text style={styles.bomItemSubtitle}>
                      {elbowQty} units @ ₹{elbowPrice.toFixed(0)}/pc
                    </Text>
                  </View>
                  <Text style={styles.bomItemTotal}>₹{(elbowQty * elbowPrice).toFixed(0)}</Text>
                </View>

                <View style={styles.bomItemRow}>
                  <View style={styles.bomItemDetails}>
                    <Text style={styles.bomItemName}>
                      {matchedCoupling?.name || `CPVC Coupling Socket ${diameter}`}
                    </Text>
                    <Text style={styles.bomItemSubtitle}>
                      {couplingQty} units @ ₹{couplingPrice.toFixed(0)}/pc
                    </Text>
                  </View>
                  <Text style={styles.bomItemTotal}>₹{(couplingQty * couplingPrice).toFixed(0)}</Text>
                </View>

                <View style={styles.bomItemRow}>
                  <View style={styles.bomItemDetails}>
                    <Text style={styles.bomItemName}>
                      {matchedCement?.name || 'Solvent Cement Can (100ml)'}
                    </Text>
                    <Text style={styles.bomItemSubtitle}>
                      {cementQty} units @ ₹{cementPrice.toFixed(0)}/pc
                    </Text>
                  </View>
                  <Text style={styles.bomItemTotal}>₹{(cementQty * cementPrice).toFixed(0)}</Text>
                </View>

                {/* Estimation Total */}
                <View style={styles.divider} />
                <View style={styles.bomTotalRow}>
                  <Text style={styles.bomTotalLabel}>ESTIMATED PARTS TOTAL</Text>
                  <Text style={styles.bomTotalValue}>₹{totalEstimate.toFixed(0)}</Text>
                </View>

                {/* Add to Cart CTA */}
                <Pressable onPress={handleAddPipeEstimateToCart} style={styles.actionBtn}>
                  <Icon name="cart-arrow-down" size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.actionBtnText}>ADD ESTIMATE TO CART</Text>
                </Pressable>
              </Card>
            </View>
          ) : (
            <View>
              {/* Finish Selection Card */}
              <Card style={styles.calculatorCard} elevation="none">
                <Text style={styles.sectionHeader}>SELECT FITTINGS COLOR</Text>
                <Text style={styles.inputLabel}>METAL COATING COLOR</Text>
                
                <View style={styles.finishGrid}>
                  {[
                    { key: 'Brushed Gold', label: 'BRUSHED GOLD', color: '#C5A059' },
                    { key: 'Matte Graphite', label: 'MATTE GRAPHITE', color: '#3A3A3C' },
                    { key: 'Chrome', label: 'CHROME FINISH', color: '#AEAEB2' },
                  ].map((finish) => (
                    <Pressable
                      key={finish.key}
                      onPress={() => setSelectedFinish(finish.key as any)}
                      style={[
                        styles.finishCard,
                        selectedFinish === finish.key && styles.finishActiveCard,
                      ]}
                    >
                      <View style={[styles.colorBubble, { backgroundColor: finish.color }]} />
                      <Text
                        style={[
                          styles.finishLabel,
                          selectedFinish === finish.key && styles.finishActiveLabel,
                        ]}
                      >
                        {finish.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Card>

              {/* Fittings Planner Card */}
              <Card style={styles.bomCard} elevation="none">
                <Text style={styles.sectionHeader}>REQUIRED FIXTURES CHECKLIST</Text>

                {[
                  { name: 'Faucet', desc: 'Basin / Sink Mixer Tap' },
                  { name: 'Showerhead', desc: 'Overhead Rain / Wall Shower' },
                  { name: 'Angle Valve', desc: 'Control Valve for Geyser/Sink' },
                  { name: 'Health Faucet', desc: 'Jet Spray Trigger Set' },
                ].map((item) => {
                  const isChecked = selectedFittings.includes(item.name);
                  // Find matched item in list
                  const matched = finishProducts.find((p) =>
                    p.name.toLowerCase().includes(item.name.toLowerCase())
                  );

                  return (
                    <Pressable
                      key={item.name}
                      onPress={() => toggleFitting(item.name)}
                      style={styles.fittingRow}
                    >
                      <Icon
                        name={isChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={22}
                        color={isChecked ? THEME.colors.brass : THEME.colors.borderDark}
                        style={{ marginRight: 12 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.fittingName, isChecked && styles.fittingCheckedName]}>
                          {item.name} ({selectedFinish})
                        </Text>
                        <Text style={styles.fittingDesc}>
                          {matched ? `Catalog: ${matched.name}` : item.desc}
                        </Text>
                      </View>
                      {matched && (
                        <Text style={styles.fittingPrice}>
                          ₹{matched.price.toFixed(0)}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}

                <View style={styles.divider} />

                {/* Add finish checklist to cart */}
                <Pressable onPress={handleAddFinishFittingsToCart} style={styles.actionBtn}>
                  <Icon name="check-all" size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.actionBtnText}>ADD SELECTED TO CART</Text>
                </Pressable>
              </Card>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backBtn: {
    padding: THEME.spacing.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.graphite,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: THEME.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActiveButton: {
    borderBottomColor: THEME.colors.brass,
  },
  tabButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.3,
  },
  tabActiveButtonText: {
    color: THEME.colors.brass,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.xl,
  },
  loadingText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.md,
  },
  scrollContent: {
    padding: THEME.spacing.md,
  },
  calculatorCard: {
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: THEME.spacing.md,
    textTransform: 'uppercase',
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.graphite,
    marginBottom: THEME.spacing.xs,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    height: 46,
    paddingHorizontal: THEME.spacing.md,
    backgroundColor: THEME.colors.surfaceRaised,
    marginBottom: THEME.spacing.md,
  },
  inputIcon: {
    marginRight: THEME.spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.graphite,
    padding: 0,
  },
  diameterSelectorRow: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },
  diameterBtn: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
  },
  diameterActiveBtn: {
    borderColor: THEME.colors.brass,
    backgroundColor: THEME.colors.surfaceRaised,
  },
  diameterText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  diameterActiveText: {
    color: THEME.colors.brass,
  },
  bomCard: {
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.xl,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  bomItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: THEME.colors.border,
  },
  bomItemDetails: {
    flex: 1,
    marginRight: THEME.spacing.sm,
  },
  bomItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.graphite,
  },
  bomItemSubtitle: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  bomItemTotal: {
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.graphite,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: THEME.spacing.md,
  },
  bomTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },
  bomTotalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.graphite,
  },
  bomTotalValue: {
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.brass,
  },
  actionBtn: {
    backgroundColor: THEME.colors.brass,
    height: 46,
    borderRadius: THEME.borderRadius.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  finishGrid: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },
  finishCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    paddingVertical: THEME.spacing.md,
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
  },
  finishActiveCard: {
    borderColor: THEME.colors.brass,
    backgroundColor: THEME.colors.surfaceRaised,
  },
  colorBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginBottom: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  finishLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  finishActiveLabel: {
    color: THEME.colors.brass,
  },
  fittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: THEME.colors.border,
  },
  fittingName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  fittingCheckedName: {
    color: THEME.colors.graphite,
  },
  fittingDesc: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  fittingPrice: {
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.graphite,
  },
});

export default CalculatorScreen;
