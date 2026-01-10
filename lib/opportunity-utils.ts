/**
 * Shared utility functions for formatting opportunity data
 * Used by both admin and referrer opportunity detail pages
 */

export const formatCurrency = (amount?: number) => {
  if (!amount) return '-';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Australian timezone constant
const AUSTRALIAN_TIMEZONE = 'Australia/Sydney';

export const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: AUSTRALIAN_TIMEZONE
  });
};

export const formatDateTime = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: AUSTRALIAN_TIMEZONE
  });
};

export const formatTime = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: AUSTRALIAN_TIMEZONE
  });
};

export const formatEntityType = (type?: string) => {
  if (!type) return '-';
  const types: { [key: string]: string } = {
    'private_company': 'Private Company',
    'public_company': 'Public Company', // Legacy - kept for backwards compatibility
    'sole_trader': 'Sole Trader',
    'smsf_trust': 'SMSF Trust',
    'trust': 'Trust',
    'partnership': 'Partnership',
    'individual': 'Individual'
  };
  return types[type] || type;
};

export const formatAssetType = (type?: string) => {
  if (!type) return '-';
  const types: { [key: string]: string } = {
    'commercial_property': 'Commercial Property',
    'residential_property': 'Residential Property',
    'vacant_land': 'Vacant Land'
  };
  return types[type] || type;
};

export const formatIndustry = (industry?: string) => {
  if (!industry) return '-';
  const industries: { [key: string]: string } = {
    'arts_and_lifestyle': 'Arts And Lifestyle',
    'building_and_trade': 'Building And Trade',
    'financial_services_and_insurance': 'Financial Services And Insurance',
    'hair_and_beauty': 'Hair And Beauty',
    'health': 'Health',
    'hospitality': 'Hospitality',
    'manufacturing': 'Manufacturing',
    'agriculture_farming_and_mining': 'Agriculture, Farming And Mining',
    'real_estate_and_property_management': 'Real Estate And Property Management',
    'services': 'Services',
    'professional_services': 'Professional Services',
    'retail': 'Retail',
    'transport_and_automotive': 'Transport And Automotive',
    'wholesaling': 'Wholesaling'
  };
  return industries[industry] || industry;
};

export const formatLoanType = (type?: string) => {
  if (!type) return '-';
  const types: { [key: string]: string } = {
    'construction': 'Construction',
    'lease_doc': 'Lease Doc',
    'low_doc': 'Low Doc',
    'private_short_term': 'Private/Short Term',
    'unsure': 'Unsure'
  };
  return types[type] || type;
};

export const formatLoanPurpose = (purpose?: string) => {
  if (!purpose) return '-';
  const purposes: { [key: string]: string } = {
    'purchase_owner_occupier': 'Purchase - Owner Occupier',
    'purchase_investment': 'Purchase - Investment',
    'refinance': 'Refinance',
    'equity_release': 'Equity Release',
    'land_bank': 'Land Bank',
    'business_use': 'Business Use',
    'commercial_equipment': 'Commercial Equipment'
  };
  return purposes[purpose] || purpose;
};

export const formatStatusDisplay = (status?: string) => {
  if (!status) return '-';
  const statuses: { [key: string]: string } = {
    'draft': 'Draft',
    'opportunity': 'Opportunity',
    'application_created': 'Application Created',
    'application_submitted': 'Application Submitted',
    'conditionally_approved': 'Conditionally Approved',
    'approved': 'Approved',
    'declined': 'Declined',
    'settled': 'Settled',
    'withdrawn': 'Withdrawn'
  };
  return statuses[status] || status;
};

export const getStatusColor = (status?: string) => {
  if (!status) return 'bg-gray-100 text-gray-800';

  const colors: { [key: string]: string } = {
    'draft': 'bg-gray-100 text-gray-800',
    'opportunity': 'bg-blue-100 text-blue-800',
    'application_created': 'bg-purple-100 text-purple-800',
    'application_submitted': 'bg-indigo-100 text-indigo-800',
    'conditionally_approved': 'bg-yellow-100 text-yellow-800',
    'approved': 'bg-green-100 text-green-800',
    'declined': 'bg-red-100 text-red-800',
    'settled': 'bg-teal-100 text-teal-800',
    'withdrawn': 'bg-gray-100 text-gray-800'
  };

  return colors[status] || 'bg-gray-100 text-gray-800';
};
