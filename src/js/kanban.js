const PRIORITY_LABELS = {
    0: "Normal",
    1: "Low",
    2: "Medium",
    3: "High",
    4: "Top",
};

const PRIORITY_CLASSES = {
    0: "card-priority-normal",
    1: "card-priority-low",
    2: "card-priority-medium",
    3: "card-priority-high",
    4: "card-priority-top"
};

export class Kanban {
    constructor({ container, template, cardClick, cardCompleted, groupBy, columns, onCardMoved }) {
        this.container = container;
        this.template = template;
        this.cards = [];
        this.onCardClick = cardClick || null;
        this.onCardCompleted = cardCompleted || null;
        this.groupBy = groupBy || null;
        this.onCardMoved = onCardMoved || null;
        this.columns = columns || null;

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

            const header = document.createElement("h3");
            header.textContent = column.title;
            columnEl.appendChild(header);

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
        element.querySelector(".card-completed").disabled = item.is_completed;
        element.querySelector(".card-completed").checked = item.is_completed;

        const priorityEl = element.querySelector(".card-priority");
        const allPriorityClasses = Object.values(PRIORITY_CLASSES);
        priorityEl.classList.remove(...allPriorityClasses);
        priorityEl.textContent = `Priority: ${PRIORITY_LABELS[item.priority] ?? "N/A"}`;
        priorityEl.classList.add(PRIORITY_CLASSES[item.priority]);

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
            element.addEventListener("click", (e) => {
                if (e.target.type === "checkbox") {
                    return;
                }
                this.onCardClick(item)
            });
        }

        if (this.onCardCompleted) {
            element.querySelector("#card-completed").addEventListener("change", (e) => {
                e.stopPropagation();
                item.is_completed = true;
                setTimeout(() => {
                    e.target.disabled = true;
                }, 0);
                this.onCardCompleted(item);
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