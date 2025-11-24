import getConfig from "./config.js"
import logger from "./logger.js"

const REDIRECT_URI = window.location.origin;

export function redirectToLogin() {
    window.location.href = `${getConfig().SSO_BASE_URL}login?redirect=${encodeURIComponent(REDIRECT_URI)}`;
}

export async function isAuthenticated() {
    try {
        const res = await fetch(`${getConfig().SSO_BASE_URL}api/check-sso-token`, {
            method: 'GET',
            credentials: 'include'
        });

        if (res.ok) {
            logger.debug('Authenticated user', await res.json())
            return true;
        } else if (res.status === 401) {
            logger.warn('Invalid or expired session', res)
        } else {
            logger.warn(`Error checking if the user is authenticated.`, res);
        }

    } catch (err) {
        logger.warn('Error verifying whether the user is authenticated.', err);
    }
    return false;
}