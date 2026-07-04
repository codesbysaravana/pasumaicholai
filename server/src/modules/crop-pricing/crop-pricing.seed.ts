export type CropCategory = 'vegetable' | 'fruit';

export type CropSeedRecord = {
  name: string;
  category: CropCategory;
  base_price: number;
};

export const defaultCropSeedData: CropSeedRecord[] = [
  { name: 'Tomato', category: 'vegetable', base_price: 25 },
  { name: 'Onion', category: 'vegetable', base_price: 30 },
  { name: 'Potato', category: 'vegetable', base_price: 20 },
  { name: 'Carrot', category: 'vegetable', base_price: 34 },
  { name: 'Cabbage', category: 'vegetable', base_price: 22 },
  { name: 'Spinach', category: 'vegetable', base_price: 18 },
  { name: 'Brinjal', category: 'vegetable', base_price: 28 },
  { name: 'Capsicum', category: 'vegetable', base_price: 44 },
  { name: 'Beans', category: 'vegetable', base_price: 38 },
  { name: 'Peas', category: 'vegetable', base_price: 45 },
  { name: 'Radish', category: 'vegetable', base_price: 24 },
  { name: 'Beetroot', category: 'vegetable', base_price: 32 },
  { name: 'Bottle Gourd', category: 'vegetable', base_price: 20 },
  { name: 'Bitter Gourd', category: 'vegetable', base_price: 35 },
  { name: 'Pumpkin', category: 'vegetable', base_price: 27 },
  { name: 'Green Chilli', category: 'vegetable', base_price: 55 },
  { name: 'Garlic', category: 'vegetable', base_price: 96 },
  { name: 'Ginger', category: 'vegetable', base_price: 80 },
  { name: 'Cauliflower', category: 'vegetable', base_price: 30 },
  { name: 'Okra', category: 'vegetable', base_price: 36 },
  { name: 'Cucumber', category: 'vegetable', base_price: 24 },
  { name: 'Drumstick', category: 'vegetable', base_price: 48 },
  { name: 'Sweet Potato', category: 'vegetable', base_price: 33 },
  { name: 'Turnip', category: 'vegetable', base_price: 28 },
  { name: 'Apple', category: 'fruit', base_price: 110 },
  { name: 'Banana', category: 'fruit', base_price: 45 },
  { name: 'Mango', category: 'fruit', base_price: 78 },
  { name: 'Orange', category: 'fruit', base_price: 72 },
  { name: 'Papaya', category: 'fruit', base_price: 42 },
  { name: 'Guava', category: 'fruit', base_price: 52 },
  { name: 'Pomegranate', category: 'fruit', base_price: 125 },
  { name: 'Watermelon', category: 'fruit', base_price: 34 },
  { name: 'Pineapple', category: 'fruit', base_price: 66 },
  { name: 'Sapota', category: 'fruit', base_price: 58 },
  { name: 'Custard Apple', category: 'fruit', base_price: 88 },
  { name: 'Jackfruit', category: 'fruit', base_price: 64 },
  { name: 'Strawberry', category: 'fruit', base_price: 180 },
  { name: 'Grapes', category: 'fruit', base_price: 95 },
  { name: 'Lemon', category: 'fruit', base_price: 60 },
  { name: 'Muskmelon', category: 'fruit', base_price: 40 },
  { name: 'Pear', category: 'fruit', base_price: 98 },
  { name: 'Plum', category: 'fruit', base_price: 112 },
];
