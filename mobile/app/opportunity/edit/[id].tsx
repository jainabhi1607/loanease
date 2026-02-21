/**
 * Edit Opportunity Screen
 * Multi-step form with professional progress indicator
 * Used when referrers tap on a draft opportunity
 */
import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, PhoneInput, CurrencyInput } from '../../../components/ui';
import { Colors } from '../../../constants/colors';
import { get, patch } from '../../../lib/api';
import {
  EntityTypeLabels,
  EntityType,
  LoanTypeLabels,
  LoanType,
  AssetTypeLabels,
  AssetType,
  IndustryOptions,
} from '../../../types';

const STEPS = [
  { key: 'client', label: 'Client', icon: 'person-outline' as const },
  { key: 'loan', label: 'Loan', icon: 'cash-outline' as const },
  { key: 'financial', label: 'Financial', icon: 'calculator-outline' as const },
  { key: 'review', label: 'Review', icon: 'checkmark-circle-outline' as const },
];

type Step = 0 | 1 | 2 | 3;

interface FormData {
  // Client
  contact_first_name: string;
  contact_last_name: string;
  client_mobile: string;
  client_email: string;
  client_entity_name: string;
  entity_type: string;
  client_abn: string;
  client_industry: string;
  time_in_business: string;
  client_address: string;
  // Loan
  loan_amount: string;
  property_value: string;
  loan_type: string;
  loan_purpose: string;
  asset_type: string;
  asset_address: string;
  brief_overview: string;
  // Financial
  net_profit: string;
  ammortisation: string;
  deprecition: string;
  existing_interest_costs: string;
  rental_expense: string;
  proposed_rental_income: string;
  existing_liabilities: boolean;
  additional_security: boolean;
  smsf_structure: boolean;
  ato_liabilities: boolean;
  credit_issues: boolean;
  // Additional
  additional_notes: string;
}

