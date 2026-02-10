export class Dialog {
  constructor({ dialog, onClose }) {
    this.dialog = dialog;
    this.currentData = null;
    this.onClose = onClose;
    this.currentConfig = null;

    this.initEvents();
  }

  initEvents() {
    const saveBtn = this.dialog.querySelector("#dialog-btn-save");
    const cancelBtn = this.dialog.querySelector("#dialog-btn-cancel");
    const deleteBtn = this.dialog.querySelector("#dialog-btn-delete");

    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const data = this.getFormData();
      if (!data) return;
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

  openDialog({ data, config }) {
    this.currentData = { ...data };
    this.currentConfig = config;
    this.renderFields();
    this.dialog.showModal();
  }

  close(action, data = null) {
    this.dialog.close();
    if (this.onClose) {
      this.onClose({ action, data, type: this.currentConfig?.type });
    }
  }

  renderFields() {
    if (!this.currentConfig) return;

    const dialogTitle = this.dialog.querySelector("#dialog-title");
    const title = this.currentConfig.title;
    if (dialogTitle) {
      dialogTitle.textContent = title ?? "";
    }

    const deleteBtn = this.dialog.querySelector("#dialog-btn-delete");
    const allowDelete = this.currentConfig.allowDelete ?? true;
    if (deleteBtn) {
      deleteBtn.style.display = allowDelete && this.currentData?.id ? "inline-block" : "none";
    }

    const fieldContainer = this.dialog.querySelector("#dialog-dynamic-fields");
    if (!fieldContainer) return;
    fieldContainer.innerHTML = "";

    const fieldValues = { ...this.currentData };

    (this.currentConfig.fields || []).forEach(field => {
      const wrapper = document.createElement("label");
      wrapper.classList.add("dialog-form-label");
      const labelRow = document.createElement("span");
      labelRow.classList.add("dialog-form-label-row");
      const labelText = document.createElement("span");
      labelText.textContent = `${field.label}:`;
      labelRow.appendChild(labelText);

      let input;
      if (field.type === "textarea") {
        input = document.createElement("textarea");
      } else if (field.type === "select") {
        input = document.createElement("select");
        const options = typeof field.options === "function" ? field.options() : (field.options || []);
        options.forEach(optionItem => {
          const option = document.createElement("option");
          option.value = optionItem.value;
          option.textContent = optionItem.label;
          input.appendChild(option);
        });
      } else {
        input = document.createElement("input");
        input.type = field.type || "text";
      }

      input.id = field.id;
      if (field.required) {
        input.required = true;
        wrapper.classList.add("is-required");
        const requiredMark = document.createElement("span");
        requiredMark.classList.add("dialog-required-mark");
        requiredMark.textContent = "*";
        labelRow.appendChild(requiredMark);
      }

      const value = fieldValues?.[field.id];
      if (value !== undefined && value !== null) {
        input.value = String(value);
      } else if (field.type === "select") {
        input.selectedIndex = 0;
      }

      wrapper.appendChild(labelRow);
      wrapper.appendChild(input);
      fieldContainer.appendChild(wrapper);
    });
  }

  getFormData() {
    if (!this.currentConfig) {
      return this.currentData;
    }

    const values = {};
    let hasErrors = false;
    (this.currentConfig.fields || []).forEach(field => {
      const input = this.dialog.querySelector(`#${field.id}`);
      if (!input) return;
      const rawValue = input.value;
      if (field.type === "select" && rawValue === "") {
        values[field.id] = null;
      } else {
        values[field.id] = rawValue;
      }
      const label = input.closest(".dialog-form-label");
      if (label) {
        label.classList.remove("field-error");
      }
      input.classList.remove("field-error");
      if (field.required && !values[field.id]) {
        hasErrors = true;
        if (label) {
          label.classList.add("field-error");
        }
        input.classList.add("field-error");
      }
    });

    if (hasErrors) {
      return null;
    }

    return { ...this.currentData, ...values };
  }

}
