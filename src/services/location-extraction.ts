/**
 * Service for extracting geographic location from article content.
 * Uses a heuristic-based approach to identify countries and regions mentioned in text.
 */

// Common country names and their ISO codes
const COUNTRIES: Record<string, { code: string; name: string }> = {
  "united states": { code: "US", name: "United States" },
  "usa": { code: "US", name: "United States" },
  "u.s.": { code: "US", name: "United States" },
  "u.s.a.": { code: "US", name: "United States" },
  "america": { code: "US", name: "United States" },
  "united kingdom": { code: "GB", name: "United Kingdom" },
  "uk": { code: "GB", name: "United Kingdom" },
  "britain": { code: "GB", name: "United Kingdom" },
  "england": { code: "GB", name: "United Kingdom" },
  "canada": { code: "CA", name: "Canada" },
  "australia": { code: "AU", name: "Australia" },
  "germany": { code: "DE", name: "Germany" },
  "france": { code: "FR", name: "France" },
  "italy": { code: "IT", name: "Italy" },
  "spain": { code: "ES", name: "Spain" },
  "japan": { code: "JP", name: "Japan" },
  "china": { code: "CN", name: "China" },
  "india": { code: "IN", name: "India" },
  "brazil": { code: "BR", name: "Brazil" },
  "russia": { code: "RU", name: "Russia" },
  "mexico": { code: "MX", name: "Mexico" },
  "south korea": { code: "KR", name: "South Korea" },
  "korea": { code: "KR", name: "South Korea" },
  "netherlands": { code: "NL", name: "Netherlands" },
  "switzerland": { code: "CH", name: "Switzerland" },
  "sweden": { code: "SE", name: "Sweden" },
  "norway": { code: "NO", name: "Norway" },
  "denmark": { code: "DK", name: "Denmark" },
  "finland": { code: "FI", name: "Finland" },
  "ireland": { code: "IE", name: "Ireland" },
  "new zealand": { code: "NZ", name: "New Zealand" },
  "south africa": { code: "ZA", name: "South Africa" },
  "argentina": { code: "AR", name: "Argentina" },
  "israel": { code: "IL", name: "Israel" },
  "saudi arabia": { code: "SA", name: "Saudi Arabia" },
  "united arab emirates": { code: "AE", name: "United Arab Emirates" },
  "uae": { code: "AE", name: "United Arab Emirates" },
  "singapore": { code: "SG", name: "Singapore" },
  "hong kong": { code: "HK", name: "Hong Kong" },
  "taiwan": { code: "TW", name: "Taiwan" },
  "poland": { code: "PL", name: "Poland" },
  "belgium": { code: "BE", name: "Belgium" },
  "austria": { code: "AT", name: "Austria" },
  "portugal": { code: "PT", name: "Portugal" },
  "greece": { code: "GR", name: "Greece" },
  "turkey": { code: "TR", name: "Turkey" },
  "egypt": { code: "EG", name: "Egypt" },
  "nigeria": { code: "NG", name: "Nigeria" },
  "ukraine": { code: "UA", name: "Ukraine" },
  "indonesia": { code: "ID", name: "Indonesia" },
  "malaysia": { code: "MY", name: "Malaysia" },
  "thailand": { code: "TH", name: "Thailand" },
  "vietnam": { code: "VN", name: "Vietnam" },
  "philippines": { code: "PH", name: "Philippines" },
  "pakistan": { code: "PK", name: "Pakistan" },
  "bangladesh": { code: "BD", name: "Bangladesh" },
  "iran": { code: "IR", name: "Iran" },
  "iraq": { code: "IQ", name: "Iraq" },
  "chile": { code: "CL", name: "Chile" },
  "colombia": { code: "CO", name: "Colombia" },
  "peru": { code: "PE", name: "Peru" },
  "venezuela": { code: "VE", name: "Venezuela" },
  "czech republic": { code: "CZ", name: "Czech Republic" },
  "czechia": { code: "CZ", name: "Czech Republic" },
  "romania": { code: "RO", name: "Romania" },
  "hungary": { code: "HU", name: "Hungary" },
};

