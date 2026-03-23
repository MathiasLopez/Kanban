import { Table } from "./components/table/table.js";

export class Dialog {
  constructor({ dialog, onClose }) {
    this.dialog = dialog;
    this.currentData = null;
    this.onClose = onClose;
    this.currentConfig = null;
    this.tableInstances = new Map();

    this.initEvents();
  }

  initEvents() {
    const saveBtn = this.dialog.querySelector("#dialog-btn-save");
    const cancelBtn = this.dialog.querySelector("#dialog-btn-cancel");
    const deleteBtn = this.dialog.querySelector("#dialog-btn-delete");

    saveBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const data = this.getFormData();
      if (!data) return;
      await this.close("save", data);
    });

    cancelBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await this.close("cancel");
    });

    deleteBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const data = this.getFormData();
      await this.close("delete", data);
    });
  }

  openDialog({ data, config }) {
    this.currentData = { ...data };
    this.currentConfig = config;
    this.renderFields();
    this.dialog.showModal();
  }

  async close(action, data = null) {
    let shouldClose = true;
    if (!this.onClose) {
      this.dialog.close();
    }

    const result = await this.onClose({ action, data, type: this.currentConfig?.type });
    if (result !== false) {
      this.dialog.close();
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
    const allowDelete = this.currentConfig.allowDelete ?? false;
    if (deleteBtn) {
      deleteBtn.style.display = allowDelete ? "inline-block" : "none";
    }

    const fieldContainer = this.dialog.querySelector("#dialog-dynamic-fields");
    if (!fieldContainer) return;
    fieldContainer.innerHTML = "";
    this.tableInstances.clear();

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

      if (field.required) {
        wrapper.classList.add("is-required");
        const requiredMark = document.createElement("span");
        requiredMark.classList.add("dialog-required-mark");
        requiredMark.textContent = "*";
        labelRow.appendChild(requiredMark);
      }

      if (field.type === "table") {
        wrapper.appendChild(labelRow);
        const table = new Table({ field, value: fieldValues?.[field.id] });
        const tableEl = table.render();
        this.tableInstances.set(field.id, table);
        wrapper.appendChild(tableEl);
        fieldContainer.appendChild(wrapper);
        return;
      }

      if (field.type === "textarea") {
        input = document.createElement("textarea");
      } else if (field.type === "select") {
        input = document.createElement("select");
        if (field.multiple) {
          input.multiple = true;
        }
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
      }

      const value = fieldValues?.[field.id];
      if (field.type === "select" && field.multiple) {
        const selectedValues = Array.isArray(value) ? value.map(String) : [];
        Array.from(input.options).forEach(option => {
          option.selected = selectedValues.includes(option.value);
        });
      } else if (value !== undefined && value !== null) {
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
      if (field.type === "table") {
        const table = this.tableInstances.get(field.id);
        if (!table) return;
        const label = table.getRoot()?.closest(".dialog-form-label");
        if (label) {
          label.classList.remove("field-error");
        }
        const result = table.getValue();
        values[field.id] = result.value;
        if (field.required && (!Array.isArray(result.value) || result.value.length === 0)) {
          hasErrors = true;
          if (label) {
            label.classList.add("field-error");
          }
          return;
        }
        if (result.hasErrors) {
          hasErrors = true;
        }
        return;
      }
      const input = this.dialog.querySelector(`#${field.id}`);
      if (!input) return;
      if (field.type === "select" && field.multiple) {
        values[field.id] = Array.from(input.selectedOptions).map(option => option.value);
      } else {
        let rawValue = input.value;
        if (field.type === "text" || field.type === "textarea") {
          rawValue = this.normalizeText(rawValue);
        }
        if (field.type === "select" && rawValue === "") {
          values[field.id] = null;
        } else {
          values[field.id] = rawValue;
        }
      }
      const label = input.closest(".dialog-form-label");
      if (label) {
        label.classList.remove("field-error");
      }
      input.classList.remove("field-error");
      if (field.required && (!values[field.id] || (Array.isArray(values[field.id]) && values[field.id].length === 0))) {
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

  normalizeText(value) {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed ? trimmed : null;
  }

}
