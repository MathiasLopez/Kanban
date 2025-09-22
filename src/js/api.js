export function getCard() {
	return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockCards);
    }, 1000);
  });
}

export function addCard(card) {
	return new Promise((resolve) => {
    setTimeout(() => {
      card.id = self.crypto.randomUUID()
      resolve(card);
    }, 1000);
  });
}

// Mock data
const mockCards = [
	{
		"title": "Card with title very very very very very large",
		"description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras finibus porttitor porttitor. Curabitur pellentesque ligula at eros pharetra placerat. Fusce sed efficitur sapien, a congue mauris. Curabitur vestibulum dui tellus, eget placerat est laoreet a. Phasellus a elit et magna viverra fringilla eget in ipsum. Vivamus iaculis venenatis erat, vel efficitur velit. Ut blandit luctus orci ac fringilla. Fusce fermentum elit vel luctus laoreet.",
		"priority": 0,
		"id": "b5bcb32b-e930-42e1-ba66-99a41c98eb56",
		"is_completed": false
	},
	{
		"title": "Card 2",
		"description": "Card 2 description",
		"priority": 1,
		"id": "b5bcb32b-e930-42e1-ba66-99a41c98eb57",
		"is_completed": false
	},
	{
		"title": "Card 3",
		"description": "Card 3 description",
		"priority": 2,
		"id": "b5bcb32b-e930-42e1-ba66-99a41c98eb58",
		"is_completed": false
	},
	{
		"title": "Card 4",
		"description": "Card 4 description",
		"priority": 3,
		"id": "b5bcb32b-e930-42e1-ba66-99a41c98eb59",
		"is_completed": false
	},
	{
		"title": "Card 5",
		"description": "Card 5 description",
		"priority": 4,
		"id": "b5bcb32b-e930-42e1-ba66-99a41c98eb60",
		"is_completed": true
	}
]
