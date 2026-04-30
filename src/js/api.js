import getConfig from "./config.js"
import { refresh, logout } from "./auth.js";

export async function apiFetch(endpoint, options = {}) {
	const headers = {
		"Content-Type": "application/json",
	};

	const makeRequest = () => fetch(`${getConfig().API_URL}${endpoint}`, {
		...options,
		headers,
		credentials: "include"
	});

	let res = await makeRequest();

	if (res.status === 401) {
		const refreshed = await refresh();
		if (refreshed) {
			res = await makeRequest();
		} else {
			await logout();
		}
	}

	if (!res.ok) {
		let errorBody = null;
		try {
			errorBody = await res.json();
		} catch {
			try {
				errorBody = await res.text();
			} catch {
				errorBody = null;
			}
		}

		const messageSuffix = errorBody ? ` - ${JSON.stringify(errorBody)}` : "";
		const error = new Error(`Error ${res.status}: ${res.statusText}${messageSuffix}`);
		// TODO: surface structured error details in UI instead of stringifying
		error.status = res.status;
		error.body = errorBody;
		throw error;
	}

	if (res.status === 204) {
      return null;
    }

	return res.json();
}

// Priorities
export function getPrioritis() {
	return apiFetch("/priorities/");
}

// Tags
export function getTags(boardId) {
	return apiFetch(`/boards/${boardId}/tags`)
}

export function addTag(boardId, tag) {
	return apiFetch(`/boards/${boardId}/tags`, {
		method: "POST",
		body: JSON.stringify(tag)
	});
}

export function updateTag(tagId, tag) {
	return apiFetch(`/tags/${tagId}`, {
		method: "PUT",
		body: JSON.stringify(tag)
	});
}

export function deleteTag(tagId) {
	return apiFetch(`/tags/${tagId}`, {
		method: "DELETE"
	});
}

// Tasks
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

export function getTaskById(taskId) {
	return apiFetch(`/tasks/${taskId}`);
}

export function searchTasks(boardId, query, limit = 20) {
    if (!boardId) return Promise.resolve([]);

    const params = new URLSearchParams({ boardId });
    if (query) params.append("q", query);
    if (limit) params.append("limit", limit);

    return apiFetch(`/tasks/search?${params.toString()}`);
}

//Boards
export function getBoards() {
	return apiFetch("/boards/");
}

export function addBoard(board) {
	return apiFetch('/boards/', {
		method: "POST",
		body: JSON.stringify(board)
	});
}

export function updateBoard(board, { force = false } = {}) {
	const query = force ? "?force=true" : "";
	return apiFetch(`/boards/${board.id}${query}`, {
		method: "PUT",
		body: JSON.stringify(board)
	});
}

export function deleteBoard(board) {
	return apiFetch(`/boards/${board.id}`, {
		method: "DELETE"
	});
}

export function getBoardColumnsWithTasks(boardId) {
	return apiFetch(`/boards/${boardId}/columns`);
}

// Colunmns
export function addTask(task, columnId) {
	return apiFetch(`/columns/${columnId}/tasks`, {
		method: "POST",
		body: JSON.stringify(task)
	});
}

export function addColumn(boardId, column) {
	return apiFetch(`/boards/${boardId}/columns`, {
		method: "POST",
		body: JSON.stringify(column)
	});
}

export function updateColumn(column) {
	return apiFetch(`/columns/${column.id}`, {
		method: "PUT",
		body: JSON.stringify(column)
	});
}

export function deleteColumn(column) {
	return apiFetch(`/columns/${column.id}`, {
		method: "DELETE"
	});
}

// Users
export function getUsers() {
	return apiFetch("/users/");
}

export function getCurrentUser() {
	return apiFetch("/users/me");
}

// Roles
export function getRoles() {
	return apiFetch("/roles/");
}

// Board members
export function getBoardMembers(boardId) {
	return apiFetch(`/boards/${boardId}/members`);
}

export function addBoardMember(boardId, payload) {
	return apiFetch(`/boards/${boardId}/members`, {
		method: "POST",
		body: JSON.stringify(payload)
	});
}

export function updateBoardMember(boardId, userId, payload) {
	return apiFetch(`/boards/${boardId}/members/${userId}`, {
		method: "PATCH",
		body: JSON.stringify(payload)
	});
}

export function deleteBoardMember(boardId, userId) {
	return apiFetch(`/boards/${boardId}/members/${userId}`, {
		method: "DELETE"
	});
}
