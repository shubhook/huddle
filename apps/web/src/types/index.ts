import type { LucideIcon } from "lucide-react";

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

export type AvatarTone = "default" | "muted" | "subtle";

export interface ChatMessage {
  id: string;
  sender: string;
  channel: string;
  timestamp: string;
  content: string;
  codeBlock?: string;
  avatarTone?: AvatarTone;
  dateLabel?: string;
}

export interface FeatureItem {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface StatItem {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
}