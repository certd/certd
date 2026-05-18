const INVITE_STORAGE_KEY = "certd_invite_code";
const INVITE_TTL = 3 * 24 * 60 * 60 * 1000;

export type InviteCache = {
  code: string;
  expiresAt: number;
};

function normalizeInviteCode(code?: string | null) {
  return code?.trim().toUpperCase();
}

export const inviteUtils = {
  save(code?: string | null) {
    const normalized = normalizeInviteCode(code);
    if (!normalized) {
      return;
    }
    const cache: InviteCache = {
      code: normalized,
      expiresAt: Date.now() + INVITE_TTL,
    };
    localStorage.setItem(INVITE_STORAGE_KEY, JSON.stringify(cache));
  },

  get() {
    const text = localStorage.getItem(INVITE_STORAGE_KEY);
    if (!text) {
      return "";
    }
    try {
      const cache = JSON.parse(text) as InviteCache;
      if (!cache.code || !cache.expiresAt || cache.expiresAt < Date.now()) {
        localStorage.removeItem(INVITE_STORAGE_KEY);
        return "";
      }
      return cache.code;
    } catch (e) {
      localStorage.removeItem(INVITE_STORAGE_KEY);
      return "";
    }
  },

  captureFromLocation() {
    const hashQuery = window.location.hash?.split("?")[1] || "";
    const search = window.location.search?.replace(/^\?/, "") || "";
    const hashParams = new URLSearchParams(hashQuery);
    const searchParams = new URLSearchParams(search);
    const code = hashParams.get("inviteCode") || searchParams.get("inviteCode");
    if (code) {
      this.save(code);
    }
  },
};
