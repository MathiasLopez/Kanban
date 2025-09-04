import { login, getCard, addCard } from "./api.js";
import { saveToken, clearToken, isLoggedIn } from "./auth.js";
import { Kanban } from "./kanban.js";
import { Dialog } from "./Dialog.js";

const kanban = new Kanban(
  {
    container: document.getElementById("kanban"),
    template: document.getElementById("card-template"),
    cardClick: onCardClick
  });
const dialog = new Dialog({
  dialog: document.querySelector("#edit-dialog"),
  saveClick: onSaveCardClicked
})
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const addCardBtn = document.getElementById("addCardBtn");

const newCard = {
  title: "",
  description: "",
  is_completed: false,
  priority: 0,
};

async function updateUI() {
  if (isLoggedIn()) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    addCardBtn.style.display = "inline-block";
    document.getElementById("username").style.display = "none"
    document.getElementById("password").style.display = "none"
    const cards = await getCard()
    kanban.loadCards(cards);
  } else {
    document.getElementById("username").style.display = "inline-block"
    document.getElementById("password").style.display = "inline-block"
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    addCardBtn.style.display = "none";
    kanban.destroy()
  }
}

loginBtn.onclick = async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  try {
    const data = await login(username, password);
    document.getElementById("password").value = ""
    saveToken(data.token);
    updateUI();
  } catch (e) {
    alert("Login failed: " + e.message);
  }
};

logoutBtn.onclick = () => {
  clearToken();
  updateUI();
};

addCardBtn.onclick = async () => {
  dialog.openDialog(newCard);
};

function onCardClick(args) {
  console.log(`Click on the card: ${args.title}`)
  dialog.openDialog(args);
}

async function onSaveCardClicked(card) {
  console.log(`Saved card button dialog clicked: ${card.title}`);
  if (card.id) {
    kanban.updateCard(card);
  } else {
    await addCard(card);
    kanban.addCard(card);
  }
}

updateUI();

// Test without cors
//open -na "Google Chrome" --args --disable-web-security --user-data-dir=/tmp/chrome_dev

