/**
 * Add Opportunity Screen
 * Full 4-step form matching the web app flow:
 *   Step 0 - Referrer (org name + user selection)
 *   Step 1 - Client (new/existing toggle, all fields)
 *   Step 2 - Detailed Opportunity Info (loan, financial, risk, outcome)
 *   Step 3 - Terms & Submit
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input, PhoneInput, CurrencyInput } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { get, post } from '../../lib/api';
import {
  LoanTypeLabels,
  AssetTypeLabels,
  IndustryOptions,
  DashboardResponse,
} from '../../types';

// ─── Constants ──────────────────────────────────────────────────
const STEPS = [
  { key: 'referrer', label: 'Referrer', icon: 'business-outline' as const },
  { key: 'client', label: 'Client', icon: 'person-outline' as const },
  { key: 'details', label: 'Details', icon: 'document-text-outline' as const },
  { key: 'terms', label: 'Terms', icon: 'checkmark-circle-outline' as const },
];

type Step = 0 | 1 | 2 | 3;

const INTEREST_RATE = 12.5;

const LOAN_PURPOSE_OPTIONS = [
  { value: 'purchase_owner_occupier', label: 'Purchase - Owner Occupier' },
  { value: 'purchase_investment', label: 'Purchase - Investment' },
  { value: 'refinance', label: 'Refinance' },
  { value: 'equity_release', label: 'Equity Release' },
  { value: 'land_bank', label: 'Land Bank' },
  { value: 'business_use', label: 'Business Use' },
  { value: 'commercial_equipment', label: 'Commercial Equipment' },
];

const ENTITY_TYPE_OPTIONS_WEB = [
  { value: 'private_company', label: 'Private Company' },
  { value: 'sole_trader', label: 'Sole Trader' },
  { value: 'smsf_trust', label: 'SMSF Trust' },
  { value: 'trust', label: 'Trust' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'individual', label: 'Individual' },
];

const TERMS = [
  'I confirm that all the information being submitted is true and correct to my knowledge at the time of submission.',
  'I confirm that the client (on whose behalf I am submitting this application) is fully aware of and has consented to me submitting their information to Clue, and that I have advised the client that Clue will be making contact with them via email, text and/or call.',
  'I confirm that I have advised the client that I will be receiving a referral fee (upfront and/or trailing) from Clue, for the loan I am submitting on their behalf, once the loan is settled.',
  'I confirm that I have advised the client that Loanease will charge a Service Fee in relation to their application and that this will be communicated directly to the client upon application.',
];

// ─── Interfaces ─────────────────────────────────────────────────
interface ReferrerUser {
  id: string;
  email: string;
  first_name: string;
  surname: string;
  role: string;
}

interface ClientRecord {
  _id: string;
  id?: string;
  entity_name: string;
  contact_first_name?: string;
  contact_last_name?: string;
  contact_email?: string;
  contact_phone?: string;
  abn?: string;
}

// ─── Component ──────────────────────────────────────────────────
export default function AddOpportunityScreen() {
  const [step, setStep] = useState<Step>(0);
  const [isSaving, setIsSaving] = useState(false);

  // ── Data loading state ──
  const [orgName, setOrgName] = useState('');
  const [referrerUsers, setReferrerUsers] = useState<ReferrerUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // ── Step 0 – Referrer ──
  const [selectedUserId, setSelectedUserId] = useState('');

  // ── Step 1 – Client ──
  const [clientType, setClientType] = useState<'new' | 'existing'>('new');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [abn, setAbn] = useState('');
  const [entityType, setEntityType] = useState('');
  const [entityName, setEntityName] = useState('');
  const [timeInBusiness, setTimeInBusiness] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [industry, setIndustry] = useState('');
  const [briefOverview, setBriefOverview] = useState('');

  // ── Step 2 – Detailed Info ──
  const [hasMoreInfo, setHasMoreInfo] = useState(false);
  // Loan
  const [loanAmount, setLoanAmount] = useState('');
  const [propertyValue, setPropertyValue] = useState('');
  const [assetType, setAssetType] = useState('');
  const [assetAddress, setAssetAddress] = useState('');
  const [loanType, setLoanType] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');
  // Financial
  const [fundedFromRental, setFundedFromRental] = useState<'' | 'yes' | 'no'>('');
  const [netProfit, setNetProfit] = useState('');
  const [ammortisation, setAmmortisation] = useState('');
  const [deprecition, setDeprecition] = useState('');
  const [existingInterestCosts, setExistingInterestCosts] = useState('');
  const [rentalExpense, setRentalExpense] = useState('');
  const [proposedRentalIncome, setProposedRentalIncome] = useState('');
  // Risk
  const [existingLiabilities, setExistingLiabilities] = useState<'' | 'yes' | 'no'>('');
  const [additionalSecurity, setAdditionalSecurity] = useState<'' | 'yes' | 'no'>('');
  const [smsfStructure, setSmsfStructure] = useState<'' | 'yes' | 'no'>('');
  const [atoLiabilities, setAtoLiabilities] = useState<'' | 'yes' | 'no'>('');
  const [creditIssues, setCreditIssues] = useState<'' | 'yes' | 'no'>('');
  // Notes
  const [additionalNotes, setAdditionalNotes] = useState('');

  // ── Step 3 – Terms ──
  const [term1, setTerm1] = useState(false);
  const [term2, setTerm2] = useState(false);
  const [term3, setTerm3] = useState(false);
  const [term4, setTerm4] = useState(false);

  // ── Toast ──
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

  // ── Numeric helper ──
  const numericOnly = (value: string) => value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

  // ─── Data Fetching ────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        // Fetch dashboard for org name
        const dashData = await get<DashboardResponse>('/referrer/dashboard');
        if (dashData.organization?.company_name) {
          setOrgName(dashData.organization.company_name);
        }
      } catch {}

      try {
        // Fetch referrer users
        const usersData = await get<{ users: ReferrerUser[]; currentUserId: string }>('/referrer/users');
        setReferrerUsers(usersData.users || []);
        if (usersData.currentUserId) {
          setCurrentUserId(usersData.currentUserId);
          setSelectedUserId(usersData.currentUserId);
        }
      } catch {}

      setIsLoadingUsers(false);
    };
    load();
  }, []);

  // Fetch clients when switching to existing
  useEffect(() => {
    if (clientType !== 'existing') {
      setClients([]);
      setSelectedClientId('');
      return;
    }
    const fetchClients = async () => {
      setIsLoadingClients(true);
      try {
        const data = await get<{ clients: ClientRecord[] }>('/referrer/clients');
        setClients(data.clients || []);
      } catch {}
      setIsLoadingClients(false);
    };
    fetchClients();
  }, [clientType]);

  // ─── ICR / LVR Calculation ────────────────────────────────────
  const parseNum = (v: string) => {
    if (!v) return 0;
    return parseFloat(v.replace(/[$,]/g, '')) || 0;
  };

  const { icr, lvr, outcomeLevel } = useMemo(() => {
    const la = parseNum(loanAmount);
    const pv = parseNum(propertyValue);
    const np = parseNum(netProfit);
    const am = parseNum(ammortisation);
    const dep = parseNum(deprecition);
    const eic = parseNum(existingInterestCosts);
    const re = parseNum(rentalExpense);
    const pri = parseNum(proposedRentalIncome);

    let calcLvr = 0;
    if (la > 0 && pv > 0) calcLvr = (la / pv) * 100;

    let calcIcr = 0;
    if (np > 0 || am > 0 || dep > 0 || eic > 0 || re > 0 || pri > 0) {
      const totalIncome = np + am + dep + eic + re + pri;
      const proposedInterest = la * (INTEREST_RATE / 100);
      const totalInterest = eic + proposedInterest;
      if (totalInterest > 0) calcIcr = totalIncome / totalInterest;
    }

    // Outcome level
    let level = 0;
    let isGreen = false;

    const riskAnswers = [existingLiabilities, additionalSecurity, smsfStructure, atoLiabilities, creditIssues];
    const yesCount = riskAnswers.filter((q) => q === 'yes').length;
    const noCount = riskAnswers.filter((q) => q === 'no').length;

    if (calcIcr >= 2 && calcLvr <= 65) {
      level = 1;
      isGreen = true;
    } else if (calcIcr >= 2 && calcLvr > 65 && calcLvr <= 80) {
      level = 2;
    } else if (calcIcr >= 2 && calcLvr > 80) {
      level = 2;
    } else if (calcIcr < 2 && calcLvr <= 65) {
      level = 2;
    } else if (calcIcr < 2 && calcLvr > 65 && calcLvr <= 80) {
      level = 2;
    } else if (calcIcr < 2 && calcLvr > 80) {
      level = 3;
    }

    if (noCount === 5 && !isGreen) { level = 1; isGreen = true; }
    if (noCount > 0 && yesCount === 0 && !isGreen) { level = 1; isGreen = true; }
    if (yesCount > 0 && isGreen) level = 2;
    if (yesCount > 0) level = 2;
    if (calcIcr < 1.5 && calcIcr > 0) level = 3;

    return { icr: calcIcr, lvr: calcLvr, outcomeLevel: level };
  }, [
    loanAmount, propertyValue, netProfit, ammortisation, deprecition,
    existingInterestCosts, rentalExpense, proposedRentalIncome,
    existingLiabilities, additionalSecurity, smsfStructure, atoLiabilities, creditIssues,
  ]);

  // ─── Validation ───────────────────────────────────────────────
  const validate = (): string | null => {
    // Step 0
    if (!selectedUserId) return 'Please select a referrer user.';

    // Step 1
    if (clientType === 'new') {
      if (!firstName || !lastName || !mobile || !email || !briefOverview)
        return 'Please fill in all required client fields (first name, last name, mobile, email, brief overview).';
    } else {
      if (!selectedClientId) return 'Please select an existing client.';
      if (!briefOverview) return 'Please provide a brief overview.';
    }

    // Step 2 – only validate when hasMoreInfo
    if (hasMoreInfo) {
      if (!loanAmount || !propertyValue || !loanType)
        return 'Please fill in loan amount, property value, and loan type.';
      if (!loanPurpose)
        return 'Please select a loan purpose.';
    }

    // Step 3
    if (!term1 || !term2 || !term3 || !term4)
      return 'Please accept all terms and conditions.';

    return null;
  };

  // ─── Submit ───────────────────────────────────────────────────
  const handleSubmit = async (asDraft: boolean) => {
    if (!asDraft) {
      const error = validate();
      if (error) {
        showToast(error, 'error');
        return;
      }
    }

    setIsSaving(true);
    try {
      const financialDetails: Record<string, any> = {};
      if (hasMoreInfo) {
        financialDetails.fundedFromRental = fundedFromRental || '';
        financialDetails.proposedRentalIncome = proposedRentalIncome;
        financialDetails.netProfitBeforeTax = netProfit;
        financialDetails.amortisation = ammortisation;
        financialDetails.depreciation = deprecition;
        financialDetails.existingInterestCosts = existingInterestCosts;
        financialDetails.rentalExpense = rentalExpense;
        financialDetails.existingLiabilities = existingLiabilities || '';
        financialDetails.additionalSecurity = additionalSecurity || '';
        financialDetails.smsf = smsfStructure || '';
        financialDetails.existingATO = atoLiabilities || '';
        financialDetails.creditIssues = creditIssues || '';
      }

      const payload: Record<string, any> = {
        referrer_user_id: selectedUserId,
        client_type: clientType,
        selected_client_id: clientType === 'existing' ? selectedClientId : null,
        new_client_data: clientType === 'new' ? {
          firstName,
          lastName,
          mobile,
          email,
          entityType,
          entityName,
          abn,
          timeInBusiness,
          companyAddress: clientAddress,
          industry,
        } : null,
        brief_overview: briefOverview,
        has_more_info: hasMoreInfo,
        loan_amount: hasMoreInfo ? loanAmount : '',
        estimated_property_value: hasMoreInfo ? propertyValue : '',
        loan_type: hasMoreInfo ? loanType : '',
        loan_purpose: hasMoreInfo ? loanPurpose : '',
        asset_type: hasMoreInfo ? assetType : '',
        asset_address: hasMoreInfo ? assetAddress : '',
        financial_details: hasMoreInfo ? financialDetails : {},
        icr: hasMoreInfo ? icr : 0,
        lvr: hasMoreInfo ? lvr : 0,
        outcome_level: hasMoreInfo ? outcomeLevel : 0,
        additional_notes: additionalNotes,
        terms_accepted: { term1, term2, term3, term4 },
        status: asDraft ? 'draft' : 'opportunity',
      };

      await post('/referrer/opportunities/create', payload);

      const msg = asDraft ? 'Draft saved successfully' : 'Opportunity submitted successfully';
      showToast(msg, 'success');
      setTimeout(() => {
        router.replace('/(tabs)/opportunities');
      }, 1200);
    } catch (error: any) {
      const errorMsg = error?.data?.error || error?.message || 'Failed to create opportunity. Please try again.';
      showToast(errorMsg, 'error');
      setIsSaving(false);
    }
  };

  const goNext = () => { if (step < 3) setStep((step + 1) as Step); };
  const goPrev = () => { if (step > 0) setStep((step - 1) as Step); };

  // ─── Shared Sub-components ────────────────────────────────────

  // Select dropdown (reused from edit flow)
  const SelectField = ({
    label,
    value,
    options,
    onSelect,
    placeholder = 'Select an option',
    required = false,
  }: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onSelect: (v: string) => void;
    placeholder?: string;
    required?: boolean;
  }) => {
    const [open, setOpen] = useState(false);
    const selectedLabel = options.find((o) => o.value === value)?.label;

    return (
      <View style={styles.selectContainer}>
        <Text style={styles.selectLabel}>
          {label}{required && <Text style={styles.required}> *</Text>}
        </Text>
        <TouchableOpacity
          style={[styles.selectTrigger, open && styles.selectTriggerOpen]}
          onPress={() => setOpen(!open)}
          activeOpacity={0.7}
        >
          <Text style={[styles.selectTriggerText, !selectedLabel && styles.selectPlaceholder]}>
            {selectedLabel || placeholder}
          </Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.gray[400]} />
        </TouchableOpacity>
        {open && (
          <View style={styles.selectDropdown}>
            <ScrollView style={styles.selectDropdownScroll} nestedScrollEnabled>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.selectOption, value === opt.value && styles.selectOptionActive]}
                  onPress={() => { onSelect(opt.value); setOpen(false); }}
                >
                  <Text style={[styles.selectOptionText, value === opt.value && styles.selectOptionTextActive]}>
                    {opt.label}
                  </Text>
                  {value === opt.value && <Ionicons name="checkmark" size={18} color="#1a8cba" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  // Toggle yes/no
  const ToggleRow = ({
    label,
    value,
    onToggle,
  }: {
    label: string;
    value: '' | 'yes' | 'no';
    onToggle: (v: 'yes' | 'no') => void;
  }) => (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={styles.toggleButtons}>
        <TouchableOpacity
          style={[styles.toggleBtn, value === 'yes' && styles.toggleBtnActive]}
          onPress={() => onToggle('yes')}
        >
          <Text style={[styles.toggleBtnText, value === 'yes' && styles.toggleBtnTextActive]}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, value === 'no' && styles.toggleBtnNo]}
          onPress={() => onToggle('no')}
        >
          <Text style={[styles.toggleBtnText, value === 'no' && styles.toggleBtnTextNo]}>No</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Checkbox row
  const CheckboxRow = ({
    checked,
    onToggle,
    text,
  }: {
    checked: boolean;
    onToggle: () => void;
    text: string;
  }) => (
    <TouchableOpacity style={styles.checkboxRow} onPress={onToggle} activeOpacity={0.7}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Ionicons name="checkmark" size={14} color={Colors.white} />}
      </View>
      <Text style={styles.checkboxText}>{text}</Text>
    </TouchableOpacity>
  );

  // ─── Render Progress ──────────────────────────────────────────
  const renderProgress = () => (
    <View style={styles.progressContainer}>
      {STEPS.map((s, i) => {
        const isActive = i === step;
        const isCompleted = i < step;
        return (
          <View key={s.key} style={styles.progressStep}>
            {i > 0 && (
              <View style={[styles.progressLine, (isActive || isCompleted) && styles.progressLineActive]} />
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
                <Ionicons name={s.icon} size={16} color={isActive ? Colors.white : Colors.gray[400]} />
              )}
            </TouchableOpacity>
            <Text style={[styles.progressLabel, (isActive || isCompleted) && styles.progressLabelActive]}>
              {s.label}
            </Text>
          </View>
        );
      })}
    </View>
  );

  // ─── Step 0: Referrer ─────────────────────────────────────────
  const renderReferrerStep = () => (
    <View>
      <Text style={styles.stepTitle}>Referrer</Text>
      <Text style={styles.stepSubtitle}>Select the referrer user for this opportunity</Text>

      {orgName ? (
        <View style={styles.orgCard}>
          <Ionicons name="business-outline" size={20} color="#1a8cba" />
          <View style={{ flex: 1 }}>
            <Text style={styles.orgLabel}>Organisation</Text>
            <Text style={styles.orgName}>{orgName}</Text>
          </View>
        </View>
      ) : null}

      {isLoadingUsers ? (
        <ActivityIndicator size="small" color="#1a8cba" style={{ marginTop: 16 }} />
      ) : (
        <SelectField
          label="Select Referrer User"
          value={selectedUserId}
          onSelect={setSelectedUserId}
          placeholder="Select a user"
          required
          options={referrerUsers.map((u) => ({
            value: u.id,
            label: `${u.first_name} ${u.surname} (${u.email})`,
          }))}
        />
      )}
    </View>
  );

  // ─── Step 1: Client ───────────────────────────────────────────
  const renderClientStep = () => (
    <View>
      <Text style={styles.stepTitle}>Client</Text>
      <Text style={styles.stepSubtitle}>Enter client details for this opportunity</Text>

      {/* New / Existing toggle */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segmentBtn, clientType === 'new' && styles.segmentBtnActive]}
          onPress={() => setClientType('new')}
        >
          <Text style={[styles.segmentText, clientType === 'new' && styles.segmentTextActive]}>New Client</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, clientType === 'existing' && styles.segmentBtnActive]}
          onPress={() => setClientType('existing')}
        >
          <Text style={[styles.segmentText, clientType === 'existing' && styles.segmentTextActive]}>Existing Client</Text>
        </TouchableOpacity>
      </View>

      {clientType === 'new' ? (
        <>
          <Input
            label="First Name"
            placeholder="Director First Name"
            value={firstName}
            onChangeText={setFirstName}
            required
          />

          <Input
            label="Last Name"
            placeholder="Director Surname"
            value={lastName}
            onChangeText={setLastName}
            required
          />

          <PhoneInput
            label="Mobile"
            placeholder="98765 43210"
            value={mobile}
            onChangeText={setMobile}
            countryCode="+91"
            required
          />

          <Input
            label="Email"
            placeholder="Contact Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            required
          />

          <Input
            label="ABN / GST No."
            placeholder="ABN / GST No."
            value={abn}
            onChangeText={setAbn}
            keyboardType="numeric"
            maxLength={11}
          />

          <SelectField
            label="Entity Type"
            value={entityType}
            onSelect={setEntityType}
            options={ENTITY_TYPE_OPTIONS_WEB}
          />

          <Input
            label="Entity Name"
            placeholder="Entity Name"
            value={entityName}
            onChangeText={setEntityName}
          />

          <Input
            label="Time in Business"
            placeholder="e.g. 4 Years"
            value={timeInBusiness}
            onChangeText={setTimeInBusiness}
          />

          <Input
            label="Company Address"
            placeholder="Enter address"
            value={clientAddress}
            onChangeText={setClientAddress}
          />

          <SelectField
            label="Industry"
            value={industry}
            onSelect={setIndustry}
            options={IndustryOptions}
          />

          <Input
            label="Brief Overview"
            placeholder="Supply us with a few key details about the opportunity, including the client's funding purpose, security type and value, loan amount required, and any other material considerations."
            value={briefOverview}
            onChangeText={setBriefOverview}
            multiline
            numberOfLines={5}
            style={styles.textArea}
            required
          />
        </>
      ) : (
        <>
          {isLoadingClients ? (
            <ActivityIndicator size="small" color="#1a8cba" style={{ marginTop: 16 }} />
          ) : (
            <SelectField
              label="Select Client"
              value={selectedClientId}
              onSelect={setSelectedClientId}
              placeholder="Select an existing client"
              required
              options={clients.map((c) => ({
                value: c._id || c.id || '',
                label: `${c.entity_name || ''} - ${c.contact_first_name || ''} ${c.contact_last_name || ''}`.trim(),
              }))}
            />
          )}

          <Input
            label="Brief Overview"
            placeholder="Supply us with a few key details about the opportunity..."
            value={briefOverview}
            onChangeText={setBriefOverview}
            multiline
            numberOfLines={5}
            style={styles.textArea}
            required
          />
        </>
      )}
    </View>
  );

  // ─── Step 2: Detailed Opportunity Info ────────────────────────
  const renderDetailsStep = () => (
    <View>
      <Text style={styles.stepTitle}>Detailed Information</Text>
      <Text style={styles.stepSubtitle}>
        If you do not have these details at this time, we can complete them later.
      </Text>

      {/* Has more info toggle */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segmentBtn, !hasMoreInfo && styles.segmentBtnActive]}
          onPress={() => setHasMoreInfo(false)}
        >
          <Text style={[styles.segmentText, !hasMoreInfo && styles.segmentTextActive]}>
            {"I don't have info"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, hasMoreInfo && styles.segmentBtnActive]}
          onPress={() => setHasMoreInfo(true)}
        >
          <Text style={[styles.segmentText, hasMoreInfo && styles.segmentTextActive]}>
            I have more info
          </Text>
        </TouchableOpacity>
      </View>

      {hasMoreInfo && (
        <>
          {/* ── Loan Section ── */}
          <View style={styles.sectionHeader}>
            <Ionicons name="cash-outline" size={18} color="#1a8cba" />
            <Text style={styles.sectionHeaderText}>Loan Details</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <CurrencyInput
                label="Loan Amount"
                placeholder="0"
                value={loanAmount}
                onChangeText={(v) => setLoanAmount(numericOnly(v))}
                required
              />
            </View>
            <View style={styles.halfField}>
              <CurrencyInput
                label="Property Value"
                placeholder="0"
                value={propertyValue}
                onChangeText={(v) => setPropertyValue(numericOnly(v))}
                required
              />
            </View>
          </View>

          <SelectField
            label="Type of Asset"
            value={assetType}
            onSelect={setAssetType}
            options={Object.entries(AssetTypeLabels).map(([k, v]) => ({ value: k, label: v }))}
          />

          <Input
            label="Asset Address"
            placeholder="Property address"
            value={assetAddress}
            onChangeText={setAssetAddress}
          />

          <SelectField
            label="Loan Type"
            value={loanType}
            onSelect={setLoanType}
            options={Object.entries(LoanTypeLabels).map(([k, v]) => ({ value: k, label: v }))}
            required
          />

          <SelectField
            label="Loan Purpose"
            value={loanPurpose}
            onSelect={setLoanPurpose}
            options={LOAN_PURPOSE_OPTIONS}
          />

          <View style={styles.divider} />

          {/* ── Financial Section ── */}
          <View style={styles.sectionHeader}>
            <Ionicons name="calculator-outline" size={18} color="#1a8cba" />
            <Text style={styles.sectionHeaderText}>Financial Details</Text>
          </View>

          <Text style={styles.fieldDescription}>
            Will the property be funded solely from rental income?
          </Text>
          <ToggleRow
            label="Funded from rental income"
            value={fundedFromRental}
            onToggle={setFundedFromRental}
          />

          {fundedFromRental === 'yes' && (
            <CurrencyInput
              label="Proposed Rental Income (Annual)"
              placeholder="0"
              value={proposedRentalIncome}
              onChangeText={(v) => setProposedRentalIncome(numericOnly(v))}
            />
          )}

          {fundedFromRental === 'no' && (
            <>
              <CurrencyInput
                label="Net Profit Before Tax"
                placeholder="0"
                value={netProfit}
                onChangeText={(v) => setNetProfit(numericOnly(v))}
              />

              <Text style={styles.addbacksLabel}>Addbacks</Text>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <CurrencyInput
                    label="Amortisation"
                    placeholder="0"
                    value={ammortisation}
                    onChangeText={(v) => setAmmortisation(numericOnly(v))}
                  />
                </View>
                <View style={styles.halfField}>
                  <CurrencyInput
                    label="Depreciation"
                    placeholder="0"
                    value={deprecition}
                    onChangeText={(v) => setDeprecition(numericOnly(v))}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <CurrencyInput
                    label="Existing Interest Costs"
                    placeholder="0"
                    value={existingInterestCosts}
                    onChangeText={(v) => setExistingInterestCosts(numericOnly(v))}
                  />
                </View>
                <View style={styles.halfField}>
                  <CurrencyInput
                    label="Rental Expense"
                    placeholder="0"
                    value={rentalExpense}
                    onChangeText={(v) => setRentalExpense(numericOnly(v))}
                  />
                </View>
              </View>

              <CurrencyInput
                label="Proposed Rental Income (Annual)"
                placeholder="0"
                value={proposedRentalIncome}
                onChangeText={(v) => setProposedRentalIncome(numericOnly(v))}
              />
            </>
          )}

          <View style={styles.divider} />

          {/* ── Risk Indicators ── */}
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-outline" size={18} color="#E5A62B" />
            <Text style={styles.sectionHeaderText}>Risk Indicators</Text>
          </View>

          <ToggleRow
            label="Existing liabilities?"
            value={existingLiabilities}
            onToggle={setExistingLiabilities}
          />
          <ToggleRow
            label="Additional security / property?"
            value={additionalSecurity}
            onToggle={setAdditionalSecurity}
          />
          <ToggleRow
            label="SMSF structure?"
            value={smsfStructure}
            onToggle={setSmsfStructure}
          />
          <ToggleRow
            label="ATO / tax liabilities?"
            value={atoLiabilities}
            onToggle={setAtoLiabilities}
          />
          <ToggleRow
            label="Credit file issues?"
            value={creditIssues}
            onToggle={setCreditIssues}
          />

          <View style={styles.divider} />

          {/* ── Outcome ── */}
          <View style={styles.sectionHeader}>
            <Ionicons name="analytics-outline" size={18} color="#1a8cba" />
            <Text style={styles.sectionHeaderText}>Outcome</Text>
          </View>

          {(icr > 0 || lvr > 0) && (
            <View style={styles.calcRow}>
              {icr > 0 && <Text style={styles.calcText}>ICR: {icr.toFixed(3)}</Text>}
              {lvr > 0 && <Text style={styles.calcText}>LVR: {lvr.toFixed(0)}%</Text>}
            </View>
          )}

          {outcomeLevel === 0 && (
            <View style={[styles.outcomeCard, styles.outcomeDefault]}>
              <Text style={styles.outcomeDefaultText}>
                Complete the fields above to reveal an initial outcome.
              </Text>
            </View>
          )}
          {outcomeLevel === 1 && (
            <View style={[styles.outcomeCard, styles.outcomeGreen]}>
              <Ionicons name="checkmark-circle" size={20} color="#059669" />
              <Text style={styles.outcomeGreenText}>Deal looks good. Submit now!</Text>
            </View>
          )}
          {outcomeLevel === 2 && (
            <View style={[styles.outcomeCard, styles.outcomeYellow]}>
              <Ionicons name="warning" size={20} color="#D97706" />
              <Text style={styles.outcomeYellowText}>
                Deal looks ok, we just need further confirmation. Submit now and a Loanease team member will be in touch.
              </Text>
            </View>
          )}
          {outcomeLevel === 3 && (
            <View style={[styles.outcomeCard, styles.outcomeRed]}>
              <Ionicons name="close-circle" size={20} color="#DC2626" />
              <Text style={styles.outcomeRedText}>
                Deal does not meet the streamlined process and will require further assessment. Submit now and a Loanease team member will be in touch.
              </Text>
            </View>
          )}

          <View style={{ marginTop: 12 }}>
            <Input
              label="Additional Notes"
              placeholder="Any additional notes for this opportunity..."
              value={additionalNotes}
              onChangeText={setAdditionalNotes}
              multiline
              numberOfLines={3}
              style={styles.textArea}
            />
          </View>
        </>
      )}
    </View>
  );

  // ─── Step 3: Terms & Submit ───────────────────────────────────
  const renderTermsStep = () => (
    <View>
      <Text style={styles.stepTitle}>Terms & Conditions</Text>
      <Text style={styles.stepSubtitle}>Please review and accept the terms below</Text>

      <View style={styles.termsCard}>
        <CheckboxRow checked={term1} onToggle={() => setTerm1(!term1)} text={TERMS[0]} />
        <CheckboxRow checked={term2} onToggle={() => setTerm2(!term2)} text={TERMS[1]} />
        <CheckboxRow checked={term3} onToggle={() => setTerm3(!term3)} text={TERMS[2]} />
        <CheckboxRow checked={term4} onToggle={() => setTerm4(!term4)} text={TERMS[3]} />
      </View>
    </View>
  );

  // ─── Render Step Content ──────────────────────────────────────
  const renderStepContent = () => {
    switch (step) {
      case 0: return renderReferrerStep();
      case 1: return renderClientStep();
      case 2: return renderDetailsStep();
      case 3: return renderTermsStep();
    }
  };

  // ─── Main Render ──────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
          <View style={styles.submitRow}>
            <TouchableOpacity
              style={styles.saveDraftBtn}
              onPress={() => handleSubmit(true)}
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
              onPress={() => handleSubmit(false)}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.submitText}>Save & Submit</Text>
                  <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, step === 0 && styles.navBtnDisabled]}
              onPress={goPrev}
              disabled={step === 0}
            >
              <Ionicons name="chevron-back" size={20} color={step === 0 ? Colors.gray[300] : '#1a8cba'} />
              <Text style={[styles.navBtnText, step === 0 && styles.navBtnTextDisabled]}>Previous</Text>
            </TouchableOpacity>

            <Text style={styles.stepIndicator}>{step + 1} / {STEPS.length}</Text>

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

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 14,
  },

  // Required asterisk
  required: {
    color: '#EF4444',
  },

  // Organisation card
  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  orgLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.gray[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orgName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },

  // Segmented control
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.gray[100],
    borderRadius: 12,
    padding: 3,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[500],
  },
  segmentTextActive: {
    color: '#0F172A',
    fontWeight: '600',
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
  fieldDescription: {
    fontSize: 13,
    color: Colors.gray[500],
    marginBottom: 8,
  },
  addbacksLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 4,
    marginBottom: 12,
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

  // Checkbox
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.gray[300],
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#1a8cba',
    borderColor: '#1a8cba',
  },
  checkboxText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: '#0F172A',
  },

  // Terms card
  termsCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Calculations / Outcome
  calcRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  calcText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  outcomeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  outcomeDefault: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#d1f4e0',
  },
  outcomeDefaultText: {
    fontSize: 13,
    color: Colors.gray[500],
    flex: 1,
  },
  outcomeGreen: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  outcomeGreenText: {
    fontSize: 13,
    color: '#166534',
    flex: 1,
  },
  outcomeYellow: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  outcomeYellowText: {
    fontSize: 13,
    color: '#92400E',
    flex: 1,
  },
  outcomeRed: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  outcomeRedText: {
    fontSize: 13,
    color: '#991B1B',
    flex: 1,
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
