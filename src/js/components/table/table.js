export class Table {
  constructor({ field, value }) {
    this.field = field;
    this.columns = Array.isArray(field.columns) ? field.columns : [];
    this.rows = Array.isArray(value) ? value.map(item => this.#normalizeRow(item)) : [];
    this.root = null;
  }

  render() {
    const container = document.createElement("div");
    container.classList.add("dialog-table");

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    this.columns.forEach(column => {
      const th = document.createElement("th");
      th.textContent = column.label;
      headerRow.appendChild(th);
    });

    const actionsTh = document.createElement("th");
    actionsTh.classList.add("dialog-table-actions");
    headerRow.appendChild(actionsTh);

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    table.appendChild(tbody);

    container.appendChild(table);

    const addRowBtn = document.createElement("button");
    addRowBtn.type = "button";
    addRowBtn.classList.add("dialog-table-add");
    addRowBtn.textContent = this.field.addButtonLabel || "Add row";
    container.appendChild(addRowBtn);

    const renderBody = () => {
      tbody.innerHTML = "";
      this.rows.forEach(row => {
        const tr = document.createElement("tr");
        tr.dataset.rowId = row.__rowId;

        this.columns.forEach(column => {
          const td = document.createElement("td");
          const input = document.createElement("input");
          input.type = column.type || "text";
          input.value = row[column.key] ?? "";
          input.dataset.colKey = column.key;
          if (column.required) {
            input.required = true;
          }
          input.addEventListener("input", (event) => {
            row[column.key] = event.target.value;
          });
          td.appendChild(input);
          tr.appendChild(td);
        });

        const actionTd = document.createElement("td");
        actionTd.classList.add("dialog-table-actions");
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.classList.add("dialog-table-delete");
        deleteBtn.setAttribute("aria-label", "Delete row");
        deleteBtn.textContent = "×";
        deleteBtn.addEventListener("click", () => {
          this.rows = this.rows.filter(item => item.__rowId !== row.__rowId);
          renderBody();
        });
        actionTd.appendChild(deleteBtn);
        tr.appendChild(actionTd);

        tbody.appendChild(tr);
      });
    };

    addRowBtn.addEventListener("click", () => {
      this.rows = [...this.rows, this.#normalizeRow({})];
      renderBody();
    });

    renderBody();
    this.root = container;
    return container;
  }

  getValue() {
    let hasErrors = false;
    if (!this.root) {
      return { value: this.rows.map(row => this.#stripRow(row)), hasErrors };
    }

    this.root.querySelectorAll("input.field-error").forEach(input => {
      input.classList.remove("field-error");
    });

    this.rows.forEach(row => {
      this.columns.forEach(column => {
        if (!column.required) return;
        const value = (row[column.key] ?? "").trim();
        if (!value) {
          hasErrors = true;
          const input = this.root.querySelector(
            `tr[data-row-id="${row.__rowId}"] input[data-col-key="${column.key}"]`
          );
          if (input) {
            input.classList.add("field-error");
          }
        }
      });
    });

    return {
      value: this.rows.map(row => this.#stripRow(row)),
      hasErrors
    };
  }

  getRoot() {
    return this.root;
  }

  #normalizeRow(row) {
    return {
      __rowId: row?.__rowId || `row_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      ...row
    };
  }

  #stripRow(row) {
    const cleaned = {};
    this.columns.forEach(column => {
      const raw = row[column.key];
      cleaned[column.key] = this.#normalizeText(raw);
    });
    if (row.id) {
      cleaned.id = row.id;
    }
    return cleaned;
  }

  #normalizeText(value) {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed ? trimmed : null;
  }
}
