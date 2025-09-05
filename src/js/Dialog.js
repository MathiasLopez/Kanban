export class Dialog {
  constructor({ dialog, onClose }) {
    this.dialog = dialog;
    this.currentData = null;
    this.onClose = onClose;

    this.initEvents();
  }

  initEvents() {
    const saveBtn = this.dialog.querySelector("#dialog-btn-save");
    const cancelBtn = this.dialog.querySelector("#dialog-btn-cancel");
    const deleteBtn = this.dialog.querySelector("#dialog-btn-delete");

    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const data = this.getFormData();
      this.close("save", data);
    });

    cancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this.close("cancel");
    });

    deleteBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const data = this.getFormData();
      this.close("delete", data);
    });
  }

  openDialog(data) {
    this.currentData = { ...data };
    this.dialog.querySelector("#dialog-title").innerHTML = data.id ? "Edit card" : "New card";
    this.dialog.querySelector("#dialog-card-title").value = data.title;
    this.dialog.querySelector("#dialog-card-description").value = data.description;
    this.dialog.querySelector("#dialog-card-completed").checked = data.is_completed;
    this.dialog.querySelector("#dialog-card-priority").value = data.priority;

    this.dialog.showModal();
  }

  close(action, data = null) {
    this.dialog.close();
    if (this.onClose) {
      this.onClose({ action, data });
    }
  }

  getFormData() {
    this.currentData.title = this.dialog.querySelector("#dialog-card-title").value;
    this.currentData.description = this.dialog.querySelector("#dialog-card-description").value;
    this.currentData.is_completed = this.dialog.querySelector("#dialog-card-completed").checked;
    this.currentData.priority = parseInt(this.dialog.querySelector("#dialog-card-priority").value);
    return this.currentData;
  }
}