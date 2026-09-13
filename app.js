const pageTitles = { overview: 'الرئيسية', dashboard: 'نظرة عامة', membership: 'عضويتي', wallet: 'المحفظة', benefits: 'المزايا', activity: 'النشاط والولاء', settings: 'الإعدادات' };
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item[data-view]');
const pageTitle = document.querySelector('#pageTitle');
const sidebar = document.querySelector('.sidebar');
const toast = document.querySelector('.toast');
const appShell = document.querySelector('.app-shell');
let toastTimer;

function showView(viewId) {
  views.forEach((view) => view.classList.toggle('active-view', view.id === viewId));
  navItems.forEach((item) => item.classList.toggle('active', item.dataset.view === viewId));
  pageTitle.textContent = pageTitles[viewId];
  appShell.classList.toggle('public-mode', viewId === 'overview');
  sidebar.classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showToast(message) {
  toast.querySelector('span').textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

navItems.forEach((item) => item.addEventListener('click', () => showView(item.dataset.view)));
document.querySelectorAll('[data-view-target]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.viewTarget)));
document.querySelectorAll('[data-scroll-target]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.scrollTarget)?.scrollIntoView({ behavior: 'smooth' })));
document.querySelectorAll('[data-toast]').forEach((button) => button.addEventListener('click', () => showToast(button.dataset.toast)));
document.querySelector('.mobile-menu').addEventListener('click', () => sidebar.classList.toggle('open'));
document.querySelector('[data-action="logout"]').addEventListener('click', () => {
  if (window.confirm('هل تريد تسجيل الخروج من حسابك؟')) showToast('تم تسجيل الخروج بنجاح');
});

showView('overview');

document.querySelectorAll('[data-toggle]').forEach((button) => button.addEventListener('click', () => {
  const toggle = button.querySelector('.toggle');
  toggle.classList.toggle('on');
  showToast(`${button.querySelector('b').textContent} ${toggle.classList.contains('on') ? 'مفعّلة' : 'متوقفة'}`);
}));

document.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', async () => {
  const code = button.dataset.copy;
  try { await navigator.clipboard.writeText(code); } catch { /* Clipboard may be unavailable in local previews. */ }
  showToast(`تم نسخ رمز القسيمة: ${code}`);
}));

const modal = document.querySelector('#upgradeModal');
document.querySelectorAll('[data-open-modal], [data-select-tier]').forEach((button) => button.addEventListener('click', () => modal.classList.add('open')));
document.querySelector('.close-modal').addEventListener('click', () => modal.classList.remove('open'));
modal.addEventListener('click', (event) => { if (event.target === modal) modal.classList.remove('open'); });
document.querySelector('[data-close-modal]').addEventListener('click', () => modal.classList.remove('open'));

lucide.createIcons();
