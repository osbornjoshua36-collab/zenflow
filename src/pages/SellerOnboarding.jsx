import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { PATH_CONFIG, calculateProfileCompleteness } from '@/utils/sellerUtils';
import WizardChrome from '@/components/onboarding/WizardChrome';
import Step1Identity from '@/components/onboarding/Step1Identity';
import IntentScreen from '@/components/onboarding/IntentScreen';
import PlanScreen from '@/components/onboarding/PlanScreen';
import ModuleA from '@/components/onboarding/ModuleA';
import ModuleB from '@/components/onboarding/ModuleB';
import ModuleC from '@/components/onboarding/ModuleC';
import ModuleD from '@/components/onboarding/ModuleD';
import ModuleE from '@/components/onboarding/ModuleE';
import ModuleF from '@/components/onboarding/ModuleF';
import ModuleG from '@/components/onboarding/ModuleG';
import GoLiveChecklist from '@/components/onboarding/GoLiveChecklist';

const MODULE_COMPONENTS = { A: ModuleA, B: ModuleB, C: ModuleC, D: ModuleD, E: ModuleE, F: ModuleF, G: ModuleG };

export default function SellerOnboarding() {
  const navigate = useNavigate();
  const [seller, setSeller] = useState(null);
  const [screen, setScreen] = useState('loading'); // loading|step1|intent|plan|step|checklist
  const [currentStep, setCurrentStep] = useState(2); // steps 2–6
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  useEffect(() => { initWizard(); }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen, currentStep]);

  const initWizard = async () => {
    try {
      const me = await base44.auth.me();
      if (!me) { setScreen('step1'); return; }

      const sellers = await base44.entities.Business.filter({ owner_email: me.email });

      if (!sellers.length) { setScreen('step1'); return; }

      const s = sellers[0];
      setSeller(s);
      base44.entities.Business.update(s.id, { wizard_last_seen_at: new Date().toISOString() });

      if (s.onboarding_status === 'active') { navigate('/'); return; }

      const step = s.onboarding_step_completed || 0;

      if (step === 0) {
        setScreen('step1');
      } else if (!s.onboarding_intent) {
        setScreen('intent');
      } else {
        const nextStep = Math.min(step + 1, 6);
        if (step >= 6) {
          setScreen('checklist');
        } else {
          setCurrentStep(nextStep);
          setScreen('step');
          setShowResumeBanner(true);
        }
      }
    } catch {
      setScreen('step1');
    }
  };

  const refreshSeller = async (id) => {
    const list = await base44.entities.Business.filter({ id });
    if (list.length) { setSeller(list[0]); return list[0]; }
    return seller;
  };

  // ── Event handlers ────────────────────────────────────────────────

  const handleStep1Complete = (newSeller) => {
    setSeller(newSeller);
    base44.analytics.track({ eventName: 'onboarding_started', properties: { seller_id: newSeller.id } });
    setScreen('intent');
  };

  const handleIntentSelected = async (intent) => {
    await base44.entities.Business.update(seller.id, { onboarding_intent: intent });
    setSeller(s => ({ ...s, onboarding_intent: intent }));
    base44.analytics.track({ eventName: 'intent_selected', properties: { seller_id: seller.id, intent } });
    setScreen('plan');
  };

  const handlePlanSelected = async (planTier) => {
   const now = new Date();
   const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
   const updates = {
     trial_plan_tier: planTier,
     trial_started_at: now.toISOString(),
     trial_ends_at: trialEnds.toISOString(),
     subscription_tier: planTier,
     subscription_status: 'trial',
   };
   await base44.entities.Business.update(seller.id, updates);
   setSeller(s => ({ ...s, ...updates }));
   base44.analytics.track({ eventName: 'plan_selected', properties: { seller_id: seller.id, intent: seller.onboarding_intent, plan_tier: planTier } });
   setCurrentStep(2);
   setScreen('step');
   window.scrollTo(0, 0);
  };

  const handlePlanSkipped = async () => {
    await base44.entities.Business.update(seller.id, { trial_plan_tier: 'none' });
    setSeller(s => ({ ...s, trial_plan_tier: 'none' }));
    base44.analytics.track({ eventName: 'plan_skipped', properties: { seller_id: seller.id, intent: seller.onboarding_intent } });
    setCurrentStep(2);
    setScreen('step');
  };

  const handleStepComplete = async (updates = {}) => {
    const merged = { ...seller, ...updates };
    const maxCompleted = Math.max(seller.onboarding_step_completed || 0, currentStep);
    const intent = seller.onboarding_intent;
    const pathCfg = PATH_CONFIG[intent];

    // Recalculate completeness
    let hasActive = false;
    try {
      const listings = await base44.entities.Listing.filter({ business_id: seller.id, status: 'Active' });
      hasActive = listings.length > 0;
    } catch {}
    const pct = calculateProfileCompleteness(merged, hasActive);

    let onboarding_status = merged.onboarding_status;
    if (pct >= 60 && hasActive && onboarding_status === 'incomplete') {
      onboarding_status = 'ready_to_launch';
    }

    await base44.entities.Business.update(seller.id, { ...updates, onboarding_step_completed: maxCompleted, profile_completeness_pct: pct, onboarding_status });
    setSeller(s => ({ ...s, ...updates, onboarding_step_completed: maxCompleted, profile_completeness_pct: pct, onboarding_status }));

    base44.analytics.track({ eventName: 'step_completed', properties: { seller_id: seller.id, intent, step_number: currentStep, step_name: pathCfg?.stepNames[currentStep - 2] } });

    if (currentStep >= 6) { setScreen('checklist'); } else { setCurrentStep(n => n + 1); }
  };

  const handleStepSkipped = async () => {
    const intent = seller.onboarding_intent;
    const pathCfg = PATH_CONFIG[intent];
    const maxCompleted = Math.max(seller.onboarding_step_completed || 0, currentStep);
    await base44.entities.Business.update(seller.id, { onboarding_step_completed: maxCompleted });
    setSeller(s => ({ ...s, onboarding_step_completed: maxCompleted }));
    base44.analytics.track({ eventName: 'step_skipped', properties: { seller_id: seller.id, intent, step_name: pathCfg?.stepNames[currentStep - 2] } });
    if (currentStep >= 6) { setScreen('checklist'); } else { setCurrentStep(n => n + 1); }
  };

  const handleBack = () => {
    if (screen === 'plan') { setScreen('intent'); return; }
    if (screen === 'step' && currentStep === 2) { setScreen('plan'); return; }
    if (screen === 'step') { setCurrentStep(n => n - 1); return; }
    if (screen === 'checklist') { setCurrentStep(6); setScreen('step'); }
  };

  const handleSaveExit = async () => {
    await base44.entities.Business.update(seller.id, { wizard_last_seen_at: new Date().toISOString() });
    base44.analytics.track({ eventName: 'wizard_exited', properties: { seller_id: seller.id, intent: seller.onboarding_intent, last_step_reached: currentStep, plan_tier: seller.trial_plan_tier || 'none' } });
    navigate('/?wizard_incomplete=1');
  };

  const handleGoLive = async () => {
    const now = new Date().toISOString();
    // Check founding member eligibility
    const activesellers = await base44.entities.Business.filter({ onboarding_status: 'active' });
    const foundingCount = activesellers.filter(b => b.is_founding_member).length;
    const isFoundingMember = foundingCount < 200;
    const TIER_PRICES = { starter: 0, pro: 29, business: 59, none: 0 };
    const lockedPrice = TIER_PRICES[seller.trial_plan_tier] ?? 0;
    await base44.entities.Business.update(seller.id, {
      onboarding_status: 'active',
      go_live_date: now,
      onboarding_completed_at: now,
      ...(isFoundingMember ? { is_founding_member: true, locked_subscription_price: lockedPrice } : {}),
    });
    base44.analytics.track({ eventName: 'onboarding_completed', properties: { seller_id: seller.id, intent: seller.onboarding_intent, plan_tier: seller.trial_plan_tier || 'none', profile_completeness_pct: seller.profile_completeness_pct || 0, is_founding_member: isFoundingMember } });
    navigate('/?onboarding_complete=1');
  };

  // ── Render ────────────────────────────────────────────────────────

  if (screen === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-[#E8945A] rounded-full animate-spin" /></div>;
  }

  if (screen === 'step1') return <Step1Identity onComplete={handleStep1Complete} />;
  if (screen === 'intent') return <IntentScreen onSelect={handleIntentSelected} onBack={() => setScreen('step1')} />;
  if (screen === 'plan') return <PlanScreen intent={seller?.onboarding_intent} onSelect={handlePlanSelected} onSkip={handlePlanSkipped} onBack={() => setScreen('intent')} />;

  const intent = seller?.onboarding_intent;
  const pathCfg = intent ? PATH_CONFIG[intent] : null;
  const stepIdx = currentStep - 2; // 0–4
  const moduleCode = pathCfg?.steps[stepIdx];
  const ModuleComp = moduleCode ? MODULE_COMPONENTS[moduleCode] : null;
  const isRequired = pathCfg ? pathCfg.required[stepIdx] : true;

  if (screen === 'step' && ModuleComp) {
    return (
      <WizardChrome
        currentStep={currentStep}
        stepName={pathCfg.stepNames[stepIdx]}
        intent={intent}
        seller={seller}
        onBack={currentStep > 2 ? handleBack : null}
        onSaveExit={handleSaveExit}
        showResumeBanner={showResumeBanner}
        onDismissResume={() => setShowResumeBanner(false)}
      >
        <ModuleComp
          seller={seller}
          onComplete={handleStepComplete}
          onSkip={!isRequired ? handleStepSkipped : null}
          skipLabel={pathCfg.skipLabel}
          isRequired={isRequired}
          isProfilePath={intent === 'profile'}
          onSellerUpdate={(u) => setSeller(s => ({ ...s, ...u }))}
        />
      </WizardChrome>
    );
  }

  if (screen === 'checklist') {
    return (
      <WizardChrome
        currentStep={7}
        stepName="Go live"
        intent={intent}
        seller={seller}
        onBack={handleBack}
        onSaveExit={null}
        showResumeBanner={false}
      >
        <GoLiveChecklist seller={seller} onGoLive={handleGoLive} onSellerUpdate={(u) => setSeller(s => ({ ...s, ...u }))} />
      </WizardChrome>
    );
  }

  return null;
}