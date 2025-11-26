const PRIORITY_LABELS = {
    0: "Normal",
    1: "Baja", //"Low",
    2: "Media", //"Medium",
    3: "Alta", //"High",
    4: "Muy alta", //"Top"
};

const PRIORITY_CLASSES = {
    0: "card-priority-normal",
    1: "card-priority-low",
    2: "card-priority-medium",
    3: "card-priority-high",
    4: "card-priority-top"
};

export class Kanban {
    constructor({ container, template, cardClick, cardCompleted, groupBy }) {
        this.container = container;
        this.template = template;
        this.cards = [];
        this.onCardClick = cardClick || null;
        this.onCardCompleted = cardCompleted || null;
        this.groupBy = groupBy || null;

        this.columns = {};
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
        const cardElement = document.querySelector(`[data-id="${originalItem.id}"]`);
        this.#fillCard(cardElement, originalItem);
    }

    deleteCard(card) {
        this.cards = this.cards.filter(i => i.id !== card.id);
        const cardElement = document.querySelector(`[data-id="${card.id}"]`);
        cardElement.remove();
    }

    render() {
        this.destroy();
        this.#generateColumns(this.cards);

        this.cards.forEach(card => {
            this.#addItemToColumn(card);
        });
    }

    destroy() {
        this.columns = {};
        this.container.innerHTML = "";
    }

    #generateColumns(cards) {
        if (!this.groupBy) return;

        const values = [...new Set(cards.map(c => c[this.groupBy]))];

        values.forEach(value => {
            const col = document.createElement("div");
            col.classList.add("kanban-column");
            col.dataset.groupValue = value;

            const header = document.createElement("h3");
            header.textContent = PRIORITY_LABELS[value];

            col.appendChild(header);

            const items = document.createElement("div");
            items.classList.add("kanban-column-items");
            col.appendChild(items);

            this.columns[value] = items;
            this.container.appendChild(col);
        });
    }

    #addItemToColumn(item) {
        const col = this.columns[item[this.groupBy]];

        if (!col) return;

        const cardDiv = this.#createCardElement(item);
        col.appendChild(cardDiv);
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

            const targetColumn = this.columns[newGroup];
            if (targetColumn) {
                targetColumn.appendChild(element);
            }

            element.dataset.groupValue = newGroup;
        }
    }

    #createCardElement(item) {
        const fragment = this.template.content.cloneNode(true);

        const element = fragment.querySelector(".card")
        element.setAttribute("data-id", item.id);
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

        return fragment
    }
}