import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/client';

// ABN checksum validation
function validateABN(abn: string): boolean {
  const cleanABN = abn.replace(/\s/g, '');
  if (cleanABN.length !== 11 || !/^\d+$/.test(cleanABN)) return false;

  // ABN checksum algorithm
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const digits = cleanABN.split('').map(Number);

  // Subtract 1 from first digit
  digits[0] -= 1;

  // Calculate weighted sum
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += digits[i] * weights[i];
  }

  return sum % 89 === 0;
}

// Calculate years between two dates
function calculateTimeInBusiness(effectiveFromDate: string): string {
  const startDate = new Date(effectiveFromDate);
  const today = new Date();

  let years = today.getFullYear() - startDate.getFullYear();
  const monthDiff = today.getMonth() - startDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < startDate.getDate())) {
    years--;
  }

  if (years < 1) {
    // Calculate months for businesses less than a year old
    let months = (today.getFullYear() - startDate.getFullYear()) * 12;
    months += today.getMonth() - startDate.getMonth();
    if (today.getDate() < startDate.getDate()) {
      months--;
    }
    if (months <= 0) {
      return 'Less than 1 month';
    }
    return months === 1 ? '1 Month' : `${months} Months`;
  }

  return years === 1 ? '1 Year' : `${years} Years`;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const abn = searchParams.get('abn');

    if (!abn) {
      return NextResponse.json(
        { error: 'ABN is required' },
        { status: 400 }
      );
    }

    // Clean ABN (remove spaces)
    const cleanABN = abn.replace(/\s/g, '');

    // Validate ABN checksum
    if (!validateABN(cleanABN)) {
      return NextResponse.json(
        {
          error: 'Invalid ABN',
          valid: false,
          message: 'The ABN entered is not valid. Please check and try again.'
        },
        { status: 400 }
      );
    }

    // Check if ABN already exists in our database
    const db = await getDatabase();
    const existingOrg = await db.collection('organisations').findOne({
      abn: cleanABN,
      deleted_at: null
    });

    if (existingOrg) {
      return NextResponse.json({
        valid: true,
        exists: true,
        message: 'This ABN already has a referrer account.',
        organisationName: existingOrg.name
      });
    }

    // Fetch from ABR XML API (provides more data including effectiveFrom date)
    const guid = process.env.ABR_API_GUID;
    if (!guid) {
      console.error('ABR_API_GUID not configured');
      return NextResponse.json(
        { error: 'ABN lookup service not configured' },
        { status: 500 }
      );
    }

    const abrXmlUrl = `https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx/SearchByABNv201205?searchString=${cleanABN}&includeHistoricalDetails=N&authenticationGuid=${guid}`;

    const response = await fetch(abrXmlUrl);
    const xmlText = await response.text();

    // Parse XML response
    // Extract key values from XML using regex (simpler than full XML parsing)
    const getXmlValue = (xml: string, tag: string): string => {
      const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'));
      return match ? match[1].trim() : '';
    };

    const getXmlValues = (xml: string, tag: string): string[] => {
      const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'gi');
      const values: string[] = [];
      let match;
      while ((match = regex.exec(xml)) !== null) {
        if (match[1].trim()) {
          values.push(match[1].trim());
        }
      }
      return values;
    };

    // Check if we have a valid response (ASICNumber indicates a company entity)
    const abnValue = getXmlValue(xmlText, 'identifierValue');

    if (!abnValue) {
      return NextResponse.json({
        valid: false,
        message: 'ABN not found in the Australian Business Register.',
        status: 'Not Found'
      });
    }

    // Get entity status
    const entityStatusCode = getXmlValue(xmlText, 'entityStatusCode');
    if (entityStatusCode && entityStatusCode !== 'Active') {
      return NextResponse.json({
        valid: false,
        message: `This ABN is ${entityStatusCode}. Only active ABNs can register.`,
        status: entityStatusCode
      });
    }

    // Get organisation names from both businessName and mainName sections
    let businessNames: string[] = [];

    // Extract all organisationName values (from businessName sections)
    const orgNames = getXmlValues(xmlText, 'organisationName');
    orgNames.forEach(name => {
      if (name && !businessNames.includes(name)) {
        businessNames.push(name);
      }
    });

    // If no business names found, check for mainName
    if (businessNames.length === 0) {
      const mainNames = getXmlValues(xmlText, 'organisationName');
      mainNames.forEach(name => {
        if (name && !businessNames.includes(name)) {
          businessNames.push(name);
        }
      });
    }

    // Get effective from date and calculate time in business
    const effectiveFrom = getXmlValue(xmlText, 'effectiveFrom');
    let timeInBusiness = '';
    if (effectiveFrom) {
      timeInBusiness = calculateTimeInBusiness(effectiveFrom);
    }

    // Get entity type
    const entityTypeCode = getXmlValue(xmlText, 'entityTypeCode');
    const entityDescription = getXmlValue(xmlText, 'entityDescription');

    // Remove duplicates
    businessNames = [...new Set(businessNames)];

    return NextResponse.json({
      valid: true,
      exists: false,
      abn: cleanABN,
      formattedAbn: `${cleanABN.slice(0, 2)} ${cleanABN.slice(2, 5)} ${cleanABN.slice(5, 8)} ${cleanABN.slice(8, 11)}`,
      entityName: businessNames[0] || '',
      businessNames: businessNames,
      entityType: entityDescription || entityTypeCode || '',
      effectiveFrom: effectiveFrom || null,
      timeInBusiness: timeInBusiness,
      state: getXmlValue(xmlText, 'stateCode') || '',
      postcode: getXmlValue(xmlText, 'postcode') || '',
      status: entityStatusCode || 'Active',
      message: 'ABN verified successfully'
    });

  } catch (error) {
    console.error('ABN lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup ABN' },
      { status: 500 }
    );
  }
}
