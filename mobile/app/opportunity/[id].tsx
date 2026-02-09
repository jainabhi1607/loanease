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
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { get, post, patch, del } from '../../lib/api';
import { Card, StatusBadge, OutcomeBadge } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { LoanTypeLabels, AssetTypeLabels } from '../../types';

const EntityTypeStringLabels: { [key: string]: string } = {
  'private_company': 'Private Company',
  'sole_trader': 'Sole Trader',
  'smsf_trust': 'SMSF Trust',
  'trust': 'Trust',
  'partnership': 'Partnership',
  'individual': 'Individual',
  '1': 'Private Company',
  '2': 'Sole Trader',
  '3': 'SMSF Trust',
  '4': 'Trust',
  '5': 'Partnership',
  '6': 'Individual',
};
import { useAuthStore } from '../../store/auth';

type Tab = 'overview' | 'notes' | 'history';

interface HistoryEntry {
  id: string;
  date: string;
  time: string;
  action: string;
  description: string;
  user_name: string;
}

interface Note {
  id: string;
  content: string;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  is_public?: boolean;
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
  additional_security?: number;
  additional_property?: number;
  smsf_structure?: number;
  ato_liabilities?: number;
  credit_issues?: number;
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
  created_by?: string;
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
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Notes CRUD state
  const [newNoteText, setNewNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');

  // External Ref & Team Member edit state
  const [externalRefModalVisible, setExternalRefModalVisible] = useState(false);
  const [externalRefValue, setExternalRefValue] = useState('');
  const [teamMemberModalVisible, setTeamMemberModalVisible] = useState(false);
  const [referrerUsers, setReferrerUsers] = useState<{ id: string; first_name: string; surname: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSavingField, setIsSavingField] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const user = useAuthStore((state) => state.user);

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
      const data = await get<Note[]>(`/referrer/opportunities/${id}/notes`);
      setNotes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    }
  }, [id]);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    if (!id) return;
    try {
      const data = await get<{ history: HistoryEntry[] }>(`/referrer/opportunities/${id}/history`);
      setHistory(data.history || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchOpportunity();
    fetchNotes();
    fetchHistory();
  }, [fetchOpportunity, fetchNotes, fetchHistory]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOpportunity();
    fetchNotes();
    fetchHistory();
  }, [fetchOpportunity, fetchNotes, fetchHistory]);

  // Fetch referrer users for team member dropdown
  const fetchReferrerUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const data = await get<{ users: { id: string; first_name: string; surname: string }[]; currentUserId: string }>('/referrer/users');
      setReferrerUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch referrer users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // Open External Ref modal
  const openExternalRefModal = () => {
    setExternalRefValue(opportunity?.external_ref || '');
    setExternalRefModalVisible(true);
  };

  // Save External Ref
  const handleSaveExternalRef = async () => {
    if (!id) return;
    setIsSavingField(true);
    try {
      await patch(`/referrer/opportunities/${id}`, { external_ref: externalRefValue });
      setExternalRefModalVisible(false);
      fetchOpportunity();
    } catch (error) {
      Alert.alert('Error', 'Failed to update external reference');
    } finally {
      setIsSavingField(false);
    }
  };

  // Open Team Member modal
  const openTeamMemberModal = () => {
    fetchReferrerUsers();
    setSelectedUserId(opportunity?.created_by || '');
    setDropdownOpen(false);
    setTeamMemberModalVisible(true);
  };

  // Save Team Member
  const handleSaveTeamMember = async () => {
    if (!id || !selectedUserId) {
      Alert.alert('Error', 'Please select a team member');
      return;
    }
    setIsSavingField(true);
    try {
      await patch(`/referrer/opportunities/${id}`, { created_by: selectedUserId });
      setTeamMemberModalVisible(false);
      fetchOpportunity();
    } catch (error) {
      Alert.alert('Error', 'Failed to update team member');
    } finally {
      setIsSavingField(false);
    }
  };

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

  // Get yes/no value - handles number (1/0), string ("1"/"0"), boolean
  const getYesNo = (value?: number | string | boolean | null) => {
    if (value === undefined || value === null) return '-';
    if (value === 1 || value === '1' || value === true || (typeof value === 'string' && value.toLowerCase() === 'yes')) return 'Yes';
    if (value === 0 || value === '0' || value === false || (typeof value === 'string' && value.toLowerCase() === 'no')) return 'No';
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
          <Text style={styles.dealId}>{opportunity.opportunity_id}</Text>
          <StatusBadge status={opportunity.status as any} />
        </View>
        <Text style={styles.entityName}>
          {opportunity.client_entity_name || 'Unknown Client'}
        </Text>

        {/* Quick Info Row */}
        <View style={styles.quickInfoRow}>
          <View style={styles.quickInfoItem}>
            <Text style={styles.quickInfoLabel}>Loan Amount</Text>
            <Text style={styles.quickInfoValue}>{formatCurrency(opportunity.loan_amount)}</Text>
          </View>
          <View style={styles.quickInfoItem}>
            <Text style={styles.quickInfoLabel}>LVR</Text>
            <Text style={styles.quickInfoValue}>{opportunity.lvr != null ? opportunity.lvr.toFixed(2) : '-'}</Text>
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

      {/* External Ref / Referrer Group / Team Member Row */}
      {opportunity.is_unqualified !== 1 && opportunity.status !== 'draft' && (
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>External Ref</Text>
            <View style={styles.infoValueRow}>
              <Text style={styles.infoValue} numberOfLines={1}>
                {opportunity.external_ref || '-'}
              </Text>
              {(user?.role === 'referrer_admin' || user?.role === 'referrer_team') && (
                <TouchableOpacity onPress={openExternalRefModal} style={styles.infoEditBtn}>
                  <Ionicons name="pencil-outline" size={14} color={Colors.primary} />
                  <Text style={styles.infoEditText}>
                    {opportunity.external_ref ? 'Edit' : 'Add'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={styles.infoItemDivider} />
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Referrer Group</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {opportunity.referrer_group || '-'}
            </Text>
          </View>
          <View style={styles.infoItemDivider} />
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Team Member</Text>
            <View style={styles.infoValueRow}>
              <Text style={styles.infoValue} numberOfLines={1}>
                {opportunity.created_by_name || '-'}
              </Text>
              {(user?.role === 'referrer_admin') && (
                <TouchableOpacity onPress={openTeamMemberModal} style={styles.infoEditBtn}>
                  <Ionicons name="pencil-outline" size={14} color={Colors.primary} />
                  <Text style={styles.infoEditText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

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
              value={opportunity.entity_type ? EntityTypeStringLabels[String(opportunity.entity_type)] || String(opportunity.entity_type) : '-'}
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
                  {opportunity.lvr != null ? opportunity.lvr.toFixed(2) : '-'}
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
            <DetailRow label="Additional Security" value={getYesNo(opportunity.additional_security ?? opportunity.additional_property)} />
            <DetailRow label="SMSF Structure" value={getYesNo(opportunity.smsf_structure)} />
            <DetailRow label="ATO Liabilities" value={getYesNo(opportunity.ato_liabilities)} />
            <DetailRow label="Credit Issues" value={getYesNo(opportunity.credit_issues ?? opportunity.credit_file_issues)} />
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
            {!isAddingNote && (
              <TouchableOpacity
                style={styles.addNoteButton}
                onPress={() => { setIsAddingNote(true); setNewNoteText(''); }}
              >
                <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Add Note Form */}
          {isAddingNote && (
            <View style={styles.noteForm}>
              <TextInput
                style={styles.noteInput}
                placeholder="Write a note..."
                placeholderTextColor={Colors.gray[400]}
                value={newNoteText}
                onChangeText={setNewNoteText}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                autoFocus
              />
              <View style={styles.noteFormActions}>
                <TouchableOpacity
                  style={styles.noteFormCancel}
                  onPress={() => { setIsAddingNote(false); setNewNoteText(''); }}
                >
                  <Text style={styles.noteFormCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.noteFormSave, (!newNoteText.trim() || savingNote) && styles.noteFormSaveDisabled]}
                  disabled={!newNoteText.trim() || savingNote}
                  onPress={async () => {
                    if (!newNoteText.trim() || !id) return;
                    setSavingNote(true);
                    try {
                      await post(`/referrer/opportunities/${id}/notes`, { content: newNoteText.trim() });
                      setNewNoteText('');
                      setIsAddingNote(false);
                      fetchNotes();
                    } catch (error) {
                      Alert.alert('Error', 'Failed to add note');
                    } finally {
                      setSavingNote(false);
                    }
                  }}
                >
                  <Text style={styles.noteFormSaveText}>{savingNote ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {notes.length > 0 ? (
            notes.map((note) => (
              <View key={note.id} style={styles.noteItem}>
                {editingNoteId === note.id ? (
                  /* Edit Mode */
                  <View>
                    <TextInput
                      style={styles.noteInput}
                      value={editNoteText}
                      onChangeText={setEditNoteText}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      autoFocus
                    />
                    <View style={styles.noteFormActions}>
                      <TouchableOpacity
                        style={styles.noteFormCancel}
                        onPress={() => { setEditingNoteId(null); setEditNoteText(''); }}
                      >
                        <Text style={styles.noteFormCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.noteFormSave, !editNoteText.trim() && styles.noteFormSaveDisabled]}
                        disabled={!editNoteText.trim()}
                        onPress={async () => {
                          if (!editNoteText.trim() || !id) return;
                          try {
                            await patch(`/referrer/opportunities/${id}/notes/${note.id}`, { content: editNoteText.trim() });
                            setEditingNoteId(null);
                            setEditNoteText('');
                            fetchNotes();
                          } catch (error) {
                            Alert.alert('Error', 'Failed to update note');
                          }
                        }}
                      >
                        <Text style={styles.noteFormSaveText}>Update</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  /* View Mode */
                  <>
                    <View style={styles.noteHeader}>
                      <Text style={styles.noteAuthor}>{note.created_by_name || 'Unknown'}</Text>
                      <View style={styles.noteActions}>
                        <Text style={styles.noteDate}>{formatDateTime(note.created_at)}</Text>
                        {(user?.id === note.created_by || user?.role === 'referrer_admin') && (
                          <View style={styles.noteIconRow}>
                            <TouchableOpacity
                              style={styles.noteIconBtn}
                              onPress={() => { setEditingNoteId(note.id); setEditNoteText(note.content); }}
                            >
                              <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.noteIconBtn}
                              onPress={() => {
                                Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Delete',
                                    style: 'destructive',
                                    onPress: async () => {
                                      try {
                                        await del(`/referrer/opportunities/${id}/notes/${note.id}`);
                                        fetchNotes();
                                      } catch (error) {
                                        Alert.alert('Error', 'Failed to delete note');
                                      }
                                    },
                                  },
                                ]);
                              }}
                            >
                              <Ionicons name="trash-outline" size={16} color={Colors.error} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={styles.noteContent}>{note.content}</Text>
                    {note.is_public && (
                      <View style={styles.publicBadge}>
                        <Ionicons name="globe-outline" size={12} color={Colors.primary} />
                        <Text style={styles.publicText}>Public</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            ))
          ) : (
            !isAddingNote && (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubble-outline" size={48} color={Colors.gray[300]} />
                <Text style={styles.emptyText}>No notes yet</Text>
              </View>
            )
          )}
        </Card>
      )}

      {activeTab === 'history' && (
        <Card>
          <View style={styles.notesHeader}>
            <Text style={styles.notesTitle}>Activity History</Text>
          </View>

          {history.length > 0 ? (
            history.map((entry, index) => (
              <View key={entry.id} style={styles.historyItem}>
                <View style={styles.historyTimeline}>
                  <View style={[
                    styles.historyDot,
                    index === 0 && styles.historyDotLatest,
                  ]} />
                  {index < history.length - 1 && <View style={styles.historyLine} />}
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyDescription}>{entry.description}</Text>
                  <View style={styles.historyMeta}>
                    <Ionicons name="person-outline" size={12} color={Colors.gray[400]} />
                    <Text style={styles.historyMetaText}>{entry.user_name}</Text>
                    <Ionicons name="time-outline" size={12} color={Colors.gray[400]} style={{ marginLeft: 8 }} />
                    <Text style={styles.historyMetaText}>{formatDate(entry.date)} {entry.time}</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color={Colors.gray[300]} />
              <Text style={styles.emptyText}>No history yet</Text>
            </View>
          )}
        </Card>
      )}
      {/* External Ref Edit Modal */}
      <Modal
        visible={externalRefModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExternalRefModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit External Reference</Text>
            <Text style={styles.modalDescription}>
              Add or update the external reference for this opportunity
            </Text>
            <TextInput
              style={styles.modalInput}
              value={externalRefValue}
              onChangeText={setExternalRefValue}
              placeholder="Enter external reference"
              placeholderTextColor={Colors.gray[400]}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setExternalRefModalVisible(false)}
                disabled={isSavingField}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, isSavingField && styles.modalSaveBtnDisabled]}
                onPress={handleSaveExternalRef}
                disabled={isSavingField}
              >
                <Text style={styles.modalSaveText}>
                  {isSavingField ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Team Member Edit Modal */}
      <Modal
        visible={teamMemberModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTeamMemberModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Team Member</Text>
            <Text style={styles.modalDescription}>
              Select the team member for this opportunity
            </Text>
            {isLoadingUsers ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <View style={styles.dropdownContainer}>
                <Text style={styles.dropdownLabel}>Select Referrer User</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setDropdownOpen(!dropdownOpen)}
                >
                  <Text style={[
                    styles.dropdownTriggerText,
                    !selectedUserId && styles.dropdownPlaceholder,
                  ]}>
                    {selectedUserId
                      ? referrerUsers.find(u => u.id === selectedUserId)
                        ? `${referrerUsers.find(u => u.id === selectedUserId)!.first_name} ${referrerUsers.find(u => u.id === selectedUserId)!.surname}`
                        : 'Select'
                      : 'Select a team member'}
                  </Text>
                  <Ionicons
                    name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={Colors.gray[500]}
                  />
                </TouchableOpacity>
                {dropdownOpen && (
                  <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                    {referrerUsers.map((u) => (
                      <TouchableOpacity
                        key={u.id}
                        style={[
                          styles.dropdownItem,
                          selectedUserId === u.id && styles.dropdownItemSelected,
                        ]}
                        onPress={() => {
                          setSelectedUserId(u.id);
                          setDropdownOpen(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          selectedUserId === u.id && styles.dropdownItemTextSelected,
                        ]}>
                          {u.first_name} {u.surname}
                        </Text>
                        {selectedUserId === u.id && (
                          <Ionicons name="checkmark" size={18} color={Colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setTeamMemberModalVisible(false)}
                disabled={isSavingField}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, (isSavingField || !selectedUserId) && styles.modalSaveBtnDisabled]}
                onPress={handleSaveTeamMember}
                disabled={isSavingField || !selectedUserId}
              >
                <Text style={styles.modalSaveText}>
                  {isSavingField ? 'Updating...' : 'Update'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    marginBottom: 4,
  },
  dealId: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.gray[500],
  },
  entityName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.teal,
    marginBottom: 16,
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

  // Info Row (External Ref / Referrer Group / Team Member)
  infoRow: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  infoItem: {
    paddingVertical: 8,
  },
  infoItemDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.gray[500],
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[900],
    flexShrink: 1,
  },
  infoEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  infoEditText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.teal,
    marginBottom: 6,
  },
  modalDescription: {
    fontSize: 13,
    color: Colors.gray[500],
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.gray[900],
    backgroundColor: Colors.gray[50],
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: Colors.gray[100],
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[700],
  },
  modalSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: Colors.teal,
  },
  modalSaveBtnDisabled: {
    opacity: 0.5,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  dropdownContainer: {
    marginBottom: 4,
  },
  dropdownLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.gray[600],
    marginBottom: 8,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.gray[50],
  },
  dropdownTriggerText: {
    fontSize: 14,
    color: Colors.gray[900],
    flex: 1,
  },
  dropdownPlaceholder: {
    color: Colors.gray[400],
  },
  dropdownList: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: Colors.white,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: `${Colors.primary}10`,
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.gray[700],
  },
  dropdownItemTextSelected: {
    fontWeight: '600',
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
  noteForm: {
    backgroundColor: Colors.gray[50],
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  noteInput: {
    fontSize: 14,
    color: Colors.gray[900],
    minHeight: 80,
    padding: 0,
    lineHeight: 20,
  },
  noteFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  noteFormCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.gray[200],
  },
  noteFormCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray[700],
  },
  noteFormSave: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  noteFormSaveDisabled: {
    opacity: 0.5,
  },
  noteFormSaveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray[800],
  },
  noteActions: {
    alignItems: 'flex-end',
    gap: 4,
  },
  noteDate: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  noteIconRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  noteIconBtn: {
    padding: 4,
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

  // History
  historyItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  historyTimeline: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.gray[300],
    marginTop: 4,
  },
  historyDotLatest: {
    backgroundColor: Colors.primary,
  },
  historyLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.gray[200],
    marginTop: 4,
  },
  historyContent: {
    flex: 1,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 8,
  },
  historyDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[800],
    marginBottom: 6,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyMetaText: {
    fontSize: 12,
    color: Colors.gray[500],
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
