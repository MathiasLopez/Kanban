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
