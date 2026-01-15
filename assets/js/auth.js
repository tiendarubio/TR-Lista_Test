// auth.js — Firebase Auth + carga de perfil (roles)
// Requiere: app.js (loadUserProfile, getAuth) + SweetAlert2

document.addEventListener('DOMContentLoaded', () => {
  const userBadge = document.getElementById('userBadge');
  const btnLogout = document.getElementById('btnLogout');

  async function promptLogin() {
    const { value: formValues } = await Swal.fire({
      title: 'Iniciar sesión',
      html:
        '<input id="swal-email" class="swal2-input" placeholder="Correo" type="email" autocomplete="username">' +
        '<input id="swal-pass" class="swal2-input" placeholder="Contraseña" type="password" autocomplete="current-password">',
      focusConfirm: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      confirmButtonText: 'Entrar',
      preConfirm: () => {
        const email = document.getElementById('swal-email').value.trim();
        const pass  = document.getElementById('swal-pass').value;
        if (!email || !pass) {
          Swal.showValidationMessage('Ingresa correo y contraseña');
          return;
        }
        return { email, pass };
      }
    });
    return formValues || null;
  }

  async function requireProfileFor(uid, email) {
    const profile = await loadUserProfile(uid);
    if (!profile) {
      await Swal.fire('Sin perfil', 'Tu usuario no tiene perfil en Firestore (users/{uid}). Contacta al administrador.', 'error');
      return null;
    }
    if (profile.active !== true) {
      await Swal.fire('Usuario desactivado', 'Tu cuenta está desactivada. Contacta al administrador.', 'error');
      return null;
    }
    return {
      uid,
      email: email || profile.email || '',
      displayName: profile.displayName || '',
      role: profile.role || 'user',
      stores: Array.isArray(profile.stores) ? profile.stores : [],
      active: true
    };
  }

  function showUser(u) {
    if (!userBadge || !btnLogout) return;
    userBadge.style.display = 'inline-block';
    btnLogout.style.display = 'inline-block';

    const roleLabel = (u.role === 'admin') ? 'Admin' : 'Usuario';
    const name = (u.displayName || u.email || 'Sesión');
    userBadge.className = 'badge bg-secondary';
    userBadge.innerHTML = '<i class="fa-solid fa-user me-1"></i>' + name + ' — ' + roleLabel;
  }

  function hideUser() {
    if (userBadge) userBadge.style.display = 'none';
    if (btnLogout) btnLogout.style.display = 'none';
  }

  async function ensureSignedIn() {
    const auth = getAuth();
    if (!auth) {
      await Swal.fire('Error', 'Firebase Auth no está disponible.', 'error');
      return;
    }
    if (auth.currentUser) return;

    let ok = false;
    while (!ok) {
      const creds = await promptLogin();
      if (!creds) return;
      try {
        await auth.signInWithEmailAndPassword(creds.email, creds.pass);
        ok = true;
      } catch (e) {
        console.error(e);
        await Swal.fire('Login fallido', 'Correo o contraseña incorrectos (o usuario no existe).', 'error');
      }
    }
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      const auth = getAuth();
      if (!auth) return;
      await auth.signOut();
    });
  }

  const auth = getAuth();
  if (!auth) return;

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.CURRENT_USER = null;
      hideUser();
      await ensureSignedIn();
      return;
    }

    const prof = await requireProfileFor(user.uid, user.email);
    if (!prof) {
      try { await auth.signOut(); } catch (_) {}
      return;
    }

    window.CURRENT_USER = prof;
    showUser(prof);

    try {
      window.dispatchEvent(new CustomEvent('tr_user_ready', { detail: prof }));
    } catch (_) {}
  });
});
