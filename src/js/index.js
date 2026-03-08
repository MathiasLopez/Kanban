import { getBoards, getBoard, addBoard, updateBoard, deleteBoard, getBoardColumnsWithTasks, addTask, updateTask, deleteTask, addColumn, updateColumn, deleteColumn, getBoardUsers, getPrioritis, getTags, addTag, updateTag, deleteTag } from "./api.js";
import { redirectToLogin, refresh, logout } from "./auth.js";
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
    BOARD_SETTINGS: "board_settings",
    TASK: "task",
    COLUMN: "column"
};
const dialog = new Dialog({
    dialog: document.querySelector("#edit-dialog"),
    onClose: async (args) => {
        if (args.type === DIALOG_TYPES.BOARD) {
            return await boardDialogClosed(args);
        } else if (args.type === DIALOG_TYPES.BOARD_SETTINGS) {
            return await boardSettingsDialogClosed(args);
        } else if (args.type === DIALOG_TYPES.COLUMN) {
            return await columnDialogClosed(args);
        } else {
            return await cardDialogClosed(args);
        }
    }
})

const CURRENT_DATA = {
    priorities: [],
    tags: [],
    boardUsers: [],
    columns: [],
    boards: []
};

const BOARD_CACHE_KEY = "selectedBoardId";

const logoutBtn = document.getElementById("logoutBtn");
const addBoardBtn = document.getElementById("addBoardBtn");
const addCardBtn = document.getElementById("addCardBtn");
const addColumnBtn = document.getElementById("addColumnBtn");
const boardSelect = document.getElementById("board-select");
const boardEditBtn = document.getElementById("board-edit-btn");
const boardSettingsBtn = document.getElementById("board-menu-btn");

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
    description: "",
    columns: [],
    tags: []
};

