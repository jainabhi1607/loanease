/**
 * Pre-Assessment Tool Screen
 * Matches the web app's pre-assessment tool for quick loan qualification check
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CurrencyInput } from '../components/ui';
import { Colors } from '../constants/colors';
import { get } from '../lib/api';

// ─── Types ──────────────────────────────────────────────────────
interface FundingData {
  loanAmount: string;
  estimatedPropertyValue: string;
  fundedFromRental: '' | 'yes' | 'no';
  proposedRentalIncome: string;
  netProfitBeforeTax: string;
  amortisation: string;
  depreciation: string;
  existingInterestCosts: string;
  rentalExpense: string;
}

interface OtherQuestionsData {
  existingLiabilities: '' | 'yes' | 'no';
  additionalSecurity: '' | 'yes' | 'no';
  smsf: '' | 'yes' | 'no';
  existingATO: '' | 'yes' | 'no';
}

interface OutcomeResult {
  icr: number;
  lvr: number;
  status: 'green' | 'yellow' | 'red' | null;
  message: string;
}

// ─── Yes/No Toggle Component ────────────────────────────────────
function YesNoToggle({
  value,
  onChange,
}: {
  value: '' | 'yes' | 'no';
  onChange: (val: 'yes' | 'no') => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <TouchableOpacity
        style={[
          styles.toggleOption,
          value === 'yes' && styles.toggleOptionActive,
        ]}
        onPress={() => onChange('yes')}
        activeOpacity={0.7}
      >
        <View style={[styles.radioCircle, value === 'yes' && styles.radioCircleActive]}>
          {value === 'yes' && <View style={styles.radioInner} />}
        </View>
        <Text style={[styles.toggleText, value === 'yes' && styles.toggleTextActive]}>Yes</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.toggleOption,
          value === 'no' && styles.toggleOptionActive,
        ]}
        onPress={() => onChange('no')}
        activeOpacity={0.7}
      >
        <View style={[styles.radioCircle, value === 'no' && styles.radioCircleActive]}>
          {value === 'no' && <View style={styles.radioInner} />}
        </View>
        <Text style={[styles.toggleText, value === 'no' && styles.toggleTextActive]}>No</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────────────
export default function PreAssessmentScreen() {
  const [interestRate, setInterestRate] = useState(8.5);

  const [fundingData, setFundingData] = useState<FundingData>({
    loanAmount: '',
    estimatedPropertyValue: '',
    fundedFromRental: '',
    proposedRentalIncome: '',
    netProfitBeforeTax: '',
    amortisation: '',
    depreciation: '',
    existingInterestCosts: '',
    rentalExpense: '',
  });

  const [otherQuestions, setOtherQuestions] = useState<OtherQuestionsData>({
    existingLiabilities: '',
    additionalSecurity: '',
    smsf: '',
    existingATO: '',
  });

  // Fetch interest rate from API
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const data = await get<{ interestRate: number }>('/settings/interest-rate');
        if (data.interestRate) setInterestRate(data.interestRate);
      } catch {
        // Use default 8.5%
      }
    };
    fetchRate();
  }, []);

  // Calculate outcome live
  const outcome = useMemo<OutcomeResult>(() => {
    const loanAmount = parseFloat(fundingData.loanAmount) || 0;
    const propertyValue = parseFloat(fundingData.estimatedPropertyValue) || 0;

    if (loanAmount === 0 || propertyValue === 0) {
      return {
        icr: 0,
        lvr: 0,
        status: null,
        message: 'Please complete the fields above to reveal an initial outcome.',
      };
    }

    const netProfit = parseFloat(fundingData.netProfitBeforeTax) || 0;
    const amortisation = parseFloat(fundingData.amortisation) || 0;
    const depreciation = parseFloat(fundingData.depreciation) || 0;
    const existingInterestCosts = parseFloat(fundingData.existingInterestCosts) || 0;
    const rentalExpense = parseFloat(fundingData.rentalExpense) || 0;
    const proposedRentalIncome = parseFloat(fundingData.proposedRentalIncome) || 0;

    // LVR
    const lvr = (loanAmount / propertyValue) * 100;

    // ICR
    const totalIncomeServicing =
      netProfit + amortisation + depreciation + existingInterestCosts + rentalExpense + proposedRentalIncome;
    const totalInterest = existingInterestCosts + (loanAmount * interestRate) / 100;
    const icr = totalInterest > 0 ? totalIncomeServicing / totalInterest : 0;

    // Check risk questions
    const hasYesAnswers =
      otherQuestions.existingLiabilities === 'yes' ||
      otherQuestions.additionalSecurity === 'yes' ||
      otherQuestions.smsf === 'yes' ||
      otherQuestions.existingATO === 'yes';

    let status: 'green' | 'yellow' | 'red' = 'green';
    let message = '';
    let isGreen = false;

    if (icr >= 2 && lvr <= 65) {
      status = 'green';
      message = 'Deal looks good. Submit now!';
      isGreen = true;
    } else if (icr >= 2 && lvr > 65 && lvr <= 80) {
      status = 'yellow';
      message = 'Deal looks ok, we just need further confirmation. Submit now and a Loanease team member will be in touch to discuss.';
    } else if (icr >= 2 && lvr > 80) {
      status = 'yellow';
      message = 'Deal looks ok, we just need further confirmation. Submit now and a Loanease team member will be in touch to discuss.';
    } else if (icr < 2 && lvr <= 65) {
      status = 'yellow';
      message = 'Deal looks ok, we just need further confirmation. Submit now and a Loanease team member will be in touch to discuss.';
    } else if (icr < 2 && lvr > 65 && lvr <= 80) {
      status = 'yellow';
      message = 'Deal looks ok, we just need further confirmation. Submit now and a Loanease team member will be in touch to discuss.';
    } else if (icr < 2 && lvr > 80) {
      status = 'red';
      message = 'Deal does not meet the streamlined process and will require further assessment. Submit now and a Loanease team member will be in touch to discuss.';
    }

    // If any Yes answers and was green, change to yellow
    if (hasYesAnswers && isGreen) {
      status = 'yellow';
      message = 'Deal looks ok, we just need further confirmation. Submit now and a Loanease team member will be in touch to discuss.';
    }

    if (hasYesAnswers && status === 'green') {
      status = 'yellow';
      message = 'Deal looks ok, we just need further confirmation. Submit now and a Loanease team member will be in touch to discuss.';
    }

    // ICR < 1.5 always red (final override)
    if (icr < 1.5 && icr > 0) {
      status = 'red';
      message = 'Deal does not meet the streamlined process and will require further assessment. Submit now and a Loanease team member will be in touch to discuss.';
    }

    return { icr, lvr, status, message };
  }, [fundingData, otherQuestions, interestRate]);

  // Clear all fields
  const handleClear = useCallback(() => {
    setFundingData({
      loanAmount: '',
      estimatedPropertyValue: '',
      fundedFromRental: '',
      proposedRentalIncome: '',
      netProfitBeforeTax: '',
      amortisation: '',
      depreciation: '',
      existingInterestCosts: '',
      rentalExpense: '',
    });
    setOtherQuestions({
      existingLiabilities: '',
      additionalSecurity: '',
      smsf: '',
      existingATO: '',
    });
  }, []);

  // Progress to opportunity - navigate to add with pre-filled data
  const handleProgressToOpportunity = useCallback(() => {
    const params: Record<string, string> = {
      loanAmount: fundingData.loanAmount,
      estimatedPropertyValue: fundingData.estimatedPropertyValue,
      fundedFromRental: fundingData.fundedFromRental,
      proposedRentalIncome: fundingData.proposedRentalIncome,
      netProfitBeforeTax: fundingData.netProfitBeforeTax,
      amortisation: fundingData.amortisation,
      depreciation: fundingData.depreciation,
      existingInterestCosts: fundingData.existingInterestCosts,
      rentalExpense: fundingData.rentalExpense,
      existingLiabilities: otherQuestions.existingLiabilities,
      additionalSecurity: otherQuestions.additionalSecurity,
      smsf: otherQuestions.smsf,
      existingATO: otherQuestions.existingATO,
      fromPreAssessment: 'true',
    };
    router.push({ pathname: '/opportunity/add', params });
  }, [fundingData, otherQuestions]);

  // Update funding field helper
  const updateFunding = (field: keyof FundingData, value: string) => {
    setFundingData((prev) => ({ ...prev, [field]: value }));
  };

  // Outcome styling
  const getOutcomeStyle = () => {
    switch (outcome.status) {
      case 'green':
        return { bg: '#d1f4e0', border: '#00D37F', text: '#00D37F', icon: 'thumbs-up' as const };
      case 'yellow':
        return { bg: '#FFF8E1', border: '#FFB300', text: '#FFB300', icon: 'alert-circle' as const };
      case 'red':
        return { bg: '#FEE2E2', border: '#EF4444', text: '#EF4444', icon: 'close-circle' as const };
      default:
        return { bg: '#FFFFFF', border: '#d1f4e0', text: '#787274', icon: null };
    }
  };

  const outcomeStyle = getOutcomeStyle();
  const canProgress = !!fundingData.loanAmount && !!fundingData.estimatedPropertyValue;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Green background wrapper */}
        <View style={styles.greenWrapper}>
          {/* Section: Funding Requirements */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{"Your Client's Funding Requirements"}</Text>

            <CurrencyInput
              label="Loan Amount"
              required
              placeholder="Enter loan amount"
              value={fundingData.loanAmount}
              onChangeText={(v) => updateFunding('loanAmount', v.replace(/[^0-9.]/g, ''))}
            />

            <CurrencyInput
              label="Estimated Property Value"
              required
              placeholder="Enter property value"
              value={fundingData.estimatedPropertyValue}
              onChangeText={(v) => updateFunding('estimatedPropertyValue', v.replace(/[^0-9.]/g, ''))}
            />

            {/* Funded from rental */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Funding</Text>
              <Text style={styles.fieldHint}>
                Will the property be funded solely from rental income?
              </Text>
              <YesNoToggle
                value={fundingData.fundedFromRental}
                onChange={(val) => updateFunding('fundedFromRental', val)}
              />
            </View>

            {/* Conditional fields: Yes = only Proposed Rental Income */}
            {fundingData.fundedFromRental === 'yes' && (
              <CurrencyInput
                label="Proposed Rental Income (Annual)"
                placeholder="Enter proposed rental income"
                value={fundingData.proposedRentalIncome}
                onChangeText={(v) => updateFunding('proposedRentalIncome', v.replace(/[^0-9.]/g, ''))}
              />
            )}

            {/* Conditional fields: No = all financial fields */}
            {fundingData.fundedFromRental === 'no' && (
              <>
                <CurrencyInput
                  label="Net Profit Before Tax"
                  placeholder="Enter net profit"
                  value={fundingData.netProfitBeforeTax}
                  onChangeText={(v) => updateFunding('netProfitBeforeTax', v.replace(/[^0-9.]/g, ''))}
                />

                <Text style={styles.addbacksLabel}>Addbacks</Text>

                <CurrencyInput
                  label="Amortisation"
                  placeholder="Enter amortisation"
                  value={fundingData.amortisation}
                  onChangeText={(v) => updateFunding('amortisation', v.replace(/[^0-9.]/g, ''))}
                />

                <CurrencyInput
                  label="Depreciation"
                  placeholder="Enter depreciation"
                  value={fundingData.depreciation}
                  onChangeText={(v) => updateFunding('depreciation', v.replace(/[^0-9.]/g, ''))}
                />

                <CurrencyInput
                  label="Existing Interest Costs"
                  placeholder="Enter interest costs"
                  value={fundingData.existingInterestCosts}
                  onChangeText={(v) => updateFunding('existingInterestCosts', v.replace(/[^0-9.]/g, ''))}
                />

                <CurrencyInput
                  label="Rental Expense"
                  placeholder="Enter rental expense"
                  value={fundingData.rentalExpense}
                  onChangeText={(v) => updateFunding('rentalExpense', v.replace(/[^0-9.]/g, ''))}
                />

                <CurrencyInput
                  label="Proposed Rental Income (Annual)"
                  placeholder="Enter proposed rental income"
                  value={fundingData.proposedRentalIncome}
                  onChangeText={(v) => updateFunding('proposedRentalIncome', v.replace(/[^0-9.]/g, ''))}
                />
              </>
            )}
          </View>

          {/* Section: Other Questions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Other Questions</Text>

            <View style={styles.questionItem}>
              <Text style={styles.questionText}>
                Does your business and/or the borrowing entity have any existing liabilities?
              </Text>
              <YesNoToggle
                value={otherQuestions.existingLiabilities}
                onChange={(val) => setOtherQuestions((prev) => ({ ...prev, existingLiabilities: val }))}
              />
            </View>

            <View style={styles.questionItem}>
              <Text style={styles.questionText}>
                Are you looking to offer up additional property security to support your equity position?
              </Text>
              <YesNoToggle
                value={otherQuestions.additionalSecurity}
                onChange={(val) => setOtherQuestions((prev) => ({ ...prev, additionalSecurity: val }))}
              />
            </View>

            <View style={styles.questionItem}>
              <Text style={styles.questionText}>
                Is the application an SMSF structure?
              </Text>
              <YesNoToggle
                value={otherQuestions.smsf}
                onChange={(val) => setOtherQuestions((prev) => ({ ...prev, smsf: val }))}
              />
            </View>

            <View style={styles.questionItem}>
              <Text style={styles.questionText}>
                Do you have any existing or overdue ATO / tax liabilities?
              </Text>
              <YesNoToggle
                value={otherQuestions.existingATO}
                onChange={(val) => setOtherQuestions((prev) => ({ ...prev, existingATO: val }))}
              />
            </View>
          </View>

          {/* Section: Outcome */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Outcome</Text>

            {outcome.status && (outcome.icr > 0 || outcome.lvr > 0) && (
              <View style={styles.outcomeMetrics}>
                <Text style={styles.outcomeMetricText}>ICR : {outcome.icr.toFixed(2)}</Text>
                <Text style={styles.outcomeMetricText}>LVR : {outcome.lvr.toFixed(0)}</Text>
              </View>
            )}

            <View
              style={[
                styles.outcomeCard,
                {
                  backgroundColor: outcomeStyle.bg,
                  borderColor: outcomeStyle.border,
                },
              ]}
            >
              {outcomeStyle.icon && (
                <Ionicons name={outcomeStyle.icon} size={20} color={outcomeStyle.text} style={styles.outcomeIcon} />
              )}
              <Text style={[styles.outcomeMessage, { color: outcomeStyle.text }]}>
                {outcome.message}
              </Text>
            </View>
          </View>

          {/* Section: Progress to Opportunity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Progress to opportunity</Text>
            <Text style={styles.progressHint}>
              Click the button below to copy the details above to a new opportunity application
            </Text>

            <TouchableOpacity
              style={[styles.progressButton, !canProgress && styles.progressButtonDisabled]}
              onPress={handleProgressToOpportunity}
              disabled={!canProgress}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-forward" size={18} color="#fff" />
              <Text style={styles.progressButtonText}>Progress to opportunity</Text>
            </TouchableOpacity>
          </View>

          {/* Clear Result */}
          <TouchableOpacity style={styles.clearButton} onPress={handleClear} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={18} color="#787274" />
            <Text style={styles.clearButtonText}>Clear Result</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  greenWrapper: {
    backgroundColor: '#EDFFD7',
    borderRadius: 16,
    padding: 20,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#02383B',
    marginBottom: 16,
  },

  // Field group
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray[700],
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 13,
    color: '#787274',
    marginBottom: 10,
  },

  // Addbacks label
  addbacksLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#02383B',
    marginBottom: 12,
    marginTop: 4,
  },

  // Yes/No Toggle
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1f4e0',
    backgroundColor: '#f0fdf4',
  },
  toggleOptionActive: {
    borderColor: '#00D37F',
    backgroundColor: '#d1f4e0',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#00D37F',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00D37F',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#02383B',
  },
  toggleTextActive: {
    color: '#02383B',
  },

  // Questions
  questionItem: {
    marginBottom: 16,
  },
  questionText: {
    fontSize: 13,
    color: '#787274',
    marginBottom: 10,
    lineHeight: 18,
  },

  // Outcome
  outcomeMetrics: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 10,
  },
  outcomeMetricText: {
    fontSize: 13,
    color: '#787274',
  },
  outcomeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  outcomeIcon: {
    marginTop: 1,
  },
  outcomeMessage: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },

  // Progress to Opportunity
  progressHint: {
    fontSize: 13,
    color: '#787274',
    marginBottom: 14,
  },
  progressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00D37F',
    paddingVertical: 14,
    borderRadius: 10,
  },
  progressButtonDisabled: {
    opacity: 0.5,
  },
  progressButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // Clear button
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    backgroundColor: '#fff',
    marginTop: 4,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#787274',
  },
});
