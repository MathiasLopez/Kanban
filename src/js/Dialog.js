export class Dialog {
  constructor({ dialog, onClose }) {
    this.dialog = dialog;
    this.currentData = null;
    this.onClose = onClose;
    this.isBoard = false;

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

  openDialog({ data, isBoard }) {
    this.currentData = { ...data };
    this.isBoard = isBoard;
    const priorityWrapper = this.dialog.querySelector('#dialog-card-priority')?.parentElement;
    const assignedWrapper = this.dialog.querySelector("#dialog-card-assigned")?.parentElement;
    if (priorityWrapper) priorityWrapper.style.display = 'inline-block';
    if (assignedWrapper) assignedWrapper.style.display = 'inline-block';
    if (isBoard) {
      this.dialog.querySelector("#dialog-title").innerHTML = data.id ? "Edit board" : "New board";
      this.dialog.querySelector("#dialog-card-title").value = data.title;
      this.dialog.querySelector("#dialog-card-description").value = data.description;
      if (priorityWrapper) priorityWrapper.style.display = 'none';
      if (assignedWrapper) assignedWrapper.style.display = 'none';
    } else {
      this.dialog.querySelector("#dialog-title").innerHTML = data.id ? "Edit card" : "New card";
      this.dialog.querySelector("#dialog-card-title").value = data.title;
      this.dialog.querySelector("#dialog-card-description").value = data.description;
      const prioritySelect = this.dialog.querySelector("#dialog-card-priority");
      const priorityId = data?.priority?.id ?? data?.priority_id ?? data?.priority ?? "";
      if (priorityId) {
        prioritySelect.value = String(priorityId);
      } else {
        prioritySelect.selectedIndex = 0;
      }
      this.dialog.querySelector("#dialog-card-assigned").value = data.assigned ?? "";
    }

    this.dialog.showModal();
  }

  close(action, data = null) {
    this.dialog.close();
    if (this.onClose) {
      this.onClose({ action, data, isBoard: this.isBoard });
    }
  }

  getFormData() {
    this.currentData.title = this.dialog.querySelector("#dialog-card-title").value;
    this.currentData.description = this.dialog.querySelector("#dialog-card-description").value;
    if (!this.isBoard) {
      const prioritySelect = this.dialog.querySelector("#dialog-card-priority");
      const selectedOption = prioritySelect.options[prioritySelect.selectedIndex];
      const priorityId = selectedOption?.value ?? null;
      const priorityTitle = selectedOption?.textContent ?? null;
      this.currentData.priority = priorityId
        ? { id: priorityId, title: priorityTitle }
        : null;
      let assigned = this.dialog.querySelector("#dialog-card-assigned").value;
      this.currentData.assigned = assigned === "" ? null : assigned;
    }
    return this.currentData;
  }
}
