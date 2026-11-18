const dailyGreetings = [
  'Ready to explore?',
  'Where are we going today?',
  'A new day, a new discovery.',
  'Let’s see what you know.',
  'Find your next place.',
  'Your atlas is waiting.',
  'How well do you know the world?',
  'Take the scenic route.',
  'Which way will you wander?',
  'There’s a world to uncover.',
  'A little geography for today?',
  'Pick a place and follow the clues.',
  'Curiosity, meet the map.',
  'Start with a country. See where you end up.',
  'Your next discovery is just around the bend.',
  'Time for a quick trip around the world.',
  'Find a new corner of the map.',
  'What do you remember about the world?',
  'Let the clues set your course.',
  'Six puzzles. Plenty of places.',
  'A fresh route through the atlas.',
  'Look closer; the world has clues.',
  'Make a little room for wonder.',
  'Ready for another map moment?',
  'Across borders and into the day.',
  'Keep your bearings; start anywhere.',
  'Today has a few places in mind.',
  'A new set of clues is ready.',
] as const

export function getDailyGreeting(date: string): string {
  let hash = 0
  for (const character of date) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return dailyGreetings[hash % dailyGreetings.length]!
}

export function getDailyGreetingCount(): number {
  return dailyGreetings.length
}
