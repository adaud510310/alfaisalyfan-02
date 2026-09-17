import { useEffect, useState } from 'react';
import { ArrowLeft, BadgePercent, CircleDollarSign, House, LogOut, Menu, ShieldCheck, TicketCheck, UserRound, WalletCards } from 'lucide-react';
import { supabase } from './lib/supabase';
import { getLoyaltyPoints, getMembershipForUser, getWalletVouchers } from './lib/membership';

const navItems = [
  { id: 'home', label: 'الرئيسية', icon: House },
  { id: 'membership', label: 'عضويتي', icon: TicketCheck },
  { id: 'wallet', label: 'المحفظة', icon: WalletCards },
  { id: 'profile', label: 'حسابي', icon: UserRound },
];

const tiers = [
  { name: 'فيصلاوي', price: '115', voucher: '30 ر.س', discount: '5%' },
  { name: 'فيصلاوي بلس', price: '575', voucher: '200 ر.س', discount: '10%', featured: true },
  { name: 'الفيصلاوي الأسطوري', price: '2,300', voucher: '500 ر.س', discount: 'VIP' },
];

function App() {
  const [activeView, setActiveView] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [membership, setMembership] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [authIssue, setAuthIssue] = useState('');
  const [selectedTier, setSelectedTier] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(() => new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type') === 'recovery');
  // Admin role must come from app_metadata, which only a server (service role /
  // Supabase dashboard) can write. user_metadata is client-editable via
  // supabase.auth.updateUser({ data }), so it must never gate admin access.
  // This client-side check only hides/shows UI; Supabase RLS on
  // membership_tiers / subscriptions / wallet_vouchers must independently
  // enforce the same admin check on every write.
  const isAdmin = user?.app_metadata?.role === 'admin'
    || user?.email?.toLowerCase() === 'adaud@alfaisalyfc.net';
  const [authScreen, setAuthScreen] = useState('landing');
  const [authMode, setAuthMode] = useState('login');

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    setRecoveryMode(hashParams.get('type') === 'recovery');
    if (hashParams.get('error_code') === 'otp_expired') {
      setAuthIssue('رابط تفعيل البريد منتهي أو غير صالح. اطلب رسالة تفعيل جديدة من الأسفل.');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    if (!supabase) return undefined;

    const loadUserData = async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setMembership(null);
        setVouchers([]);
        setLoyaltyPoints(0);
        return;
      }

      try {
        const [membershipData, voucherData, points] = await Promise.all([
          getMembershipForUser(currentUser.id),
          getWalletVouchers(currentUser.id),
          getLoyaltyPoints(currentUser.id),
        ]);

        setMembership(membershipData);
        setVouchers(voucherData ?? []);
        setLoyaltyPoints(points);
      } catch (error) {
        console.error('تعذر تحميل بيانات العضوية:', error);
        setMembership(null);
        setVouchers([]);
        setLoyaltyPoints(0);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      loadUserData(data.session?.user ?? null);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUserData(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (recoveryMode) return <ResetPasswordPage />;

  if (authReady && !user) {
    if (authScreen === 'auth') {
      return <AuthPage initialMessage={authIssue} defaultMode={authMode} onBack={() => setAuthScreen('landing')} />;
    }

    return <PublicLandingPage onOpenAuth={(mode) => {
      setAuthMode(mode);
      setAuthScreen('auth');
    }} />;
  }

  const navigate = (view) => {
    setActiveView(view);
    setMenuOpen(false);
  };

  const chooseTier = (tier) => {
    setPaymentMessage('');
    setSelectedTier(tier);
  };

  const closeTierModal = () => setSelectedTier(null);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand"><span className="brand-mark brand-logo-wrap"><img src="/images/club-logo.svg" alt="شعار النادي" className="brand-logo" /></span><div><small>عضوية النادي الرسمية</small></div></div>
        <div className="club-stamp"><span>AL FAISALY</span><b>FC</b><small>EST. 1954</small></div>
        <nav>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button className={activeView === id ? 'nav-item active' : 'nav-item'} onClick={() => navigate(id)} key={id}>
              <Icon size={18} /><span>{label}</span>{id === 'wallet' && <em>2</em>}
            </button>
          ))}
          {isAdmin && <button className={activeView === 'admin' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('admin')}><ShieldCheck size={18} /><span>لوحة الإدارة</span></button>}
          <button className="nav-item sidebar-logout" onClick={logout}><LogOut size={18} /><span>تسجيل الخروج</span></button>
        </nav>
      </aside>

      <main className="content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="فتح القائمة"><Menu /></button>
          <div className="breadcrumb"><button className="home-return" onClick={() => navigate('home')}><House size={16} />الرئيسية</button>{activeView !== 'home' && <><span>/</span><b>{activeView === 'admin' ? 'لوحة الإدارة' : navItems.find((item) => item.id === activeView)?.label}</b></>}</div>
          <div className="profile"><span className="avatar">{(user?.user_metadata?.full_name || user?.email || 'م').charAt(0).toUpperCase()}</span><div><strong>{user?.user_metadata?.full_name || 'عضو فيصلاوي'}</strong><small>{user?.email}</small></div></div>
        </header>

        {activeView === 'home' && <Home onMembership={() => navigate('membership')} onSelectTier={chooseTier} />}
        {activeView === 'membership' && <Membership membership={membership} onSelectTier={chooseTier} isDemo={!supabase} />}
        {activeView === 'wallet' && <Wallet vouchers={vouchers} loyaltyPoints={loyaltyPoints} isDemo={!supabase} />}
        {activeView === 'profile' && <Profile user={user} />}
        {activeView === 'admin' && (isAdmin ? <AdminDashboard /> : <AdminAccessDenied />)}
      </main>
      {selectedTier && <TierModal tier={selectedTier} onClose={closeTierModal} onContinue={() => setPaymentMessage('تم تجهيز طلبك. سيتم تحويلك إلى بوابة الدفع قريبًا.')} paymentMessage={paymentMessage} />}
    </div>
  );
}