// Major cities with their countries
const MAJOR_CITIES: Record<string, { country: string; code: string; city: string }> = {
  "new york": { country: "United States", code: "US", city: "New York" },
  "los angeles": { country: "United States", code: "US", city: "Los Angeles" },
  "washington": { country: "United States", code: "US", city: "Washington D.C." },
  "chicago": { country: "United States", code: "US", city: "Chicago" },
  "san francisco": { country: "United States", code: "US", city: "San Francisco" },
  "london": { country: "United Kingdom", code: "GB", city: "London" },
  "paris": { country: "France", code: "FR", city: "Paris" },
  "berlin": { country: "Germany", code: "DE", city: "Berlin" },
  "tokyo": { country: "Japan", code: "JP", city: "Tokyo" },
  "beijing": { country: "China", code: "CN", city: "Beijing" },
  "shanghai": { country: "China", code: "CN", city: "Shanghai" },
  "moscow": { country: "Russia", code: "RU", city: "Moscow" },
  "sydney": { country: "Australia", code: "AU", city: "Sydney" },
  "toronto": { country: "Canada", code: "CA", city: "Toronto" },
  "mumbai": { country: "India", code: "IN", city: "Mumbai" },
  "delhi": { country: "India", code: "IN", city: "Delhi" },
  "singapore": { country: "Singapore", code: "SG", city: "Singapore" },
  "dubai": { country: "United Arab Emirates", code: "AE", city: "Dubai" },
  "seoul": { country: "South Korea", code: "KR", city: "Seoul" },
  "hong kong": { country: "Hong Kong", code: "HK", city: "Hong Kong" },
  "rome": { country: "Italy", code: "IT", city: "Rome" },
  "madrid": { country: "Spain", code: "ES", city: "Madrid" },
  "amsterdam": { country: "Netherlands", code: "NL", city: "Amsterdam" },
  "brussels": { country: "Belgium", code: "BE", city: "Brussels" },
  "zurich": { country: "Switzerland", code: "CH", city: "Zurich" },
  "vienna": { country: "Austria", code: "AT", city: "Vienna" },
  "stockholm": { country: "Sweden", code: "SE", city: "Stockholm" },
  "oslo": { country: "Norway", code: "NO", city: "Oslo" },
  "copenhagen": { country: "Denmark", code: "DK", city: "Copenhagen" },
  "dublin": { country: "Ireland", code: "IE", city: "Dublin" },
  "tel aviv": { country: "Israel", code: "IL", city: "Tel Aviv" },
  "jerusalem": { country: "Israel", code: "IL", city: "Jerusalem" },
  "sao paulo": { country: "Brazil", code: "BR", city: "São Paulo" },
  "rio de janeiro": { country: "Brazil", code: "BR", city: "Rio de Janeiro" },
  "buenos aires": { country: "Argentina", code: "AR", city: "Buenos Aires" },
  "mexico city": { country: "Mexico", code: "MX", city: "Mexico City" },
  "cape town": { country: "South Africa", code: "ZA", city: "Cape Town" },
  "johannesburg": { country: "South Africa", code: "ZA", city: "Johannesburg" },
};

export interface LocationInfo {
  country: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
}

/**
 * Extracts location information from article title and content.
 * Prioritizes mentions at the beginning of text (often datelines in news articles).
 */
export function extractLocation(
  title: string | null | undefined,
  content: string | null | undefined
): LocationInfo {
  const result: LocationInfo = {
    country: null,
    countryCode: null,
    city: null,
    region: null,
  };

  const text = `${title || ""} ${content || ""}`.toLowerCase();

  if (!text.trim()) {
    return result;
  }

  // First, check for cities (more specific)
  for (const [cityKey, cityInfo] of Object.entries(MAJOR_CITIES)) {
    // Use word boundary matching for accuracy
    const regex = new RegExp(`\\b${cityKey}\\b`, "i");
    if (regex.test(text)) {
      result.city = cityInfo.city;
      result.country = cityInfo.country;
      result.countryCode = cityInfo.code;
      return result;
    }
  }

  // Then check for countries
  for (const [countryKey, countryInfo] of Object.entries(COUNTRIES)) {
    const regex = new RegExp(`\\b${countryKey}\\b`, "i");
    if (regex.test(text)) {
      result.country = countryInfo.name;
      result.countryCode = countryInfo.code;
      return result;
    }
  }

  return result;
}

/**
 * Returns the count of location mentions in text (for relevance scoring).
 */
export function countLocationMentions(
  text: string,
  country: string
): number {
  const lowerText = text.toLowerCase();
  const lowerCountry = country.toLowerCase();

  // Find all variations of the country name
  const variations: string[] = [];
  for (const [key, info] of Object.entries(COUNTRIES)) {
    if (info.name.toLowerCase() === lowerCountry) {
      variations.push(key);
    }
  }

  if (variations.length === 0) {
    variations.push(lowerCountry);
  }

  let count = 0;
  for (const variation of variations) {
    const regex = new RegExp(`\\b${variation}\\b`, "gi");
    const matches = lowerText.match(regex);
    count += matches?.length || 0;
  }

  return count;
}
