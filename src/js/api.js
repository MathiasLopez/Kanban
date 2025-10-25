import getConfig from "./config.js"

export async function apiFetch(endpoint, options = {}) {
	const headers = {
		"Content-Type": "application/json",
	};

	const res = await fetch(`${getConfig().API_URL}${endpoint}`, {
		...options,
		headers,
		credentials: "include"
	});

	if (!res.ok) {
		throw new Error(`Error ${res.status}: ${res.statusText}`);
	}

	if (res.status === 204) {
      return null;
    }

	return res.json();
}

// Tasks
export function getTasks(boardId) {
	return apiFetch(`/boards/${boardId}/tasks`);
}

export function addTask(task, boardId) {
	return apiFetch(`/boards/${boardId}/tasks`, {
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

//Boards
export function getBoards() {
	return apiFetch("/boards/");
}

export function getBoard(boardId) {
	return apiFetch(`/boards/${boardId}`);
}

export function addBoard(board) {
	return apiFetch('/boards/', {
		method: "POST",
		body: JSON.stringify(board)
	});
}

export function updateBoard(board) {
	return apiFetch(`/boards/${board.id}`, {
		method: "PUT",
		body: JSON.stringify(board)
	});
}

export function deleteBoard(board) {
	return apiFetch(`/boards/${board.id}`, {
		method: "DELETE"
	});
}

// Users
export function getUsers() {
	return apiFetch("/users/");
}