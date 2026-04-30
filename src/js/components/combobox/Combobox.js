import { debounce } from "../../utils/debounce.js";

export class Combobox {
  constructor({
    selectedItem = null,
    placeholder = "",
    minChars = 3,
    allowClear = true,
    required = false,
    readOnly = false,
    search,
    onChange = null
  }) {
    this.selectedItem = selectedItem;
    this.placeholder = placeholder;
    this.minChars = minChars;
    this.allowClear = allowClear;
    this.required = required;
    this.readOnly = readOnly;
    this.onChange = typeof onChange === "function" ? onChange : null;

    if (typeof search !== "function") {
      console.warn(
        "[Combobox] No `search` function provided. The combobox will not return results. " +
        "Pass a function: async (query) => [{ value, label }]"
      );
      this.search = async () => [];
    } else {
      this.search = search;
    }

    this.root = null;
    this.inputEl = null;
    this.dropdownEl = null;
    this._pillLabelEl = null;
    this._pendingRestore = null;
    this._activeIndex = -1;
    this._options = [];
    this._uid = `cbx-${Math.random().toString(36).slice(2, 8)}`;
    this._abortController = null;
  }

  _syncHasValue() {
    const hasValue = !!this.selectedItem;
    this.root?.classList.toggle("has-value", hasValue);
    if (hasValue && this._pillLabelEl) this._pillLabelEl.textContent = this.selectedItem.label;
  }

