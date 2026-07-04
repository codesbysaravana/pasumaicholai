export interface Farmer {
  id: number;
  name: string;
  produce: string;
  lat: number;
  lng: number;
}

export interface FarmDetails {
  farmer: Farmer;
  distanceKm: number;
}
