import { supabase } from './supabase.js';


const greetingEl = document.getElementById("greeting");
const todayDateEl = document.getElementById("today-date");
const avatarInitialsEl = document.getElementById("avatar-initials");
const sbUsernameEl = document.getElementById("sb-username");
const sbUseremailEl = document.getElementById("sb-useremail");
const streakCountEl = document.getElementById("streak-count");
const longestStreakEl = document.getElementById("longest-streak");
const moodStatusEl = document.getElementById("mood-status");
const nextAppointmentEl = document.getElementById("next-appointment");
const affirmationTextEl = document.getElementById("affirmation-text");
const notifBadgeEl = document.getElementById("notif-badge");
const logoutBtn = document.getElementById("logoutBtn");

// --------------------------------------------------
// Static affirmations
// --------------------------------------------------
const affirmations = [
  "You do not need to do everything today. One step is enough.",
  "Small progress still matters.",
  "Your feelings are valid, even when they are hard to explain.",
  "Rest is productive too.",
  "You are allowed to move at your own pace.",
  "A calm mind grows through small daily habits.",
  "You are doing better than you think."
];

// --------------------------------------------------
// Init
// --------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  try {
    setTodayDate();
    setDailyAffirmation();
    setupLogout();

    const user = await requireAuth();
    if (!user) return;

    const profile = await ensureAndLoadProfile(user);

    renderUserBasics(user, profile);
    renderGreeting(profile, user);

    await loadMoodStats(user.id);
    await loadTodayMood(user.id);
    await loadNextAppointment(user.id);
    await loadNotificationBadge(user.id);
  } catch (err) {
    console.error("Dashboard init error:", err);
  }
});

// --------------------------------------------------
// Auth
// --------------------------------------------------
async function requireAuth() {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      window.location.href = "/login";
      return null;
    }

    return data.user;
  } catch (err) {
    console.error("Auth error:", err);
    window.location.href = "/login";
    return null;
  }
}

