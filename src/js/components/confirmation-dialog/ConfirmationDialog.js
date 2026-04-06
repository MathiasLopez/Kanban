export class ConfirmationDialog {
  constructor({ dialog } = {}) {
    this._ownedByInstance = false;
    this.pendingResolve = null;

    this.dialog =
      dialog ??
      document.getElementById("confirmation-dialog") ??
      this._createDialog();

    this.titleEl = this.dialog.querySelector("[data-confirmation-title]");
    this.messageEl = this.dialog.querySelector("[data-confirmation-message]");
    this.confirmBtn = this.dialog.querySelector("[data-confirmation-confirm]");
    this.cancelBtn = this.dialog.querySelector("[data-confirmation-cancel]");

    if (!this.confirmBtn || !this.cancelBtn) {
      throw new Error(
        "ConfirmationDialog: elements with the attributes are missing " +
          "[data-confirmation-confirm] y/o [data-confirmation-cancel]."
      );
    }

    if (!this.titleEl || !this.messageEl) {
      throw new Error(
        "ConfirmationDialog: elements with the attributes are missing " +
          "[data-confirmation-title] y/o [data-confirmation-message]."
      );
    }

    this._boundConfirm = () => this._settle(true);
    this._boundCancel = () => this._settle(false);
    this._boundNativeCancel = (event) => {
      event.preventDefault();
      this._settle(false);
    };

    this.confirmBtn.addEventListener("click", this._boundConfirm);
    this.cancelBtn.addEventListener("click", this._boundCancel);
    this.dialog.addEventListener("cancel", this._boundNativeCancel);
  }

  async open({
    title = "Warning",
    message = "",
    confirmLabel = "Delete anyway",
    cancelLabel = "Cancel",
    hideCancel = false,
  } = {}) {
    this.titleEl.textContent = title;
    this.messageEl.textContent = message;
    this.confirmBtn.textContent = confirmLabel;
    this.cancelBtn.textContent = cancelLabel;
    this.cancelBtn.style.display = hideCancel ? "none" : "";

    // Resolve any pending promises before opening a new one
    if (this.pendingResolve) {
      this.pendingResolve(false);
      this.pendingResolve = null;
    }

    this.dialog.showModal();

    return new Promise((resolve) => {
      this.pendingResolve = resolve;
    });
  }

  /**
   * Removes the event listeners and, if the dialog was created by this instance,
   * removes it from the DOM. Call this method when the control is no longer needed.
   */
  destroy() {
    this.confirmBtn.removeEventListener("click", this._boundConfirm);
    this.cancelBtn.removeEventListener("click", this._boundCancel);
    this.dialog.removeEventListener("cancel", this._boundNativeCancel);

    if (this.pendingResolve) {
      this.pendingResolve(false);
      this.pendingResolve = null;
    }

    if (this._ownedByInstance) {
      this.dialog.remove();
    }
  }

  // ---------------------------------------------------------------------------
  // Private methods
  // ---------------------------------------------------------------------------

  _settle(value) {
    if (!this.pendingResolve) return;

    const resolve = this.pendingResolve;
    this.pendingResolve = null;

    // If the dialog has a close animation (CSS class), wait for the
    // “close” event before closing; otherwise, close and resolve immediately.
    if (this.dialog.classList.contains("has-close-animation")) {
      this.dialog.addEventListener(
        "close",
        () => resolve(value),
        { once: true }
      );
      this.dialog.close();
    } else {
      this.dialog.close();
      resolve(value);
    }
  }

  _createDialog() {
    const dialog = document.createElement("dialog");
    dialog.id = "confirmation-dialog";
    dialog.className = "confirmation-dialog";

    const form = document.createElement("form");
    form.method = "dialog";
    form.className = "confirmation-dialog-form";

    const titleEl = document.createElement("h3");
    titleEl.className = "confirmation-dialog-title";
    titleEl.setAttribute("data-confirmation-title", "");

    const messageEl = document.createElement("p");
    messageEl.className = "confirmation-dialog-message";
    messageEl.setAttribute("data-confirmation-message", "");

    const menu = document.createElement("menu");
    menu.className = "confirmation-dialog-menu";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn-cancel";
    cancelBtn.setAttribute("data-confirmation-cancel", "");

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "btn btn-confirm";
    confirmBtn.setAttribute("data-confirmation-confirm", "");

    menu.append(cancelBtn, confirmBtn);
    form.append(titleEl, messageEl, menu);
    dialog.append(form);
    document.body.appendChild(dialog);

    this._ownedByInstance = true;
    return dialog;
  }
}