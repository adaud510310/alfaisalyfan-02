import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './profile.css';
import './tier-modal.css';
import './admin.css';
import './recovery.css';

class AppErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <main style={{ padding: '40px', direction: 'rtl', fontFamily: 'sans-serif' }}><h1>حدث خطأ في التطبيق</h1><p>أعد تحميل الصفحة. إذا استمر الخطأ، أرسل الرسالة التالية:</p><pre dir="ltr" style={{ whiteSpace: 'pre-wrap', color: '#7a1028' }}>{this.state.error.message}</pre></main>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);
