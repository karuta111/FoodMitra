// web/src/lib/msg91-widget.ts
// Browser-side wrapper for the MSG91 OTP Widget JS SDK.

const WIDGET_SCRIPT_URLS = [
  'https://verify.msg91.com/otp-provider.js',
  'https://verify.phone91.com/otp-provider.js',
];
const AUTH_KEY = process.env.NEXT_PUBLIC_MSG91_AUTH_KEY || '';
const WIDGET_ID = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID || '';

let scriptLoaded: Promise<void> | null = null;

function loadWidgetScript(): Promise<void> {
  if (scriptLoaded) return scriptLoaded;
  scriptLoaded = new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('document not available'));
      return;
    }
    const existing = document.querySelector('script[src^="https://verify.msg91.com/otp-provider"],script[src^="https://verify.phone91.com/otp-provider"]');
    if (existing) {
      if ((window as any).initSendOTP) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load MSG91 widget script')));
      return;
    }
    let i = 0;
    const attempt = () => {
      if (i >= WIDGET_SCRIPT_URLS.length) {
        reject(new Error('All MSG91 widget script URLs failed to load'));
        return;
      }
      const s = document.createElement('script');
      s.src = WIDGET_SCRIPT_URLS[i];
      s.async = true;
      s.onload = () => {
        if (typeof (window as any).initSendOTP === 'function') {
          resolve();
        } else {
          i++;
          attempt();
        }
      };
      s.onerror = () => {
        i++;
        attempt();
      };
      document.head.appendChild(s);
    };
    attempt();
  });
  return scriptLoaded;
}

export interface Msg91WidgetResult {
  accessToken: string;
  phone?: string;
}

export async function triggerMsg91OtpWidget(phone: string): Promise<Msg91WidgetResult> {
  if (!AUTH_KEY || !WIDGET_ID) {
    throw new Error('MSG91 widget not configured. Set NEXT_PUBLIC_MSG91_AUTH_KEY and NEXT_PUBLIC_MSG91_WIDGET_ID.');
  }
  await loadWidgetScript();

  const initSendOTP = (window as any).initSendOTP;
  if (typeof initSendOTP !== 'function') {
    throw new Error(
      'MSG91 widget script loaded but window.initSendOTP is not a function. ' +
      'Available globals: ' + Object.keys(window).filter(k => /otp|msg91|widget/i.test(k)).join(', ') + '.'
    );
  }

  const existing = document.querySelector('msg91-otp-provider');
  if (existing) existing.remove();

  return new Promise<Msg91WidgetResult>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('OTP verification timed out (5 minutes)'));
    }, 5 * 60 * 1000);

    initSendOTP({
      widgetId: WIDGET_ID,
      tokenAuth: AUTH_KEY,
      identifier: phone,
      exposeMethods: true,
      success: (data: unknown) => {
        clearTimeout(timeoutId);
        const tokenStr =
          typeof data === 'string' ? data :
          (data as any)?.accessToken || (data as any)?.access_token || (data as any)?.token || (data as any)?.message;
        if (tokenStr) {
          resolve({ accessToken: tokenStr, phone });
        } else {
          reject(new Error('Widget did not return an access token. Data was: ' + JSON.stringify(data).slice(0, 300)));
        }
      },
      failure: (error: unknown) => {
        clearTimeout(timeoutId);
        const msg =
          typeof error === 'string' ? error :
          (error as any)?.message || (error as any)?.error || (error as any)?.reason ||
          (typeof error === 'object' ? JSON.stringify(error).slice(0, 300) : 'OTP verification failed');
        reject(new Error(msg));
      },
    });
  });
}

export function isMsg91WidgetConfigured(): boolean {
  return (
    process.env.NEXT_PUBLIC_OTP_USE_MSG91_WIDGET === 'true' &&
    !!AUTH_KEY &&
    !!WIDGET_ID
  );
}
