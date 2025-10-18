const isLocal = location.hostname.includes("localtest");

export default function getConfig() {
    return {
        API_URL: isLocal ? "https://tasksapi.localtest.me" : "https://tasksapi.mathiaslopez.tech",
        SSO_BASE_URL: isLocal ? "https://auth.localtest.me/" : "https://auth.mathiaslopez.tech/",
        ENV: isLocal ? "development" : "production"
    }
}