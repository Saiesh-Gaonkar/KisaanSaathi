export type UserRole = 'farmer' | 'wholesaler' | 'transporter';

export type UserStatus = 'PROVISIONAL' | 'VERIFIED';

export interface UserLocation {
  address: string; // Manually written village, mandi, or street address
  latitude: number; // Exact GPS latitude
  longitude: number; // Exact GPS longitude
}

export interface UserProfile {
  uid: string;
  role: UserRole;
  user_status: UserStatus;
  name: string;
  email: string;
  location: UserLocation;
  trust_score: number;
  completed_deals_count: number;
  created_at: any;
}

export type BatchStatus = 
  | 'DRAFT' 
  | 'PENDING_SIMULATION' 
  | 'LISTED_ACTIVE' 
  | 'MATCHED_IN_TRANSIT' 
  | 'FULFILLED';

export interface AIRecommendation {
  rank: number;
  channel: string;
  recommended_buyer_name?: string;
  recommended_transporter?: string;
  net_realization: number;
  gross_price_per_qtl: number;
  estimated_freight: number;
  estimated_mandi_fee: number;
  estimated_shrinkage: number;
  trust_risk_penalty: number;
  economic_rationale: string;
}

export interface InventoryBatch {
  batch_id: string;
  farmer_id: string;
  farmer_name?: string;
  farmer_location?: UserLocation;
  crop: string;
  variety: string;
  quantity_qtl: number;
  min_price_per_qtl: number; // Minimum reservation price per quintal set by farmer
  harvest_date: string; // YYYY-MM-DD
  status: BatchStatus;
  ai_recommendations: AIRecommendation[] | null;
  created_at: any;
}

export type DeliveryTerm = 'EX_FARM' | 'FOR_MANDI';
export type BidStatus = 'OPEN' | 'ACCEPTED' | 'REJECTED';

export interface BuyerBid {
  bid_id: string;
  batch_id: string;
  buyer_id: string;
  buyer_name?: string;
  offered_price_per_qtl: number;
  delivery_term: DeliveryTerm;
  buyer_trust_snapshot: number;
  status: BidStatus;
  created_at: any;
}

export type RouteStatus = 'AVAILABLE' | 'CLAIMED';

export interface TransporterRoute {
  route_id: string;
  transporter_id: string;
  transporter_name?: string;
  vehicle_type: string;
  capacity_qtl: number;
  origin: string;
  destination: string;
  distance_km: number; // Estimated corridor distance
  is_backhaul: boolean;
  tariff_per_km: number; // Base rate per km

  // Itemized vehicle pricing breakdown for hackathon transparency
  cleaning_charge: number;      // Sanitation / cleaning charge
  labour_charge: number;        // Loading & unloading handling charge
  maintenance_charge: number;   // Vehicle wear & maintenance charge
  total_vehicle_price: number;  // (distance_km * tariff_per_km) + cleaning + labour + maintenance

  transporter_trust_snapshot: number;
  status: RouteStatus;
  created_at: any;
}

export type DealStatus = 'MATCHED' | 'PICKUP_VERIFIED' | 'FULFILLED';

export interface DealVerificationPins {
  farmgate_otp: string;
  scale_otp: string;
  farmgate_verified: boolean;
  scale_verified: boolean;
}

export interface DealRatings {
  farmer_to_buyer: number | null;
  farmer_to_transporter: number | null;
  buyer_to_farmer: number | null;
  transporter_to_farmer: number | null;
}

export interface DealAndReview {
  deal_id: string;
  batch_id: string;
  crop?: string;
  quantity_qtl?: number;
  farmer_id: string;
  farmer_name?: string;
  buyer_id: string;
  buyer_name?: string;
  transporter_id: string;
  transporter_name?: string;
  agreed_price_per_qtl: number;
  status: DealStatus;
  verification_pins: DealVerificationPins;
  ratings: DealRatings | null;
  created_at: any;
  fulfilled_at: any | null;
}

