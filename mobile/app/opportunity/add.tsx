/**
 * Add Opportunity Screen
 * Multi-step form to create new opportunity
 */
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Button, Input, PhoneInput, CurrencyInput } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { post } from '../../lib/api';

type Step = 1 | 2 | 3 | 4;

export default function AddOpportunityScreen() {
  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    // Client
    clientType: 'new' as 'new' | 'existing',
    firstName: '',
    lastName: '',
    mobile: '',
    email: '',
    entityName: '',

    // Loan
    briefOverview: '',
    hasMoreInfo: false,
    loanAmount: '',
    propertyValue: '',

    // Terms
    termsAccepted: false,
  });

  // Update form field
  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Submit opportunity
  const handleSubmit = async (asDraft: boolean) => {
    setIsLoading(true);

    try {
      await post('/referrer/opportunities/create', {
        client_type: formData.clientType,
        new_client_data: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          mobile: formData.mobile,
          email: formData.email,
          entityName: formData.entityName,
        },
        brief_overview: formData.briefOverview,
        has_more_info: formData.hasMoreInfo,
        loan_amount: formData.loanAmount ? parseInt(formData.loanAmount) : undefined,
        estimated_property_value: formData.propertyValue ? parseInt(formData.propertyValue) : undefined,
        status: asDraft ? 'draft' : 'opportunity',
      });

      Alert.alert(
        'Success',
        asDraft ? 'Draft saved successfully' : 'Opportunity submitted successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create opportunity. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render step content
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.stepTitle}>Client Information</Text>
            <Text style={styles.stepSubtitle}>Enter the client's details</Text>

            <Input
              label="First Name"
              placeholder="Enter first name"
              value={formData.firstName}
              onChangeText={(v) => updateField('firstName', v)}
              required
            />
            <Input
              label="Last Name"
              placeholder="Enter last name"
              value={formData.lastName}
              onChangeText={(v) => updateField('lastName', v)}
              required
            />
            <PhoneInput
              label="Mobile"
              placeholder="412 345 678"
              value={formData.mobile}
              onChangeText={(v) => updateField('mobile', v)}
              required
            />
            <Input
              label="Email"
              placeholder="Enter email"
              value={formData.email}
              onChangeText={(v) => updateField('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              required
            />
            <Input
              label="Entity/Company Name"
              placeholder="Enter company name"
              value={formData.entityName}
              onChangeText={(v) => updateField('entityName', v)}
            />
          </>
        );

      case 2:
        return (
          <>
            <Text style={styles.stepTitle}>Brief Overview</Text>
            <Text style={styles.stepSubtitle}>Describe the loan requirements</Text>

            <Input
              label="Overview"
              placeholder="Describe the loan requirements, purpose, and any relevant details..."
              value={formData.briefOverview}
              onChangeText={(v) => updateField('briefOverview', v)}
              multiline
              numberOfLines={6}
              style={styles.textArea}
            />
          </>
        );

      case 3:
        return (
          <>
            <Text style={styles.stepTitle}>Loan Details</Text>
            <Text style={styles.stepSubtitle}>Optional loan information</Text>

            <CurrencyInput
              label="Loan Amount"
              placeholder="0"
              value={formData.loanAmount}
              onChangeText={(v) => updateField('loanAmount', v)}
            />
            <CurrencyInput
              label="Estimated Property Value"
              placeholder="0"
              value={formData.propertyValue}
              onChangeText={(v) => updateField('propertyValue', v)}
            />
          </>
        );

      case 4:
        return (
          <>
            <Text style={styles.stepTitle}>Review & Submit</Text>
            <Text style={styles.stepSubtitle}>Review your opportunity details</Text>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewLabel}>Client</Text>
              <Text style={styles.reviewValue}>
                {formData.firstName} {formData.lastName}
              </Text>
              <Text style={styles.reviewValue}>{formData.email}</Text>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewLabel}>Overview</Text>
              <Text style={styles.reviewValue}>
                {formData.briefOverview || 'No overview provided'}
              </Text>
            </View>

            {formData.loanAmount && (
              <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>Loan Amount</Text>
                <Text style={styles.reviewValue}>${formData.loanAmount}</Text>
              </View>
            )}
          </>
        );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress */}
        <View style={styles.progress}>
          {[1, 2, 3, 4].map((s) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                s <= step && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
        <Text style={styles.progressText}>Step {step} of 4</Text>

        {/* Content */}
        <View style={styles.form}>{renderStep()}</View>

        {/* Navigation */}
        <View style={styles.navigation}>
          {step > 1 && (
            <Button
              title="Back"
              variant="outline"
              onPress={() => setStep((step - 1) as Step)}
              style={styles.navButton}
            />
          )}

          {step < 4 ? (
            <Button
              title="Continue"
              onPress={() => setStep((step + 1) as Step)}
              style={[styles.navButton, step === 1 && styles.fullButton]}
            />
          ) : (
            <View style={styles.submitButtons}>
              <Button
                title="Save Draft"
                variant="outline"
                onPress={() => handleSubmit(true)}
                loading={isLoading}
                style={styles.draftButton}
              />
              <Button
                title="Submit"
                onPress={() => handleSubmit(false)}
                loading={isLoading}
                style={styles.submitButton}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gray[200],
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.gray[500],
    marginBottom: 24,
  },
  form: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.teal,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.gray[500],
    marginBottom: 24,
  },
  textArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  reviewSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray[500],
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 16,
    color: Colors.gray[900],
  },
  navigation: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  navButton: {
    flex: 1,
  },
  fullButton: {
    flex: 1,
  },
  submitButtons: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  draftButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});
