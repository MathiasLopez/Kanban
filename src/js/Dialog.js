import { Table } from "./components/table/table.js";
import { Combobox } from "./components/combobox/Combobox.js";
import { LinkList } from "./components/linklist/LinkList.js";

export class Dialog {
  constructor({ onClose }) {
    this.dialog = this._createDialogElement();
    this.currentData = null;
    this.onClose = onClose;
    this.currentConfig = null;
    this.tableInstances = new Map();
    this.fieldGetters = new Map();
    this._components = [];
    this._ac = new AbortController();

    this.initEvents();
  }

  _createDialogElement() {
    const dialog = document.createElement("dialog");
    dialog.className = "app-dialog";

    const form = document.createElement("form");
    form.method = "dialog";
    form.className = "dialog-form";

    const header = document.createElement("header");
    header.className = "dialog-header";
    const h2 = document.createElement("h2");
    h2.dataset.dialogTitle = "";
    header.appendChild(h2);

    const body = document.createElement("div");
    body.className = "dialog-body";
    const fields = document.createElement("div");
    fields.className = "dialog-fields";
    fields.dataset.dialogDynamicFields = "";
    body.appendChild(fields);

    const footer = document.createElement("footer");
    footer.className = "dialog-footer";
    const menu = document.createElement("menu");
    menu.className = "dialog-actions";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-delete";
    deleteBtn.type = "button";
    deleteBtn.dataset.dialogBtnDelete = "";
    deleteBtn.textContent = "Delete";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn-cancel";
    cancelBtn.type = "button";
    cancelBtn.dataset.dialogBtnCancel = "";
    cancelBtn.textContent = "Cancel";

    const saveBtn = document.createElement("button");
    saveBtn.className = "btn btn-save";
    saveBtn.value = "default";
    saveBtn.dataset.dialogBtnSave = "";
    saveBtn.textContent = "Save";

    menu.append(deleteBtn, cancelBtn, saveBtn);
    footer.appendChild(menu);
    form.append(header, body, footer);
    dialog.appendChild(form);
    document.body.appendChild(dialog);
    return dialog;
  }

  initEvents() {
    const sig = this._ac.signal;
    const saveBtn = this.dialog.querySelector("[data-dialog-btn-save]");
    const cancelBtn = this.dialog.querySelector("[data-dialog-btn-cancel]");
    const deleteBtn = this.dialog.querySelector("[data-dialog-btn-delete]");

    saveBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const data = this.getFormData();
      if (!data) return;
      await this.close("save", data);
    }, { signal: sig });

    cancelBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await this.close("cancel");
    }, { signal: sig });

    deleteBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const data = this.getFormData();
      await this.close("delete", data);
    }, { signal: sig });

    // Escape (and other browser-driven dismissals) fire `cancel` before the
    // native close. Route them through our own close() so onClose runs and the
    // <dialog> element + child component listeners get cleaned up.
    this.dialog.addEventListener("cancel", async (e) => {
      e.preventDefault();
      await this.close("cancel");
    }, { signal: sig });
  }

  destroy() {
    this._components.forEach(component => component.destroy?.());
    this._components = [];
    this._ac.abort();
    this.dialog.remove();
  }

  openDialog({ data, config }) {
    this.currentData = { ...data };
    this.currentConfig = config;
    this.renderFields();
    this.dialog.showModal();
  }

  async close(action, data = null) {
    if (!this.onClose) {
      this.dialog.close();
      this.destroy();
      return;
    }

    const result = await this.onClose({
      action,
      data,
      type: this.currentConfig?.type,
      config: this.currentConfig,
      dialog: this
    });

    if (result !== false) {
      this.dialog.close();
      this.destroy();
    }
  }

  renderFields() {
    if (!this.currentConfig) return;

    this.fieldGetters.clear();
    const dialogTitle = this.dialog.querySelector("[data-dialog-title]");
    const title = this.currentConfig.title;
    if (dialogTitle) {
      dialogTitle.textContent = title ?? "";
    }

    const readOnly = this.currentConfig.readOnly ?? false;

    const deleteBtn = this.dialog.querySelector("[data-dialog-btn-delete]");
    const allowDelete = !readOnly && (this.currentConfig.allowDelete ?? false);
    if (deleteBtn) {
      deleteBtn.style.display = allowDelete ? "inline-block" : "none";
    }

    const saveBtn = this.dialog.querySelector("[data-dialog-btn-save]");
    const allowSave = !readOnly && (this.currentConfig.allowSave ?? true);
    if (saveBtn) {
      saveBtn.style.display = allowSave ? "inline-block" : "none";
      saveBtn.disabled = !allowSave;
    }

    const fieldContainer = this.dialog.querySelector("[data-dialog-dynamic-fields]");
    if (!fieldContainer) return;
    this._components.forEach(component => component.destroy?.());
    this._components = [];
    fieldContainer.innerHTML = "";
    this.tableInstances.clear();

    const fieldValues = { ...this.currentData };

    (this.currentConfig.fields || []).forEach(field => {
      // Use <div> for fields that don't map to a single form control (linklist,
      // table). A <label> wrapping multiple controls causes browsers to forward
      // :hover and click activation to the first control inside, which breaks
      // per-item interactivity.
      const wrapsSingleControl = field.type !== "linklist" && field.type !== "table";
      const wrapper = document.createElement(wrapsSingleControl ? "label" : "div");
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
        this._components.push(table);
        wrapper.appendChild(tableEl);
        fieldContainer.appendChild(wrapper);
        return;
      }

      if (field.type === "linklist") {
        wrapper.appendChild(labelRow);
        const instance = new LinkList({
          items: field.items || [],
          labelField: field.labelField || "title",
          onItemClick: field.onItemClick || null
        });
        this._components.push(instance);
        wrapper.appendChild(instance.render());
        fieldContainer.appendChild(wrapper);
        return;
      }

      if (field.type === "combobox") {
        wrapper.appendChild(labelRow);
        const selectedItem = fieldValues?.[field.id]
          ? { value: fieldValues[field.id][field.valueField], label: fieldValues[field.id][field.labelField] }
          : null;
        const wrappedSearch = typeof field.search === "function"
          ? async (q) => {
              const results = await field.search(q);
              return (results || []).map(r => ({
                value: r[field.valueField],
                label: r[field.labelField]
              }));
            }
          : undefined;
        const instance = new Combobox({
          selectedItem,
          placeholder: field.placeholder || "",
          minChars: field.minChars ?? 3,
          allowClear: field.allowClear ?? true,
          required: field.required ?? false,
          readOnly: readOnly || (field.readOnly ?? false),
          search: wrappedSearch
        });
        const el = instance.render();
        this.fieldGetters.set(field.id, () => instance.getValue());
        this._components.push(instance);
        wrapper.appendChild(el);
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
      if (readOnly) {
        if (field.type === "select") {
          input.disabled = true;
        } else {
          input.readOnly = true;
        }
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
      if (field.type === "linklist") return;
      
      if (field.type === "combobox") {
        const getter = this.fieldGetters.get(field.id);
        const value = getter ? getter() : undefined;
        if (value) {
          values[field.id] = {
            [field.valueField]: value.value,
            [field.labelField]: value.label
          };
        } else {
          values[field.id] = value;
        }
        return;
      }
      
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
