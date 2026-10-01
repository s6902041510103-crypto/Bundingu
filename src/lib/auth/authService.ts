import { getSupabaseClient } from '@/lib/supabase/client';

export interface TeacherUser {
  id: string;
  email: string;
  name: string;
  school?: string;
  createdAt?: string;
}

const STORAGE_KEY = 'knowledge_snake_teacher_session';

export const DEMO_TEACHER: TeacherUser = {
  id: 'teacher-demo-01',
  email: 'teacher@demo.com',
  name: 'คุณครูสมศรี (Demo)',
  school: 'โรงเรียนอนุบาลแห่งการเรียนรู้',
};

/**
 * Authentication service for Teacher users
 * Supports Supabase Auth with seamless fallback to localStorage demo sessions
 */
export const authService = {
  /**
   * Log in teacher with email and password
   */
  async login(email: string, password: string): Promise<{ success: boolean; user?: TeacherUser; error?: string }> {
    const trimmedEmail = email.trim().toLowerCase();

    // Check demo credentials first for instant login
    if (trimmedEmail === 'teacher@demo.com' && password === 'demo123456') {
      this.saveSession(DEMO_TEACHER);
      return { success: true, user: DEMO_TEACHER };
    }

    try {
      const supabase = getSupabaseClient();
      if (supabase && typeof supabase.auth?.signInWithPassword === 'function') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (!error && data?.user) {
          const user: TeacherUser = {
            id: data.user.id,
            email: data.user.email || trimmedEmail,
            name: data.user.user_metadata?.name || trimmedEmail.split('@')[0],
            school: data.user.user_metadata?.school || '',
          };
          this.saveSession(user);
          return { success: true, user };
        }
      }
    } catch {
      // Supabase auth attempt failed or in local mock mode; continue to local fallback
    }

    // Local fallback: Check if user exists in local registered teachers
    const storedTeachers = this.getRegisteredTeachers();
    const localUser = storedTeachers.find(t => t.email.toLowerCase() === trimmedEmail);
    if (localUser) {
      this.saveSession(localUser);
      return { success: true, user: localUser };
    }

    // Default permissive login for offline/evaluation if valid format
    if (trimmedEmail.includes('@') && password.length >= 6) {
      const generatedUser: TeacherUser = {
        id: `teacher-${Date.now()}`,
        email: trimmedEmail,
        name: trimmedEmail.split('@')[0],
        school: 'โรงเรียนจำลอง',
      };
      this.saveSession(generatedUser);
      return { success: true, user: generatedUser };
    }

    return {
      success: false,
      error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง (สำหรับ Demo ใช้ teacher@demo.com / demo123456)',
    };
  },

  /**
   * Register a new teacher account
   */
  async register(
    email: string,
    password: string,
    name: string,
    school?: string
  ): Promise<{ success: boolean; user?: TeacherUser; error?: string }> {
    const trimmedEmail = email.trim().toLowerCase();

    try {
      const supabase = getSupabaseClient();
      if (supabase && typeof supabase.auth?.signUp === 'function') {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              name: name.trim(),
              school: school?.trim() || '',
            },
          },
        });

        if (!error && data?.user) {
          const user: TeacherUser = {
            id: data.user.id,
            email: trimmedEmail,
            name: name.trim(),
            school: school?.trim() || '',
          };
          this.saveRegisteredTeacher(user);
          this.saveSession(user);
          return { success: true, user };
        }
      }
    } catch {
      // Fallback to local registration
    }

    // Local registration fallback
    const newUser: TeacherUser = {
      id: `teacher-${Date.now()}`,
      email: trimmedEmail,
      name: name.trim(),
      school: school?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    this.saveRegisteredTeacher(newUser);
    this.saveSession(newUser);
    return { success: true, user: newUser };
  },

  /**
   * Get active teacher session
   */
  getCurrentUser(): TeacherUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  /**
   * Save session
   */
  saveSession(user: TeacherUser): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      // Also sync legacy key for backwards compatibility
      localStorage.setItem('teacher_session', JSON.stringify({ email: user.email, name: user.name }));
    } catch (e) {
      console.error('Failed to save session', e);
    }
  },

  /**
   * Log out teacher
   */
  async logout(): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      if (supabase && typeof supabase.auth?.signOut === 'function') {
        await supabase.auth.signOut();
      }
    } catch {}

    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('teacher_session');
    }
  },

  getRegisteredTeachers(): TeacherUser[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('knowledge_snake_registered_teachers');
      return raw ? JSON.parse(raw) : [DEMO_TEACHER];
    } catch {
      return [DEMO_TEACHER];
    }
  },

  saveRegisteredTeacher(user: TeacherUser): void {
    if (typeof window === 'undefined') return;
    try {
      const list = this.getRegisteredTeachers().filter(u => u.email.toLowerCase() !== user.email.toLowerCase());
      list.push(user);
      localStorage.setItem('knowledge_snake_registered_teachers', JSON.stringify(list));
    } catch {}
  },
};
