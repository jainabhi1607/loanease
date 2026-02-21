/**
 * Shared utility functions for formatting opportunity data
 * Used by both admin and referrer opportunity detail pages
 */

export const formatCurrency = (amount?: number) => {
  if (!amount) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Indian timezone constant
const INDIAN_TIMEZONE = 'Asia/Kolkata';

export const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: INDIAN_TIMEZONE
  });
};

export const formatDateTime = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: INDIAN_TIMEZONE
  });
};

export const formatTime = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: INDIAN_TIMEZONE
  });
};

export const formatEntityType = (type?: string | number) => {
  if (!type && type !== 0) return '-';
  // Integer keys (stored in MongoDB as 1-6)
  const intTypes: { [key: number]: string } = {
    1: 'Private Company',
    2: 'Sole Trader',
    3: 'SMSF Trust',
    4: 'Trust',
    5: 'Partnership',
    6: 'Individual'
  };
  // String keys (legacy/form values)
  const strTypes: { [key: string]: string } = {
    'private_company': 'Private Company',
    'sole_trader': 'Sole Trader',
    'smsf_trust': 'SMSF Trust',
    'trust': 'Trust',
    'partnership': 'Partnership',
    'individual': 'Individual'
  };
  const numType = typeof type === 'string' ? parseInt(type, 10) : type;
  if (!isNaN(numType) && intTypes[numType]) return intTypes[numType];
  return strTypes[String(type)] || String(type);
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
    'private_short_term': 'Private / Short Term',
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
