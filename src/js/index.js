import { getBoards, getBoard, addBoard, updateBoard, deleteBoard, getBoardColumnsWithTasks, addTask, updateTask, deleteTask, addColumn, updateColumn, deleteColumn, getUsers, getPrioritis, getTags } from "./api.js";
import { redirectToLogin, isAuthenticated } from "./auth.js";
import { Kanban } from "./kanban.js";
import { Dialog } from "./Dialog.js";
import logger from "./logger.js";
import getConfig from "./config.js"
import { showLoader, hideLoader } from "./controls/loader.js";

const loginBtn = document.getElementById("loginBtn");
const kanban = new Kanban(
    {
        container: document.getElementById("kanban"),
        template: document.getElementById("card-template"),
        groupBy: 'column_id',
        columns: [],
        cardClick: onCardClick,
        onCardMoved: handleCardMoved,
        onColumnClick: handleColumnClick
    });
const DIALOG_TYPES = {
    BOARD: "board",
    TASK: "task",
    COLUMN: "column"
};
const dialog = new Dialog({
    dialog: document.querySelector("#edit-dialog"),
    onClose: async (args) => {
        if (args.type === DIALOG_TYPES.BOARD) {
            await boardDialogClosed(args);
        } else if (args.type === DIALOG_TYPES.COLUMN) {
            await columnDialogClosed(args);
        } else {
            await cardDialogClosed(args);
        }
    }
})

const CURRENT_DATA = {
    priorities: [],
    tags: [],
    users: [],
    columns: []
};

const BOARD_CACHE_KEY = "selectedBoardId";

const logoutBtn = document.getElementById("logoutBtn");
const addBoardBtn = document.getElementById("addBoardBtn");
const addCardBtn = document.getElementById("addCardBtn");
const addColumnBtn = document.getElementById("addColumnBtn");
const boardSelect = document.getElementById("board-select");
const boardEditBtn = document.getElementById("board-menu-btn");

const newTask = {
    title: "",
    description: "",
    priority_id: null,
    assigned: null,
    tags: [],
    column_id: null
};

const newBoard = {
    title: "",
    description: ""
};

function buildDialogConfig(type, isEdit) {
    if (type === DIALOG_TYPES.BOARD) {
        return {
            type: DIALOG_TYPES.BOARD,
            title: isEdit ? "Edit board" : "New board",
            fields: [
                { id: "title", label: "Title", type: "text", required: true },
                { id: "description", label: "Description", type: "textarea" }
            ]
        };
    }

    if (type === DIALOG_TYPES.COLUMN) {
        return {
            type: DIALOG_TYPES.COLUMN,
            title: isEdit ? "Edit column" : "New column",
            fields: [
                { id: "title", label: "Title", type: "text", required: true },
                { id: "description", label: "Description", type: "textarea" }
            ]
        };
    }

    return {
        type: DIALOG_TYPES.TASK,
        title: isEdit ? "Edit card" : "New card",
        fields: [
            { id: "title", label: "Title", type: "text", required: true },
            { id: "description", label: "Description", type: "textarea" },
            {
                id: "priority_id",
                label: "Priority",
                type: "select",
                options: () => CURRENT_DATA.priorities.map(priority => ({
                    value: priority.id,
                    label: priority.title
                }))
            },
            {
                id: "assigned",
                label: "Assigned",
                type: "select",
                options: () => ([
                    { value: "", label: "Unassigned" },
                    ...CURRENT_DATA.users.map(user => ({
                        value: user.id,
                        label: user.username
                    }))
                ])
            },
            {
                id: "column_id",
                label: "Column",
                type: "select",
                options: () => (CURRENT_DATA.columns || []).map(column => ({
                    value: column.id,
                    label: column.title
                }))
            }
        ]
    };
}

const PRIORITY_CLASSES = {
    '87303282-a1d8-48e1-84ac-6a5739a9737c': "card-priority-normal",
    // 1: "card-priority-low",
    // 2: "card-priority-medium",
    // 3: "card-priority-high",
    // 4: "card-priority-top"
};

const DEFAULT_PRIORITY_CLASS = 'card-priority-normal';