function PublicLandingPage({ onOpenAuth }) {
  const quickLinks = [
    { label: 'الموقع', href: 'https://alfaisalyfc.net/', icon: '🌐' },
    { label: 'المتجر', href: 'https://store.alfaisalyfc.net/', icon: '🛍️' },
    { label: 'تذاكر', href: 'https://webook.com/ar/search?q=الفيصلي', icon: '🎫' },
  ];

  return <div className="public-shell"><div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 5%' }}><header className="landing-header"><div className="landing-brand"><span className="brand-mark brand-logo-wrap"><img src="/images/club-logo.svg" alt="شعار النادي" className="brand-logo" /></span><div><small>عضوية النادي الرسمية</small></div></div><div className="landing-actions"><div className="quick-links-bar">{quickLinks.map((link) => <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="quick-link-item"><span>{link.icon}</span><span>{link.label}</span></a>)} </div><button className="ghost-button" onClick={() => onOpenAuth('login')}>تسجيل الدخول</button><button className="primary-button" onClick={() => onOpenAuth('signup')}>إنشاء حساب</button></div></header><main className="landing-main"><section className="hero"><div><span className="eyebrow light">عضوية الفيصلي الرسمية</span><h1>كن جزءًا من<br /><strong>قصة الفيصلي</strong></h1><p>عضويتك تقرّبك من النادي، تمنحك صوتًا، وتكافئ انتماءك في كل لحظة.</p><div className="hero-actions"><button className="primary-button" onClick={() => onOpenAuth('signup')}>اكتشف العضويات <ArrowLeft size={18} /></button><button className="secondary-button" onClick={() => onOpenAuth('login')}>دخول حساب موجود</button></div></div><div className="hero-crest"><span>AL FAISALY</span><b>FC</b><small>EST. 1954</small></div></section><div className="landing-stats"><div><strong>2.4k+</strong><span>أعضاء نشطين</span></div><div><strong>18</strong><span>مزايا حصرية</span></div><div><strong>24/7</strong><span>خدمة الأعضاء</span></div></div><section className="steps-section"><div className="section-heading"><div><span className="eyebrow">كيف تبدأ</span><h2>رحلة العضوية السريعة</h2></div></div><div className="steps-grid"><article className="step-card"><span>1</span><h3>أنشئ حسابك</h3><p>سجل بياناتك في دقائق فقط.</p></article><article className="step-card"><span>2</span><h3>اختر عضويتك</h3><p>اختَر الباقة المناسبة لشغفك.</p></article><article className="step-card"><span>3</span><h3>استمتع بالمزايا</h3><p>احصل على الخصومات، القسائم، وتذاكرك المفضلة.</p></article></div></section><section className="landing-cta"><div><span className="eyebrow">أعِد اكتشاف ناديك</span><h2>انضم إلى عائلة فيصلاوي اليوم.</h2></div><button className="primary-button" onClick={() => onOpenAuth('signup')}>ابدأ عضويتك <ArrowLeft size={18} /></button></section><section className="faisaly-sponsors"><h3 className="sponsors-title">شركاء النجاح والرعاية</h3><div className="sponsors-container"><img src="/images/002.png" alt="رعاة نادي الفيصلي السعودي" className="sponsors-image" /></div></section><footer className="faisaly-footer"><div className="faisaly-footer-content"><div className="faisaly-footer-col"><h3>عن نادي الفيصلي السعودي</h3><p>تأسس نادي الفيصلي السعودي (العنابي) عام 1954م في مدينة حرمة بمحافظة المجمعة. يُعد النادي رمزاً رياضياً وثقافياً واجتماعياً بارزاً في المملكة العربية السعودية.</p><div className="faisaly-social-icons"><a href="https://x.com/alfaisaly" target="_blank" rel="noreferrer" className="faisaly-social-icon x-link"><i className="fa-brands fa-x-twitter"></i></a><a href="https://www.instagram.com/alfaisalyfc/" target="_blank" rel="noreferrer" className="faisaly-social-icon instagram-link"><i className="fa-brands fa-instagram"></i></a><a href="https://www.facebook.com/alfaisaly1954" target="_blank" rel="noreferrer" className="faisaly-social-icon facebook-link"><i className="fa-brands fa-facebook-f"></i></a><a href="https://www.youtube.com/@alfaisalyfc1" target="_blank" rel="noreferrer" className="faisaly-social-icon youtube-link"><i className="fa-brands fa-youtube"></i></a></div></div><div className="faisaly-footer-col"><h3>روابط سريعة</h3><ul className="faisaly-footer-links"><li><a href="https://alfaisalyfc.net/" target="_blank" rel="noreferrer"><i className="fa-solid fa-arrow-left"></i> الموقع الرسمي للنادي</a></li><li><a href="https://ar.wikipedia.org/wiki/%D8%A7%D9%84%D9%86%D8%A7%D8%AF%D9%8A_%D8%A7%D9%84%D9%81%D9%8A%D8%B5%D9%84%D9%8A_(%D8%A7%D9%84%D8%B3%D8%B9%D9%88%D8%AF%D9%8A%D8%A9)" target="_blank" rel="noreferrer"><i className="fa-solid fa-arrow-left"></i> صفحة النادي على ويكيبيديا</a></li><li><a href="#quran"><i className="fa-solid fa-arrow-left"></i> بداية السورة</a></li></ul></div><div className="faisaly-footer-col"><h3>فضل قراءة سورة الكهف</h3><p>عن أبي سعيد الخدري رضي الله عنه أن النبي صلى الله عليه وسلم قال: «من قرأ سورة الكهف في يوم الجمعة أضاء له من النور ما بين الجمعتين» (رواه الحاكم).</p></div></div><div className="faisaly-footer-bottom">جميع الحقوق محفوظة &copy; 2026 | تحت إشراف محبي <a href="https://alfaisalyfc.net/" target="_blank" rel="noreferrer">نادي الفيصلي السعودي (العنابي)</a></div></footer></main></div></div>;
}

