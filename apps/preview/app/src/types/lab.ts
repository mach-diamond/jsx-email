export interface LabState {
  colorScheme: boolean;
  // Name of the active sample-data preset ('' = the template's first/default).
  dataPreset: string;
  invertColors: boolean;
  preset: string;
  sendEmail: string;
  sendError: string | null;
  sendState: 'idle' | 'sending' | 'sent' | 'error';
}

export interface CardState {
  id: string;
  templateId: string;
}