  render() {
    const listboxId = `${this._uid}-listbox`;
    const ac = new AbortController();
    const sig = ac.signal;
    this._abortController = ac;

    const wrapper = document.createElement("div");
    wrapper.classList.add("combobox");

    const inputWrapper = document.createElement("div");
    inputWrapper.classList.add("combobox-input-wrapper");

    // Search icon
    const searchIcon = document.createElement("span");
    searchIcon.classList.add("combobox-search-icon");
    searchIcon.setAttribute("aria-hidden", "true");
    searchIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
      viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
      stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>`;

    // Selected value pill
    const pill = document.createElement("div");
    pill.classList.add("combobox-pill");

    const pillLabel = document.createElement("span");
    pillLabel.classList.add("combobox-pill-label");
    pillLabel.textContent = this.selectedItem?.label ?? "";
    pill.appendChild(pillLabel);

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.classList.add("combobox-clear");
    clearBtn.setAttribute("aria-label", "Clear selection");
    clearBtn.setAttribute("tabindex", "-1");
    const clearIcon = document.createElement("span");
    clearIcon.classList.add("combobox-clear-icon");
    clearIcon.textContent = "×";
    clearBtn.appendChild(clearIcon);

    // Input
    const input = document.createElement("input");
    input.type = "text";
    input.classList.add("combobox-input");
    input.placeholder = this.placeholder;
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-haspopup", "listbox");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", listboxId);
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
    if (this.required) input.setAttribute("aria-required", "true");
    if (this.readOnly) input.disabled = true;

    // Spinner
    const spinner = document.createElement("span");
    spinner.classList.add("combobox-spinner");
    spinner.setAttribute("aria-hidden", "true");

    // Dropdown listbox
    const dropdown = document.createElement("div");
    dropdown.classList.add("combobox-dropdown");
    dropdown.setAttribute("role", "listbox");
    dropdown.id = listboxId;
    if (this.placeholder) dropdown.setAttribute("aria-label", this.placeholder);

    if (this.allowClear && !this.readOnly) pill.appendChild(clearBtn);

    // Assemble DOM — input precedes pill so that a wrapping <label>'s labeled
    // control resolves to input instead of clearBtn.
    inputWrapper.appendChild(searchIcon);
    inputWrapper.appendChild(input);
    inputWrapper.appendChild(pill);
    inputWrapper.appendChild(spinner);
    wrapper.appendChild(inputWrapper);
    wrapper.appendChild(dropdown);

    const openDropdown = () => {
      dropdown.classList.add("is-open");
      input.setAttribute("aria-expanded", "true");
    };

    const closeDropdown = () => {
      dropdown.classList.remove("is-open");
      input.setAttribute("aria-expanded", "false");
      setActiveIndex(-1);
    };

    const setActiveIndex = (index) => {
      const items = dropdown.querySelectorAll(".combobox-item");
      items.forEach((el, i) => el.classList.toggle("is-active", i === index));
      this._activeIndex = index;
      if (index >= 0 && items[index]) {
        input.setAttribute("aria-activedescendant", items[index].id);
        items[index].scrollIntoView({ block: "nearest" });
      } else {
        input.removeAttribute("aria-activedescendant");
      }
    };

    const selectOption = (opt) => {
      this._pendingRestore = null;
      wrapper.classList.remove("is-editing");
      this.selectedItem = { value: opt.value, label: opt.label };
      input.value = "";
      this._syncHasValue();
      closeDropdown();
      this.onChange?.(this.selectedItem);
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const renderOptions = (options) => {
      this._options = options || [];
      dropdown.innerHTML = "";
      setActiveIndex(-1);

      if (!this._options.length) {
        const empty = document.createElement("div");
        empty.classList.add("combobox-empty");
        empty.textContent = input.value.trim().length >= this.minChars
          ? "No results"
          : `Type at least ${this.minChars} characters to search`;
        dropdown.appendChild(empty);
        return;
      }

      this._options.forEach((opt, i) => {
        const item = document.createElement("div");
        item.classList.add("combobox-item");
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", "false");
        item.id = `${this._uid}-opt-${i}`;
        item.textContent = opt.label;
        item.addEventListener("mousedown", (e) => {
          console.debug("Event | mousedown in item of dropdown");
          e.preventDefault(); // prevent blur before selection is registered
          selectOption(opt);
        }, { signal: sig });
        dropdown.appendChild(item);
      });
    };

    // Search with race condition protection
    let searchId = 0;
    const executeSearch = async (q) => {
      if (this.readOnly) return;
      if (!q || q.length < this.minChars) {
        closeDropdown();
        return;
      }
      const id = ++searchId;
      wrapper.classList.add("is-loading");
      try {
        const results = await this.search(q);
        if (id !== searchId) return;
        renderOptions(results);
        openDropdown();
      } catch (err) {
        if (id !== searchId) return;
        console.error("[Combobox] Search failed:", err);
        renderOptions([]);
        openDropdown();
      } finally {
        if (id === searchId) wrapper.classList.remove("is-loading");
      }
    };

    const debouncedSearch = debounce(executeSearch, 300);

    const exitEditMode = () => {
      wrapper.classList.remove("is-editing");
      if (!this.selectedItem && this._pendingRestore) {
        this.selectedItem = this._pendingRestore;
        input.value = "";
        this._syncHasValue();
      }
      this._pendingRestore = null;
    };

    const enterEditMode = () => {
      if (!this.selectedItem || this.readOnly) return;
      if (!this._pendingRestore) this._pendingRestore = { ...this.selectedItem };
      wrapper.classList.add("is-editing");
    };

    input.addEventListener("input", (e) => {
      // Capture restore point in case the user abandons the search.
      enterEditMode();
      this.selectedItem = null;
      this._syncHasValue();
      debouncedSearch(e.target.value.trim());
    }, { signal: sig });

    input.addEventListener("focus", () => {
      enterEditMode();
      const q = input.value.trim();
      if (q.length >= this.minChars) debouncedSearch(q);
    }, { signal: sig });

    input.addEventListener("keydown", (e) => {
      console.debug(`Event | keydown in input | key: ${e.key}`);
      const isOpen = dropdown.classList.contains("is-open");

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (!isOpen) {
            if (input.value.trim().length >= this.minChars) debouncedSearch(input.value.trim());
            return;
          }
          setActiveIndex(Math.min(this._activeIndex + 1, this._options.length - 1));
          break;

        case "ArrowUp":
          e.preventDefault();
          setActiveIndex(Math.max(this._activeIndex - 1, 0));
          break;

        case "Enter":
          e.preventDefault();
          if (isOpen && this._activeIndex >= 0 && this._options[this._activeIndex]) {
            selectOption(this._options[this._activeIndex]);
          }
          break;

        case "Escape":
          e.stopPropagation(); // prevent bubbling to parent dialog
          if (isOpen) closeDropdown();
          exitEditMode();
          break;

        case "Tab":
          closeDropdown();
          break;
      }
    }, { signal: sig });

    // Clicking anywhere in the input wrapper (except the × button) enters edit
    // mode. stopPropagation prevents a wrapping <label> from re-activating the input.
    inputWrapper.addEventListener("click", (e) => {
      e.stopPropagation();
      if (clearIcon.contains(e.target)) return;
      if (!this.selectedItem || this.readOnly) return;
      if (wrapper.classList.contains("is-editing")) return;
      enterEditMode();
      input.value = "";
      requestAnimationFrame(() => input.focus());
    }, { signal: sig });

    input.addEventListener("blur", () => {
      console.debug("Event | blur in input");
      exitEditMode();
      closeDropdown();
    }, { signal: sig });

    // Prevents input blur before the clear click is registered.
    clearIcon.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    }, { signal: sig });

    clearIcon.addEventListener("click", (e) => {
      console.debug("Event | click in clearIcon");
      e.stopPropagation();
      if (!this.allowClear || this.readOnly) return;
      this._pendingRestore = null;
      wrapper.classList.remove("is-editing");
      this.selectedItem = null;
      input.value = "";
      this._syncHasValue();
      closeDropdown();
      input.focus();
      this.onChange?.(null);
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, { signal: sig });

    this.root = wrapper;
    this.inputEl = input;
    this.dropdownEl = dropdown;
    this._pillLabelEl = pillLabel;
    this._syncHasValue();
    return wrapper;
  }

  getValue() {
    return this.selectedItem ?? null;
  }

  setValue(selectedItem) {
    this.selectedItem = selectedItem ?? null;
    this._pendingRestore = null;
    if (this.root) {
      this.root.classList.remove("is-editing");
      if (this.inputEl) this.inputEl.value = "";
      this._syncHasValue();
    }
  }

  getRoot() {
    return this.root;
  }

  destroy() {
    this._abortController?.abort();
    this._abortController = null;
  }
}
