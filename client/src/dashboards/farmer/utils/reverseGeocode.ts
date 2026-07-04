export interface ResolvedLocation {
  ward?: string;
  city?: string;
  state?: string;
}

interface NominatimAddress {
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
}

interface NominatimReverseResponse {
  address?: NominatimAddress;
}

function clean(value: string | undefined): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}

export async function reverseGeocodeCoordinates(lat: number, lng: number): Promise<ResolvedLocation> {
  const endpoint = new URL("https://nominatim.openstreetmap.org/reverse");
  endpoint.searchParams.set("lat", String(lat));
  endpoint.searchParams.set("lon", String(lng));
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("addressdetails", "1");

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Reverse geocoding failed.");
  }

  const payload = (await response.json()) as NominatimReverseResponse;
  const address = payload.address ?? {};
  return {
    ward: clean(address.suburb) ?? clean(address.neighbourhood),
    city: clean(address.city) ?? clean(address.town) ?? clean(address.village) ?? clean(address.municipality),
    state: clean(address.state),
  };
}
