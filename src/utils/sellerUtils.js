/**
 * Calculate profile completeness percentage (0–100) for a seller.
 * Description, logo, and portfolio images are optional and not counted.
 * @param {object} seller - Business entity record
 * @param {boolean} hasActiveListing - whether the seller has at least one active listing
 */
export function calculateProfileCompleteness(seller, hasActiveListing = false) {
  let pct = 0;
  if (seller.business_name && seller.business_name.trim()) pct += 10;
  if (seller.owner_phone || seller.phone) pct += 5;
  if (seller.tagline && seller.tagline.trim()) pct += 5;
  if (seller.banner_image_url) pct += 10;
  if (seller.service_radius_miles) pct += 5;
  if (hasActiveListing) pct += 15;
  if (seller.licence_document_url) pct += 10;
  if (seller.insurance_document_url) pct += 5;
  return Math.min(pct, 100);
}

/**
 * Determine onboarding status based on completeness and listing presence.
 */
export function deriveOnboardingStatus(seller, hasActiveListing) {
  if (seller.onboarding_status === 'active' || seller.onboarding_status === 'suspended') {
    return seller.onboarding_status;
  }
  const pct = calculateProfileCompleteness(seller, hasActiveListing);
  if (pct >= 45 && hasActiveListing) return 'ready_to_launch';
  return 'incomplete';
}

/**
 * Generate a slug from a business name.
 */
export function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Step path configurations by intent */
export const PATH_CONFIG = {
  leads: {
    steps: ['D', 'C', 'A', 'B', 'E'],
    stepNames: ['First listing', 'Service area', 'Business story', 'Brand & media', 'Credentials'],
    required: [true, true, false, false, false],
    skipLabel: "I'll do this later — get me live faster",
    headline: "Almost ready to receive your first job request",
  },
  profile: {
    steps: ['A', 'B', 'E', 'D', 'C'],
    stepNames: ['Business story', 'Brand & media', 'Credentials', 'First listing', 'Service area'],
    required: [true, true, false, true, true],
    skipLabel: "I'll add this later",
    headline: "Your online presence is taking shape",
  },
  operations: {
    steps: ['A', 'C', 'D', 'F', 'G'],
    stepNames: ['Business story', 'Service area', 'First listing', 'Invoicing setup', 'Calendar connect'],
    required: [false, true, true, true, false],
    skipLabel: "Set this up after I'm live",
    headline: "Your business workspace is nearly ready",
  },
};