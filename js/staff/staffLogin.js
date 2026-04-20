// js/staffLogin.js
import { supabase } from './supabase.js';

const form = document.getElementById('staffLoginForm');
const emailInput = document.getElementById('staffEmail');
const passwordInput = document.getElementById('staffPassword');
const message = document.getElementById('message');

const STAFF_ROLES = ['staff', 'admin', 'therapist'];

function setMessage(text, type = 'info') {
  if (!message) return;

  message.textContent = text;

  if (type === 'error') {
    message.style.color = '#c0392b';
  } else if (type === 'success') {
    message.style.color = '#3D6B35';
  } else {
    message.style.color = '';
  }
}

async function getProfileRole(userId) {
  const { data, error } = await supabase
    .from('profile')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data?.role ?? null;
}

// Redirect already-logged-in users if they are valid staff
(async () => {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Session check failed:', error.message);
      document.body.style.visibility = 'visible';
      return;
    }

    const session = data?.session;

    if (!session?.user) {
      document.body.style.visibility = 'visible';
      return;
    }

    const role = await getProfileRole(session.user.id);

    if (STAFF_ROLES.includes(role)) {
      window.location.replace('/staff-dashboard');
      return;
    }

    // Logged in, but not staff
    await supabase.auth.signOut();
    setMessage('This portal is for authorized staff accounts only.', 'error');
    document.body.style.visibility = 'visible';
  } catch (err) {
    console.error('Startup staff auth check failed:', err);
    document.body.style.visibility = 'visible';
  }
})();

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const email = emailInput?.value.trim().toLowerCase() || '';
    const password = passwordInput?.value || '';

    if (!email) {
      setMessage('Please enter your work email.', 'error');
      return;
    }

    if (!password) {
      setMessage('Please enter your password.', 'error');
      return;
    }

    try {
      if (submitButton) submitButton.disabled = true;

      setMessage('Signing in...');

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message, 'error');
        return;
      }

      const user = data?.user;

      if (!user?.id) {
        setMessage('Unable to verify this account.', 'error');
        await supabase.auth.signOut();
        return;
      }

      let role = null;

      try {
        role = await getProfileRole(user.id);
      } catch (profileError) {
        console.error('Profile lookup failed:', profileError);
        setMessage('Could not verify staff permissions.', 'error');
        await supabase.auth.signOut();
        return;
      }

      if (!STAFF_ROLES.includes(role)) {
        setMessage('Access denied. This account is not authorized for the staff portal.', 'error');
        await supabase.auth.signOut();
        return;
      }

      setMessage('Login successful. Redirecting...', 'success');
      window.location.href = '/staff-dashboard';
    } catch (err) {
      console.error('Staff login failed:', err);
      setMessage('Something went wrong. Please try again.', 'error');
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
} else {
  console.error('staffLoginForm was not found in the HTML.');
}