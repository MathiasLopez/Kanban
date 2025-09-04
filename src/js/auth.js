export function saveToken(token) {
	localStorage.setItem("authToken", token);
}

export function getToken() {
	return localStorage.getItem("authToken");
}

export function clearToken() {
	localStorage.removeItem("authToken");
}

export function isLoggedIn() {
	return !!getToken();
}