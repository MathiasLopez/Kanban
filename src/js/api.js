const API_URL = "https://tasksapi.mathiaslopez.tech";

export async function apiFetch(endpoint, options = {}) {
	const headers = {
		"Content-Type": "application/json",
	};

	const res = await fetch(`${API_URL}${endpoint}`, {
		...options,
		headers
	});

	if (!res.ok) {
		throw new Error(`Error ${res.status}: ${res.statusText}`);
	}

	if (res.status === 204) {
      return null;
    }

	return res.json();
}

export function getTasks() {
	return apiFetch("/tasks/");
}

export function addTask(task) {
	return apiFetch("/tasks/", {
		method: "POST",
		body: JSON.stringify(task)
	});
}

export function updateTask(task) {
	return apiFetch(`/tasks/${task.id}`, {
		method: "PUT",
		body: JSON.stringify(task)
	});
}

export function deleteTask(task) {
	return apiFetch(`/tasks/${task.id}`, {
		method: "DELETE"
	});
}

export function markTaskAsCompleted(task) {
	return apiFetch(`/tasks/${task.id}/complete`, {
		method: "PUT"
	});
}