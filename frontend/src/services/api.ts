/**
 * API Service for GD Arena Frontend.
 * Interacts with FastAPI backend REST routes with persistent JWT token auth.
 */

const BASE_URL = ''; // Relative to take advantage of Vite proxy / same-host deploy

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'admin';
  has_completed_onboarding?: boolean;
}

export interface UserProfile {
  college?: string;
  year?: string;
  course?: string;
  branch?: string;
  experience_areas?: string[];
  gd_confidence?: string;
  baseline_summary?: string;
}

export interface ActivityStreak {
  current_streak: number;
  longest_streak: number;
  total_active_days: number;
  total_sessions: number;
  weekly_activity?: { date: string; day: string; sessions: number }[];
  motivating_message?: string;
}

export interface GDTopic {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  format: string;
  description?: string;
  is_custom?: boolean;
}

export interface AIParticipant {
  id: string;
  name: string;
  profile: {
    profile_type: string;
    description: string;
    communication_style: string;
    speaking_frequency: number;
    prompt_instructions: string;
  };
  assigned_voice?: string;
}

export interface TranscriptEntry {
  entry_id: string;
  session_id: string;
  speaker_id: string;
  speaker_name: string;
  speaker_type: 'STUDENT' | 'PARTICIPANT' | 'MODERATOR';
  text: string;
  sequence_number: number;
  turn_type: string;
  started_at?: string;
  duration_seconds?: number;
}

export interface EvidenceReference {
  transcript_entry_id: string;
  quote: string;
}

export interface FeedbackItem {
  criterion: string;
  rating: number;
  feedback: string;
  evidence: EvidenceReference[];
  improvement: string;
  status: string;
}

export interface FinalReport {
  session_id: string;
  topic: string;
  status: string;
  duration_seconds: number;
  metrics: {
    speaking_time_by_participant: Record<string, number>;
    turns_by_participant: Record<string, number>;
    word_count_by_participant: Record<string, number>;
    student_share_words_percent: number;
    student_share_time_percent: number;
    average_turn_length_words: number;
    student_turn_count: number;
    interruptions_count: number;
    student_participation_distribution: { phase_name: string; student_turns: number; total_turns: number }[];
    timing_type: string;
  };
  analysis: {
    student_arguments: string[];
    relevant_examples: string[];
    responses_to_others: string[];
    agreements: string[];
    disagreements: string[];
    missed_opportunities: string[];
  };
  feedback: FeedbackItem[];
  overall_score: number;
  overall_summary: string;
  is_partial: boolean;
  created_at: string;
}

// Token storage helpers
export const getToken = (): string | null => localStorage.getItem('gd_arena_token');
export const setToken = (token: string): void => localStorage.setItem('gd_arena_token', token);
export const removeToken = (): void => localStorage.removeItem('gd_arena_token');

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Request failed: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // Ignore parse failure
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth
  signup: (data: { email: string; password: string; full_name: string }) =>
    request<{ access_token: string; user: User }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ access_token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () =>
    request<{
      id: string;
      email: string;
      full_name: string;
      role: 'student' | 'admin';
      profile: UserProfile;
      streak: ActivityStreak;
      has_completed_onboarding: boolean;
    }>('/api/auth/me'),

  resetPassword: (data: { email: string; new_password: string }) =>
    request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Onboarding
  saveAcademic: (data: { college: string; year: string; course: string; branch: string }) =>
    request<{ status: string }>('/api/onboarding/academic', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  saveExperience: (data: { experience_areas: string[]; gd_confidence: string }) =>
    request<{ status: string }>('/api/onboarding/experience', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  submitBaselineAssessment: (data: { topic: string; transcript: string; duration_seconds: number }) =>
    request<{
      status: string;
      clarity_score: number;
      relevance_score: number;
      pace_wpm: number;
      baseline_summary: string;
      disclosure: string;
    }>('/api/assessment/baseline', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Dashboard & Topics
  getDashboardSummary: () =>
    request<{
      profile: UserProfile & { full_name: string; email: string };
      streak: ActivityStreak;
      performance: {
        has_data: boolean;
        avg_communication_score: number | null;
        speaking_participation: string;
        ideas_content_quality: string;
        listening_collaboration: string;
        recent_change: string;
      };
      recent_activity: { session_id: string; topic: string; status: string; date: string; duration_seconds: number }[];
      recommended_topics: GDTopic[];
    }>('/api/dashboard/summary'),

  getTopics: (category?: string, search?: string) => {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.set('category', category);
    if (search) params.set('search', search);
    return request<GDTopic[]>(`/api/topics?${params.toString()}`);
  },

  createCustomTopic: (data: { title: string; category?: string; difficulty?: string }) =>
    request<GDTopic>('/api/topics/custom', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSessionHistory: () =>
    request<
      {
        session_id: string;
        topic: string;
        session_type: string;
        status: string;
        duration_seconds: number;
        created_at: string;
        report?: { overall_score: number; summary: string };
      }[]
    >('/api/history'),

  // AI GD Room Orchestration
  createSession: (config: {
    topic: string;
    participant_count?: number;
    duration_seconds?: number;
    student_name?: string;
  }) =>
    request<{
      session_id: string;
      status: string;
      topic: string;
      participants: AIParticipant[];
      duration_seconds: number;
    }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  getSession: (sessionId: string) =>
    request<any>(`/api/sessions/${sessionId}`),

  startSession: (sessionId: string) =>
    request<{
      session_id: string;
      opening_turn: TranscriptEntry;
      audio: any;
    }>(`/api/sessions/${sessionId}/start`, {
      method: 'POST',
    }),

  submitStudentTurn: (sessionId: string, data: { text: string; is_interruption?: boolean }) =>
    request<{ entry: TranscriptEntry }>(`/api/sessions/${sessionId}/turn/student`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  requestNextTurn: (sessionId: string) =>
    request<{
      decision?: any;
      entry?: TranscriptEntry;
      audio?: any;
      action?: string;
      status?: string;
    }>(`/api/sessions/${sessionId}/turn/next`, {
      method: 'POST',
    }),

  interruptSpeaker: (sessionId: string) =>
    request<{ status: string; interrupted_speaker_id?: string }>(`/api/sessions/${sessionId}/interrupt`, {
      method: 'POST',
    }),

  endSession: (sessionId: string) =>
    request<FinalReport>(`/api/sessions/${sessionId}/end`, {
      method: 'POST',
    }),

  getReport: (sessionId: string) =>
    request<FinalReport>(`/api/sessions/${sessionId}/report`),

  // Human GD Rooms
  listHumanRooms: () =>
    request<
      {
        id: string;
        topic_title: string;
        language: string;
        max_participants: number;
        current_participants: number;
        duration_seconds: number;
        is_private: boolean;
        status: string;
        created_at: string;
      }[]
    >('/api/human-rooms'),

  createHumanRoom: (data: {
    topic_title: string;
    max_participants: number;
    duration_seconds: number;
    is_private?: boolean;
    passkey?: string;
  }) =>
    request<{ id: string; topic_title: string; max_participants: number; is_private: boolean }>(
      '/api/human-rooms',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  joinHumanRoom: (roomId: string, passkey?: string) =>
    request<{ status: string; room_id: string; topic_title: string; participant_name: string; duration_seconds?: number }>(
      `/api/human-rooms/${roomId}/join`,
      {
        method: 'POST',
        body: JSON.stringify({ passkey }),
      }
    ),

  submitPeerFeedback: (roomId: string, data: { reviewee_id: string; rating: number; comments?: string }) =>
    request<{ status: string }>(`/api/human-rooms/${roomId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
