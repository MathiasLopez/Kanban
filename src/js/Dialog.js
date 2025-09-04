export class Dialog {
  constructor({ dialog, saveClick }) {
    this.dialog = dialog;
    this.currentCard = null;
    if (saveClick) {
      this.dialog.querySelector("#save-btn").addEventListener("click", () => {
        this.currentCard.title = this.dialog.querySelector("#dialog-card-title").value;
        this.currentCard.description = this.dialog.querySelector("#dialog-card-description").value;
        this.currentCard.is_completed = this.dialog.querySelector("#dialog-card-completed").checked;
        this.currentCard.priority = parseInt(this.dialog.querySelector("#dialog-card-priority").value);
        saveClick(this.currentCard);
      });
    }
  }

  openDialog(card) {
    this.currentCard = { ...card };
    this.dialog.querySelector("#dialog-title").innerHTML = card.id ? "Edit card" : "New card";
    this.dialog.querySelector("#dialog-card-title").value = card.title;
    this.dialog.querySelector("#dialog-card-description").value = card.description;
    this.dialog.querySelector("#dialog-card-completed").checked = card.is_completed;
    this.dialog.querySelector("#dialog-card-priority").value = card.priority;

    this.dialog.showModal();
  }
}