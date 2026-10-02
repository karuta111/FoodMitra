// src/lib/integrations/msg91.ts
// MSG91 OTP Widget integration.
//
// Widget mode: the browser embeds MSG91's widget JS. The widget collects the
// phone number, sends the OTP via MSG91 (using MSG91's own pre-approved template —
// no DLT approval needed), collects the OTP digits, verifies them, and returns a
// JWT access token to your frontend.
//
// Your frontend then sends that access token to OUR backend, which calls MSG91's
// server-side verifyAccessToken endpoint to confirm the token is legit and learn
// which phone number was verified.
//
// OTP digits never touch our backend — only the verified access token does.

const MSG91_VERIFY_URL = 'https://control.msg91.com/api/v5/widget/verifyAccessToken';
const AUTH_KEY = process.env.MSG91_AUTH_KEY || '';
export function isMsg91Enabled(): boolean {
  return process.env.OTP_USE_MSG91_WIDGET === 'true' && !!(process.env.MSG91_AUTH_KEY || AUTH_KEY);
}

export interface WidgetVerifyResult {
  verified: boolean;
  phone?: string;
  message?: string;
  raw?: unknown;
}

function normalizePhone(raw: string | number | undefined): string | undefined {
  if (!raw) return undefined;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 13 && digits.startsWith('91')) return `+${digits}`;
  return digits ? `+${digits}` : undefined;
}

export class Msg91Client {
  /**
   * Verify the access token returned by the MSG91 OTP widget.
   */
  static async verifyWidgetAccessToken(accessToken: string): Promise<WidgetVerifyResult> {
    if (!isMsg91Enabled()) {
      throw new Error('MSG91 widget not configured');
    }
    if (!accessToken || accessToken.length < 20) {
      return { verified: false, message: 'Invalid access token' };
    }

    let res: Response;
    try {
      res = await fetch(MSG91_VERIFY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          authkey: AUTH_KEY,
          'access-token': accessToken,
        }),
      });
    } catch (e) {
      return {
        verified: false,
        message: `Network error contacting MSG91: ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      return { verified: false, message: `MSG91 returned non-JSON (HTTP ${res.status})` };
    }

    const ok = res.ok && (
      data.status === 'success' ||
      data.type === 'success' ||
      data.success === true ||
      data.verified === true
    );
    if (!ok) {
      return {
        verified: false,
        message: data.message || data.error || `MSG91 verification failed (HTTP ${res.status})`,
        raw: data,
      };
    }
    const phone = normalizePhone(data.phone || data.mobile || data.mobile_number);
    return { verified: true, phone, message: data.message, raw: data };
  }
}
