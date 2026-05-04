export class LinkList {
  constructor({
    items = [],
    labelField = "title",
    onItemClick = null,
    canDelete = false,
    onItemDelete = null
  } = {}) {
    this.items = items.map(item => ({ ...item }));
    this.labelField = labelField;
    this.onItemClick = onItemClick;
    this.canDelete = !!canDelete;
    this.onItemDelete = onItemDelete;
    this.root = null;
  }

  render() {
    const ul = document.createElement("ul");
    ul.classList.add("link-list");
    this.root = ul;
    this._renderItems();
    return ul;
  }

  _renderItems() {
    if (!this.root) return;
    this.root.innerHTML = "";

    this.items.forEach((item, index) => {
      const li = document.createElement("li");
      li.classList.add("link-list-li");
      if (item.disabled) li.classList.add("is-disabled");

      const btn = document.createElement("button");
      btn.type = "button";
      btn.classList.add("link-list-item");
      btn.textContent = item[this.labelField] || `#${item.id}`;
      if (item.disabled) {
        btn.disabled = true;
      } else if (this.onItemClick) {
        btn.addEventListener("click", () => this.onItemClick(item));
      }
      li.appendChild(btn);

      if (this.canDelete) {
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.classList.add("link-list-item-delete");
        const label = item[this.labelField] || `#${item.id}`;
        delBtn.setAttribute("aria-label", `Delete ${label}`);
        delBtn.textContent = "×";
        delBtn.addEventListener("click", () => {
          const [removed] = this.items.splice(index, 1);
          this._renderItems();
          if (typeof this.onItemDelete === "function") {
            this.onItemDelete(removed);
          }
        });
        li.appendChild(delBtn);
      }

      this.root.appendChild(li);
    });
  }

  addItem(item) {
    this.items.push({ ...item });
    this._renderItems();
  }

  getItems() {
    return this.items.map(item => ({ ...item }));
  }

  getRoot() { return this.root; }
}
