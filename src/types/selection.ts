/**
 * LookalikeResult interface with all 17 required fields
 * All required fields are typed as string (not optional) to ensure consistency
 * Empty values should be represented as empty strings ''
 */
export interface LookalikeResult {
  doc_id: string;
  // Required fields (always present, may be empty)
  name: string;
  domain: string;
  company_size: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  postal_code: string;
  sector_level1: string;
  sector_level2: string;
  sector_level3: string;
  region_level1: string;
  region_level2: string;
  region_level3: string;
  region_level4: string;
  linkedin_company_url: string;
  legal_form: string;
  // Optional fields
  similarity?: number;
  // Legacy fields (for backward compatibility with database_october)
  experience_years?: number;
  sectors?: string[]; // Legacy - use sector_level1-3 instead
}