export default function EditOpportunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [step, setStep] = useState<Step>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [opportunityId, setOpportunityId] = useState('');

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    });
  };

  const [formData, setFormData] = useState<FormData>({
    contact_first_name: '',
    contact_last_name: '',
    client_mobile: '',
    client_email: '',
    client_entity_name: '',
    entity_type: '',
    client_abn: '',
    client_industry: '',
    time_in_business: '',
    client_address: '',
    loan_amount: '',
    property_value: '',
    loan_type: '',
    loan_purpose: '',
    asset_type: '',
    asset_address: '',
    brief_overview: '',
    net_profit: '',
    ammortisation: '',
    deprecition: '',
    existing_interest_costs: '',
    rental_expense: '',
    proposed_rental_income: '',
    existing_liabilities: false,
    additional_security: false,
    smsf_structure: false,
    ato_liabilities: false,
    credit_issues: false,
    additional_notes: '',
  });

  // Fetch existing opportunity data
  useEffect(() => {
    const fetchOpportunity = async () => {
      try {
        const data = await get<any>(`/referrer/opportunities/${id}`);
        setOpportunityId(data.opportunity_id || '');
        setFormData({
          contact_first_name: data.contact_first_name || '',
          contact_last_name: data.contact_last_name || '',
          client_mobile: data.client_mobile || '',
          client_email: data.client_email || '',
          client_entity_name: data.client_entity_name || '',
          entity_type: data.entity_type ? String(data.entity_type) : '',
          client_abn: data.client_abn || '',
          client_industry: data.client_industry || '',
          time_in_business: data.client_time_in_business || data.time_in_business || '',
          client_address: data.client_address || '',
          loan_amount: data.loan_amount ? String(data.loan_amount) : '',
          property_value: data.estimated_property_value || data.property_value
            ? String(data.estimated_property_value || data.property_value)
            : '',
          loan_type: data.loan_type || '',
          loan_purpose: data.loan_purpose || '',
          asset_type: data.asset_type || '',
          asset_address: data.asset_address || '',
          brief_overview: data.brief_overview || '',
          net_profit: data.net_profit ? String(data.net_profit) : '',
          ammortisation: data.ammortisation ? String(data.ammortisation) : '',
          deprecition: data.deprecition ? String(data.deprecition) : '',
          existing_interest_costs: data.existing_interest_costs ? String(data.existing_interest_costs) : '',
          rental_expense: data.rental_expense ? String(data.rental_expense) : '',
          proposed_rental_income: data.proposed_rental_income ? String(data.proposed_rental_income) : '',
          existing_liabilities: data.existing_liabilities === 1,
          additional_security: data.additional_security === 1,
          smsf_structure: data.smsf_structure === 1,
          ato_liabilities: data.ato_liabilities === 1,
          credit_issues: data.credit_issues === 1,
          additional_notes: data.additional_notes || '',
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to load opportunity data.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOpportunity();
  }, [id]);

  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateNumericField = (field: keyof FormData, value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    setFormData((prev) => ({ ...prev, [field]: cleaned }));
  };

  // Save opportunity
  const handleSave = async (submitAsOpportunity: boolean) => {
    setIsSaving(true);
    try {
      const payload: Record<string, any> = {};

      // Only include fields that have values
      if (formData.entity_type) payload.entity_type = parseInt(formData.entity_type);
      if (formData.client_industry) payload.industry = formData.client_industry;
      if (formData.time_in_business) payload.time_in_business = formData.time_in_business;
      if (formData.client_abn) payload.abn = formData.client_abn;
      if (formData.client_entity_name) payload.entity_name = formData.client_entity_name;
      if (formData.contact_first_name) payload.contact_first_name = formData.contact_first_name;
      if (formData.contact_last_name) payload.contact_last_name = formData.contact_last_name;
      if (formData.client_email) payload.client_email = formData.client_email;
      if (formData.client_mobile) payload.client_mobile = formData.client_mobile;
      if (formData.loan_type) payload.loan_type = formData.loan_type;
      if (formData.loan_purpose) payload.loan_purpose = formData.loan_purpose;
      if (formData.asset_type) payload.asset_type = formData.asset_type;
      if (formData.asset_address) payload.asset_address = formData.asset_address;
      if (formData.brief_overview) payload.brief_overview = formData.brief_overview;
      if (formData.additional_notes) payload.additional_notes = formData.additional_notes;
      if (formData.client_address) payload.client_address = formData.client_address;

      // Numeric fields - send null if empty
      payload.loan_amount = formData.loan_amount ? parseFloat(formData.loan_amount) : null;
      payload.property_value = formData.property_value ? parseFloat(formData.property_value) : null;
      payload.net_profit = formData.net_profit ? parseFloat(formData.net_profit) : null;
      payload.ammortisation = formData.ammortisation ? parseFloat(formData.ammortisation) : null;
      payload.deprecition = formData.deprecition ? parseFloat(formData.deprecition) : null;
      payload.existing_interest_costs = formData.existing_interest_costs ? parseFloat(formData.existing_interest_costs) : null;
      payload.rental_expense = formData.rental_expense ? parseFloat(formData.rental_expense) : null;
      payload.proposed_rental_income = formData.proposed_rental_income ? parseFloat(formData.proposed_rental_income) : null;

      // Boolean fields - use DB field names (additional_property, credit_file_issues)
      payload.existing_liabilities = formData.existing_liabilities ? 1 : 0;
      payload.additional_property = formData.additional_security ? 1 : 0;
      payload.smsf_structure = formData.smsf_structure ? 1 : 0;
      payload.ato_liabilities = formData.ato_liabilities ? 1 : 0;
      payload.credit_file_issues = formData.credit_issues ? 1 : 0;

      if (submitAsOpportunity) {
        payload.status = 'opportunity';
      }

      await patch(`/referrer/opportunities/${id}`, payload);

      const msg = submitAsOpportunity ? 'Opportunity submitted successfully' : 'Draft saved successfully';
      showToast(msg, 'success');

      // Navigate back to listing after short delay so toast is visible
      setTimeout(() => {
        router.replace('/(tabs)/opportunities');
      }, 1200);
    } catch (error: any) {
      console.error('Save error:', error);
      const errorMsg = error?.data?.error || error?.message || 'Failed to save. Please try again.';
      showToast(errorMsg, 'error');
      setIsSaving(false);
    }
  };

  const goNext = () => {
    if (step < 3) setStep((step + 1) as Step);
  };

  const goPrev = () => {
    if (step > 0) setStep((step - 1) as Step);
  };

  // Format currency for display
  const fmtCurrency = (val: string) => {
    if (!val) return '-';
    const num = parseFloat(val);
    return isNaN(num) ? '-' : `₹${num.toLocaleString('en-IN')}`;
  };

  // Render progress indicator
  const renderProgress = () => (
    <View style={styles.progressContainer}>
      {STEPS.map((s, i) => {
        const isActive = i === step;
        const isCompleted = i < step;
        return (
          <View key={s.key} style={styles.progressStep}>
            {i > 0 && (
              <View
                style={[
                  styles.progressLine,
                  (isActive || isCompleted) && styles.progressLineActive,
                ]}
              />
            )}
            <TouchableOpacity
              onPress={() => setStep(i as Step)}
              style={[
                styles.progressCircle,
                isActive && styles.progressCircleActive,
                isCompleted && styles.progressCircleCompleted,
              ]}
            >
              {isCompleted ? (
                <Ionicons name="checkmark" size={16} color={Colors.white} />
              ) : (
                <Ionicons
                  name={s.icon}
                  size={16}
                  color={isActive ? Colors.white : Colors.gray[400]}
                />
              )}
            </TouchableOpacity>
            <Text
              style={[
                styles.progressLabel,
                (isActive || isCompleted) && styles.progressLabelActive,
              ]}
            >
              {s.label}
            </Text>
          </View>
        );
      })}
    </View>
  );

  // Toggle button component for yes/no fields
  const ToggleRow = ({
    label,
    value,
    field,
  }: {
    label: string;
    value: boolean;
    field: keyof FormData;
  }) => (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={styles.toggleButtons}>
        <TouchableOpacity
          style={[styles.toggleBtn, value && styles.toggleBtnActive]}
          onPress={() => updateField(field, true)}
        >
          <Text style={[styles.toggleBtnText, value && styles.toggleBtnTextActive]}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, !value && styles.toggleBtnNo]}
          onPress={() => updateField(field, false)}
        >
          <Text style={[styles.toggleBtnText, !value && styles.toggleBtnTextNo]}>No</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Dropdown select component
  const SelectField = ({
    label,
    value,
    options,
    field,
    placeholder = 'Select an option',
  }: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    field: keyof FormData;
    placeholder?: string;
  }) => {
    const [open, setOpen] = useState(false);
    const selectedLabel = options.find((o) => o.value === value)?.label;

    return (
      <View style={styles.selectContainer}>
        <Text style={styles.selectLabel}>{label}</Text>
        <TouchableOpacity
          style={[styles.selectTrigger, open && styles.selectTriggerOpen]}
          onPress={() => setOpen(!open)}
          activeOpacity={0.7}
        >
          <Text style={[styles.selectTriggerText, !selectedLabel && styles.selectPlaceholder]}>
            {selectedLabel || placeholder}
          </Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={Colors.gray[400]}
          />
        </TouchableOpacity>
        {open && (
          <View style={styles.selectDropdown}>
            <ScrollView style={styles.selectDropdownScroll} nestedScrollEnabled>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.selectOption,
                    value === opt.value && styles.selectOptionActive,
                  ]}
                  onPress={() => {
                    updateField(field, opt.value);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      value === opt.value && styles.selectOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {value === opt.value && (
                    <Ionicons name="checkmark" size={18} color="#1a8cba" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  // Step 1: Client Details
  const renderClientStep = () => (
    <View>
      <Text style={styles.stepTitle}>Client Details</Text>
      <Text style={styles.stepSubtitle}>Update your client&apos;s information</Text>

      <Input
        label="Entity / Company Name"
        placeholder="Enter entity name"
        value={formData.client_entity_name}
        onChangeText={(v) => updateField('client_entity_name', v)}
      />

      <SelectField
        label="Entity Type"
        value={formData.entity_type}
        field="entity_type"
        options={Object.entries(EntityTypeLabels).map(([k, v]) => ({ value: k, label: v }))}
      />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Input
            label="First Name"
            placeholder="First name"
            value={formData.contact_first_name}
            onChangeText={(v) => updateField('contact_first_name', v)}
          />
        </View>
        <View style={styles.halfField}>
          <Input
            label="Last Name"
            placeholder="Last name"
            value={formData.contact_last_name}
            onChangeText={(v) => updateField('contact_last_name', v)}
          />
        </View>
      </View>

      <Input
        label="Email"
        placeholder="client@example.com"
        value={formData.client_email}
        onChangeText={(v) => updateField('client_email', v)}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <PhoneInput
        label="Mobile"
        placeholder="98765 43210"
        countryCode="+91"
        value={formData.client_mobile}
        onChangeText={(v) => updateField('client_mobile', v)}
      />

      <Input
        label="ABN"
        placeholder="Enter ABN"
        value={formData.client_abn}
        onChangeText={(v) => updateField('client_abn', v)}
        keyboardType="numeric"
        maxLength={11}
      />

      <Input
        label="Address"
        placeholder="Enter address"
        value={formData.client_address}
        onChangeText={(v) => updateField('client_address', v)}
      />

      <Input
        label="Time in Business"
        placeholder="e.g. 5 years"
        value={formData.time_in_business}
        onChangeText={(v) => updateField('time_in_business', v)}
      />
    </View>
  );

  // Step 2: Loan Details
  const renderLoanStep = () => (
    <View>
      <Text style={styles.stepTitle}>Loan Details</Text>
      <Text style={styles.stepSubtitle}>Specify the loan requirements</Text>

      <CurrencyInput
        label="Loan Amount"
        placeholder="0"
        value={formData.loan_amount}
        onChangeText={(v) => updateNumericField('loan_amount', v)}
      />

      <CurrencyInput
        label="Estimated Property Value"
        placeholder="0"
        value={formData.property_value}
        onChangeText={(v) => updateNumericField('property_value', v)}
      />

      <SelectField
        label="Loan Type"
        value={formData.loan_type}
        field="loan_type"
        options={Object.entries(LoanTypeLabels).map(([k, v]) => ({ value: k, label: v }))}
      />

      <Input
        label="Loan Purpose"
        placeholder="Purpose of the loan"
        value={formData.loan_purpose}
        onChangeText={(v) => updateField('loan_purpose', v)}
      />

      <SelectField
        label="Asset Type"
        value={formData.asset_type}
        field="asset_type"
        options={Object.entries(AssetTypeLabels).map(([k, v]) => ({ value: k, label: v }))}
      />

      <Input
        label="Asset Address"
        placeholder="Property address"
        value={formData.asset_address}
        onChangeText={(v) => updateField('asset_address', v)}
      />

      <Input
        label="Brief Overview"
        placeholder="Describe the loan requirements..."
        value={formData.brief_overview}
        onChangeText={(v) => updateField('brief_overview', v)}
        multiline
        numberOfLines={4}
        style={styles.textArea}
      />
    </View>
  );

  // Step 3: Financial Details
  const renderFinancialStep = () => (
    <View>
      <Text style={styles.stepTitle}>Financial Details</Text>
      <Text style={styles.stepSubtitle}>Income and risk assessment</Text>

      <View style={styles.sectionHeader}>
        <Ionicons name="trending-up-outline" size={18} color="#1a8cba" />
        <Text style={styles.sectionHeaderText}>Income</Text>
      </View>

      <CurrencyInput
        label="Net Profit Before Tax"
        placeholder="0"
        value={formData.net_profit}
        onChangeText={(v) => updateNumericField('net_profit', v)}
      />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <CurrencyInput
            label="Amortisation"
            placeholder="0"
            value={formData.ammortisation}
            onChangeText={(v) => updateNumericField('ammortisation', v)}
          />
        </View>
        <View style={styles.halfField}>
          <CurrencyInput
            label="Depreciation"
            placeholder="0"
            value={formData.deprecition}
            onChangeText={(v) => updateNumericField('deprecition', v)}
          />
        </View>
      </View>

      <CurrencyInput
        label="Existing Interest Costs"
        placeholder="0"
        value={formData.existing_interest_costs}
        onChangeText={(v) => updateNumericField('existing_interest_costs', v)}
      />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <CurrencyInput
            label="Rental Expense"
            placeholder="0"
            value={formData.rental_expense}
            onChangeText={(v) => updateNumericField('rental_expense', v)}
          />
        </View>
        <View style={styles.halfField}>
          <CurrencyInput
            label="Proposed Rental Income"
            placeholder="0"
            value={formData.proposed_rental_income}
            onChangeText={(v) => updateNumericField('proposed_rental_income', v)}
          />
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.sectionHeader}>
        <Ionicons name="shield-outline" size={18} color="#E5A62B" />
        <Text style={styles.sectionHeaderText}>Risk Indicators</Text>
      </View>

      <ToggleRow label="Existing Liabilities" value={formData.existing_liabilities} field="existing_liabilities" />
      <ToggleRow label="Additional Security / Property" value={formData.additional_security} field="additional_security" />
      <ToggleRow label="SMSF Structure" value={formData.smsf_structure} field="smsf_structure" />
      <ToggleRow label="ATO Liabilities" value={formData.ato_liabilities} field="ato_liabilities" />
      <ToggleRow label="Credit Issues" value={formData.credit_issues} field="credit_issues" />
    </View>
  );

  // Step 4: Review
  const renderReviewStep = () => {
    const entityLabel = formData.entity_type
      ? EntityTypeLabels[parseInt(formData.entity_type) as EntityType] || '-'
      : '-';
    const loanTypeLabel = formData.loan_type
      ? LoanTypeLabels[formData.loan_type as LoanType] || '-'
      : '-';
    const assetTypeLabel = formData.asset_type
      ? AssetTypeLabels[formData.asset_type as AssetType] || '-'
      : '-';

    const ReviewItem = ({ label, value }: { label: string; value: string }) => (
      <View style={styles.reviewItem}>
        <Text style={styles.reviewLabel}>{label}</Text>
        <Text style={styles.reviewValue}>{value || '-'}</Text>
      </View>
    );

    return (
      <View>
        <Text style={styles.stepTitle}>Review & Submit</Text>
        <Text style={styles.stepSubtitle}>Check everything before submitting</Text>

        {/* Client Summary */}
        <View style={styles.reviewCard}>
          <View style={styles.reviewCardHeader}>
            <Ionicons name="person-outline" size={18} color="#1a8cba" />
            <Text style={styles.reviewCardTitle}>Client</Text>
            <TouchableOpacity onPress={() => setStep(0)} style={styles.editBadge}>
              <Text style={styles.editBadgeText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <ReviewItem label="Entity" value={formData.client_entity_name} />
          <ReviewItem label="Type" value={entityLabel} />
          <ReviewItem label="Contact" value={`${formData.contact_first_name} ${formData.contact_last_name}`.trim()} />
          <ReviewItem label="Email" value={formData.client_email} />
          <ReviewItem label="Mobile" value={formData.client_mobile} />
        </View>

        {/* Loan Summary */}
        <View style={styles.reviewCard}>
          <View style={styles.reviewCardHeader}>
            <Ionicons name="cash-outline" size={18} color="#1a8cba" />
            <Text style={styles.reviewCardTitle}>Loan</Text>
            <TouchableOpacity onPress={() => setStep(1)} style={styles.editBadge}>
              <Text style={styles.editBadgeText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <ReviewItem label="Loan Amount" value={fmtCurrency(formData.loan_amount)} />
          <ReviewItem label="Property Value" value={fmtCurrency(formData.property_value)} />
          <ReviewItem label="Loan Type" value={loanTypeLabel} />
          <ReviewItem label="Purpose" value={formData.loan_purpose} />
          <ReviewItem label="Asset Type" value={assetTypeLabel} />
        </View>

        {/* Financial Summary */}
        <View style={styles.reviewCard}>
          <View style={styles.reviewCardHeader}>
            <Ionicons name="calculator-outline" size={18} color="#1a8cba" />
            <Text style={styles.reviewCardTitle}>Financial</Text>
            <TouchableOpacity onPress={() => setStep(2)} style={styles.editBadge}>
              <Text style={styles.editBadgeText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <ReviewItem label="Net Profit" value={fmtCurrency(formData.net_profit)} />
          <ReviewItem label="Existing Interest" value={fmtCurrency(formData.existing_interest_costs)} />
          <View style={styles.reviewFlags}>
            {formData.existing_liabilities && <View style={styles.flagBadge}><Text style={styles.flagText}>Liabilities</Text></View>}
            {formData.smsf_structure && <View style={styles.flagBadge}><Text style={styles.flagText}>SMSF</Text></View>}
            {formData.ato_liabilities && <View style={styles.flagBadgeWarn}><Text style={styles.flagTextWarn}>ATO</Text></View>}
            {formData.credit_issues && <View style={styles.flagBadgeWarn}><Text style={styles.flagTextWarn}>Credit Issues</Text></View>}
          </View>
        </View>

        {/* Additional Notes */}
        <Input
          label="Additional Notes"
          placeholder="Any additional notes for this opportunity..."
          value={formData.additional_notes}
          onChangeText={(v) => updateField('additional_notes', v)}
          multiline
          numberOfLines={3}
          style={styles.textArea}
        />
      </View>
    );
  };

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 0: return renderClientStep();
      case 1: return renderLoanStep();
      case 2: return renderFinancialStep();
      case 3: return renderReviewStep();
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a8cba" />
        <Text style={styles.loadingText}>Loading opportunity...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>Edit Opportunity</Text>
              {opportunityId ? (
                <Text style={styles.headerSubtitle}>{opportunityId}</Text>
              ) : null}
            </View>
          ),
        }}
      />

      {/* Progress indicator */}
      {renderProgress()}

      {/* Form content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderStepContent()}
      </ScrollView>

      {/* Bottom navigation */}
      <View style={styles.bottomNav}>
        {step === 3 ? (
          // Final step: Save Draft & Submit buttons
          <View style={styles.submitRow}>
            <TouchableOpacity
              style={styles.saveDraftBtn}
              onPress={() => handleSave(false)}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#1a8cba" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#1a8cba" />
                  <Text style={styles.saveDraftText}>Save Draft</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => handleSave(true)}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.submitText}>Submit</Text>
                  <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // Navigation: Prev / Next
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, step === 0 && styles.navBtnDisabled]}
              onPress={goPrev}
              disabled={step === 0}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={step === 0 ? Colors.gray[300] : '#1a8cba'}
              />
              <Text style={[styles.navBtnText, step === 0 && styles.navBtnTextDisabled]}>
                Previous
              </Text>
            </TouchableOpacity>

            <Text style={styles.stepIndicator}>
              {step + 1} / {STEPS.length}
            </Text>

            <TouchableOpacity style={styles.navBtnNext} onPress={goNext}>
              <Text style={styles.navBtnNextText}>Next</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Toast notification */}
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            toast.type === 'success' ? styles.toastSuccess : styles.toastError,
            { opacity: toastOpacity },
          ]}
        >
          <Ionicons
            name={toast.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={22}
            color={Colors.white}
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.gray[500],
  },

  // Header (rendered inside Stack navigation header)
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  progressLine: {
    position: 'absolute',
    top: 18,
    right: '50%',
    left: '-50%',
    height: 2,
    backgroundColor: Colors.gray[200],
    zIndex: 0,
  },
  progressLineActive: {
    backgroundColor: '#1a8cba',
  },
  progressCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray[100],
    borderWidth: 2,
    borderColor: Colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  progressCircleActive: {
    backgroundColor: '#1a8cba',
    borderColor: '#1a8cba',
  },
  progressCircleCompleted: {
    backgroundColor: '#00A67E',
    borderColor: '#00A67E',
  },
  progressLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '500',
    color: Colors.gray[400],
  },
  progressLabelActive: {
    color: '#0F172A',
    fontWeight: '600',
  },

  // Scroll content
  scrollContent: {
    padding: 20,
    paddingBottom: 24,
  },

  // Step headers
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.gray[500],
    marginBottom: 24,
  },

  // Layout helpers
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  textArea: {
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: 'top',
    flex: 1,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 20,
  },

  // Select dropdown
  selectContainer: {
    marginBottom: 18,
    zIndex: 10,
  },
  selectLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray[700],
    marginBottom: 8,
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.gray[50],
    borderWidth: 1.5,
    borderColor: Colors.gray[200],
    borderRadius: 12,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  selectTriggerOpen: {
    borderColor: Colors.gray[300],
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  selectTriggerText: {
    fontSize: 15,
    color: Colors.gray[900],
    flex: 1,
  },
  selectPlaceholder: {
    color: Colors.gray[400],
  },
  selectDropdown: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: Colors.gray[200],
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  selectDropdownScroll: {
    maxHeight: 200,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  selectOptionActive: {
    backgroundColor: '#E8F4FC',
  },
  selectOptionText: {
    fontSize: 14,
    color: Colors.gray[700],
    flex: 1,
  },
  selectOptionTextActive: {
    color: '#1a8cba',
    fontWeight: '600',
  },

  // Toggle buttons
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  toggleLabel: {
    fontSize: 14,
    color: '#0F172A',
    flex: 1,
  },
  toggleButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.gray[100],
    borderWidth: 1.5,
    borderColor: Colors.gray[200],
  },
  toggleBtnActive: {
    backgroundColor: '#E8F4FC',
    borderColor: '#1a8cba',
  },
  toggleBtnNo: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.gray[400],
  },
  toggleBtnTextActive: {
    color: '#1a8cba',
    fontWeight: '600',
  },
  toggleBtnTextNo: {
    color: '#EF4444',
    fontWeight: '600',
  },

  // Review cards
  reviewCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  reviewCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  editBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#E8F4FC',
  },
  editBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a8cba',
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  reviewLabel: {
    fontSize: 13,
    color: Colors.gray[500],
  },
  reviewValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    maxWidth: '55%',
    textAlign: 'right',
  },
  reviewFlags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  flagBadge: {
    backgroundColor: '#E8F4FC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  flagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1a8cba',
  },
  flagBadgeWarn: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  flagTextWarn: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
  },

  // Bottom navigation
  bottomNav: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1a8cba',
  },
  navBtnDisabled: {
    borderColor: Colors.gray[200],
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a8cba',
  },
  navBtnTextDisabled: {
    color: Colors.gray[300],
  },
  stepIndicator: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray[400],
  },
  navBtnNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#1a8cba',
  },
  navBtnNextText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },

  // Submit row
  submitRow: {
    flexDirection: 'row',
    gap: 12,
  },
  saveDraftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1a8cba',
  },
  saveDraftText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a8cba',
  },
  submitBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1a8cba',
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },

  // Toast notification
  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  },
  toastSuccess: {
    backgroundColor: '#00A67E',
  },
  toastError: {
    backgroundColor: '#EF4444',
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
    flex: 1,
  },
});
