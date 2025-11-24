import { getBoards, getBoard, addBoard, updateBoard, deleteBoard, getTasks, addTask, updateTask, deleteTask, markTaskAsCompleted, getUsers } from "./api.js";
import { redirectToLogin, isAuthenticated } from "./auth.js";
import { Kanban } from "./kanban.js";
import { Dialog } from "./Dialog.js";
import logger from "./logger.js";
import getConfig from "./config.js"

const loginBtn = document.getElementById("loginBtn");
const kanban = new Kanban(
    {
        container: document.getElementById("kanban"),
        template: document.getElementById("card-template"),
        cardClick: onCardClick,
        cardCompleted: onCardCompleted
    });
const dialog = new Dialog({
    dialog: document.querySelector("#edit-dialog"),
    onClose: async (args) => {
        if (args.isBoard) {
            await boardDialogClosed(args);
        } else {
            await cardDialogClosed(args);
        }
    }
})

const BOARD_CACHE_KEY = "selectedBoardId";

const logoutBtn = document.getElementById("logoutBtn");
const addBoardBtn = document.getElementById("addBoardBtn");
const addCardBtn = document.getElementById("addCardBtn");
const assignedSelect = document.getElementById("dialog-card-assigned");
const boardSelect = document.getElementById("board-select");
const boardEditBtn = document.getElementById("board-menu-btn");

const newTask = {
    title: "",
    description: "",
    is_completed: false,
    priority: 0,
    assigned: null
};

const newBoard = {
    title: "",
    description: ""
};

(async () => {
    try {
        initializeLogger();

        loginBtn.addEventListener("click", () => {
            redirectToLogin();
        });

        logoutBtn.addEventListener("click", () => {
            showAccess();
        });

        boardSelect.addEventListener("change", async e => {
            localStorage.setItem(BOARD_CACHE_KEY, e.target.value);
            await loadTasks()
        });

        boardEditBtn.addEventListener("click", async () => {
            logger.debug("addBoardBtn clicked", boardSelect.value);
            const board = await getBoard(boardSelect.value);
            dialog.openDialog({ data: { ...board }, isBoard: true });
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
    boardSelect.style.display = "inline-block";
    boardEditBtn.style.display = "inline-block";
    await loadBoards();
    await loadTasks();
}

function removeKanban() {
    addBoardBtn.style.display = "none";
    addCardBtn.style.display = "none";
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
    dialog.openDialog({ data: { ...newBoard }, isBoard: true });
};

addCardBtn.onclick = async () => {
    logger.debug("addCardBtn clicked");
    dialog.openDialog({ data: { ...newTask } });
};

function onCardClick(args) {
    logger.debug("onCardClicked", args);
    dialog.openDialog({ data: { ...args } });
}

async function onCardCompleted(task) {
    logger.debug('onCardCompleted', task);
    await markTaskAsCompleted(task);
    kanban.updateCard(task);
}

async function cardDialogClosed(args) {
    logger.debug("cardDialogClosed", args);
    if (args.action === "save") {
        if (args.data.id) {
            await updateTask(args.data)
            kanban.updateCard(args.data);
        } else {
            var response = await addTask(args.data, boardSelect.value);
            args.data.id = response.id
            kanban.addCard(args.data);
        }
    } else if (args.action === "delete") {
        await deleteTask(args.data)
        kanban.deleteCard(args.data);
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
                await loadTasks();
            }
        }
    } catch (error) {
        logger.error(error.message, error);
    }
}

async function loadUsers() {
    const users = await getUsers();

    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "— Sin asignar —";
    assignedSelect.appendChild(emptyOption);
    users.forEach(user => {
        const option = document.createElement("option");
        option.value = user.id;
        option.textContent = user.username;
        assignedSelect.appendChild(option);
    });
}

async function loadBoards() {
    const boards = await getBoards();
    boardSelect.innerHTML = "";
    boards.forEach(board => {
        addBoardToSelect(board);
    });

    const cachedId = localStorage.getItem(BOARD_CACHE_KEY);
    if (cachedId) {
        const option = boardSelect.querySelector(`option[value="${cachedId}"]`);
        if (option) {
            boardSelect.value = cachedId;
        } else {
            localStorage.removeItem(BOARD_CACHE_KEY);
        }
    } else if (boardSelect.options.length > 0) {
        boardSelect.value = boardSelect.options[0].value;
    }
}

function addBoardToSelect(board) {
    const option = document.createElement("option");
    option.value = board.id;
    option.textContent = board.title;
    boardSelect.appendChild(option);
}

async function loadTasks() {
    const boardSelected = boardSelect.value;
    if (boardSelected) {
        var tasks = await getTasks(boardSelected);
        kanban.loadCards(tasks);
    } else {
        return []
    }
}