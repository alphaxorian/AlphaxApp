/*
 * ALPHAXEXTENSIONS — API Manager (standalone)
 * Added as a new file only. Existing extension files are intentionally unchanged.
 *
 * IMPORTANT:
 * - This file is not wired into popup.js/manifest.json because the request was to
 *   leave every existing file untouched.
 * - To use it later, an approved integration must call AlphaXAPIManager.verifyLicense(key).
 * - Keep Firebase service-account credentials on the server/Cloudflare Worker only.
 */
(() => {
  'use strict';

  const CONFIG = Object.freeze({
    // Existing Worker endpoint referenced by this extension's popup.js.
    workerBaseUrl: 'https://alphax-license-api.arsalankhanyt0786.workers.dev',
    licensePath: '/verify',
    timeoutMs: 12000
  });

  async function requestJson(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {})
        }
      });

      const raw = await response.text();
      let data;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (_) {
        throw new Error(`API returned non-JSON data (HTTP ${response.status}).`);
      }

      if (!response.ok) {
        const message = typeof data.message === 'string'
          ? data.message
          : `API request failed (HTTP ${response.status}).`;
        const error = new Error(message);
        error.status = response.status;
        error.data = data;
        throw error;
      }
      return data;
    } catch (error) {
      if (error && error.name === 'AbortError') {
        throw new Error('License API timed out. Check the Worker and try again.');
      }
      if (error instanceof TypeError) {
        throw new Error('Could not reach the license API. Check the Worker URL, network, and CORS settings.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function verifyLicense(licenseKey) {
    const key = String(licenseKey || '').trim();
    if (!key) {
      return { success: false, valid: false, message: 'Please enter your license key.' };
    }

    const data = await requestJson(CONFIG.workerBaseUrl + CONFIG.licensePath, {
      method: 'POST',
      body: JSON.stringify({ licenseKey: key })
    });

    return {
      success: data?.success === true,
      valid: data?.valid === true,
      message: typeof data?.message === 'string'
        ? data.message
        : (data?.valid === true ? 'License verified successfully.' : 'License is invalid or inactive.'),
      raw: data
    };
  }

  async function healthCheck() {
    return requestJson(CONFIG.workerBaseUrl + '/', { method: 'GET' });
  }

  // Expose a small, explicit API for a future integration; no existing files modified.
  Object.defineProperty(globalThis, 'AlphaXAPIManager', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: Object.freeze({ verifyLicense, healthCheck })
  });
})();
