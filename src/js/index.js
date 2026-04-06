import { getBoards, addBoard, updateBoard, deleteBoard, getBoardColumnsWithTasks, addTask, updateTask, deleteTask, getBoardMembers, getPrioritis, getTags, getRoles, getUsers, getCurrentUser } from "./api.js";
import { redirectToLogin, refresh, logout } from "./auth.js";
import { Kanban } from "./kanban.js";
import { Dialog } from "./Dialog.js";
import { ConfirmationDialog } from "./components/confirmation-dialog/ConfirmationDialog.js";
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
        onCardMoved: handleCardMoved
    });

const DIALOG_TYPES = {
    BOARD_SETTINGS: "board_settings",
    TASK: "task"
};

const ROLE_PERMISSION_SCOPES = {
    GLOBAL: "global",
    BOARD: "board"
};

const dialog = new Dialog({
    dialog: document.querySelector("#edit-dialog"),
    onClose: async (args) => {
        if (args.type === DIALOG_TYPES.BOARD_SETTINGS) {
            return await boardSettingsDialogClosed(args);
        } else {
            return await cardDialogClosed(args);
        }
    }
})

const confirmationDialog = new ConfirmationDialog();

const TAG_ASSOCIATION_WARNING = "This tag is assigned to active tasks. If you continue, those associations will also be removed. Do you want to delete it anyway?";

const CURRENT_DATA = {
    priorities: [],
    tags: [],
    boardMembers: [],
    roles: [],
    allUsers: [],
    currentUser: null,
    currentBoardRole: null,
    columns: [],
    boards: []
};

const BOARD_CACHE_KEY = "selectedBoardId";

const logoutBtn = document.getElementById("logoutBtn");
const addBoardBtn = document.getElementById("addBoardBtn");
const addCardBtn = document.getElementById("addCardBtn");
const boardSelect = document.getElementById("board-select");
const boardSettingsBtn = document.getElementById("board-menu-btn");
const emptyState = document.getElementById("empty-state");
const emptyCreateBtn = document.getElementById("empty-create-btn");
const userInfo = document.getElementById("user-info");
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
    tags: [],
    members: []
};

let forceBoardUpdate = false;

function resetForceBoardUpdate() {
    forceBoardUpdate = false;
}

