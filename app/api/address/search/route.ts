import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    
    if (!query || query.length < 3) {
      return NextResponse.json({ features: [] });
    }
    
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    
    if (!mapboxToken) {
      console.error('MapBox access token not configured');
      return NextResponse.json(
        { error: 'Address search not configured' },
        { status: 500 }
      );
    }
    
    // Call MapBox API from server side (no CORS issues)
    const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
      `access_token=${mapboxToken}&` +
      `country=AU&` + // Restrict to Australia
      `types=address&` + // Only get addresses
      `limit=5`;
    
    const response = await fetch(mapboxUrl);
    
    if (!response.ok) {
      console.error('MapBox API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to search addresses' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Return the suggestions
    return NextResponse.json({
      features: data.features || []
    });
    
  } catch (error) {
    console.error('Address search error:', error);
    return NextResponse.json(
      { error: 'Failed to search addresses' },
      { status: 500 }
    );
  }
}