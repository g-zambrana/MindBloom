import { supabase } from './supabase.js';

const logoutBtn = document.getElementById('logoutBtn');

async function checkUser() {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    window.location.href = '/pages/login.html';
    return;
  }
}

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = '/pages/login.html';
});

checkUser();