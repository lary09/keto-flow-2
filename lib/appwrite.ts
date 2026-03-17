import { Client, Account, Databases, ID, Query } from "appwrite";

export const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "69b84d1c000d50dc644e";
export const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://nyc.cloud.appwrite.io/v1";
export const APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "main";

export const COLLECTIONS = {
  USER_PROFILES: "user_profiles",
  MEAL_LOGS: "meal_logs",
  SHOPPING_LISTS: "shopping_lists",
  SAVED_RECIPES: "saved_recipes",
  COMMUNITY_FOODS: "community_foods",
  WEIGHT_LOGS: "weight_logs",
};

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);

export interface UserProfile {
  $id: string;
  userId: string;
  email: string;
  name: string;
  dailyCalorieGoal: number;
  dailyFatGoal: number;
  dailyProteinGoal: number;
  dailyCarbGoal: number;
  $createdAt: string;
  $updatedAt: string;
}

export interface MealLog {
  $id: string;
  userId: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodName: string;
  calories: number;
  fat: number;
  protein: number;
  carbs: number;
  servingSize?: string;
  recipeId?: number | string;
  $createdAt: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount?: string;
  quantity?: number;
  unit?: string;
  checked: boolean;
  category?: string;
}

export interface ShoppingList {
  $id: string;
  userId: string;
  name: string;
  items: string; // JSON string
  $createdAt: string;
  $updatedAt: string;
}

export interface SavedRecipe {
  $id: string;
  userId: string;
  recipeId: number;
  title: string;
  image: string;
  calories: number;
  fat: number;
  protein: number;
  carbs: number;
  servings: number;
  readyInMinutes: number;
  ingredients: string; // JSON string
  savedAt: string;
}

export interface WeightLog {
  $id: string;
  userId: string;
  weight: number;
  bmi: number;
  date: string;
  $createdAt: string;
}

export interface CommunityFood {
  $id: string;
  foodName: string;
  calories: number;
  fat: number;
  protein: number;
  carbs: number;
  servingSize?: string;
}

export { client, account, databases, ID, Query };
