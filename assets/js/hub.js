const API = 'http://localhost:8000';

    function showLockedToast() {
      const t = document.getElementById('toast');
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3000);
    }

    // Optionally: poll to auto-unlock challenge button when admin creates a session
    // For now the button remains locked; challenge.html handles post-login polling