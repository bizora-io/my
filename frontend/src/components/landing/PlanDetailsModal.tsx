import React from 'react';
import {
  X,
  Check,
  Crown,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Store,
  Users,
  HardDrive
} from 'lucide-react';
import { getPlanFeaturesOverview, DisplayFeature } from '../../lib/featureDisplayMapping';

interface PlanDetailsModalProps {
  isOpen: boolean;
  plan: any | null;
  billingCycle: 'monthly' | 'yearly';
  onClose: () => void;
  onSelectPlan: (plan: any) => void;
  isBn?: boolean;
}

export const PlanDetailsModal: React.FC<PlanDetailsModalProps> = ({
  isOpen,
  plan,
  billingCycle,
  onClose,
  onSelectPlan,
  isBn = false,
}) => {
  if (!isOpen || !plan) return null;

  const monthlyPrice = Number(plan.monthlyPrice ?? plan.price) || 0;
  const yearlyPrice = Number(plan.yearlyPrice) || (monthlyPrice > 0 ? monthlyPrice * 10 : 0);
  const isFree = monthlyPrice === 0 && yearlyPrice === 0;

  const displayPrice = isFree
    ? 0
    : billingCycle === 'yearly' && yearlyPrice > 0
    ? yearlyPrice
    : monthlyPrice;

  const displayPeriod = isFree
    ? (plan.trialDays ? `${plan.trialDays} Days Free` : 'Forever')
    : billingCycle === 'yearly' && yearlyPrice > 0
    ? (isBn ? '/ বছর' : '/ year')
    : (isBn ? '/ মাস' : '/ month');

  const { allFeatures, byCategory, totalCount } = getPlanFeaturesOverview(plan.features);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0e0e13] border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-start justify-between bg-black/40">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-2xl font-black text-white">{plan.name}</h3>
              {plan.isPopular && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Crown className="w-3 h-3 fill-black" />
                  {plan.badge || 'Popular'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              {plan.description || 'Complete subscription package tailored for retail, wholesale, and production operations.'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xl font-black text-white">
                {isFree ? 'Free' : `৳ ${displayPrice.toLocaleString()}`}
                <span className="text-xs font-normal text-slate-400 ml-1">{displayPeriod}</span>
              </div>
              <span className="text-[11px] font-bold text-amber-400">
                {totalCount} Features Included
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Resource Limits Strip */}
        <div className="px-6 py-3 bg-white/[0.02] border-b border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Stores</span>
              <span className="font-bold text-white">{plan.limitStores ?? 1} branch(es)</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Staff Limit</span>
              <span className="font-bold text-white">{plan.limitEmployees ?? 10} members</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Users</span>
              <span className="font-bold text-white">{plan.limitUsers ?? 5} user seats</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Storage</span>
              <span className="font-bold text-white">{plan.limitStorageMb ?? 1024} MB</span>
            </div>
          </div>
        </div>

        {/* Feature List Grouped by Module */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {Object.entries(byCategory).map(([catKey, category]) => (
            <div key={catKey} className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 border-b border-white/10 pb-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {category.label} ({category.items.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {category.items.map((feat: DisplayFeature) => {
                  const Icon = feat.icon;
                  return (
                    <div
                      key={feat.id}
                      className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-all flex items-start gap-3"
                    >
                      <div className="p-2 rounded-xl bg-white/5 text-amber-300 shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-1.5">
                          <span>{feat.name}</span>
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-auto" />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          {feat.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer CTA */}
        <div className="p-6 border-t border-white/10 bg-black/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>14-Day Free Trial Available · Zero Setup Fees · Cancel Anytime</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              Back to Overview
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onSelectPlan(plan);
              }}
              className="px-6 py-2.5 rounded-full bg-amber-400 text-black font-black text-xs hover:bg-amber-300 shadow-xl shadow-amber-400/25 transition-all flex items-center gap-1.5"
            >
              <span>{isFree ? 'Start Free' : 'Choose This Plan'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

