/**
 * Script to fix invalid opportunity data that doesn't match database constraints
 * This script will:
 * 1. Convert invalid asset_type values to null or valid values
 * 2. Convert invalid industry values to null
 * 3. Convert display-formatted loan_type to snake_case
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixInvalidData() {
  console.log('Starting to fix invalid opportunity data...\n');

  // Fetch all opportunities to check for invalid data
  const { data: opportunities, error: fetchError } = await supabase
    .from('opportunities')
    .select('id, opportunity_id, asset_type, industry, loan_type')
    .is('deleted_at', null);

  if (fetchError) {
    console.error('Error fetching opportunities:', fetchError);
    return;
  }

  console.log(`Found ${opportunities.length} opportunities to check\n`);

  const validAssetTypes = ['commercial_property', 'residential_property', 'vacant_land'];
  const validIndustries = [
    'arts_and_lifestyle', 'building_and_trade', 'financial_services_and_insurance',
    'hair_and_beauty', 'health', 'hospitality', 'manufacturing',
    'agriculture_farming_and_mining', 'real_estate_and_property_management',
    'services', 'professional_services', 'retail', 'transport_and_automotive', 'wholesaling'
  ];
  const validLoanTypes = ['construction', 'lease_doc', 'low_doc', 'private_short_term', 'unsure'];

  let fixedCount = 0;

  for (const opp of opportunities) {
    const updates = {};
    let needsUpdate = false;

    // Fix asset_type
    if (opp.asset_type && !validAssetTypes.includes(opp.asset_type)) {
      console.log(`[${opp.opportunity_id}] Invalid asset_type: ${opp.asset_type} -> null`);
      updates.asset_type = null;
      needsUpdate = true;
    }

    // Fix industry
    if (opp.industry && !validIndustries.includes(opp.industry)) {
      console.log(`[${opp.opportunity_id}] Invalid industry: ${opp.industry} -> null`);
      updates.industry = null;
      needsUpdate = true;
    }

    // Fix loan_type (convert display format to snake_case)
    if (opp.loan_type) {
      let newLoanType = opp.loan_type;

      if (opp.loan_type === 'Construction') newLoanType = 'construction';
      else if (opp.loan_type === 'Lease Doc') newLoanType = 'lease_doc';
      else if (opp.loan_type === 'Low Doc') newLoanType = 'low_doc';
      else if (opp.loan_type === 'Private/Short Term' || opp.loan_type === 'Private / Short Term')
        newLoanType = 'private_short_term';
      else if (opp.loan_type === 'Unsure') newLoanType = 'unsure';
      else if (!validLoanTypes.includes(opp.loan_type)) newLoanType = null;

      if (newLoanType !== opp.loan_type) {
        console.log(`[${opp.opportunity_id}] Converting loan_type: ${opp.loan_type} -> ${newLoanType}`);
        updates.loan_type = newLoanType;
        needsUpdate = true;
      }
    }

    // Apply updates if needed
    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('opportunities')
        .update(updates)
        .eq('id', opp.id);

      if (updateError) {
        console.error(`Error updating ${opp.opportunity_id}:`, updateError.message);
      } else {
        fixedCount++;
        console.log(`✓ Updated ${opp.opportunity_id}\n`);
      }
    }
  }

  console.log(`\nFixed ${fixedCount} opportunities`);
  console.log('Done!');
}

fixInvalidData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Script error:', err);
    process.exit(1);
  });