function buildDialogConfig(type, isEdit) {
    if (type === DIALOG_TYPES.BOARD_SETTINGS) {
        const isCreateBoardMode = hasPermission("board.create", ROLE_PERMISSION_SCOPES.GLOBAL);
        const fields = [];
        const canManageBoard = hasPermission("board.update") || isCreateBoardMode;
        const canManageTags = hasPermission("tag.manage") || isCreateBoardMode;
        const canManageMembers = hasPermission("board.manage_members") || isCreateBoardMode;

        if (canManageBoard) {
            fields.push(
                { id: "title", label: "Title", type: "text", required: true },
                { id: "description", label: "Description", type: "textarea" },
                {
                    id: "columns",
                    label: "Columns",
                    type: "table",
                    maxVisibleRows: 3,
                    columns: [
                        { key: "title", label: "Title", type: "text", required: true },
                        { key: "description", label: "Description", type: "text" }
                    ],
                    addButtonLabel: "Add column"
                }
            );
        }
        if (canManageTags) {
            fields.push({
                id: "tags",
                label: "Tags",
                type: "table",
                maxVisibleRows: 3,
                columns: [
                    { key: "title", label: "Title", type: "text", required: true }
                ],
                addButtonLabel: "Add tag"
            });
        }
        if (canManageMembers) {
            fields.push({
                id: "members",
                label: "Members",
                type: "table",
                maxVisibleRows: 3,
                columns: [
                    {
                        key: "user_id",
                        label: "User",
                        type: "select",
                        required: true,
                        readOnly: true,
                        options: (row = {}, rows = []) => {
                            const currentId = row.user_id;
                            const selectedIds = rows.map(r => r.user_id).filter(Boolean);
                            const available = CURRENT_DATA.allUsers.filter(user =>
                                user.id === currentId ||
                                !selectedIds.includes(user.id)
                            );
                            return available.map(user => ({
                                value: user.id,
                                label: user.username
                            }));
                        }
                    },
                    {
                        key: "role_id",
                        label: "Role",
                        type: "select",
                        required: true,
                        options: () => getBoardRoles().map(role => ({
                            value: role.id,
                            label: role.name
                        }))
                    }
                ],
                addButtonLabel: "Add member"
            });
        }
        return {
            type: DIALOG_TYPES.BOARD_SETTINGS,
            title: isEdit ? "Board settings" : "New board",
            allowDelete: !isCreateBoardMode && hasPermission("board.update"),
            fields
        };
    }

    const canCreateTask = hasPermission("task.create");
    const canUpdateTask = hasPermission("task.update");
    const canDeleteTask = hasPermission("task.delete");

    return {
        type: DIALOG_TYPES.TASK,
        title: isEdit ? "Edit card" : "New card",
        allowSave: isEdit ? canUpdateTask : canCreateTask,
        allowDelete: isEdit && canDeleteTask,
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
                    ...CURRENT_DATA.boardMembers.map(member => ({
                        value: member.user_id,
                        label: member.username
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
            let boardSelectChangeLoaderId = showLoader();
            try {
                const nextBoardId = e.target.value;
                localStorage.setItem(BOARD_CACHE_KEY, nextBoardId);
                await refreshBoardData();
            } catch (error) {
                logger.error(error.message, error);
            } finally {
                hideLoader(boardSelectChangeLoaderId);
            }
        });

        boardSettingsBtn.addEventListener("click", async () => {
            logger.debug("boardSettingsBtn clicked", boardSelect.value);
            resetForceBoardUpdate();
            let boardMeta = CURRENT_DATA.boards.find(board => board.id === boardSelect.value);
            dialog.openDialog({
                data: {
                    board_id: boardMeta.id,
                    title: boardMeta.title,
                    description: boardMeta.description ?? null,
                    columns: (CURRENT_DATA.columns || []).map(column => ({ ...column })),
                    tags: (CURRENT_DATA.tags || []).map(tag => ({ ...tag })),
                    members: (CURRENT_DATA.boardMembers || []).map(member => ({
                        id: member.user_id,
                        user_id: member.user_id,
                        role_id: member.role_id,
                        username: member.username
                    }))
                },
                config: buildDialogConfig(DIALOG_TYPES.BOARD_SETTINGS, true)
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
    const [priorities, roles] = await Promise.all([
        getPrioritis(),
        getRoles(),
        loadBoards(),
        loadUserInformation(),
        loadUsers()
    ])

    CURRENT_DATA.roles = roles;

    addBoardBtn.style.display = canCreateBoard() ? "inline-block" : "none";
    addCardBtn.style.display = "inline-block";
    boardSelect.style.display = "inline-block";
    boardSettingsBtn.style.display = "inline-block";

    CURRENT_DATA.priorities = priorities
    const defaultPriority = priorities?.[0] ?? null;
    newTask.priority_id = defaultPriority?.id ?? null;
    newTask.priority = null;
    kanban.priorites = priorities;

    await refreshBoardData();
}

function getRoleLevel(role) {
    if (!role) return 0;
    const level = Number(role.level ?? 0);
    const rank = Number(role.rank ?? 0);
    return Math.max(level, rank);
}

function getRoleById(roleId) {
    return CURRENT_DATA.roles.find(role => role.id === roleId) ?? null;
}

function getBoardRoles() {
    return CURRENT_DATA.roles.filter(role => role.scope == ROLE_PERMISSION_SCOPES.BOARD);
}

function getHighestBoardRole() {
    return getBoardRoles().reduce((best, role) => {
        if (!best) {
            return role;
        }
        return getRoleLevel(role) > getRoleLevel(best) ? role : best;
    }, null);
}

async function loadUsers() {
    try {
        CURRENT_DATA.allUsers = await getUsers();
    } catch (error) {
        logger.error(error.message, error);
        CURRENT_DATA.allUsers = [];
    }
}

async function loadUserInformation() {
    CURRENT_DATA.currentUser = await getCurrentUser();
    updateUserDisplay();
    return CURRENT_DATA.currentUser;
}

function buildDefaultMembersForCreation() {
    const highestBoardRole = getHighestBoardRole();
    const currentUserId = CURRENT_DATA.currentUser?.id;
    if (!highestBoardRole || !currentUserId) {
        return [];
    }
    return [{
        user_id: currentUserId,
        role_id: highestBoardRole.id,
        username: CURRENT_DATA.currentUser?.username ?? null
    }];
}

function hasPermission(name, scope = ROLE_PERMISSION_SCOPES.BOARD) {
    const globalPerms = CURRENT_DATA.currentUser.role.permissions;
    if (globalPerms.some(p => p.name === name)) return true;

    if (scope === ROLE_PERMISSION_SCOPES.GLOBAL) return true;

    return CURRENT_DATA.currentBoardRole?.permissions.some(p => p.name === name)
}


function canCreateBoard() {
    return hasPermission("board.create", ROLE_PERMISSION_SCOPES.GLOBAL);
}

function updateActionVisibility() {
    const hasBoard = Boolean(boardSelect.value);
    const showSettings = hasBoard && canShowBoardSettings();
    boardSettingsBtn.style.display = showSettings ? "inline-block" : "none";
    addCardBtn.style.display = hasBoard && hasPermission("task.create") ? "inline-block" : "none";
    addBoardBtn.style.display = canCreateBoard() ? "inline-block" : "none";
    emptyCreateBtn.style.display = canCreateBoard() ? "inline-block" : "none";
}

function canShowBoardSettings() {
    return hasPermission("board.update")
        || hasPermission("tag.manage")
        || hasPermission("board.manage_members");
}

function removeKanban() {
    addBoardBtn.style.display = "none";
    addCardBtn.style.display = "none";
    boardSelect.style.display = "none"
    boardSettingsBtn.style.display = "none";
    emptyState.style.display = "none";
    kanban.destroy()
}

function showAccess() {
    logoutBtn.style.display = "none";
    loginBtn.style.display = "inline-block";
    removeKanban();
    hideUserDisplay();
}

addBoardBtn.onclick = async () => {
    logger.debug("addBoardBtn clicked");
    dialog.openDialog({
        data: { ...newBoard, members: buildDefaultMembersForCreation() },
        config: buildDialogConfig(DIALOG_TYPES.BOARD_SETTINGS, false)
    });
};

emptyCreateBtn.onclick = () => addBoardBtn.onclick();

addCardBtn.onclick = async () => {
    logger.debug("addCardBtn clicked");
    newTask.column_id = CURRENT_DATA.columns?.[0]?.id ?? null;
    dialog.openDialog({ data: { ...newTask }, config: buildDialogConfig(DIALOG_TYPES.TASK, false) });
};

function onCardClick(args) {
    logger.debug("onCardClicked", args);
    const tagIds = normalizeTagIds(args?.tags);
    dialog.openDialog({ data: { ...args, tags: tagIds }, config: buildDialogConfig(DIALOG_TYPES.TASK, true) });
}

function hideUserDisplay() {
    if (!userInfo) return;
    userInfo.style.display = "none";
    userInfo.textContent = "";
}

function updateUserDisplay() {
    if (!userInfo) return;
    const username = CURRENT_DATA.currentUser?.username;
    if (!username) {
        hideUserDisplay();
        return;
    }
    userInfo.textContent = `Signed in as ${username}`;
    userInfo.style.display = "inline-flex";
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
    let loaderId;
    let success = true;
    try {
        loaderId = showLoader();
        logger.debug("cardDialogClosed", args);
        if (args.action === "save") {
            args.data.title = normalizeText(args.data?.title);
            if (!args.data?.title) {
                alert("Task title is required.");
                return false;
            }
            if (args.data.id) {
                const payload = normalizeTaskPayload(args.data);
                const response = await updateTask(payload);
                const priority_id = payload.priority_id ?? response?.priority_id ?? args.data.priority_id ?? args.data.priority;
                const priorityObj = (CURRENT_DATA.priorities || []).find(p => p.id === priority_id) ?? response?.priority ?? args.data.priority;
                kanban.updateCard({
                    ...args.data,
                    ...response,
                    priority_id,
                    priority: priorityObj
                });
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
        alert(error?.message || "Failed to save the task. Please try again.");
        success = false;
    } finally {
        hideLoader(loaderId);
    }
    return success;
}

async function boardSettingsDialogClosed(args) {
    if (args.action !== "delete" && args.action !== "save") return true;
    let loaderId;
    let success = true;
    try {
        loaderId = showLoader();
        const boardId = args.data?.board_id;

        if (args.action === "delete") {
            if (!hasPermission("board.update")) {
                alert("You do not have permission to delete this board.");
                return false;
            }
            const confirmed = confirm("Are you sure you want to delete the board? All tasks associated with it will be deleted.");
            if (!confirmed) return false;
            await deleteBoard({ id: boardId });
            const option = boardSelect.querySelector(`option[value="${boardId}"]`);
            if (option) {
                option.remove();
            }
            CURRENT_DATA.boards = (CURRENT_DATA.boards || []).filter(board => board.id !== boardId);
            await refreshBoardData();
            return true;
        }

        if (!boardId) {
            const normalized = normalizeBoardDraft(args.data, {
                columns: [],
                tags: [],
                members: buildDefaultMembersForCreation()
            });
            if (!normalized.title) {
                alert("Board title is required.");
                return false;
            }
            const validation = validateBoardDraft(normalized);
            if (!validation.ok) {
                alert(validation.message);
                return false;
            }
            if (normalized.members.length === 0) {
                alert("At least one member is required to create a board.");
                return false;
            }
            if (normalized.ownerRoleId && !normalized.hasOwner) {
                alert("At least one owner-level member is required to create the board.");
                return false;
            }
            const payload = {
                title: normalized.title,
                description: normalized.description,
                columns: normalized.columns,
                tags: normalized.tags,
                members: normalized.members
            };
            let response;
            try {
                response = await addBoard(payload);
            } catch (error) {
                if (error?.status === 403) {
                    alert("You do not have permission to create boards. The 'board.create' permission is required.");
                    return false;
                }
                throw error;
            }
            addBoardToSelect(response);
            CURRENT_DATA.boards = [...(CURRENT_DATA.boards || []), response];
            boardSelect.value = response.id;
            const goToBoard = confirm("Would you like to go to the newly created board?");
            if (goToBoard) {
                kanban.destroy();
            }
            await refreshBoardData(response.id);
            return true;
        }

        const canUpdateBoard = hasPermission("board.update");
        const canManageTags = hasPermission("tag.manage");
        const canManageMembers = hasPermission("board.manage_members");
        const currentBoard = CURRENT_DATA.boards.find(board => board.id === boardId);
        const columnsInput = canUpdateBoard ? args.data?.columns : CURRENT_DATA.columns;
        const tagsInput = canManageTags ? args.data?.tags : CURRENT_DATA.tags;
        const membersInput = canManageMembers ? args.data?.members : CURRENT_DATA.boardMembers;

        const normalized = normalizeBoardDraft({
            ...args.data,
            columns: columnsInput,
            tags: tagsInput,
            members: membersInput
        }, {
            title: currentBoard?.title,
            description: currentBoard?.description,
            columns: CURRENT_DATA.columns,
            tags: CURRENT_DATA.tags,
            members: CURRENT_DATA.boardMembers
        });

        if (canUpdateBoard) {
            const normalizedTitle = normalized.title;
            if (!normalizedTitle) {
                alert("Board title is required.");
                return false;
            }
        }

        if (canUpdateBoard && normalized.columns.some(column => !column.title)) {
            alert("Columns require a non-empty title.");
            return false;
        }

        if (canManageTags && normalized.tags.some(tag => !tag.title)) {
            alert("Tags require a non-empty title.");
            return false;
        }

        if (canManageMembers) {
            const normalizedMembers = normalized.members;
            if (normalizedMembers.some(m => !m.user_id || !m.role_id)) {
                alert("Members require a user and a role.");
                return false;
            }
            const memberIds = normalizedMembers.map(m => m.user_id);
            const memberIdSet = new Set(memberIds);
            if (memberIdSet.size !== memberIds.length) {
                alert("Members must be unique per user.");
                return false;
            }
            if (normalized.ownerRoleId && !normalized.hasOwner) {
                alert("At least one owner-level member must remain assigned to the board.");
                return false;
            }
        }

        const payload = {
            id: boardId,
            title: normalized.title,
            description: normalized.description,
            columns: normalized.columns,
            tags: normalized.tags,
            members: normalized.members
        };

        await updateBoard(payload, { force: forceBoardUpdate });

        if (canUpdateBoard) {
            const normalizedTitle = normalized.title;
            const prevTitle = normalizeText(currentBoard?.title);
            const prevDescription = normalizeText(currentBoard?.description);
            const hasBoardChanges = normalizedTitle !== prevTitle || normalized.description !== prevDescription;
            if (hasBoardChanges) {
                const option = boardSelect.querySelector(`option[value="${boardId}"]`);
                if (option) {
                    option.textContent = normalizedTitle;
                }
                CURRENT_DATA.boards = (CURRENT_DATA.boards || []).map(board =>
                    board.id === boardId ? { ...board, title: normalizedTitle, description: normalized.description } : board
                );
            }
        }

        await refreshBoardData();
    } catch (error) {
        if (error?.status === 409 && isTagInUseError(error?.message)) {
            const confirmed = await confirmationDialog.open({
                message: TAG_ASSOCIATION_WARNING
            });
            if (confirmed) {
                forceBoardUpdate = true;
                await boardSettingsDialogClosed(args);
                return true;
            } else {
                const newlyCreatedTags = (args.data?.tags || []).filter(tag => !tag?.id);
                const restoredTags = [...(CURRENT_DATA.tags || []), ...newlyCreatedTags];
                args.data.tags = restoredTags;
                dialog.currentData = { ...dialog.currentData, tags: restoredTags };
                dialog.renderFields();
                return false;
            }
        }
        logger.error(error.message, error);
        alert(error?.message || `Failed to ${args.action} board settings. Please try again.`);
        success = false;
    } finally {
        hideLoader(loaderId);
    }
    return success;
}

function isTagInUseError(errorMessage) {
    const regex = /Error 409:\s*-\s*\{"detail":"Tag '.*' is assigned to tasks; remove those associations before deleting it"\}/;
    return regex.test(errorMessage);
}

async function loadBoardMembers(boardId) {
    CURRENT_DATA.boardMembers = [];
    CURRENT_DATA.currentBoardRole = null;

    try {
        // fetch members (ids + role) and resolve usernames from the cached users list
        const members = await getBoardMembers(boardId);
        CURRENT_DATA.boardMembers = Array.isArray(members)
            ? members.map(member => {
                const user_id = member.user_id || member.id;
                const resolvedUser = CURRENT_DATA.allUsers.find(u => u.id === user_id);
                return {
                    user_id,
                    role_id: member.role_id,
                    username: resolvedUser?.username ?? null
                };
            })
            : [];

        const currentMember = CURRENT_DATA.boardMembers.find(member => member.user_id === CURRENT_DATA.currentUser.id);
        if (currentMember) {
            CURRENT_DATA.currentBoardRole = CURRENT_DATA.roles.find(role => role.id === currentMember.role_id);
        } else {
            logger.info('The user is not a member of the', CURRENT_DATA.currentUser.role.name);
        }
    } catch (error) {
        logger.error(error.message, error);
        CURRENT_DATA.boardMembers = [];
    }
    return CURRENT_DATA.boardMembers;
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
        setNoBoardState();
    }

    return selectedId;
}

function setNoBoardState() {
    boardSelect.style.display = "none";
    kanban.destroy();
    emptyState.style.display = "block";
    if (addBoardBtn) {
        addBoardBtn.style.display = "inline-block";
    }
    CURRENT_DATA.columns = [];
    CURRENT_DATA.tags = [];
    CURRENT_DATA.boardMembers = [];
    CURRENT_DATA.currentBoardRole = null;
}

function setHasBoardState() {
    boardSelect.style.display = "inline-block";
    emptyState.style.display = "none";
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

async function loadTags(boardId) {
    if (!boardId) {
        CURRENT_DATA.tags = [];
        kanban.tags = [];
        return [];
    }
    const tags = await getTags(boardId);
    CURRENT_DATA.tags = tags;
    kanban.tags = tags;
    return tags;
}

async function refreshBoardData(boardId = boardSelect.value) {
    if (!boardId) {
        setNoBoardState();
        updateActionVisibility();
        return;
    }
    await loadBoardMembers(boardId);
    await loadTags(boardId);
    await loadColumnsWithTasks();

    setHasBoardState();
    updateActionVisibility();
}

function validateBoardDraft(data) {
    const columns = Array.isArray(data?.columns) ? data.columns : [];
    const tags = Array.isArray(data?.tags) ? data.tags : [];

    const columnTitles = columns.map(item => item?.title).filter(Boolean);
    const tagTitles = tags.map(item => item?.title).filter(Boolean);

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

function normalizeBoardMembers(members, ownerRoleId) {
    const normalized = new Map();
    (Array.isArray(members) ? members : []).forEach(member => {
        const user_id = member.user_id || member.id;
        if (!user_id) return;
        const role_id = member.role_id || ownerRoleId;
        if (!role_id) return;

        const existing = normalized.get(user_id);
        if (!existing) {
            normalized.set(user_id, { user_id, role_id });
            return;
        }

        const existingLevel = getRoleLevel(getRoleById(existing.role_id));
        const candidateLevel = getRoleLevel(getRoleById(role_id));
        if (candidateLevel >= existingLevel) {
            normalized.set(user_id, { user_id, role_id });
        }
    });
    return Array.from(normalized.values());
}

function normalizeBoardDraft(data = {}, defaults = {}) {
    const highestBoardRole = getHighestBoardRole();
    const ownerRoleId = highestBoardRole?.id ?? null;
    const columns = Array.isArray(data.columns) ? data.columns : defaults.columns ?? [];
    const tags = Array.isArray(data.tags) ? data.tags : defaults.tags ?? [];
    const members = Array.isArray(data.members) ? data.members : defaults.members ?? [];

    const normalizedColumns = columns.map(column => ({
        ...column,
        title: normalizeText(column?.title),
        description: normalizeText(column?.description)
    }));
    const normalizedTags = tags.map(tag => ({
        ...tag,
        title: normalizeText(tag?.title)
    }));
    const normalizedMembers = normalizeBoardMembers(members, ownerRoleId);

    return {
        title: normalizeText(data.title ?? defaults.title),
        description: normalizeText(data.description ?? defaults.description),
        columns: normalizedColumns,
        tags: normalizedTags,
        members: normalizedMembers,
        ownerRoleId,
        hasOwner: ownerRoleId ? normalizedMembers.some(member => member.role_id === ownerRoleId) : true
    };
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
