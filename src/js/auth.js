import getConfig from "./config.js"
import logger from "./logger.js"

const REDIRECT_URI = window.location.origin;

export function redirectToLogin() {
    window.location.href = `${getConfig().SSO_BASE_URL}login?redirect=${encodeURIComponent(REDIRECT_URI)}`;
}

const DEVICE_ID_KEY = "deviceId";
const TENANT_ID = "00000000-0000-0000-0000-000000000000";

export function getDeviceId() {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
}

export async function refresh() {
    try {
        const res = await fetch(`${getConfig().SSO_BASE_URL}api/refresh`, {
            method: "POST",
            credentials: "include",
            headers: {
                "X-Device-Id": getDeviceId()
            }
        });
        if (!res.ok) {
            return false;
        }
        await res.json().catch(() => null);
        return true;
    } catch (err) {
        logger.warn("Error refreshing token.", err);
        return false;
    }
}

export async function logout() {
    try {
        await fetch(`${getConfig().SSO_BASE_URL}api/logout`, {
            method: "POST",
            credentials: "include",
            headers: {
                "X-Device-Id": getDeviceId(),
                "X-Tenant-Id": TENANT_ID
            }
        });
    } catch (err) {
        logger.warn("Error during logout.", err);
    }
}