// --------------------------------------------------
// Profile
// --------------------------------------------------
async function ensureAndLoadProfile(user) {
  const fallbackName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const fallbackEmail = user.email || "";

  try {
    const { data: existingProfile, error: selectError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (selectError) {
      throw selectError;
    }

    if (existingProfile) {
      return existingProfile;
    }

    const insertPayload = {
      id: user.id,
      full_name: fallbackName,
      email: fallbackEmail,
      role: "user"
    };

    const { data: insertedProfile, error: insertError } = await supabase
      .from("profiles")
      .insert([insertPayload])
      .select()
      .single();

    if (insertError) {
      console.warn("Profile insert failed:", insertError.message);
      return {
        id: user.id,
        full_name: fallbackName,
        email: fallbackEmail,
        role: "user"
      };
    }

    return insertedProfile;
  } catch (err) {
    console.warn("Profile load fallback:", err.message);
    return {
      id: user.id,
      full_name: fallbackName,
      email: fallbackEmail,
      role: "user"
    };
  }
}

function renderUserBasics(user, profile) {
  const fullName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const email = profile?.email || user.email || "";

  sbUsernameEl.textContent = fullName;
  sbUseremailEl.textContent = email;
  avatarInitialsEl.textContent = getInitials(fullName);
}

function renderGreeting(profile, user) {
  const firstName = (profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User")
    .trim()
    .split(" ")[0];

  const hour = new Date().getHours();
  let greeting = "Hello";

  if (hour < 12) {
    greeting = "Good morning";
  } else if (hour < 18) {
    greeting = "Good afternoon";
  } else {
    greeting = "Good evening";
  }

  greetingEl.textContent = `${greeting}, ${firstName}.`;
}

// --------------------------------------------------
// Date / affirmation
// --------------------------------------------------
function setTodayDate() {
  todayDateEl.textContent = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function setDailyAffirmation() {
  const dayIndex = new Date().getDate() % affirmations.length;
  affirmationTextEl.textContent = affirmations[dayIndex];
}

// --------------------------------------------------
// Mood stats
// --------------------------------------------------
async function loadTodayMood(userId) {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("mood_entries")
      .select("id, mood_rating, mood_label, entry_date, created_at")
      .eq("user_id", userId)
      .eq("entry_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      moodStatusEl.textContent = "Not logged yet";
      moodStatusEl.style.color = "#e67e22";
      return;
    }

    moodStatusEl.textContent = `${data.mood_label || "Logged today"} ✓`;
    moodStatusEl.style.color = "#3D6B35";
  } catch (err) {
    console.error("Today mood error:", err);
    moodStatusEl.textContent = "Unable to load";
    moodStatusEl.style.color = "#c0392b";
  }
}

async function loadMoodStats(userId) {
  try {
    const { data, error } = await supabase
      .from("mood_entries")
      .select("entry_date")
      .eq("user_id", userId)
      .order("entry_date", { ascending: true });

    if (error) {
      throw error;
    }

    const uniqueDates = [...new Set((data || []).map((row) => row.entry_date))];
    const { currentStreak, longestStreak } = calculateStreaks(uniqueDates);

    streakCountEl.textContent = String(currentStreak);
    streakCountEl.classList.remove("skeleton");

    longestStreakEl.textContent = `Longest: ${longestStreak} day${longestStreak === 1 ? "" : "s"}`;
  } catch (err) {
    console.error("Mood stats error:", err);
    streakCountEl.textContent = "0";
    streakCountEl.classList.remove("skeleton");
    longestStreakEl.textContent = "Longest: 0 days";
  }
}

function calculateStreaks(dateStrings) {
  if (!dateStrings || !dateStrings.length) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const dates = dateStrings
    .map((dateStr) => {
      const d = new Date(`${dateStr}T00:00:00`);
      d.setHours(0, 0, 0, 0);
      return d;
    })
    .sort((a, b) => a - b);

  let longestStreak = 1;
  let runningStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const diffDays = Math.round((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      runningStreak++;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else {
      runningStreak = 1;
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  let currentStreak = 0;

  for (let i = dates.length - 1; i >= 0; i--) {
    const current = new Date(dates[i]);
    current.setHours(0, 0, 0, 0);

    if (i === dates.length - 1) {
      const isToday = current.getTime() === today.getTime();
      const isYesterday = current.getTime() === yesterday.getTime();

      if (!isToday && !isYesterday) {
        currentStreak = 0;
        break;
      }

      currentStreak = 1;
    } else {
      const next = new Date(dates[i + 1]);
      next.setHours(0, 0, 0, 0);

      const diffDays = Math.round((next - current) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return { currentStreak, longestStreak };
}

// --------------------------------------------------
// Appointments
// --------------------------------------------------
async function loadNextAppointment(userId) {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("id, therapist_id, appointment_date, appointment_time, status, notes")
      .eq("user_id", userId)
      .gte("appointment_date", today)
      .in("status", ["scheduled", "confirmed"])
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true })
      .limit(1);

    if (error) {
      throw error;
    }

    if (!appointments || appointments.length === 0) {
      nextAppointmentEl.textContent = "No upcoming sessions";
      return;
    }

    const appt = appointments[0];

    let therapistName = "Your therapist";

    if (appt.therapist_id) {
      try {
        const { data: therapist, error: therapistError } = await supabase
          .from("therapists")
          .select("id, profile_id")
          .eq("id", appt.therapist_id)
          .maybeSingle();

        if (!therapistError && therapist?.profile_id) {
          const { data: therapistProfile, error: profileError } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", therapist.profile_id)
            .maybeSingle();

          if (!profileError && therapistProfile?.full_name) {
            therapistName = therapistProfile.full_name;
          }
        }
      } catch (nestedErr) {
        console.warn("Therapist lookup warning:", nestedErr);
      }
    }

    const dateTimeString = `${appt.appointment_date}T${appt.appointment_time || "00:00:00"}`;
    const appointmentDate = new Date(dateTimeString);

    if (Number.isNaN(appointmentDate.getTime())) {
      nextAppointmentEl.textContent = therapistName;
      return;
    }

    const formatted = appointmentDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric"
    });

    const formattedTime = appointmentDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit"
    });

    nextAppointmentEl.textContent = `${therapistName} · ${formatted} at ${formattedTime}`;
  } catch (err) {
    console.error("Next appointment error:", err);
    nextAppointmentEl.textContent = "Unable to load";
  }
}

// --------------------------------------------------
// Notifications
// --------------------------------------------------
async function loadNotificationBadge(userId) {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("tasks")
      .select("id")
      .eq("user_id", userId)
      .neq("status", "completed")
      .lte("due_date", today);

    if (error) {
      throw error;
    }

    const count = data?.length || 0;

    if (count > 0) {
      notifBadgeEl.textContent = count > 9 ? "9+" : String(count);
      notifBadgeEl.style.display = "flex";
    } else {
      notifBadgeEl.style.display = "none";
    }
  } catch (err) {
    console.error("Notification badge error:", err);
    notifBadgeEl.style.display = "none";
  }
}

// --------------------------------------------------
// Logout
// --------------------------------------------------
function setupLogout() {
  logoutBtn.addEventListener("click", async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      window.location.href = "/login";
    } catch (err) {
      console.error("Logout error:", err);
      alert("Could not sign out. Please try again.");
    }
  });
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------
function getInitials(name) {
  if (!name) return "?";

  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 1) {
    return parts[0][0].toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}