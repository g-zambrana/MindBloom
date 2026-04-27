// /js/staff/reports.js
// MindBloom staff reports controller

import { supabase, requireAuth } from '../supabase.js';

const PROFILES_TABLE = 'profiles';
const STAFF_LOGIN_PATH = '/staff/login';
const ALLOWED_ROLES = ['staff', 'admin'];

const els = {
  todayDate: document.getElementById('today-date'),
  logoutBtn: document.getElementById('logoutBtn'),
  avatarInitials: document.getElementById('avatar-initials'),
  sbUsername: document.getElementById('sb-username'),
  sbUseremail: document.getElementById('sb-useremail'),
  statusMessage: document.getElementById('status-message'),

  totalUsers: document.getElementById('total-users'),
  totalUsersSub: document.getElementById('total-users-sub'),
  upcomingAppts: document.getElementById('upcoming-appts'),
  upcomingApptsSub: document.getElementById('upcoming-appts-sub'),
  activeTherapists: document.getElementById('active-therapists'),
  activeTherapistsSub: document.getElementById('active-therapists-sub'),
  openAlerts: document.getElementById('open-alerts'),
  openAlertsSub: document.getElementById('open-alerts-sub'),
};

function normalizeValue(value) {
  return String(value || '').trim().toLowerCase();
}

function isClient(role) {
  const normalized = normalizeValue(role);
  return normalized === 'user' || normalized === 'client';
}

function isScheduled(status) {
  const normalized = normalizeValue(status);
  return normalized === 'scheduled' || normalized === 'pending';
}

function isThisMonth(value) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function isThisWeek(value) {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - now.getDay());

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return date >= start && date < end;
}

function isToday(value) {
  if (!value) return false;

  const date = new Date(value);
  const now = new Date();

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function getInitials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'ST'
  );
}

function showStatus(message, type = 'success') {
  if (!els.statusMessage) return;
  els.statusMessage.textContent = message;
  els.statusMessage.className = `status-message show ${type}`;
}

function clearStatus() {
  if (!els.statusMessage) return;
  els.statusMessage.textContent = '';
  els.statusMessage.className = 'status-message';
}

async function requireStaffUser() {
  const authUser = await requireAuth();

  if (!authUser) {
    window.location.replace(STAFF_LOGIN_PATH);
    throw new Error('Not authenticated');
  }

  const { data: profile, error } = await supabase
    .from(PROFILES_TABLE)
    .select('id, full_name, email, role, created_at')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) throw error;

  if (!profile) {
    throw new Error('Staff profile was not found.');
  }

  if (!ALLOWED_ROLES.includes(normalizeValue(profile.role))) {
    await supabase.auth.signOut();
    window.location.replace(STAFF_LOGIN_PATH);
    throw new Error('Unauthorized staff access.');
  }

  return { authUser, profile };
}

function renderStaffIdentity(profile, authUser) {
  const displayName =
    profile.full_name ||
    profile.email?.split('@')[0] ||
    authUser.email?.split('@')[0] ||
    'Staff Member';

  const email = profile.email || authUser.email || '';

  if (els.sbUsername) els.sbUsername.textContent = displayName;
  if (els.sbUseremail) els.sbUseremail.textContent = email;
  if (els.avatarInitials) els.avatarInitials.textContent = getInitials(displayName);

  if (els.todayDate) {
    els.todayDate.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

async function fetchProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, energy_level, anxiety_level, sleep_hours, created_at');

  if (error) throw error;
  return data || [];
}

async function fetchTherapists() {
  const { data, error } = await supabase
    .from('therapists')
    .select('id, user_id, status, created_at');

  if (error) throw error;
  return data || [];
}

async function fetchAppointments() {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, user_id, therapist_id, scheduled_at, status, created_at');

  if (error) throw error;
  return data || [];
}

async function fetchMoodEntries() {
  const { data, error } = await supabase
    .from('mood_entries')
    .select('id, user_id, mood_rating, entry_date, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw error;
  return data || [];
}

async function fetchJournalEntries() {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('id, user_id, mood, word_count, entry_date, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw error;
  return data || [];
}

async function fetchStaffNotes() {
  const { data, error } = await supabase
    .from('staff_notes')
    .select('id, staff_id, user_id, created_at');

  if (error) throw error;
  return data || [];
}

function renderReports({ profiles, therapists, appointments, moodEntries, journalEntries, staffNotes }) {
  const clients = profiles.filter(profile => isClient(profile.role));

  const newClientsThisMonth = clients.filter(profile => isThisMonth(profile.created_at));

  const appointmentsThisMonth = appointments.filter(appt => {
    return appt.scheduled_at && isThisMonth(appt.scheduled_at) && isScheduled(appt.status);
  });

  const therapistIdsThisWeek = new Set(
    appointments
      .filter(appt => appt.therapist_id && isScheduled(appt.status) && isThisWeek(appt.scheduled_at))
      .map(appt => appt.therapist_id)
  );

  const activeTherapistsThisWeek = therapists.filter(therapist =>
    therapistIdsThisWeek.has(therapist.id)
  );

  const moodEntriesToday = moodEntries.filter(entry => isToday(entry.created_at));

  const avgMood = moodEntries.length
    ? (moodEntries.reduce((sum, entry) => sum + Number(entry.mood_rating || 0), 0) / moodEntries.length).toFixed(1)
    : '—';

  const journalEntriesThisMonth = journalEntries.filter(entry => isThisMonth(entry.created_at));
  const notesToday = staffNotes.filter(note => isToday(note.created_at));

  if (els.totalUsers) els.totalUsers.textContent = String(newClientsThisMonth.length);
  if (els.totalUsersSub) els.totalUsersSub.textContent = `${clients.length} total client accounts`;

  if (els.upcomingAppts) els.upcomingAppts.textContent = String(appointmentsThisMonth.length);
  if (els.upcomingApptsSub) els.upcomingApptsSub.textContent = 'Scheduled appointments this month';

  if (els.activeTherapists) els.activeTherapists.textContent = String(activeTherapistsThisWeek.length);
  if (els.activeTherapistsSub) els.activeTherapistsSub.textContent = 'Therapists booked this week';

  if (els.openAlerts) els.openAlerts.textContent = String(moodEntriesToday.length);
  if (els.openAlertsSub) {
    els.openAlertsSub.textContent = `Avg mood: ${avgMood} | Journals this month: ${journalEntriesThisMonth.length} | Notes today: ${notesToday.length}`;
  }
}

function attachEvents() {
  if (els.logoutBtn) {
    els.logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.href = STAFF_LOGIN_PATH;
    });
  }
}

async function init() {
  try {
    clearStatus();

    const { authUser, profile } = await requireStaffUser();
    renderStaffIdentity(profile, authUser);

    const [
      profiles,
      therapists,
      appointments,
      moodEntries,
      journalEntries,
      staffNotes,
    ] = await Promise.all([
      fetchProfiles(),
      fetchTherapists(),
      fetchAppointments(),
      fetchMoodEntries(),
      fetchJournalEntries(),
      fetchStaffNotes(),
    ]);

    renderReports({
      profiles,
      therapists,
      appointments,
      moodEntries,
      journalEntries,
      staffNotes,
    });

    attachEvents();
  } catch (error) {
    console.error('[reports] init error:', error);
    showStatus(`Reports failed to load: ${error.message}`, 'error');
  }
}

await init();