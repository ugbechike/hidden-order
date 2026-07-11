import type { GameItem, ThemeId } from "./types";

export const themes: Record<ThemeId, { label: string; items: GameItem[] }> = {
  fruits: {
    label: "Fruits",
    items: [
      { id: "apple", label: "Apple", icon: "🍎" },
      { id: "banana", label: "Banana", icon: "🍌" },
      { id: "grape", label: "Grape", icon: "🍇" },
      { id: "orange", label: "Orange", icon: "🍊" },
      { id: "pear", label: "Pear", icon: "🍐" },
      { id: "melon", label: "Melon", icon: "🍈" },
      { id: "kiwi", label: "Kiwi", icon: "🥝" },
      { id: "cherry", label: "Cherry", icon: "🍒" },
      { id: "peach", label: "Peach", icon: "🍑" },
      { id: "mango", label: "Mango", icon: "🥭" },
      { id: "pineapple", label: "Pineapple", icon: "🍍" },
      { id: "strawberry", label: "Berry", icon: "🍓" }
    ]
  },
  animals: {
    label: "Animals",
    items: [
      { id: "cat", label: "Cat", icon: "🐱" },
      { id: "dog", label: "Dog", icon: "🐶" },
      { id: "fox", label: "Fox", icon: "🦊" },
      { id: "frog", label: "Frog", icon: "🐸" },
      { id: "panda", label: "Panda", icon: "🐼" },
      { id: "koala", label: "Koala", icon: "🐨" },
      { id: "lion", label: "Lion", icon: "🦁" },
      { id: "tiger", label: "Tiger", icon: "🐯" },
      { id: "bear", label: "Bear", icon: "🐻" },
      { id: "monkey", label: "Monkey", icon: "🐵" },
      { id: "rabbit", label: "Rabbit", icon: "🐰" },
      { id: "penguin", label: "Penguin", icon: "🐧" }
    ]
  },
  shapes: {
    label: "Shapes",
    items: [
      { id: "circle", label: "Circle", icon: "●" },
      { id: "square", label: "Square", icon: "■" },
      { id: "triangle", label: "Triangle", icon: "▲" },
      { id: "diamond", label: "Diamond", icon: "◆" },
      { id: "star", label: "Star", icon: "★" },
      { id: "heart", label: "Heart", icon: "♥" },
      { id: "hexagon", label: "Hexagon", icon: "⬢" },
      { id: "pentagon", label: "Pentagon", icon: "⬟" },
      { id: "crescent", label: "Crescent", icon: "☾" },
      { id: "sun", label: "Sun", icon: "☀" },
      { id: "spark", label: "Spark", icon: "✦" },
      { id: "cross", label: "Cross", icon: "✚" }
    ]
  },
  desserts: {
    label: "Desserts",
    items: [
      { id: "cake", label: "Cake", icon: "🍰" },
      { id: "cookie", label: "Cookie", icon: "🍪" },
      { id: "donut", label: "Donut", icon: "🍩" },
      { id: "pie", label: "Pie", icon: "🥧" },
      { id: "cupcake", label: "Cupcake", icon: "🧁" },
      { id: "candy", label: "Candy", icon: "🍬" },
      { id: "lollipop", label: "Lollipop", icon: "🍭" },
      { id: "chocolate", label: "Chocolate", icon: "🍫" },
      { id: "icecream", label: "Ice Cream", icon: "🍨" },
      { id: "shavedice", label: "Shaved Ice", icon: "🍧" },
      { id: "pudding", label: "Pudding", icon: "🍮" },
      { id: "honey", label: "Honey", icon: "🍯" }
    ]
  },
  sports: {
    label: "Sports",
    items: [
      { id: "soccer", label: "Soccer", icon: "⚽" },
      { id: "basketball", label: "Basketball", icon: "🏀" },
      { id: "football", label: "Football", icon: "🏈" },
      { id: "baseball", label: "Baseball", icon: "⚾" },
      { id: "tennis", label: "Tennis", icon: "🎾" },
      { id: "volleyball", label: "Volleyball", icon: "🏐" },
      { id: "rugby", label: "Rugby", icon: "🏉" },
      { id: "pool", label: "Pool", icon: "🎱" },
      { id: "hockey", label: "Hockey", icon: "🏒" },
      { id: "golf", label: "Golf", icon: "⛳" },
      { id: "boxing", label: "Boxing", icon: "🥊" },
      { id: "dart", label: "Dart", icon: "🎯" }
    ]
  }
};

export const themeOrder = Object.keys(themes) as ThemeId[];

export function getThemeItems(theme: ThemeId, itemCount: number) {
  return themes[theme].items.slice(0, itemCount);
}
