import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Share,
} from 'react-native';
import THEME from '../theme/theme';
import Card from './Card';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Button from './Button';
import { useToastStore } from '../store/toastStore';

export interface InvoiceData {
  invoiceNo: string;
  date: string;
  type: 'SERVICE' | 'ORDER';
  title: string;
  customerName?: string;
  customerAddress?: string;
  items: Array<{
    name: string;
    qty: number;
    price: number;
  }>;
  subtotal: number;
  taxOrDelivery: number;
  grandTotal: number;
  warrantyValidTill?: string;
}

interface InvoiceModalProps {
  visible: boolean;
  invoice: InvoiceData | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  visible,
  invoice,
  onClose,
}) => {
  const showToast = useToastStore((s) => s.showToast);

  if (!invoice) return null;

  const handleShareInvoice = async () => {
    try {
      const summaryText = `FASTWAY WORKSHOP DIGITAL INVOICE\nInvoice: #${invoice.invoiceNo}\nDate: ${invoice.date}\nType: ${invoice.type}\nItem: ${invoice.title}\nTotal Paid: ₹${invoice.grandTotal.toFixed(0)}\nIncludes 7-Day Free Repair Warranty Guarantee!`;
      await Share.share({
        message: summaryText,
        title: `Invoice ${invoice.invoiceNo}`,
      });
    } catch (err) {
      showToast('Failed to share invoice', 'error');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card style={styles.card} elevation="none">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <Icon name="wrench-clock" size={20} color={THEME.colors.brass} style={{ marginRight: 6 }} />
              <Text style={styles.logoText}>FASTWAY WORKSHOP</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="close" size={22} color={THEME.colors.graphite} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Invoice Badge & No */}
            <View style={styles.metaRow}>
              <View>
                <Text style={styles.invoiceLabel}>DIGITAL TAX INVOICE</Text>
                <Text style={styles.invoiceNo}>#{invoice.invoiceNo}</Text>
              </View>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{invoice.type}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Date & Customer Info */}
            <View style={styles.infoGrid}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>DATE OF ISSUANCE</Text>
                <Text style={styles.infoVal}>{invoice.date}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>PAYMENT STATUS</Text>
                <Text style={[styles.infoVal, { color: THEME.colors.success, fontWeight: '800' }]}>PAID & VERIFIED</Text>
              </View>
            </View>

            {/* Line Items Table */}
            <Text style={styles.tableTitle}>ITEMIZED SUMMARY</Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.thText, { flex: 2 }]}>DESCRIPTION</Text>
                <Text style={[styles.thText, { flex: 1, textAlign: 'center' }]}>QTY</Text>
                <Text style={[styles.thText, { flex: 1, textAlign: 'right' }]}>AMOUNT</Text>
              </View>
              {invoice.items.map((item, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tdText, { flex: 2 }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.tdText, { flex: 1, textAlign: 'center' }]}>{item.qty}</Text>
                  <Text style={[styles.tdAmount, { flex: 1, textAlign: 'right' }]}>₹{(item.price * item.qty).toFixed(0)}</Text>
                </View>
              ))}
            </View>

            {/* Totals */}
            <View style={styles.summaryBox}>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>Subtotal</Text>
                <Text style={styles.sumVal}>₹{invoice.subtotal.toFixed(0)}</Text>
              </View>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>{invoice.type === 'SERVICE' ? 'Inspection & Taxes' : 'Delivery & Taxes'}</Text>
                <Text style={styles.sumVal}>₹{invoice.taxOrDelivery.toFixed(0)}</Text>
              </View>
              <View style={[styles.divider, { marginVertical: 6 }]} />
              <View style={styles.sumRow}>
                <Text style={styles.grandTotalLabel}>TOTAL AMOUNT PAID</Text>
                <Text style={styles.grandTotalVal}>₹{invoice.grandTotal.toFixed(0)}</Text>
              </View>
            </View>

            {/* 7-DAY REPAIR GUARANTEE WARRANTY CARD */}
            <View style={styles.warrantyBox}>
              <View style={styles.warrantyHeaderRow}>
                <Icon name="shield-check" size={24} color="#FFF" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warrantyTitle}>7-DAY FREE REPAIR GUARANTEE</Text>
                  <Text style={styles.warrantySub}>Fastway Workshop Certified Quality Seal</Text>
                </View>
              </View>
              <Text style={styles.warrantyDesc}>
                If any leakage, fitting issue, or part malfunction recurs within 7 days of service/order, Fastway will re-visit & replace parts completely FREE of charge.
              </Text>
              {invoice.warrantyValidTill && (
                <Text style={styles.warrantyValidText}>Valid Till: {invoice.warrantyValidTill}</Text>
              )}
            </View>

            <View style={styles.actionBtnRow}>
              <Button
                title="SHARE INVOICE"
                onPress={handleShareInvoice}
                variant="outline"
                icon={<Icon name="share-variant" size={16} color={THEME.colors.graphite} />}
                style={styles.shareBtn}
              />
              <Button
                title="CLOSE"
                onPress={onClose}
                variant="primary"
                style={styles.closeBtn}
              />
            </View>
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: THEME.spacing.md,
  },
  card: {
    padding: THEME.spacing.md,
    backgroundColor: '#FFF',
    borderRadius: THEME.borderRadius.lg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingBottom: THEME.spacing.xs,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.graphite,
    letterSpacing: 0.8,
  },
  scrollContent: {
    paddingVertical: THEME.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: THEME.spacing.sm,
  },
  invoiceLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.graphiteMuted,
    letterSpacing: 0.5,
  },
  invoiceNo: {
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.graphite,
    marginTop: 2,
  },
  typeBadge: {
    backgroundColor: THEME.colors.brass,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.xs,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: THEME.spacing.sm,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.sm,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.3,
  },
  infoVal: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.graphite,
    marginTop: 2,
  },
  tableTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.graphiteMuted,
    letterSpacing: 0.5,
    marginTop: THEME.spacing.xs,
    marginBottom: 6,
  },
  table: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.xs,
    overflow: 'hidden',
    marginBottom: THEME.spacing.md,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF9F6',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  thText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.graphite,
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: THEME.colors.border,
  },
  tdText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.graphite,
  },
  tdAmount: {
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.graphite,
  },
  summaryBox: {
    backgroundColor: '#FAF9F6',
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.xs,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  sumLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  sumVal: {
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.graphite,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.graphite,
  },
  grandTotalVal: {
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.graphite,
  },
  warrantyBox: {
    backgroundColor: THEME.colors.graphite,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: THEME.spacing.md,
  },
  warrantyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  warrantyTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.brass,
    letterSpacing: 0.5,
  },
  warrantySub: {
    fontSize: 9,
    color: '#D1CDCA',
  },
  warrantyDesc: {
    fontSize: 10,
    color: '#EFECE6',
    lineHeight: 14,
    fontWeight: '500',
  },
  warrantyValidText: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.amber,
    marginTop: 6,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shareBtn: {
    flex: 1,
    height: 42,
  },
  closeBtn: {
    flex: 1,
    height: 42,
  },
});

export default InvoiceModal;
