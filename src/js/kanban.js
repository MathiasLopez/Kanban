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
    constructor({ container, template, cardClick, cardCompleted }) {
        this.container = container;
        this.template = template;
        this.cards = [];
        this.onCardClick = cardClick || null;
        this.onCardCompleted = cardCompleted || null
    }

    loadCards(cards) {
        this.cards = cards
        this.render();
    }

    addCard(card) {
        this.cards.push(card);
        createCard(this, card);
    }

    updateCard(card) {
        let originalCard = this.cards.find(i => i.id == card.id);
        Object.assign(originalCard, card);
        const cardElement = document.querySelector(`[data-id="${originalCard.id}"]`);
        updateCard(cardElement, originalCard);
    }

    deleteCard(card) {
        this.cards = this.cards.filter(i => i.id !== card.id);
        const cardElement = document.querySelector(`[data-id="${card.id}"]`);
        cardElement.remove();
    }

    render() {
        this.destroy()

        this.cards.forEach(card => {
            createCard(this, card);
        });
    }

    destroy() {
        this.container.innerHTML = "";
    }
}

function createCard(kanban, card) {
    const fragment = kanban.template.content.cloneNode(true);

    const element = fragment.querySelector(".card")
    element.setAttribute("data-id", card.id);
    updateCard(element, card);

    if (kanban.onCardClick) {
        fragment.querySelector(".card").addEventListener("click", (e) => {
            if (e.target.type === "checkbox") {
                return;
            }
            kanban.onCardClick(card)
        });
    }

    if (kanban.onCardCompleted) {
        fragment.querySelector("#card-completed").addEventListener("change", (e) => {
            e.stopPropagation();
            card.is_completed = true;
            setTimeout(() => {
                e.target.disabled = true;
            }, 0);
            kanban.onCardCompleted(card);
        });
    }

    kanban.container.appendChild(fragment);
}

function updateCard(element, card) {
    element.querySelector(".card-title").textContent = card.title;
    element.querySelector(".card-description").textContent = card.description;
    element.querySelector(".card-completed").disabled = card.is_completed;
    element.querySelector(".card-completed").checked = card.is_completed;

    const priorityEl = element.querySelector(".card-priority");
    const allPriorityClasses = Object.values(PRIORITY_CLASSES);
    priorityEl.classList.remove(...allPriorityClasses);
    priorityEl.textContent = `Priority: ${PRIORITY_LABELS[card.priority] ?? "N/A"}`;
    priorityEl.classList.add(PRIORITY_CLASSES[card.priority]);
}