(async () => {
    let loaderId;
    try {
        initializeLogger();

        loaderId = showLoader();

        loginBtn.addEventListener("click", () => {
            redirectToLogin();
        });

        logoutBtn.addEventListener("click", () => {
            showAccess();
        });

        boardSelect.addEventListener("change", async e => {
            localStorage.setItem(BOARD_CACHE_KEY, e.target.value);
            await loadColumnsWithTasks()
        });

        boardEditBtn.addEventListener("click", async () => {
            logger.debug("addBoardBtn clicked", boardSelect.value);
            const board = await getBoard(boardSelect.value);
            dialog.openDialog({ data: { ...board }, config: buildDialogConfig(DIALOG_TYPES.BOARD, true) });
        });

        if (await isAuthenticated()) {
            loginBtn.style.display = "none";
            logoutBtn.style.display = "inline-block";
            await loadUsers();
            await initializeKanban();
        } else {
            showAccess();
        }
    } catch (error) {
        logger.error(error.message, error)
    } finally {
        hideLoader(loaderId);
    }
})();

function initializeLogger() {
    try {
        logger.setLevels({
            debug: getConfig().ENV == 'development',
            info: true,
            warn: true,
            error: true
        });

    } catch (error) {
        console.error(error);
    }
}

async function initializeKanban() {
    addBoardBtn.style.display = "inline-block";
    addCardBtn.style.display = "inline-block";
    addColumnBtn.style.display = "inline-block";
    boardSelect.style.display = "inline-block";
    boardEditBtn.style.display = "inline-block";

    const [priorities] = await Promise.all([
        getPrioritis(),
        loadBoards()
    ])

    CURRENT_DATA.priorities = priorities
    const defaultPriority = priorities?.[0] ?? null;
    newTask.priority_id = defaultPriority?.id ?? null;
    newTask.priority = null;
    const prioritesExtended = extendPrioritiesWithClass(priorities);
    kanban.priorites = prioritesExtended;

    CURRENT_DATA.tags = await getTags(boardSelect.value);
    kanban.tags = CURRENT_DATA.tags

    await loadColumnsWithTasks();
}

function extendPrioritiesWithClass(priorities) {
    return priorities.map(i => ({
        ...i,
        class: PRIORITY_CLASSES[i.id] ?? DEFAULT_PRIORITY_CLASS
    }));
}

function removeKanban() {
    addBoardBtn.style.display = "none";
    addCardBtn.style.display = "none";
    addColumnBtn.style.display = "none";
    boardSelect.style.display = "none"
    boardEditBtn.style.display = "none";
    kanban.destroy()
}

function showAccess() {
    logoutBtn.style.display = "none";
    loginBtn.style.display = "inline-block";
    removeKanban();
}

addBoardBtn.onclick = async () => {
    logger.debug("addBoardBtn clicked");
    dialog.openDialog({ data: { ...newBoard }, config: buildDialogConfig(DIALOG_TYPES.BOARD, false) });
};

addCardBtn.onclick = async () => {
    logger.debug("addCardBtn clicked");
    newTask.column_id = CURRENT_DATA.columns?.[0]?.id ?? null;
    dialog.openDialog({ data: { ...newTask }, config: buildDialogConfig(DIALOG_TYPES.TASK, false) });
};

addColumnBtn.onclick = async () => {
    logger.debug("addColumnBtn clicked");
    dialog.openDialog({ data: { title: "", description: "" }, config: buildDialogConfig(DIALOG_TYPES.COLUMN, false) });
};

function onCardClick(args) {
    logger.debug("onCardClicked", args);
    dialog.openDialog({ data: { ...args }, config: buildDialogConfig(DIALOG_TYPES.TASK, true) });
}

function handleColumnClick(column) {
    logger.debug("onColumnClick", column);
    dialog.openDialog({ data: { ...column }, config: buildDialogConfig(DIALOG_TYPES.COLUMN, true) });
}

async function handleCardMoved(args) {
    try {
        logger.debug("handleCardMoved", args);
        //TODO: disable card while it is updating
        args.item.column_id = args.toColumn;
        kanban.updateCard(args.item);
        await updateTask(args.item);
    } catch (error) {
        logger.error(error.message, error);
        args.item.column_id = args.fromColumn;
        kanban.updateCard(args.item);
    } finally {
        //TODO: enable card
    }
}

