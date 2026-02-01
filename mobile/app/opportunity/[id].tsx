/**
 * Opportunity Detail Screen
 * Displays comprehensive opportunity information matching desktop version
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { get } from '../../lib/api';
import { Card, StatusBadge, OutcomeBadge } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { EntityTypeLabels, LoanTypeLabels, AssetTypeLabels } from '../../types';

type Tab = 'overview' | 'notes' | 'history';

interface Note {
  _id: string;
  content: string;
  created_by_name?: string;
  created_at: string;
  is_public?: number;
}

interface OpportunityData {
  id: string;
  opportunity_id: string;
  status: string;
  created_at: string;
  updated_at?: string;

  // Client details (flattened from API)
  client_entity_name?: string;
  client_contact_name?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  client_mobile?: string;
  client_email?: string;
  client_abn?: string;
  client_address?: string;
  client_industry?: string;
  client_time_in_business?: string;
  entity_type?: number;

  // Loan details
  loan_amount?: number;
  property_value?: number;
  estimated_property_value?: number;
  loan_type?: string;
  loan_purpose?: string;
  asset_type?: string;
  asset_address?: string;
  lender?: string;

  // Financial details
  net_profit?: number;
  ammortisation?: number;
  deprecition?: number;
  existing_interest_costs?: number;
  rental_expense?: number;
  proposed_rental_income?: number;
  rental_income?: string;
  existing_liabilities?: number;
  additional_property?: number;
  smsf_structure?: number;
  ato_liabilities?: number;
  credit_file_issues?: number;

  // Calculations
  icr?: number;
  lvr?: number;
  outcome_level?: number;

  // Other
  brief_overview?: string;
  additional_notes?: string;
  external_ref?: string;
  referrer_group?: string;
  created_by_name?: string;
  target_settlement_date?: string;
  date_settled?: string;

  // Unqualified
  is_unqualified?: number;
  unqualified_reason?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Status steps for progress indicator
const STATUS_STEPS = [
  { key: 'opportunity', label: 'Opportunity' },
  { key: 'application_created', label: 'Application' },
  { key: 'application_submitted', label: 'Submitted' },
  { key: 'conditionally_approved', label: 'Conditional' },
  { key: 'approved', label: 'Approved' },
  { key: 'settled', label: 'Settled' },
];

export default function OpportunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [opportunity, setOpportunity] = useState<OpportunityData | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch opportunity
  const fetchOpportunity = useCallback(async () => {
    if (!id) return;
    try {
      const data = await get<OpportunityData>(`/referrer/opportunities/${id}`);
      setOpportunity(data);
    } catch (error) {
      console.error('Failed to fetch opportunity:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    if (!id) return;
    try {
      const data = await get<{ notes: Note[] }>(`/referrer/opportunities/${id}/notes`);
      setNotes(data.notes || []);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchOpportunity();
    fetchNotes();
  }, [fetchOpportunity, fetchNotes]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOpportunity();
    fetchNotes();
  }, [fetchOpportunity, fetchNotes]);

  // Format currency
  const formatCurrency = (value?: number) => {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value?: number) => {
    if (value === undefined || value === null) return '-';
    return `${value.toFixed(2)}%`;
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format datetime
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get yes/no value
  const getYesNo = (value?: number) => {
    if (value === 1) return 'Yes';
    if (value === 0) return 'No';
    return '-';
  };

  // Get current status index for progress
  const getCurrentStatusIndex = () => {
    if (!opportunity) return 0;
    const index = STATUS_STEPS.findIndex(s => s.key === opportunity.status);
    return index >= 0 ? index : 0;
  };

  // Detail row component
  const DetailRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight && styles.detailValueHighlight]}>{value || '-'}</Text>
    </View>
  );

  // Section header component
  const SectionHeader = ({ icon, title }: { icon: string; title: string }) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={20} color={Colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  if (isLoading || !opportunity) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const currentStatusIndex = getCurrentStatusIndex();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.dealId}>{opportunity.opportunity_id}</Text>
            <Text style={styles.entityName}>
              {opportunity.client_entity_name || 'Unknown Client'}
            </Text>
          </View>
          <StatusBadge status={opportunity.status as any} />
        </View>

        {/* Quick Info Row */}
        <View style={styles.quickInfoRow}>
          <View style={styles.quickInfoItem}>
            <Text style={styles.quickInfoLabel}>Loan Amount</Text>
            <Text style={styles.quickInfoValue}>{formatCurrency(opportunity.loan_amount)}</Text>
          </View>
          <View style={styles.quickInfoItem}>
            <Text style={styles.quickInfoLabel}>LVR</Text>
            <Text style={styles.quickInfoValue}>{formatPercent(opportunity.lvr)}</Text>
          </View>
          <View style={styles.quickInfoItem}>
            <Text style={styles.quickInfoLabel}>ICR</Text>
            <Text style={styles.quickInfoValue}>{formatPercent(opportunity.icr)}</Text>
          </View>
          {opportunity.outcome_level && (
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoLabel}>Outcome</Text>
              <OutcomeBadge level={opportunity.outcome_level as 1 | 2 | 3} />
            </View>
          )}
        </View>
      </View>

      {/* Application Progress */}
      {opportunity.status !== 'draft' && (
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Application Progress</Text>
          <View style={styles.progressContainer}>
            {STATUS_STEPS.map((step, index) => (
              <View key={step.key} style={styles.progressStep}>
                <View style={[
                  styles.progressDot,
                  index <= currentStatusIndex && styles.progressDotActive,
                  index === currentStatusIndex && styles.progressDotCurrent,
                ]}>
                  {index < currentStatusIndex && (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  )}
                </View>
                <Text style={[
                  styles.progressLabel,
                  index <= currentStatusIndex && styles.progressLabelActive,
                ]}>{step.label}</Text>
                {index < STATUS_STEPS.length - 1 && (
                  <View style={[
                    styles.progressLine,
                    index < currentStatusIndex && styles.progressLineActive,
                  ]} />
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notes' && styles.tabActive]}
          onPress={() => setActiveTab('notes')}
        >
          <Text style={[styles.tabText, activeTab === 'notes' && styles.tabTextActive]}>
            Notes ({notes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'overview' && (
        <>
          {/* Unqualified Banner */}
          {opportunity.is_unqualified === 1 && (
            <View style={styles.unqualifiedBanner}>
              <Ionicons name="warning-outline" size={20} color={Colors.warning} />
              <View style={styles.unqualifiedContent}>
                <Text style={styles.unqualifiedTitle}>Unqualified Opportunity</Text>
                <Text style={styles.unqualifiedReason}>
                  {opportunity.unqualified_reason || 'No reason provided'}
                </Text>
              </View>
            </View>
          )}

          {/* Dates Section */}
          <Card>
            <SectionHeader icon="calendar-outline" title="Key Dates" />
            <DetailRow label="Date Created" value={formatDate(opportunity.created_at)} />
            <DetailRow label="Target Settlement" value={formatDate(opportunity.target_settlement_date)} />
            {opportunity.date_settled && (
              <DetailRow label="Date Settled" value={formatDate(opportunity.date_settled)} highlight />
            )}
            <DetailRow label="Last Updated" value={formatDateTime(opportunity.updated_at)} />
          </Card>

          {/* Client Details */}
          <Card>
            <SectionHeader icon="person-outline" title="Client Details" />
            <DetailRow label="Entity Name" value={opportunity.client_entity_name || '-'} />
            <DetailRow
              label="Entity Type"
              value={opportunity.entity_type ? EntityTypeLabels[opportunity.entity_type as 1|2|3|4|5|6] : '-'}
            />
            <DetailRow label="Contact Name" value={opportunity.client_contact_name || `${opportunity.contact_first_name || ''} ${opportunity.contact_last_name || ''}`.trim() || '-'} />
            <DetailRow label="Email" value={opportunity.client_email || '-'} />
            <DetailRow label="Mobile" value={opportunity.client_mobile || '-'} />
            <DetailRow label="ABN" value={opportunity.client_abn || '-'} />
            <DetailRow label="Industry" value={opportunity.client_industry || '-'} />
            <DetailRow label="Time in Business" value={opportunity.client_time_in_business || '-'} />
            <DetailRow label="Address" value={opportunity.client_address || '-'} />
          </Card>

          {/* Loan Details */}
          <Card>
            <SectionHeader icon="cash-outline" title="Loan Details" />
            <DetailRow label="Loan Amount" value={formatCurrency(opportunity.loan_amount)} highlight />
            <DetailRow label="Property Value" value={formatCurrency(opportunity.property_value || opportunity.estimated_property_value)} />
            <DetailRow label="Loan Type" value={opportunity.loan_type ? LoanTypeLabels[opportunity.loan_type as keyof typeof LoanTypeLabels] : '-'} />
            <DetailRow label="Loan Purpose" value={opportunity.loan_purpose || '-'} />
            <DetailRow label="Asset Type" value={opportunity.asset_type ? AssetTypeLabels[opportunity.asset_type as keyof typeof AssetTypeLabels] : '-'} />
            <DetailRow label="Asset Address" value={opportunity.asset_address || '-'} />
            {opportunity.lender && <DetailRow label="Lender" value={opportunity.lender} />}
            {opportunity.external_ref && <DetailRow label="External Ref" value={opportunity.external_ref} />}
          </Card>

          {/* Financial Details */}
          <Card>
            <SectionHeader icon="calculator-outline" title="Financial Details" />

            {/* ICR/LVR Summary */}
            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>ICR</Text>
                <Text style={[styles.metricValue, { color: (opportunity.icr || 0) >= 2 ? Colors.success : Colors.error }]}>
                  {formatPercent(opportunity.icr)}
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>LVR</Text>
                <Text style={[styles.metricValue, { color: (opportunity.lvr || 0) <= 65 ? Colors.success : (opportunity.lvr || 0) <= 80 ? Colors.warning : Colors.error }]}>
                  {formatPercent(opportunity.lvr)}
                </Text>
              </View>
              {opportunity.outcome_level && (
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Outcome</Text>
                  <OutcomeBadge level={opportunity.outcome_level as 1 | 2 | 3} />
                </View>
              )}
            </View>

            <View style={styles.divider} />

            {/* Income Details */}
            <Text style={styles.subSectionTitle}>Income</Text>
            <DetailRow label="Net Profit Before Tax" value={formatCurrency(opportunity.net_profit)} />
            <DetailRow label="Amortisation" value={formatCurrency(opportunity.ammortisation)} />
            <DetailRow label="Depreciation" value={formatCurrency(opportunity.deprecition)} />
            <DetailRow label="Existing Interest Costs" value={formatCurrency(opportunity.existing_interest_costs)} />
            <DetailRow label="Rental Expense" value={formatCurrency(opportunity.rental_expense)} />
            <DetailRow label="Funded from Rental" value={opportunity.rental_income || '-'} />
            <DetailRow label="Proposed Rental Income" value={formatCurrency(opportunity.proposed_rental_income)} />

            <View style={styles.divider} />

            {/* Risk Indicators */}
            <Text style={styles.subSectionTitle}>Risk Indicators</Text>
            <DetailRow label="Existing Liabilities" value={getYesNo(opportunity.existing_liabilities)} />
            <DetailRow label="Additional Security" value={getYesNo(opportunity.additional_property)} />
            <DetailRow label="SMSF Structure" value={getYesNo(opportunity.smsf_structure)} />
            <DetailRow label="ATO Liabilities" value={getYesNo(opportunity.ato_liabilities)} />
            <DetailRow label="Credit Issues" value={getYesNo(opportunity.credit_file_issues)} />
          </Card>

          {/* Additional Info */}
          {(opportunity.brief_overview || opportunity.additional_notes) && (
            <Card>
              <SectionHeader icon="document-text-outline" title="Additional Information" />
              {opportunity.brief_overview && (
                <>
                  <Text style={styles.subSectionTitle}>Brief Overview</Text>
                  <Text style={styles.overviewText}>{opportunity.brief_overview}</Text>
                </>
              )}
              {opportunity.additional_notes && (
                <>
                  <Text style={styles.subSectionTitle}>Additional Notes</Text>
                  <Text style={styles.overviewText}>{opportunity.additional_notes}</Text>
                </>
              )}
            </Card>
          )}

          {/* Referrer Info */}
          <Card>
            <SectionHeader icon="business-outline" title="Referrer Information" />
            <DetailRow label="Referrer Group" value={opportunity.referrer_group || '-'} />
            <DetailRow label="Submitted By" value={opportunity.created_by_name || '-'} />
          </Card>
        </>
      )}

      {activeTab === 'notes' && (
        <Card>
          <View style={styles.notesHeader}>
            <Text style={styles.notesTitle}>Notes</Text>
            <TouchableOpacity style={styles.addNoteButton}>
              <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {notes.length > 0 ? (
            notes.map((note) => (
              <View key={note._id} style={styles.noteItem}>
                <View style={styles.noteHeader}>
                  <Text style={styles.noteAuthor}>{note.created_by_name || 'Unknown'}</Text>
                  <Text style={styles.noteDate}>{formatDateTime(note.created_at)}</Text>
                </View>
                <Text style={styles.noteContent}>{note.content}</Text>
                {note.is_public === 1 && (
                  <View style={styles.publicBadge}>
                    <Ionicons name="globe-outline" size={12} color={Colors.primary} />
                    <Text style={styles.publicText}>Public</Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={48} color={Colors.gray[300]} />
              <Text style={styles.emptyText}>No notes yet</Text>
            </View>
          )}
        </Card>
      )}

      {activeTab === 'history' && (
        <Card>
          <Text style={styles.notesTitle}>Activity History</Text>
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color={Colors.gray[300]} />
            <Text style={styles.emptyText}>History will appear here</Text>
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header Card
  headerCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dealId: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.gray[500],
    marginBottom: 4,
  },
  entityName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.teal,
  },
  quickInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  quickInfoItem: {
    alignItems: 'center',
  },
  quickInfoLabel: {
    fontSize: 11,
    color: Colors.gray[500],
    marginBottom: 4,
  },
  quickInfoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gray[900],
  },

  // Progress Card
  progressCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressDotActive: {
    backgroundColor: Colors.success,
  },
  progressDotCurrent: {
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: `${Colors.primary}30`,
  },
  progressLabel: {
    fontSize: 9,
    color: Colors.gray[400],
    textAlign: 'center',
  },
  progressLabelActive: {
    color: Colors.gray[700],
    fontWeight: '500',
  },
  progressLine: {
    position: 'absolute',
    top: 12,
    left: '60%',
    right: '-40%',
    height: 2,
    backgroundColor: Colors.gray[200],
  },
  progressLineActive: {
    backgroundColor: Colors.success,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.gray[100],
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.white,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[500],
  },
  tabTextActive: {
    color: Colors.teal,
  },

  // Sections
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray[600],
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Detail Rows
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.gray[500],
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[900],
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  detailValueHighlight: {
    color: Colors.success,
    fontWeight: '700',
  },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  metricBox: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.gray[500],
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },

  // Unqualified Banner
  unqualifiedBanner: {
    flexDirection: 'row',
    backgroundColor: `${Colors.warning}15`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  unqualifiedContent: {
    flex: 1,
  },
  unqualifiedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warning,
  },
  unqualifiedReason: {
    fontSize: 13,
    color: Colors.gray[600],
    marginTop: 4,
  },

  // Overview Text
  overviewText: {
    fontSize: 14,
    color: Colors.gray[700],
    lineHeight: 20,
    marginBottom: 12,
  },

  // Notes
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  addNoteButton: {
    padding: 4,
  },
  noteItem: {
    backgroundColor: Colors.gray[50],
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  noteAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray[800],
  },
  noteDate: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  noteContent: {
    fontSize: 14,
    color: Colors.gray[700],
    lineHeight: 20,
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  publicText: {
    fontSize: 11,
    color: Colors.primary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray[400],
    marginTop: 12,
  },
});
