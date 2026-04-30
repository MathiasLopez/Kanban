export class LinkList {
  constructor({ items = [], labelField = "title", onItemClick = null }) {
    this.items = items;
    this.labelField = labelField;
    this.onItemClick = onItemClick;
    this.root = null;
  }

  render() {
    const ul = document.createElement("ul");
    ul.classList.add("link-list");
    this.items.forEach(item => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.classList.add("link-list-item");
      btn.textContent = item[this.labelField] || `#${item.id}`;
      if (this.onItemClick) btn.addEventListener("click", () => this.onItemClick(item));
      li.appendChild(btn);
      ul.appendChild(li);
    });
    this.root = ul;
    return ul;
  }

  getRoot() { return this.root; }
}
