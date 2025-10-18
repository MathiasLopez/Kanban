import { getTasks, addTask, updateTask, deleteTask, markTaskAsCompleted, getUsers } from "./api.js";
import { redirectToLogin, isAuthenticated } from "./auth.js";
import { Kanban } from "./kanban.js";
import { Dialog } from "./Dialog.js";

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
    onClose: cardDialogClosed
})

const logoutBtn = document.getElementById("logoutBtn");
const addCardBtn = document.getElementById("addCardBtn");
const assignedSelect = document.getElementById("dialog-card-assigned");

const newTask = {
    title: "",
    description: "",
    is_completed: false,
    priority: 0,
    assigned: null
};

(async () => {
    try {
        loginBtn.addEventListener("click", () => {
            redirectToLogin();
        });

        logoutBtn.addEventListener("click", () => {
            showAccess();
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
        console.error(error);
    }
})();

async function initializeKanban() {
    addCardBtn.style.display = "inline-block";
    const tasks = await getTasks()
    kanban.loadCards(tasks);
}

function removeKanban() {
    addCardBtn.style.display = "none";
    kanban.destroy()
}

function showAccess() {
    logoutBtn.style.display = "none";
    loginBtn.style.display = "inline-block";
    removeKanban();
}

addCardBtn.onclick = async () => {
    console.log(`addCardBtn clicked`);
    dialog.openDialog({ ...newTask });
};

function onCardClick(args) {
    console.log(`onCardClicked: ${JSON.stringify(args)}`);
    dialog.openDialog({ ...args });
}

async function onCardCompleted(task) {
    console.log(`onCardCompleted: ${JSON.stringify(task)}`)
    await markTaskAsCompleted(task);
    kanban.updateCard(task);
}

async function cardDialogClosed(args) {
    console.log(`cardDialogClosed: ${JSON.stringify(args)}`);
    if (args.action === "save") {
        if (args.data.id) {
            await updateTask(args.data)
            kanban.updateCard(args.data);
        } else {
            var response = await addTask(args.data);
            args.data.id = response.id
            kanban.addCard(args.data);
        }
    } else if (args.action === "delete") {
        await deleteTask(args.data)
        kanban.deleteCard(args.data);
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