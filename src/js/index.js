import { getCard, addCard } from "./api.js";
import { redirectToLogin, isAuthenticated } from "./auth.js";
import { Kanban } from "./kanban.js";
import { Dialog } from "./Dialog.js";

const loginBtn = document.getElementById("loginBtn");
const kanban = new Kanban(
    {
        container: document.getElementById("kanban"),
        template: document.getElementById("card-template"),
        cardClick: onCardClick
    });
const dialog = new Dialog({
    dialog: document.querySelector("#edit-dialog"),
    onClose: cardDialogClosed
})

const logoutBtn = document.getElementById("logoutBtn");
const addCardBtn = document.getElementById("addCardBtn");

const newCard = {
    title: "",
    description: "",
    is_completed: false,
    priority: 0,
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
            await initializeKanban();
        } else {
            showAccess();
        }
    } catch (error) {

    }
})();

async function initializeKanban() {
    addCardBtn.style.display = "inline-block";
    const cards = await getCard()
    kanban.loadCards(cards);
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
    dialog.openDialog({ ...newCard });
};

function onCardClick(args) {
    console.log(`onCardClicked: ${JSON.stringify(args)}`);
    dialog.openDialog({ ...args });
}

async function cardDialogClosed(args) {
    console.log(`cardDialogClosed: ${JSON.stringify(args)}`);
    if (args.action === "save") {
        if (args.data.id) {
            kanban.updateCard(args.data);
        } else {
            await addCard(args.data);
            kanban.addCard(args.data);
        }
    } else if (args.action === "delete") {
        kanban.deleteCard(args.data);
    }
}