function buildDialogConfig(type, isEdit) {
    if (type === DIALOG_TYPES.BOARD) {
        const fields = [
            { id: "title", label: "Title", type: "text", required: true },
            { id: "description", label: "Description", type: "textarea" }
        ];
        if (!isEdit) {
            fields.push(
                {
                    id: "columns",
                    label: "Columns",
                    type: "table",
                    columns: [
                        { key: "title", label: "Title", type: "text", required: true },
                        { key: "description", label: "Description", type: "text" }
                    ],
                    addButtonLabel: "Add column"
                },
                {
                    id: "tags",
                    label: "Tags",
                    type: "table",
                    columns: [
                        { key: "title", label: "Title", type: "text", required: true }
                    ],
                    addButtonLabel: "Add tag"
                }
            );
        }
        return {
            type: DIALOG_TYPES.BOARD,
            title: isEdit ? "Edit board" : "New board",
            fields
        };
    }

    if (type === DIALOG_TYPES.BOARD_SETTINGS) {
        return {
            type: DIALOG_TYPES.BOARD_SETTINGS,
            title: "Board settings",
            allowDelete: false,
            fields: [
                {
                    id: "columns",
                    label: "Columns",
                    type: "table",
                    columns: [
                        { key: "title", label: "Title", type: "text", required: true },
                        { key: "description", label: "Description", type: "text" }
                    ],
                    addButtonLabel: "Add column"
                },
                {
                    id: "tags",
                    label: "Tags",
                    type: "table",
                    columns: [
                        { key: "title", label: "Title", type: "text", required: true }
                    ],
                    addButtonLabel: "Add tag"
                }
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
                    ...CURRENT_DATA.boardUsers.map(user => ({
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
            },
            {
                id: "tags",
                label: "Tags",
                type: "select",
                multiple: true,
                options: () => CURRENT_DATA.tags.map(tag => ({
                    value: tag.id,
                    label: tag.title
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

        logoutBtn.addEventListener("click", async () => {
            await logout();
            showAccess();
        });

        boardSelect.addEventListener("change", async e => {
            const nextBoardId = e.target.value;
            localStorage.setItem(BOARD_CACHE_KEY, nextBoardId);
            await refreshBoardData();
        });

        boardEditBtn.addEventListener("click", async () => {
            logger.debug("boardEditBtn clicked", boardSelect.value);
            const board = await getBoard(boardSelect.value);
            dialog.openDialog({ data: { ...board }, config: buildDialogConfig(DIALOG_TYPES.BOARD, true) });
        });

        boardSettingsBtn.addEventListener("click", async () => {
            logger.debug("boardSettingsBtn clicked", boardSelect.value);
            dialog.openDialog({
                data: {
                    board_id: boardSelect.value,
                    columns: (CURRENT_DATA.columns || []).map(column => ({ ...column })),
                    tags: (CURRENT_DATA.tags || []).map(tag => ({ ...tag }))
                },
                config: buildDialogConfig(DIALOG_TYPES.BOARD_SETTINGS)
            });
        });

        if (await refresh()) {
            loginBtn.style.display = "none";
            logoutBtn.style.display = "inline-block";
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
    boardSettingsBtn.style.display = "inline-block";

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

    await refreshBoardData();
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
    boardSettingsBtn.style.display = "none";
    kanban.destroy()
}

function showAccess() {
    logoutBtn.style.display = "none";
    loginBtn.style.display = "inline-block";
    removeKanban();
}

addBoardBtn.onclick = async () => {
    logger.debug("addBoardBtn clicked");
    dialog.openDialog({
        data: { ...newBoard },
        config: buildDialogConfig(DIALOG_TYPES.BOARD, false)
    });
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
    const tagIds = normalizeTagIds(args?.tags);
    dialog.openDialog({ data: { ...args, tags: tagIds }, config: buildDialogConfig(DIALOG_TYPES.TASK, true) });
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
        await updateTask(normalizeTaskPayload(args.item));
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
            args.data.title = normalizeText(args.data?.title);
            if (!args.data?.title) {
                alert("Task title is required.");
                return false;
            }
            if (isTaskTitleDuplicate(args.data.title, args.data.id)) {
                alert("Task title must be unique (case-insensitive).");
                return false;
            }
            if (args.data.id) {
                await updateTask(normalizeTaskPayload(args.data))
                kanban.updateCard(args.data);
            } else {
                const targetColumnId = args.data.column_id || CURRENT_DATA.columns?.[0]?.id;
                if (!targetColumnId) {
                    throw new Error("No columns available to assign the new task.");
                }
                const payload = normalizeTaskPayload({ ...args.data, column_id: targetColumnId });
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
    return true;
}

async function boardDialogClosed(args) {
    try {
        if (args.action === "save") {
            if (args.data.id) {
                const normalized = normalizeBoardDraft(args.data);
                if (!normalized.title) {
                    alert("Board title is required.");
                    return false;
                }
                if (isBoardTitleDuplicate(normalized.title, normalized.id)) {
                    alert("Board title must be unique (case-insensitive).");
                    return false;
                }
                await updateBoard({
                    id: normalized.id,
                    title: normalized.title,
                    description: normalized.description
                });
                const option = boardSelect.querySelector(`option[value="${args.data.id}"]`);
                option.textContent = normalized.title;
                CURRENT_DATA.boards = (CURRENT_DATA.boards || []).map(board =>
                    board.id === normalized.id ? { ...board, title: normalized.title, description: normalized.description } : board
                );
            } else {
                const normalized = normalizeBoardDraft(args.data);
                if (!normalized.title) {
                    alert("Board title is required.");
                    return false;
                }
                if (isBoardTitleDuplicate(normalized.title)) {
                    alert("Board title must be unique (case-insensitive).");
                    return false;
                }
                const validation = validateBoardDraft(normalized);
                if (!validation.ok) {
                    alert(validation.message);
                    return false;
                }
                var response = await addBoard(normalized);
                addBoardToSelect(response);
                CURRENT_DATA.boards = [...(CURRENT_DATA.boards || []), response];
                if (confirm("Would you like to go to the newly created board?")) {
                    boardSelect.value = response.id;
                    kanban.destroy();
                }
                await refreshBoardData();
            }
        } else if (args.action === "delete") {
            if (confirm("Are you sure you want to delete the board? All tasks associated with it will be deleted.")) {
                await deleteBoard(args.data)
                const option = boardSelect.querySelector(`option[value="${args.data.id}"]`);
                option.remove();
                CURRENT_DATA.boards = (CURRENT_DATA.boards || []).filter(board => board.id !== args.data.id);
                await refreshBoardData();
            }
        }
    } catch (error) {
        logger.error(error.message, error);
    }
    return true;
}

async function boardSettingsDialogClosed(args) {
    try {
        if (args.action !== "save") {
            return true;
        }
        const boardId = args.data?.board_id || boardSelect.value;
        if (!boardId) return true;

        const nextColumns = Array.isArray(args.data?.columns) ? args.data.columns : [];
        const nextTags = Array.isArray(args.data?.tags) ? args.data.tags : [];
        const prevColumns = Array.isArray(CURRENT_DATA.columns) ? CURRENT_DATA.columns : [];
        const prevTags = Array.isArray(CURRENT_DATA.tags) ? CURRENT_DATA.tags : [];

        const normalizedColumns = nextColumns.map(column => ({
            ...column,
            title: normalizeText(column?.title),
            description: normalizeText(column?.description)
        }));
        const normalizedTags = nextTags.map(tag => ({
            ...tag,
            title: normalizeText(tag?.title)
        }));

        if (normalizedColumns.some(column => !column.title)) {
            alert("Columns require a non-empty title.");
            return false;
        }
        if (normalizedTags.some(tag => !tag.title)) {
            alert("Tags require a non-empty title.");
            return false;
        }

        const columnTitles = normalizedColumns.map(item => item.title).filter(Boolean);
        const columnTitleSet = new Set(columnTitles.map(title => title.toLowerCase()));
        if (columnTitleSet.size !== columnTitles.length) {
            alert("Column titles must be unique (case-insensitive).");
            return false;
        }

        const tagTitles = normalizedTags.map(item => item.title).filter(Boolean);
        const tagTitleSet = new Set(tagTitles.map(title => title.toLowerCase()));
        if (tagTitleSet.size !== tagTitles.length) {
            alert("Tag titles must be unique (case-insensitive).");
            return false;
        }

        const prevColumnsById = new Map(prevColumns.map(column => [column.id, column]));
        const nextColumnsById = new Map(normalizedColumns.filter(column => column.id).map(column => [column.id, column]));

        const columnsToAdd = normalizedColumns.filter(column => !column.id).map(column => ({
            title: column.title,
            description: column.description
        }));

        const columnsToUpdate = normalizedColumns
            .filter(column => column.id && prevColumnsById.has(column.id))
            .map(column => {
                const prev = prevColumnsById.get(column.id);
                return {
                    id: column.id,
                    title: column.title,
                    description: column.description,
                    prevTitle: normalizeText(prev.title),
                    prevDescription: normalizeText(prev.description)
                };
            })
            .filter(column =>
                column.title !== column.prevTitle ||
                column.description !== column.prevDescription
            )
            .map(column => ({
                id: column.id,
                title: column.title,
                description: column.description
            }));

        const columnsToDelete = prevColumns.filter(column => !nextColumnsById.has(column.id));

        const prevTagsById = new Map(prevTags.map(tag => [tag.id, tag]));
        const nextTagsById = new Map(normalizedTags.filter(tag => tag.id).map(tag => [tag.id, tag]));

        const tagsToAdd = normalizedTags.filter(tag => !tag.id).map(tag => ({
            title: tag.title
        }));

        const tagsToUpdate = normalizedTags
            .filter(tag => tag.id && prevTagsById.has(tag.id))
            .map(tag => {
                const prev = prevTagsById.get(tag.id);
                return {
                    id: tag.id,
                    title: tag.title,
                    prevTitle: normalizeText(prev.title)
                };
            })
            .filter(tag => tag.title !== tag.prevTitle)
            .map(tag => ({
                id: tag.id,
                title: tag.title
            }));

        const tagsToDelete = prevTags.filter(tag => !nextTagsById.has(tag.id));

        await Promise.all(columnsToAdd.map(column => addColumn(boardId, column)));
        await Promise.all(columnsToUpdate.map(column => updateColumn(column)));
        await Promise.all(columnsToDelete.map(column => deleteColumn(column)));

        await Promise.all(tagsToAdd.map(tag => addTag(boardId, tag)));
        await Promise.all(tagsToUpdate.map(tag => updateTag(tag.id, { title: tag.title })));
        await Promise.all(tagsToDelete.map(tag => deleteTag(tag.id)));

        await refreshBoardData();
    } catch (error) {
        logger.error(error.message, error);
    }
    return true;
}

async function columnDialogClosed(args) {
    try {
        if (args.action === "save") {
            args.data.title = normalizeText(args.data.title);
            args.data.description = normalizeText(args.data.description);
            if (!args.data.title) {
                alert("Column title is required.");
                return false;
            }
            if (isColumnTitleDuplicate(args.data.title, args.data.id)) {
                alert("Column title must be unique (case-insensitive).");
                return false;
            }
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
    return true;
}

async function loadBoardUsers(boardId) {
    if (!boardId) {
        CURRENT_DATA.boardUsers = [];
        return [];
    }

    try {
        const users = await getBoardUsers(boardId);
        CURRENT_DATA.boardUsers = Array.isArray(users) ? users : [];
    } catch (error) {
        logger.error(error.message, error);
        CURRENT_DATA.boardUsers = [];
    }

    return CURRENT_DATA.boardUsers;
}

async function loadBoards() {
    const boards = await getBoards();
    CURRENT_DATA.boards = boards;
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

function normalizeTagIds(tags) {
    if (!Array.isArray(tags)) {
        return [];
    }
    return tags.map(tag => tag?.id ?? tag).filter(Boolean);
}

function normalizeTaskPayload(task) {
    const tagIds = normalizeTagIds(task?.tags);
    return {
        ...task,
        tags: tagIds
    };
}

async function loadTags() {
    const boardSelected = boardSelect.value;
    if (!boardSelected) {
        CURRENT_DATA.tags = [];
        kanban.tags = [];
        return [];
    }
    const tags = await getTags(boardSelected);
    CURRENT_DATA.tags = tags;
    kanban.tags = tags;
    return tags;
}

async function refreshBoardData() {
    await loadBoardUsers(boardSelect.value);
    await loadTags();
    await loadColumnsWithTasks();
}

function validateBoardDraft(data) {
    const columns = Array.isArray(data?.columns) ? data.columns : [];
    const tags = Array.isArray(data?.tags) ? data.tags : [];

    const columnTitles = columns.map(item => item?.title).filter(Boolean);
    const tagTitles = tags.map(item => item?.title).filter(Boolean);

    if (columns.some(item => !item?.title)) {
        return { ok: false, message: "Columns require a non-empty title." };
    }
    if (tags.some(item => !item?.title)) {
        return { ok: false, message: "Tags require a non-empty title." };
    }

    const columnTitleSet = new Set(columnTitles.map(title => title.toLowerCase()));
    if (columnTitleSet.size !== columnTitles.length) {
        return { ok: false, message: "Column titles must be unique (case-insensitive)." };
    }

    const tagTitleSet = new Set(tagTitles.map(title => title.toLowerCase()));
    if (tagTitleSet.size !== tagTitles.length) {
        return { ok: false, message: "Tag titles must be unique (case-insensitive)." };
    }

    return { ok: true };
}


function normalizeText(value) {
    if (value === undefined || value === null) {
        return null;
    }
    const trimmed = String(value).trim();
    return trimmed ? trimmed : null;
}

function normalizeBoardDraft(data) {
    if (!data) {
        return data;
    }
    const columns = Array.isArray(data.columns) ? data.columns : [];
    const tags = Array.isArray(data.tags) ? data.tags : [];

    // Normalize user input in-place while preserving extra draft fields (ids/UI state).
    data.title = normalizeText(data.title);
    data.description = normalizeText(data.description);
    data.columns = columns.map(column => ({
        ...column,
        title: normalizeText(column?.title),
        description: normalizeText(column?.description)
    }));
    data.tags = tags.map(tag => ({
        ...tag,
        title: normalizeText(tag?.title)
    }));
    return data;
}

function isBoardTitleDuplicate(title, excludeId = null) {
    if (!title) return false;
    const normalized = title.toLowerCase();
    return (CURRENT_DATA.boards || []).some(board => {
        if (!board?.title) return false;
        if (excludeId && board.id === excludeId) return false;
        return board.title.toLowerCase() === normalized;
    });
}

function isColumnTitleDuplicate(title, excludeId = null) {
    if (!title) return false;
    const normalized = title.toLowerCase();
    return (CURRENT_DATA.columns || []).some(column => {
        if (!column?.title) return false;
        if (excludeId && column.id === excludeId) return false;
        return column.title.toLowerCase() === normalized;
    });
}

function isTaskTitleDuplicate(title, excludeId = null) {
    if (!title) return false;
    const normalized = title.toLowerCase();
    return (kanban.cards || []).some(card => {
        if (!card?.title) return false;
        if (excludeId && card.id === excludeId) return false;
        return card.title.toLowerCase() === normalized;
    });
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
