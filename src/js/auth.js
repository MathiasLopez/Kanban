const SSO_BASE_URL = "https://auth.mathiaslopez.tech/"
const REDIRECT_URI = window.location.origin;

export function redirectToLogin() {
  window.location.href = `${SSO_BASE_URL}login?redirect=${encodeURIComponent(REDIRECT_URI)}`;
}

export async function isAuthenticated() {
    try {
        const res = await fetch(`${SSO_BASE_URL}auth/check-sso-token`, {
            method: 'GET',
            credentials: 'include'
        });

		if (res.ok) {
			console.log(await res.json())
			return true;	
		} else if(res.status === 401){
			console.warn('Invalid or expired session')
		} else {
			console.error(`Error checking if the user is authenticated. Code: ${res.status} Message: ${res.statusText}`)
		}

    } catch (err) {
        console.error('Error verifying whether the user is authenticated.', err);
    }
	return false;
}