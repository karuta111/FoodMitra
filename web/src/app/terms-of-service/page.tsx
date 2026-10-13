import type { Metadata } from "next";
export const metadata: Metadata = { title: "Terms of Service — FoodMitra", description: "The terms and conditions for using FoodMitra." };
export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12 lg:py-16">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-500 mb-8">Last updated: October 12, 2026</p>
        <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed text-slate-700">
          <section><h2 className="text-lg font-semibold text-slate-900 mb-2">1. Acceptance of Terms</h2><p>By using the FoodMitra mobile application or website (the &quot;Service&quot;), you agree to be bound by these Terms of Service.</p></section>
          <section><h2 className="text-lg font-semibold text-slate-900 mb-2">2. Description of Service</h2><p>FoodMitra is an online food delivery platform that connects customers with restaurants. FoodMitra acts as an intermediary between customers and restaurants.</p></section>
          <section><h2 className="text-lg font-semibold text-slate-900 mb-2">3. User Accounts</h2><ul className="list-disc pl-6 space-y-1"><li>You must provide accurate information when creating an account.</li><li>You are responsible for maintaining account security.</li><li>You must be at least 18 years old.</li><li>One account per person.</li></ul></section>
          <section><h2 className="text-lg font-semibold text-slate-900 mb-2">4. Orders and Payments</h2><ul className="list-disc pl-6 space-y-1"><li>Orders are subject to acceptance by the restaurant.</li><li>Prices are in INR and include applicable taxes.</li><li>Delivery fees are calculated based on distance.</li><li>Minimum order amounts may apply.</li></ul></section>
          <section><h2 className="text-lg font-semibold text-slate-900 mb-2">5. Cancellations and Refunds</h2><ul className="list-disc pl-6 space-y-1"><li>Orders can be cancelled before restaurant approval.</li><li>Refunds, if applicable, processed within 5-7 business days.</li></ul></section>
          <section><h2 className="text-lg font-semibold text-slate-900 mb-2">6. User Conduct</h2><p>You agree not to: place fraudulent orders, harass staff, hack or disrupt the Service, or use automated systems to place orders.</p></section>
          <section><h2 className="text-lg font-semibold text-slate-900 mb-2">7. Limitation of Liability</h2><p>FoodMitra is an intermediary and is not responsible for food quality, safety, delivery delays, or restaurant unavailability.</p></section>
          <section><h2 className="text-lg font-semibold text-slate-900 mb-2">8. Contact</h2><p>Email: <a href="mailto:admin@foodmitra.com" className="text-orange-600 hover:underline">admin@foodmitra.com</a></p></section>
          <hr className="border-slate-200 my-8" />
          <p className="text-xs text-slate-400 text-center">© 2026 FoodMitra. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