async function cardDialogClosed(args) {
    try {
        logger.debug("cardDialogClosed", args);
        if (args.action === "save") {
            if (args.data.id) {
                await updateTask(args.data)
                kanban.updateCard(args.data);
            } else {
                const targetColumnId = args.data.column_id || CURRENT_DATA.columns?.[0]?.id;
                if (!targetColumnId) {
                    throw new Error("No columns available to assign the new task.");
                }
                const payload = { ...args.data, column_id: targetColumnId };
                var response = await addTask(payload, targetColumnId);
                args.data = { ...response };
                kanban.addCard(args.data);
            }
        } else if (args.action === "delete") {
            await deleteTask(args.data)
            kanban.deleteCard(args.data);
        }
    } catch (error) {
        logger.error(error.message, error);
    }
}

async function boardDialogClosed(args) {
    try {
        if (args.action === "save") {
            if (args.data.id) {
                await updateBoard(args.data);
                const option = boardSelect.querySelector(`option[value="${args.data.id}"]`);
                option.textContent = args.data.title;
            } else {
                var response = await addBoard(args.data);
                addBoardToSelect(response);
                if (confirm("Would you like to go to the newly created board?")) {
                    boardSelect.value = response.id;
                    kanban.destroy();
                }
            }
        } else if (args.action === "delete") {
            if (confirm("Are you sure you want to delete the board? All tasks associated with it will be deleted.")) {
                await deleteBoard(args.data)
                const option = boardSelect.querySelector(`option[value="${args.data.id}"]`);
                option.remove();
                await loadColumnsWithTasks();
            }
        }
    } catch (error) {
        logger.error(error.message, error);
    }
}

async function columnDialogClosed(args) {
    try {
        if (args.action === "save") {
            if (args.data.id) {
                await updateColumn(args.data);
            } else {
                const boardSelected = boardSelect.value;
                if (!boardSelected) {
                    throw new Error("No board selected to create the column.");
                }
                await addColumn(boardSelected, args.data);
            }
            await loadColumnsWithTasks();
        } else if (args.action === "delete") {
            if (confirm("Are you sure you want to delete the column? All tasks associated with it will be deleted.")) {
                await deleteColumn(args.data);
                await loadColumnsWithTasks();
            }
        }
    } catch (error) {
        logger.error(error.message, error);
    }
}

async function loadUsers() {
    const users = await getUsers();
    CURRENT_DATA.users = users;
}

async function loadBoards() {
    const boards = await getBoards();
    boardSelect.innerHTML = "";
    boards.forEach(addBoardToSelect);

    const cachedId = localStorage.getItem(BOARD_CACHE_KEY);
    const selectedId = resolveSelectedBoardId(boards, cachedId);

    if (selectedId) {
        boardSelect.value = selectedId;
        localStorage.setItem(BOARD_CACHE_KEY, selectedId);
    } else {
        localStorage.removeItem(BOARD_CACHE_KEY);
    }

    return selectedId;

    // TODO: What happens if there are no boards?
    // const cachedId = localStorage.getItem(BOARD_CACHE_KEY);
    // if (cachedId) {
    //     const option = boardSelect.querySelector(`option[value="${cachedId}"]`);
    //     if (option) {
    //         boardSelect.value = cachedId;
    //     } else {
    //         localStorage.removeItem(BOARD_CACHE_KEY);
    //     }
    // } else if (boardSelect.options.length > 0) {
    //     boardSelect.value = boardSelect.options[0].value;
    // }
}

function resolveSelectedBoardId(boards, cachedId) {
    if (cachedId && boards.some(b => b.id === cachedId)) {
        return cachedId;
    }
    return boards.length > 0 ? boards[0].id : null;
}


function addBoardToSelect(board) {
    const option = document.createElement("option");
    option.value = board.id;
    option.textContent = board.title;
    boardSelect.appendChild(option);
}

async function loadColumnsWithTasks() {
    const boardSelected = boardSelect.value;
    if (boardSelected) {
        var result = await getBoardColumnsWithTasks(boardSelected);
        const columns = result.map(({ tasks, ...column }) => column)
        CURRENT_DATA.columns = columns;
        kanban.columns = columns.map(item => ({
            key: item.id,
            title: item.title,
            data: item
        }))

        const tasks = result.flatMap(column =>
            column.tasks.map(task => ({
                ...task
            }))
        )
        kanban.loadCards(tasks);
    } else {
        return []
    }
}
