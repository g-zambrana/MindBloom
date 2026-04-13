import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://vlsjefufwdxilvibouyx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsc2plZnVmd2R4aWx2aWJvdXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjU0MjIsImV4cCI6MjA5MTI0MTQyMn0.ueI8iY9M9X6JYm_dTjaR7v7Z6By-2fU0iBUthWiVKF8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const message = document.getElementById('message');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  message.textContent = 'Logging in...';

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  message.textContent = 'Login successful!';
  window.location.href = '/home.html';
});