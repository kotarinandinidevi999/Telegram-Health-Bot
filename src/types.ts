export interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  isEmergency?: boolean;
}

export interface PresetCommand {
  label: string;
  command: string;
  category: 'disease' | 'symptom' | 'medicine' | 'tips' | 'emergency';
  icon: string;
  description: string;
}
