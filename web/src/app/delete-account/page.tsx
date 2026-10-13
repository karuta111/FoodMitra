import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete Account — FoodMitra",
  description: "Request deletion of your FoodMitra account and associated data.",
};

export default function DeleteAccount() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12 lg:py-16">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Delete Your Account</h1>
        <p className="text-sm text-slate-500 mb-8">Request deletion of your FoodMitra account and associated data</p>

        <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed text-slate-700">

          {/* Warning banner */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-medium">
              ⚠️ Account deletion is permanent and cannot be undone. You will lose access to your
              order history, saved addresses, and profile information.
            </p>
          </div>

          {/* What gets deleted */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">What Will Be Deleted</h2>
            <p>When you request account deletion, the following data associated with your FoodMitra account will be permanently deleted within 30 days:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Account credentials</strong> — phone number, email address, and password hash</li>
              <li><strong>Customer profile</strong> — full name, date of birth, anniversary date</li>
              <li><strong>Delivery addresses</strong> — all saved addresses with GPS coordinates</li>
              <li><strong>Shopping cart</strong> — any items currently in your cart</li>
              <li><strong>Push notification tokens</strong> — Expo push token registered on your device</li>
              <li><strong>Active sessions</strong> — all refresh tokens (you will be immediately logged out)</li>
              <li><strong>Reviews</strong> — any restaurant reviews you have submitted</li>
              <li><strong>Notifications</strong> — all in-app notification records</li>
            </ul>
          </section>

          {/* What is retained */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">What Will Be Retained (Legal Compliance)</h2>
            <p>Certain data is retained for legal, tax, and regulatory compliance and cannot be deleted immediately:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Order records</strong> — Retained for 3-7 years as required by Indian tax and consumer protection laws. Your personal identifier (phone number) will be anonymized, but the order details (items, amounts, timestamps) are retained for audit purposes.</li>
              <li><strong>Payment records</strong> — Retained for 7 years as required by financial regulations (RBI/Payment Gateway compliance). Payment method details are NOT stored by FoodMitra — only transaction IDs and amounts.</li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              After the retention period expires, this data is automatically and permanently deleted.
            </p>
          </section>

          {/* How to request deletion */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">How to Request Account Deletion</h2>
            <p>To delete your FoodMitra account and associated data, follow these steps:</p>
            <ol className="list-decimal pl-6 space-y-2 mt-3">
              <li>
                <strong>Send an email</strong> to our data protection team at:
                <br />
                <a href="mailto:omkarghodekar18@gmail.com?subject=Delete%20My%20FoodMitra%20Account" className="text-orange-600 hover:underline font-medium">
                  omkarghodekar18@gmail.com
                </a>
              </li>
              <li>
                <strong>Use the subject line:</strong> &quot;Delete My FoodMitra Account&quot;
              </li>
              <li>
                <strong>Include the following information</strong> in your email so we can verify your identity:
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>Your registered phone number (e.g., +91 98765 43210)</li>
                  <li>Your full name as registered on FoodMitra</li>
                  <li>A brief statement: &quot;I request deletion of my FoodMitra account and all associated personal data.&quot;</li>
                </ul>
              </li>
              <li>
                <strong>Alternatively, call us</strong> at:
                <br />
                <span className="font-medium">+91 8446855637</span> or <span className="font-medium">+91 7350978721</span>
                <br />
                <span className="text-xs text-slate-500">(Monday to Saturday, 9:00 AM to 9:00 PM IST)</span>
              </li>
            </ol>
          </section>

          {/* What happens next */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">What Happens After You Submit a Request</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li><strong>Verification (within 48 hours):</strong> We will verify your identity by matching the phone number and name you provide with our records.</li>
              <li><strong>Confirmation email:</strong> You will receive a confirmation email once your identity is verified.</li>
              <li><strong>Data deletion (within 30 days):</strong> Your account and all associated personal data (as listed above) will be permanently deleted from our systems and databases.</li>
              <li><strong>Final notification:</strong> You will receive a final email confirming that your account and data have been deleted.</li>
            </ol>
          </section>

          {/* Withdrawal */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Withdraw a Deletion Request</h2>
            <p>
              If you change your mind, you can withdraw your deletion request by emailing
              <a href="mailto:omkarghodekar18@gmail.com?subject=Withdraw%20Account%20Deletion%20Request" className="text-orange-600 hover:underline"> omkarghodekar18@gmail.com </a>
              within 7 days of submitting the request (before the deletion is processed).
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Questions?</h2>
            <p>If you have any questions about the account deletion process, contact us:</p>
            <ul className="list-none pl-0 mt-2 space-y-1">
              <li><strong>Email:</strong> <a href="mailto:omkarghodekar18@gmail.com" className="text-orange-600 hover:underline">omkarghodekar18@gmail.com</a></li>
              <li><strong>Phone:</strong> +91 8446855637, +91 7350978721</li>
            </ul>
          </section>

          <hr className="border-slate-200 my-8" />
          <p className="text-xs text-slate-400 text-center">© 2026 FoodMitra. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
