import { getDb } from "./firebaseAdmin.js";
import { isFeatureEnabled } from "./featureRegistry.js";

export async function getPlanByName(planName: string | undefined | null): Promise<any | null> {
  if (!planName) return null;
  const doc = await getDb().collection("platformConfig").doc("subscriptionPlans").get();
  const list: any[] = doc.exists && Array.isArray(doc.data()?.list) ? doc.data()!.list : [];
  const query = planName.toLowerCase().trim();
  return (
    list.find(
      (p) =>
        (p.name || "").toLowerCase().trim() === query ||
        (p.id || "").toLowerCase().trim() === query
    ) || null
  );
}

export function planFeaturesArray(plan: any | null): string[] {
  if (!plan?.features) return [];
  if (Array.isArray(plan.features)) return plan.features;
  return String(plan.features)
    .split(",")
    .map((f: string) => f.trim())
    .filter(Boolean);
}

/** Given a plan name, resolve the feature list to actually grant a business. */
export async function resolveFeaturesForPlan(planName: string | undefined | null): Promise<string[]> {
  const plan = await getPlanByName(planName);
  return planFeaturesArray(plan);
}

/** Check if a business has access to a specific feature */
export async function checkBusinessHasFeature(
  businessId: string,
  featureKey: string
): Promise<boolean> {
  if (!businessId || !featureKey) return true;
  try {
    const doc = await getDb().collection("businesses").doc(businessId).get();
    if (!doc.exists) return false;
    const data = doc.data() || {};
    
    // Check if directly granted features on business doc
    const directFeatures = Array.isArray(data.features)
      ? data.features
      : Array.isArray(data.enabledFeatures)
      ? data.enabledFeatures
      : [];
    const directModules = Array.isArray(data.modules) ? data.modules : [];

    if (isFeatureEnabled(featureKey, directFeatures, directModules)) {
      return true;
    }

    // Check against configured plan
    if (data.plan) {
      const plan = await getPlanByName(data.plan);
      if (plan) {
        const planFeats = planFeaturesArray(plan);
        const planMods = Array.isArray(plan.modules) ? plan.modules : [];
        if (isFeatureEnabled(featureKey, planFeats, planMods)) {
          return true;
        }
      }
    }

    return false;
  } catch (err) {
    console.error(`Error checking feature ${featureKey} for business ${businessId}:`, err);
    return false;
  }
}