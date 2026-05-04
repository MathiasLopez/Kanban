import { LinkList } from "../linklist/LinkList.js";

export class Attachments {
  constructor({
    items = [],
    canEdit = false,
    onDownload = null,
    onError = null
  } = {}) {
    this.canEdit = !!canEdit;
    this.onDownload = onDownload;
    this.onError = onError;

    this.linkList = new LinkList({
      items: items.map(item => ({ ...item })),
      labelField: "filename",
      onItemClick: (item) => this._handleClick(item),
      canDelete: this.canEdit,
      onItemDelete: () => this._updateEmptyState()
    });

    this.root = null;
    this.emptyEl = null;
    this.fileInput = null;
    this._boundFileChange = null;
    this._boundFileCancel = null;
    this._filePickerActive = false;
  }

  render() {
    const root = document.createElement("div");
    root.classList.add("attachments");

    const emptyEl = document.createElement("div");
    emptyEl.classList.add("attachments-empty");
    emptyEl.textContent = "No attachments yet.";
    this.emptyEl = emptyEl;
    root.appendChild(emptyEl);

    root.appendChild(this.linkList.render());

    if (this.canEdit) {
      const uploadBtn = document.createElement("button");
      uploadBtn.type = "button";
      uploadBtn.classList.add("attachments-upload");
      uploadBtn.textContent = "Upload file";

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.classList.add("attachments-file-input");
      fileInput.hidden = true;

      uploadBtn.addEventListener("click", () => {
        this._filePickerActive = true;
        fileInput.click();
      });

      // The picker emits `change` (file picked) or `cancel` (dismissed) when
      // it closes. The same Escape press also makes the browser fire `cancel`
      // on the parent <dialog>, but the order between the two is not defined
      // by spec. Releasing the flag on the next macrotask keeps it observable
      // as true throughout the current task — covering whichever event fires
      // first — and lets it relax cleanly afterwards.
      const releasePicker = () => {
        setTimeout(() => { this._filePickerActive = false; }, 0);
      };

      this._boundFileChange = (event) => {
        releasePicker();
        const file = event.target.files?.[0];
        fileInput.value = "";
        if (!file) return;
        this.linkList.addItem({ filename: file.name, file, disabled: true });
        this._updateEmptyState();
      };
      fileInput.addEventListener("change", this._boundFileChange);

      this._boundFileCancel = releasePicker;
      fileInput.addEventListener("cancel", this._boundFileCancel);

      this.fileInput = fileInput;
      root.appendChild(uploadBtn);
      root.appendChild(fileInput);
    }

    this.root = root;
    this._updateEmptyState();
    return root;
  }

  _updateEmptyState() {
    if (!this.emptyEl) return;
    const isEmpty = this.linkList.getItems().length === 0;
    this.emptyEl.style.display = isEmpty ? "" : "none";
    const listEl = this.linkList.getRoot();
    if (listEl) {
      listEl.style.display = isEmpty ? "none" : "";
    }
  }

  async _handleClick(item) {
    if (typeof this.onDownload !== "function") return;
    try {
      await this.onDownload(item);
    } catch (err) {
      if (typeof this.onError === "function") this.onError(err);
    }
  }

  getItems() {
    return this.linkList.getItems().map(({ disabled, ...rest }) => rest);
  }

  getRoot() {
    return this.root;
  }

  shouldBlockDialogCancel() {
    return this._filePickerActive;
  }

  destroy() {
    if (this.fileInput) {
      if (this._boundFileChange) {
        this.fileInput.removeEventListener("change", this._boundFileChange);
      }
      if (this._boundFileCancel) {
        this.fileInput.removeEventListener("cancel", this._boundFileCancel);
      }
    }
    this.fileInput = null;
    this._boundFileChange = null;
    this._boundFileCancel = null;
    this.emptyEl = null;
    this.root = null;
  }
}
