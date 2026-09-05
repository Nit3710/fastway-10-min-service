import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  Modal,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import THEME from '../theme/theme';
import { RootStackParamList, Product } from '../types';
import { getProducts } from '../api/catalogApi';
import ProductCard from '../components/ProductCard';
import SkeletonBox from '../components/SkeletonBox';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import Card from '../components/Card';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const GridSkeleton = () => (
  <View style={{ flex: 1, margin: THEME.spacing.xs, maxWidth: '48%' }}>
    <SkeletonBox width="100%" height={120} borderRadius={THEME.borderRadius.md} />
    <SkeletonBox width="80%" height={12} style={{ marginTop: 8 }} />
    <SkeletonBox width="60%" height={12} style={{ marginTop: 6 }} />
  </View>
);

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  
  const showToast = useToastStore((s) => s.showToast);
  const addItem = useCartStore((s) => s.addItem);

  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // BOM Parser State
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [bomText, setBomText] = useState('');
  const [parsedResults, setParsedResults] = useState<{ product: Product; qty: number; selected: boolean }[]>([]);
  const [showParser, setShowParser] = useState(false);

  // Voice Modal State
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const handleVoiceChoice = (text: string) => {
    setBomText(text);
    setShowVoiceModal(false);
    showToast('Voice note transcribed successfully!', 'success');
  };

  useEffect(() => {
    if (showVoiceModal) {
      const timer = setTimeout(() => {
        handleVoiceChoice('3 CPVC Pipe 3/4 inch\n4 Elbow joints 3/4\n1 Solvent Cement Can');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showVoiceModal]);

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  // Pre-fetch all products for local BOM parser
  useEffect(() => {
    getProducts({ page: 0, size: 100 })
      .then((res) => setAllProducts(res.content || []))
      .catch((err) => console.warn('BOM Parser catalog pre-fetch failed:', err));
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setProducts([]);
      setLoading(false);
      setEmpty(false);
      return;
    }
    setLoading(true);
    setEmpty(false);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await getProducts({ search: query.trim(), page: 0, size: 30 });
        setProducts(data.content);
        setEmpty(data.content.length === 0);
      } catch {
        setProducts([]);
        setEmpty(false);
      } finally {
        setLoading(false);
      }
    }, 450);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // BOM Regex Fuzzy Parser
  const handleParseBOM = () => {
    Keyboard.dismiss();
    if (!bomText.trim()) {
      showToast('Please paste or write your list first', 'error');
      return;
    }
    const lines = bomText.split('\n');
    const results: typeof parsedResults = [];

    lines.forEach((line) => {
      if (!line.trim()) return;

      // Extract quantity e.g. "5 x elbow" or "10 CPVC pipes" or "faucet 2pcs"
      const qtyMatch = line.match(/(\d+)\s*(?:pcs|pc|x)?/i);
      const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;

      // Clean terms
      let term = line.replace(/(\d+)\s*(?:pcs|pc|x)?/i, '').trim();
      term = term.replace(/[,.-]/g, '').trim().toLowerCase();

      if (!term) return;

      // Split words to get match keywords
      const keywords = term.split(/\s+/).filter((k) => k.length > 2);

      let bestMatch: Product | null = null;
      let highestMatches = 0;

      allProducts.forEach((p) => {
        const nameLower = p.name.toLowerCase();
        let matches = 0;
        keywords.forEach((kw) => {
          if (nameLower.includes(kw)) matches++;
        });

        if (matches > highestMatches) {
          highestMatches = matches;
          bestMatch = p;
        }
      });

      if (bestMatch && highestMatches > 0) {
        results.push({ product: bestMatch, qty, selected: true });
      }
    });

    if (results.length === 0) {
      showToast('No matching items found in store catalog', 'error');
    } else {
      setParsedResults(results);
      showToast(`Parsed ${results.length} matching items`, 'success');
    }
  };

  const toggleParsedItem = (idx: number) => {
    setParsedResults((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleAddParsedToCart = async () => {
    const selectedItems = parsedResults.filter((r) => r.selected);
    if (selectedItems.length === 0) {
      showToast('No items selected', 'error');
      return;
    }
    try {
      for (const item of selectedItems) {
        await addItem(item.product.id, item.qty);
      }
      showToast(`${selectedItems.length} items added to cart`, 'success');
      setShowParser(false);
      setBomText('');
      setParsedResults([]);
      navigation.navigate('Cart');
    } catch {
      showToast('Failed to add list to cart', 'error');
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      onPress={() =>
        navigation.navigate('ProductDetail', {
          productId: item.id,
          productName: item.name,
        })
      }
    />
  );

  return (
    <View style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.background} barStyle="dark-content" />

      {/* Flat Header */}
      <View style={[styles.flatHeader, { paddingTop: insets.top + THEME.spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={THEME.colors.graphite} />
        </Pressable>
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color={THEME.colors.graphiteMuted} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search products, brands..."
            placeholderTextColor={THEME.colors.graphiteMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} style={styles.clearBtnInside} hitSlop={8}>
              <Icon name="close-circle" size={18} color={THEME.colors.graphiteMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Content */}
      {!query.trim() ? (
        <ScrollView contentContainerStyle={styles.centerScroll} keyboardShouldPersistTaps="handled">
          {!showParser ? (
            <View style={styles.hintContainer}>
              <View style={styles.hintIconBox}>
                <Icon name="magnify" size={40} color={THEME.colors.brass} />
              </View>
              <Text style={styles.hintText}>Search by entering query terms above</Text>
              
              <View style={styles.hintDivider}>
                <View style={styles.line} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.line} />
              </View>

              {/* Smart BOM Box Trigger */}
              <Card style={styles.bomTriggerCard} elevation="none">
                <Icon name="file-document-edit-outline" size={24} color={THEME.colors.brass} style={{ marginBottom: 8 }} />
                <Text style={styles.bomTitle}>PASTE PLUMBER'S SHOPPING LIST</Text>
                <Text style={styles.bomDesc}>
                  Have a list of items written on paper by your plumber? Just paste it here to find and add all items to your cart instantly.
                </Text>
                <Pressable onPress={() => setShowParser(true)} style={styles.bomBtn}>
                  <Text style={styles.bomBtnText}>OPEN PAPER LIST READER</Text>
                </Pressable>
              </Card>
            </View>
          ) : (
            <View style={styles.parserContainer}>
              <View style={styles.parserHeader}>
                <Text style={styles.parserTitle}>PAPER LIST SCANNER</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Pressable onPress={() => setShowVoiceModal(true)} style={styles.voiceMicroBtn} hitSlop={12}>
                    <Icon name="microphone" size={20} color={THEME.colors.brass} />
                  </Pressable>
                  <View style={{ width: 12 }} />
                  <Pressable onPress={() => { setShowParser(false); setParsedResults([]); }} hitSlop={12}>
                    <Icon name="close" size={20} color={THEME.colors.graphite} />
                  </Pressable>
                </View>
              </View>

              <Text style={styles.inputLabel}>PASTE LIST BELOW (QUANTITY ITEM_NAME)</Text>
              <TextInput
                multiline
                numberOfLines={5}
                value={bomText}
                onChangeText={setBomText}
                placeholder={`Example:\n5 CPVC Pipe 3/4 inch\n4 Elbow joints\n1 Faucet Mixer Brushed Gold`}
                placeholderTextColor={THEME.colors.graphiteMuted}
                style={styles.bomTextInput}
              />

              <Pressable onPress={handleParseBOM} style={styles.parseActionBtn}>
                <Icon name="text-search" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.parseActionBtnText}>FIND MATCHING ITEMS</Text>
              </Pressable>

              {/* Parsed Matches List */}
              {parsedResults.length > 0 && (
                <View style={styles.resultsWrapper}>
                  <Text style={styles.resultsHeader}>ITEMS MATCHED IN STORE</Text>
                  {parsedResults.map((item, idx) => (
                    <Pressable
                      key={`${item.product.id}-${idx}`}
                      onPress={() => toggleParsedItem(idx)}
                      style={styles.resultRow}
                    >
                      <Icon
                        name={item.selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={20}
                        color={item.selected ? THEME.colors.brass : THEME.colors.borderDark}
                        style={{ marginRight: 10 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultName} numberOfLines={1}>{item.product.name}</Text>
                        <Text style={styles.resultSubtitle}>
                          Qty: {item.qty} × <Text style={styles.priceText}>₹{item.product.price.toFixed(0)}</Text>
                        </Text>
                      </View>
                    </Pressable>
                  ))}

                  <Pressable onPress={handleAddParsedToCart} style={styles.cartActionBtn}>
                    <Icon name="cart-arrow-down" size={18} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.cartActionBtnText}>ADD MATCHED ITEMS TO CART</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      ) : loading ? (
        <FlatList<number>
          data={[1, 2, 3, 4, 5, 6]}
          numColumns={2}
          keyExtractor={(i) => String(i)}
          renderItem={() => <GridSkeleton />}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
        />
      ) : empty ? (
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={32} color={THEME.colors.graphiteMuted} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyMessage}>No results found for "{query}"</Text>
        </View>
      ) : (
        <FlatList<Product>
          data={products}
          numColumns={2}
          keyExtractor={(p) => String(p.id)}
          renderItem={renderProduct}
          contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) + 32 : Math.max(insets.bottom, 32) }]}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}

      {/* Voice Note Simulation Modal */}
      <Modal
        visible={showVoiceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVoiceModal(false)}
      >
        <View style={styles.voiceModalBackdrop}>
          <Card style={styles.voiceModalCard} elevation="none">
            <Text style={styles.voiceModalTitle}>LISTENING TO PLUMBER'S VOICE...</Text>
            
            {/* Pulsing soundwave simulation */}
            <View style={styles.soundwaveContainer}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((val) => (
                <View
                  key={val}
                  style={[
                    styles.soundwaveBar,
                    {
                      height: val % 3 === 0 ? 32 : val % 2 === 0 ? 18 : 45,
                    },
                  ]}
                />
              ))}
            </View>

            <Text style={styles.voiceModalSubtitle}>
              Speak your materials order now (e.g. "5 CPVC pipes, 4 elbows")
            </Text>

            {/* Selection options to test different voices */}
            <Text style={styles.voiceSelectLabel}>OR CHOOSE A DEMO VOICE RECORDING:</Text>
            <View style={styles.voiceOptionList}>
              <Pressable
                onPress={() => handleVoiceChoice('5 CPVC Pipe 3/4 inch\n2 Elbow joints 3/4 inch\n1 Solvent Cement Can')}
                style={styles.voiceOptionBtn}
              >
                <Icon name="account-voice" size={16} color={THEME.colors.graphite} style={{ marginRight: 6 }} />
                <Text style={styles.voiceOptionText}>"5 Pipes, 2 Elbows, 1 Glue"</Text>
              </Pressable>
              <Pressable
                onPress={() => handleVoiceChoice('2 Faucet Mixer Brushed Gold\n2 Angle Valve Brushed Gold')}
                style={styles.voiceOptionBtn}
              >
                <Icon name="account-voice" size={16} color={THEME.colors.graphite} style={{ marginRight: 6 }} />
                <Text style={styles.voiceOptionText}>"Brushed Gold Mixer and Taps"</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.colors.background },
  flatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingBottom: THEME.spacing.sm,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backBtn: {
    padding: THEME.spacing.xs,
    marginRight: THEME.spacing.xs,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    height: 40,
    paddingHorizontal: THEME.spacing.sm,
  },
  searchIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: THEME.colors.graphite,
    paddingVertical: 0,
    fontWeight: '600',
  },
  clearBtnInside: {
    padding: 4,
  },
  centerScroll: {
    padding: THEME.spacing.md,
    flexGrow: 1,
  },
  hintContainer: {
    alignItems: 'center',
    paddingTop: THEME.spacing.xl,
  },
  hintIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    marginBottom: THEME.spacing.md,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  hintDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginVertical: THEME.spacing.xl,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.colors.border,
  },
  orText: {
    marginHorizontal: THEME.spacing.md,
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.graphiteMuted,
  },
  bomTriggerCard: {
    width: '100%',
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
  },
  bomTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.graphite,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bomDesc: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: THEME.spacing.md,
  },
  bomBtn: {
    backgroundColor: THEME.colors.brass,
    paddingHorizontal: THEME.spacing.md,
    height: 38,
    borderRadius: THEME.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  bomBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  parserContainer: {
    width: '100%',
  },
  parserHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  parserTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.graphite,
    letterSpacing: 0.5,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.graphite,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  bomTextInput: {
    width: '100%',
    height: 110,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.surfaceRaised,
    padding: THEME.spacing.md,
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.graphite,
    textAlignVertical: 'top',
    marginBottom: THEME.spacing.md,
  },
  parseActionBtn: {
    backgroundColor: THEME.colors.graphite,
    height: 44,
    borderRadius: THEME.borderRadius.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },
  parseActionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resultsWrapper: {
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: THEME.spacing.md,
  },
  resultsHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.sm,
    letterSpacing: 0.3,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: THEME.colors.border,
  },
  resultName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.graphite,
  },
  resultSubtitle: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  priceText: {
    fontFamily: THEME.typography.price.fontFamily,
    fontWeight: '700',
  },
  cartActionBtn: {
    backgroundColor: THEME.colors.brass,
    height: 46,
    borderRadius: THEME.borderRadius.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.xl,
  },
  cartActionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  listContent: { padding: THEME.spacing.sm, paddingBottom: THEME.spacing.xl },
  columnWrapper: { justifyContent: 'space-between' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: THEME.spacing.xl },
  emptyMessage: { ...THEME.typography.body, color: THEME.colors.textSecondary, textAlign: 'center' },
  voiceMicroBtn: {
    padding: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: THEME.spacing.lg,
  },
  voiceModalCard: {
    padding: THEME.spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    backgroundColor: '#FFF',
  },
  voiceModalTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.graphite,
    letterSpacing: 0.5,
    marginBottom: THEME.spacing.lg,
  },
  soundwaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    gap: 6,
    marginBottom: THEME.spacing.lg,
  },
  soundwaveBar: {
    width: 6,
    backgroundColor: THEME.colors.brass,
    borderRadius: 3,
  },
  voiceModalSubtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: THEME.spacing.xl,
  },
  voiceSelectLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: THEME.spacing.sm,
  },
  voiceOptionList: {
    width: '100%',
    gap: THEME.spacing.sm,
  },
  voiceOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: '#FAF9F6',
  },
  voiceOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.graphite,
  },
});

export default SearchScreen;
