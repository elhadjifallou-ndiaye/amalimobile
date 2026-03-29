// Types de l'application AMALI

export type PremiumTier = 'essentiel' | 'elite' | 'prestige' | 'prestige-femme';

export interface Profile {
  id: number;
  name: string;
  age: number;
  location: string;
  bio: string;
  image: string[];
  halalMode?: boolean;
  verified: boolean;
  relationshipGoal?: string;
  prayerLevel?: string;
  compatibility: number;
  interests: string[];
  education: string;
  profession: string;
  premiumTier?: PremiumTier;
  distance?: number;
  height?: number;
  religion: string
}

export interface Conversation {
  id: number;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  halalMode: boolean;
  initial: string;
  color: string;
}

export interface Message {
  id: number;
  text: string;
  sender: 'me' | 'other';
  time: string;
  read?: boolean;
}

export interface PremiumPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  color: string;
  borderColor: string;
  bgColor: string;
  icon: string;
  popular?: boolean;
  badge?: string;
  features: PremiumFeature[];
}

export interface PremiumFeature {
  text: string;
  included: boolean;
}

export type ScreenType = 'discovery' | 'community' | 'messages' | 'profile' | 'likes';

export interface User {
  id: number;
  name: string;
  email: string;
  location: string;
  verified: boolean;
  premiumTier?: PremiumTier;
}