function AuthPage({ initialMessage = '', defaultMode = 'login', onBack }) {
  const [mode, setMode] = useState(defaultMode);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [status, setStatus] = useState({ type: initialMessage ? 'error' : '', message: initialMessage });
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(Boolean(initialMessage));

  const updateField = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });
    setNeedsConfirmation(false);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.name } },
        });

        if (error) throw error;
        setStatus({
          type: 'success',
          message: data.session ? 'تم إنشاء حسابك بنجاح.' : 'تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتفعيل الحساب.',
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });

        if (error) throw error;
      }
    } catch (error) {
      const message = error.message || 'تعذر إتمام العملية.';
      setNeedsConfirmation(message.toLowerCase().includes('email not confirmed'));
      setStatus({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: form.email });
    setStatus(error
      ? { type: 'error', message: error.message }
      : { type: 'success', message: 'تم إرسال رسالة تفعيل جديدة إلى بريدك.' });
    setLoading(false);
  };

  return <main className="auth-page">
    <section className="auth-panel">
      {onBack && <button className="auth-home-button" type="button" onClick={onBack}><House size={17} />العودة إلى الصفحة الرئيسية</button>}
      <div className="auth-brand"><span className="brand-mark brand-logo-wrap"><img src="/images/club-logo.svg" alt="شعار النادي" className="brand-logo" /></span><div><small>عضوية النادي الرسمية</small></div></div>
      <div className="auth-heading"><span className="eyebrow">مرحبًا بك في عائلة الفيصلي</span><h1>{mode === 'signup' ? 'أنشئ عضويتك' : 'تسجيل الدخول'}</h1><p>{mode === 'signup' ? 'ابدأ رحلتك مع النادي واستمتع بمزايا عضويتك.' : 'أدخل بياناتك للوصول إلى عضويتك ومكافآتك.'}</p></div>
      <form className="auth-form" onSubmit={submit}>
        {mode === 'signup' && <label>الاسم الكامل<input name="name" value={form.name} onChange={updateField} placeholder="محمد العتيبي" required /></label>}
        <label>البريد الإلكتروني<input name="email" type="email" value={form.email} onChange={updateField} placeholder="name@example.com" dir="ltr" required /></label>
        <label>كلمة المرور<input name="password" type="password" value={form.password} onChange={updateField} placeholder="••••••••" minLength="6" dir="ltr" required /></label>
        <button className="primary-button auth-submit" type="submit" disabled={loading}>{loading ? 'جارٍ التنفيذ...' : mode === 'signup' ? 'إنشاء الحساب' : 'دخول إلى عضويتي'} <ArrowLeft size={18} /></button>
      </form>
      {status.message && <p className={`auth-status ${status.type}`}>{status.message}</p>}
      {needsConfirmation && <button className="auth-resend" onClick={resendConfirmation} disabled={loading || !form.email}>إعادة إرسال رسالة التفعيل</button>}
      <div className="auth-switch">{mode === 'signup' ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب؟'} <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setStatus({ type: '', message: '' }); }}>{mode === 'signup' ? 'سجل الدخول' : 'أنشئ حسابًا'}</button></div>
    </section>
    <aside className="auth-aside"><span className="eyebrow light">عضوية الفيصلي الرسمية</span><h2>كن جزءًا من<br /><strong>قصة الفيصلي</strong></h2><p>عضويتك تقرّبك من النادي، تمنحك صوتًا، وتكافئ انتماءك في كل لحظة.</p><div className="hero-crest"><span>AL FAISALY</span><b>FC</b><small>EST. 1954</small></div></aside>
  </main>;
}

