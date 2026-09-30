'use client';

import { Loader2, UtensilsCrossed } from 'lucide-react';

export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
 return (
 <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-orange-50 to-amber-50">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-200">
 <UtensilsCrossed className="w-7 h-7" />
 </div>
 <span className="text-2xl font-semibold text-slate-800">FoodMitra</span>
 </div>
 <div className="flex items-center gap-2 text-slate-600">
 <Loader2 className="w-4 h-4 animate-spin" />
 <span className="text-sm">{label}</span>
 </div>
 </div>
 );
}
