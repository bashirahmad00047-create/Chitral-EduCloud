// Chitral EduCloud ERP - Internationalization & Urdu RTL Engine

const i18n = {
  currentLang: 'en',

  toggleLanguage() {
    this.currentLang = this.currentLang === 'en' ? 'ur' : 'en';
    const html = document.documentElement;
    const langLabel = document.getElementById('langLabel');

    if (this.currentLang === 'ur') {
      html.setAttribute('dir', 'rtl');
      html.setAttribute('lang', 'ur');
      if (langLabel) langLabel.innerText = "English (LTR)";
    } else {
      html.setAttribute('dir', 'ltr');
      html.setAttribute('lang', 'en');
      if (langLabel) langLabel.innerText = "اردو (RTL)";
    }

    this.apply();
    if (typeof renderScreen === 'function' && typeof state !== 'undefined') {
      state.currentLang = this.currentLang;
      renderScreen(state.currentScreen);
    }
    if (typeof showToast === 'function') {
      showToast(this.currentLang === 'ur' ? "اردو زبان فعال ہو گئی ہے" : "Language switched to English");
    }
  },

  apply() {
    const t = TRANSLATIONS[this.currentLang];
    if (!t) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) {
        el.innerText = t[key];
      }
    });

    // Also update dynamic badge
    const liveBadge = document.getElementById('liveDatabaseBadge');
    if (liveBadge) {
      liveBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> ${this.currentLang === 'ur' ? "لائیو ڈیٹا بیس" : "LIVE DATABASE"}`;
    }
  }
};
