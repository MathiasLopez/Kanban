const PRIORITY_LABELS = {
    0: "Normal",
    1: "Low",
    2: "Medium",
    3: "High",
    4: "Top",
};

/**
 * @param priorities List of priorities. Example [{ id = 0, title = "High", class= "" }]
 * @param tags List of tags. Example [{ id = 0, title = "version 1.0", class= "" }]
 */
export class Kanban {
    constructor({ container, template, cardClick, groupBy, columns, onCardMoved, onColumnClick, priorites, tags }) {
        this.container = container;
        this.template = template;
        this.cards = [];
        this.onCardClick = cardClick || null;
        this.groupBy = groupBy || null;
        this.onCardMoved = onCardMoved || null;
        this.onColumnClick = onColumnClick || null;
        this.columns = columns || null;
        this.priorites = priorites || null;
        this.tags || null;

        this.cardContainers = {};
    }

    loadCards(cards) {
        this.cards = cards
        this.render();
    }

    addCard(card) {
        this.cards.push(card);
        this.#addItemToColumn(card);
    }

    updateCard(item) {
        let originalItem = this.cards.find(i => i.id == item.id);
        Object.assign(originalItem, item);
        const cardElement = document.querySelector(`[item-id="${originalItem.id}"]`);
        this.#fillCard(cardElement, originalItem);
    }

    deleteCard(card) {
        this.cards = this.cards.filter(i => i.id !== card.id);
        const cardElement = document.querySelector(`[item-id="${card.id}"]`);
        cardElement.remove();
    }

    render() {
        this.destroy();
        this.#generateColumns();

        this.cards.forEach(card => {
            this.#addItemToColumn(card);
        });
    }

    destroy() {
        this.cardContainers = {};
        this.container.innerHTML = "";
    }

    #generateColumns() {
        if (!this.groupBy) return;

        this.columns.forEach(column => {
            const columnEl = document.createElement("div");
            columnEl.classList.add("kanban-column");
            columnEl.dataset.groupValue = column.key;

            const headerRow = document.createElement("div");
            headerRow.classList.add("kanban-column-header");

            const header = document.createElement("h3");
            header.textContent = column.title;
            headerRow.appendChild(header);

            if (this.onColumnClick) {
                const editButton = document.createElement("button");
                editButton.type = "button";
                editButton.classList.add("column-edit-btn");
                editButton.setAttribute("aria-label", "Edit column");
                editButton.innerHTML = `
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M15 3v5h5" fill="none" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M8 17l1.2-3.6 5.8-5.8 2.4 2.4-5.8 5.8L8 17z" fill="none" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                `;
                editButton.addEventListener("click", () => {
                    this.onColumnClick(column.data ?? column);
                });
                headerRow.appendChild(editButton);
            }
            columnEl.appendChild(headerRow);

            const cardContainer = document.createElement("div");
            cardContainer.classList.add("kanban-column-card-container");
            columnEl.appendChild(cardContainer);

            this.cardContainers[column.key] = cardContainer;
            this.container.appendChild(columnEl);

            columnEl.addEventListener("dragover", (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
            });

            columnEl.addEventListener("drop", (e) => {
                e.preventDefault();

                const itemId = e.dataTransfer.getData("text/plain");
                const cardEl = this.container.querySelector(`[item-id="${itemId}"]`);

                const fromColumn = cardEl.dataset.groupValue;
                const toColumn = columnEl.dataset.groupValue;

                columnEl.querySelector(".kanban-column-card-container").appendChild(cardEl);

                cardEl.dataset.groupValue = toColumn;

                if (this.onCardMoved) {
                    this.onCardMoved({
                        item: this.cards.find(i => i.id == itemId),
                        fromColumn,
                        toColumn
                    });
                }
            });
        });
    }

    #addItemToColumn(item) {
        const columnEl = this.cardContainers[item[this.groupBy]];

        if (!columnEl) return;

        const cardDiv = this.#createCardElement(item);
        columnEl.appendChild(cardDiv);
    }

    #fillCard(element, item) {
        element.querySelector(".card-title").textContent = item.title;
        element.querySelector(".card-description").textContent = item.description;

        const priorityEl = element.querySelector(".card-priority");
        const priorities = this.priorites || [];
        const allPriorityClasses = priorities.map(p => p.class);

        priorityEl.classList.remove(...allPriorityClasses);

        const priorityId = item?.priority?.id ?? item?.priority_id ?? item?.priority ?? null;
        const priority = priorities.find(i => i.id == priorityId);
        const priorityTitle = priority?.title ?? item?.priority?.title ?? "N/A";
        priorityEl.textContent = `Priority: ${priorityTitle}`;
        if (priority?.class) {
            priorityEl.classList.add(priority.class);
        }

        const currentGroup = element.dataset.groupValue;
        const newGroup = String(item[this.groupBy]);

        if (currentGroup !== newGroup) {
            element.parentElement?.removeChild(element);

            const targetColumn = this.cardContainers[newGroup];
            if (targetColumn) {
                targetColumn.appendChild(element);
            }

            element.dataset.groupValue = newGroup;
        }
    }

    #createCardElement(item) {
        const fragment = this.template.content.cloneNode(true);

        const element = fragment.querySelector(".card")
        element.setAttribute("item-id", item.id);
        this.#fillCard(element, item);

        if (this.onCardClick) {
            element.addEventListener("click", () => {
                this.onCardClick(item)
            });
        }

        element.setAttribute("draggable", "true");
        element.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", item.id);
            e.dataTransfer.effectAllowed = "move";
        });

        return fragment
    }
}