function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (password.length < 6) {
      setStatus({ type: 'error', message: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' });
      return;
    }
    if (password !== confirmation) {
      setStatus({ type: 'error', message: 'كلمتا المرور غير متطابقتين.' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setStatus(error
      ? { type: 'error', message: error.message }
      : { type: 'success', message: 'تم تحديث كلمة المرور. يمكنك الآن تسجيل الدخول.' });
    if (!error) window.history.replaceState(null, '', window.location.pathname);
    setLoading(false);
  };

  return <main className="auth-page"><section className="auth-panel"><div className="auth-brand"><span className="brand-mark">ف</span><div><strong>فيصلاوي</strong><small>عضوية النادي الرسمية</small></div></div><div className="auth-heading"><span className="eyebrow">استعادة الحساب</span><h1>أنشئ كلمة مرور جديدة</h1><p>اختر كلمة مرور جديدة لحماية حسابك.</p></div><form className="auth-form" onSubmit={submit}><label>كلمة المرور الجديدة<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength="6" required dir="ltr" /></label><label>تأكيد كلمة المرور<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength="6" required dir="ltr" /></label><button className="primary-button auth-submit" type="submit" disabled={loading}>{loading ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور'} <ArrowLeft size={18} /></button></form>{status.message && <p className={`auth-status ${status.type}`}>{status.message}</p>}<button className="auth-switch-button" onClick={() => { window.history.replaceState(null, '', window.location.pathname); window.location.reload(); }}>العودة إلى تسجيل الدخول</button></section><aside className="auth-aside"><span className="eyebrow light">حسابك مع الفيصلي</span><h2>أمانك<br /><strong>أولويتنا</strong></h2><p>استخدم كلمة مرور قوية ولا تشارك رابط الاستعادة مع أي شخص.</p><div className="hero-crest"><span>AL FAISALY</span><b>FC</b><small>EST. 1954</small></div></aside></main>;
}

function Profile({ user }) {
  const [name, setName] = useState(user?.user_metadata?.full_name ?? '');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    setStatus(error ? error.message : 'تم حفظ بياناتك بنجاح.');
    setSaving(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return <div className="page-wrap"><div className="page-title"><span className="eyebrow">الحساب</span><h1>ملفي الشخصي</h1><p>إدارة بياناتك المرتبطة بعضوية الفيصلي.</p></div><div className="profile-layout"><form className="profile-card" onSubmit={saveProfile}><div className="profile-card-heading"><span className="profile-large-avatar">{(name || user?.email || 'م').charAt(0).toUpperCase()}</span><div><h2>{name || 'عضو فيصلاوي'}</h2><p>{user?.email}</p></div></div><label>الاسم الكامل<input value={name} onChange={(event) => setName(event.target.value)} placeholder="اكتب اسمك الكامل" /></label><label>البريد الإلكتروني<input value={user?.email ?? ''} readOnly dir="ltr" /></label><button className="primary-button" type="submit" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</button>{status && <p className="profile-status">{status}</p>}</form><div className="profile-card account-summary"><span className="eyebrow">معلومات الحساب</span><div><b>تاريخ التسجيل</b><span>{user?.created_at ? new Date(user.created_at).toLocaleDateString('ar-SA') : 'غير متاح'}</span></div><div><b>حالة البريد</b><span className="verified">مفعّل</span></div><button className="logout-button" type="button" onClick={logout}><LogOut size={17} /> تسجيل الخروج</button></div></div></div>;
}

function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [tiersData, setTiersData] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [newVoucher, setNewVoucher] = useState({ userId: '', code: '', value: '', expiresAt: '' });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [tiersResult, subscriptionsResult, vouchersResult] = await Promise.all([
        supabase.from('membership_tiers').select('*').order('price'),
        supabase.from('subscriptions').select('id,user_id,status,starts_at,ends_at,tier_id,membership_tiers(name,price)').order('created_at', { ascending: false }),
        supabase.from('wallet_vouchers').select('*').order('created_at', { ascending: false }),
      ]);

      if (tiersResult.error || subscriptionsResult.error || vouchersResult.error) {
        setStatus(tiersResult.error?.message || subscriptionsResult.error?.message || vouchersResult.error?.message || 'تعذر تحميل بيانات لوحة الإدارة.');
        return;
      }
      setTiersData(tiersResult.data ?? []);
      setSubscriptions(subscriptionsResult.data ?? []);
      setVouchers(vouchersResult.data ?? []);
    } catch (error) {
      setStatus(error.message || 'تعذر الاتصال بقاعدة البيانات.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAdminData(); }, []);

  const updateTier = async (tier) => {
    const { error } = await supabase.from('membership_tiers').update({ price: Number(tier.price), voucher_value: Number(tier.voucher_value), discount_percent: Number(tier.discount_percent) }).eq('id', tier.id);
    setStatus(error ? error.message : 'تم تحديث الباقة والأسعار.');
    if (!error) loadAdminData();
  };

  const createVoucher = async (event) => {
    event.preventDefault();
    const { error } = await supabase.from('wallet_vouchers').insert({ user_id: newVoucher.userId, code: newVoucher.code, title: 'قسيمة إدارية', value: Number(newVoucher.value), expires_at: newVoucher.expiresAt, status: 'available' });
    setStatus(error ? error.message : 'تم إنشاء القسيمة بنجاح.');
    if (!error) {
      setNewVoucher({ userId: '', code: '', value: '', expiresAt: '' });
      loadAdminData();
    }
  };

  const metric = (label, value, icon) => <div className="admin-metric"><span>{icon}</span><small>{label}</small><strong>{value}</strong></div>;
  return <div className="page-wrap admin-page"><div className="page-title"><span className="eyebrow">إدارة المنصة</span><h1>لوحة تحكم الإدارة</h1><p>إدارة الأعضاء والباقات والاشتراكات والقسائم من مكان واحد.</p></div>{loading && <p className="admin-status">جارٍ تحميل بيانات الإدارة...</p>}<div className="admin-metrics">{metric('الباقات', tiersData.length, <TicketCheck size={19} />)}{metric('الاشتراكات', subscriptions.length, <ShieldCheck size={19} />)}{metric('القسائم', vouchers.length, <WalletCards size={19} />)}{metric('قيمة الباقات', `${tiersData.reduce((sum, tier) => sum + Number(tier.price || 0), 0)} ر.س`, <CircleDollarSign size={19} />)}</div><div className="admin-tabs">{[['overview', 'نظرة عامة'], ['members', 'الأعضاء والاشتراكات'], ['tiers', 'الباقات والأسعار'], ['vouchers', 'إنشاء القسائم']].map(([id, label]) => <button className={tab === id ? 'admin-tab active' : 'admin-tab'} onClick={() => setTab(id)} key={id}>{label}</button>)}</div>{status && <p className="admin-status">{status}</p>}{tab === 'overview' && <div className="admin-panel"><h2>ملخص المنصة</h2><p>استخدم التبويبات لإدارة بيانات العضوية. العمليات هنا تعتمد على صلاحيات Supabase وRLS.</p><div className="admin-quick-actions"><button onClick={() => setTab('tiers')}>إدارة الأسعار <ArrowLeft size={16} /></button><button onClick={() => setTab('vouchers')}>إنشاء قسيمة <ArrowLeft size={16} /></button></div></div>}{tab === 'members' && <div className="admin-panel"><h2>الأعضاء والاشتراكات</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>المستخدم</th><th>الباقة</th><th>الحالة</th><th>الانتهاء</th></tr></thead><tbody>{subscriptions.map((subscription) => <tr key={subscription.id}><td dir="ltr">{subscription.user_id?.slice(0, 8) ?? 'غير معروف'}...</td><td>{subscription.membership_tiers?.name ?? `باقة #${subscription.tier_id}`}</td><td><span className="admin-chip">{subscription.status}</span></td><td>{subscription.ends_at ?? 'بدون تاريخ'}</td></tr>)}</tbody></table>{!subscriptions.length && <p className="admin-empty">لا توجد اشتراكات مسجلة.</p>}</div></div>}{tab === 'tiers' && <div className="admin-panel"><h2>الباقات والأسعار</h2><div className="admin-tier-list">{tiersData.map((tier) => <div className="admin-tier-row" key={tier.id}><strong>{tier.name}</strong><label>السعر<input type="number" value={tier.price} onChange={(event) => setTiersData(tiersData.map((item) => item.id === tier.id ? { ...item, price: event.target.value } : item))} /></label><label>القسيمة<input type="number" value={tier.voucher_value} onChange={(event) => setTiersData(tiersData.map((item) => item.id === tier.id ? { ...item, voucher_value: event.target.value } : item))} /></label><label>الخصم %<input type="number" value={tier.discount_percent} onChange={(event) => setTiersData(tiersData.map((item) => item.id === tier.id ? { ...item, discount_percent: event.target.value } : item))} /></label><button className="outline-button" onClick={() => updateTier(tier)}>حفظ</button></div>)}</div></div>}{tab === 'vouchers' && <div className="admin-panel"><h2>إنشاء قسيمة لمستخدم</h2><form className="admin-voucher-form" onSubmit={createVoucher}><label>معرف المستخدم<input value={newVoucher.userId} onChange={(event) => setNewVoucher({ ...newVoucher, userId: event.target.value })} placeholder="UUID" required dir="ltr" /></label><label>رمز القسيمة<input value={newVoucher.code} onChange={(event) => setNewVoucher({ ...newVoucher, code: event.target.value })} placeholder="FAISALY-200" required dir="ltr" /></label><label>القيمة<input type="number" value={newVoucher.value} onChange={(event) => setNewVoucher({ ...newVoucher, value: event.target.value })} required /></label><label>تاريخ الانتهاء<input type="date" value={newVoucher.expiresAt} onChange={(event) => setNewVoucher({ ...newVoucher, expiresAt: event.target.value })} required /></label><button className="primary-button" type="submit">إنشاء القسيمة <ArrowLeft size={17} /></button></form></div>}</div>;
}

function AdminAccessDenied() {
  return <div className="page-wrap"><div className="page-title"><span className="eyebrow">صلاحيات الحساب</span><h1>لوحة الإدارة</h1><p>هذا الحساب لا يملك صلاحية الوصول إلى لوحة الإدارة.</p></div><div className="admin-panel"><h2>تعذر فتح اللوحة</h2><p>سجّل الدخول بالحساب الإداري ثم حدّث الصفحة. الحساب الإداري المعتمد هو:</p><strong dir="ltr">adaud@alfaisalyfc.net</strong><p className="admin-help">إذا كنت تستخدم هذا البريد، سجّل الخروج ثم الدخول من جديد حتى تصل بيانات الصلاحية إلى الجلسة الحالية.</p></div></div>;
}

function Home({ onMembership, onSelectTier }) {
  return <div className="page-wrap">
    <section className="hero"><div><span className="eyebrow light">عضوية الفيصلي الرسمية</span><h1>كن جزءًا من<br /><strong>قصة الفيصلي</strong></h1><p>عضويتك تقرّبك من النادي، تمنحك صوتًا، وتكافئ انتماءك في كل لحظة.</p><button className="primary-button" onClick={onMembership}>اكتشف العضويات <ArrowLeft size={18} /></button></div><div className="hero-crest"><span>AL FAISALY</span><b>FC</b><small>EST. 1954</small></div></section>
    <section className="intro"><div><span className="eyebrow">عن عضوية الفيصلي</span><h2>أكثر من مجرد<br /><span>عضوية.</span></h2></div><p>من أولوية التذاكر إلى الخصومات والتجارب الحصرية، صمّمنا عضويتك لتكون أقرب إلى النادي في كل مباراة وكل انتصار.</p></section>
    <section className="benefits"><article><TicketCheck /><h3>أولوية التذاكر</h3><p>كن أول من يعيش أجواء مباريات الفيصلي.</p></article><article><BadgePercent /><h3>مزايا حصرية</h3><p>خصومات وقسائم مصممة لأعضاء النادي.</p></article><article><span className="benefit-symbol">✦</span><h3>مكافآت الولاء</h3><p>كل تفاعل مع الفيصلي يستحق مكافأة.</p></article></section>
    <section className="tiers"><div className="section-heading"><div><span className="eyebrow">اختر مستوى انتمائك</span><h2>أنواع العضوية</h2></div><span>ثلاث باقات. شغف واحد.</span></div><div className="tier-grid">{tiers.map((tier) => <article className={tier.featured ? 'tier-card featured' : 'tier-card'} key={tier.name}><span className="tier-label">{tier.featured ? 'الأفضل قيمة' : 'عضوية سنوية'}</span><h3>{tier.name}</h3><strong>{tier.price}<small> ر.س</small></strong><p>قسيمة متجر بقيمة {tier.voucher}</p><p>خصم {tier.discount} على المتجر</p><button className="outline-button" onClick={() => onSelectTier(tier)}>اختيار الباقة</button></article>)}</div></section>
  </div>;
}

function Membership({ membership, onSelectTier, isDemo }) {
  const currentTier = membership?.membership_tiers;
  const hasActiveMembership = Boolean(membership);
  const tierName = currentTier?.name ?? (isDemo ? 'فيصلاوي بلس' : null);
  const expiry = membership?.ends_at ?? (isDemo ? '2027-05-15' : null);
  const showBanner = hasActiveMembership || isDemo;

  return <div className="page-wrap"><div className="page-title"><span className="eyebrow">العضوية</span><h1>عضويتك مع الفيصلي</h1><p>اختر المستوى الذي يناسب شغفك، واستمتع بمزايا أكثر.</p></div>{showBanner ? <div className="membership-banner"><span>الباقة الحالية</span><h2>{tierName}</h2><p>عضوية سنوية · تنتهي في {expiry}</p><button className="primary-button" onClick={() => onSelectTier(tiers.find((tier) => tier.name === tierName) ?? tiers[1])}>إدارة العضوية <ArrowLeft size={18} /></button></div> : <div className="membership-banner"><span>لا توجد عضوية نشطة</span><h2>لم تشترك بعد في أي باقة</h2><p>اختر إحدى الباقات أدناه لتفعيل عضويتك.</p></div>}<div className="tier-grid">{tiers.map((tier) => <article className={tier.featured ? 'tier-card featured' : 'tier-card'} key={tier.name}><span className="tier-label">{tier.featured ? 'الأكثر اختيارًا' : 'الباقة'}</span><h3>{tier.name}</h3><strong>{tier.price}<small> ر.س / سنويًا</small></strong><p>قسيمة ترحيبية بقيمة {tier.voucher}</p><p>خصم {tier.discount} على المتجر</p><button className={tier.featured ? 'primary-button' : 'outline-button'} onClick={() => onSelectTier(tier)}>{tier.name === tierName ? 'باقتك الحالية' : 'ترقية الباقة'}</button></article>)}</div></div>;
}

function TierModal({ tier, onClose, onContinue, paymentMessage }) {
  return <div className="tier-modal-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}><section className="tier-modal" role="dialog" aria-modal="true" aria-labelledby="tier-modal-title"><button className="tier-modal-close" onClick={onClose} aria-label="إغلاق">×</button><span className="eyebrow">تأكيد الباقة</span><h2 id="tier-modal-title">{tier.name}</h2><p>أنت على وشك اختيار هذه العضوية السنوية.</p><div className="tier-modal-details"><div><span>السعر</span><strong>{tier.price} ر.س</strong></div><div><span>قسيمة المتجر</span><strong>{tier.voucher}</strong></div><div><span>الخصم</span><strong>{tier.discount}</strong></div></div>{paymentMessage ? <p className="payment-message">{paymentMessage}</p> : <button className="primary-button modal-continue" onClick={onContinue}>متابعة للدفع <ArrowLeft size={18} /></button>}<small className="modal-note">الدفع التجريبي فقط، ولن يتم خصم أي مبلغ.</small></section></div>;
}

function Wallet({ vouchers, loyaltyPoints, isDemo }) {
  const demoVouchers = [
    { title: 'قسيمة الترحيب', value: 200, expires_at: '2027-05-15' },
    { title: 'مكافأة الولاء', value: 30, expires_at: '2026-12-31' },
  ];
  const displayedVouchers = isDemo && !vouchers.length ? demoVouchers : vouchers;
  const displayedPoints = isDemo ? (loyaltyPoints || 2480) : loyaltyPoints;
  const balance = displayedVouchers.reduce((total, voucher) => total + Number(voucher.value || 0), 0);

  return <div className="page-wrap"><div className="page-title"><span className="eyebrow">المحفظة</span><h1>قسائمك ومكافآتك</h1><p>رصيد الولاء: {displayedPoints} نقطة</p></div><div className="wallet-balance"><span>إجمالي الرصيد المتاح</span><strong>{balance} <small>ر.س</small></strong><p>قسائمك محمية ومخصصة لحسابك</p></div>{displayedVouchers.length ? displayedVouchers.map((voucher) => <div className="voucher" key={voucher.code ?? voucher.title}><WalletCards /><div><strong>{voucher.title}</strong><small>صالحة حتى {voucher.expires_at}</small></div><b>{voucher.value} ر.س</b></div>) : <p className="admin-empty">لا توجد قسائم متاحة حاليًا.</p>}</div>;
}

export default App;
