import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SecureID Uncaught React Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    localStorage.removeItem('secureid_token');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F6F3EC',
          color: '#12202E',
          fontFamily: "'Inter', sans-serif",
          padding: '2rem',
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            backgroundColor: '#FAF9F5',
            border: '1px solid #DED7C9',
            borderRadius: '8px',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(18, 32, 46, 0.08)',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#FCEDED',
              color: '#A83B3B',
              fontSize: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              !
            </div>
            <h2 style={{
              fontFamily: "'Source Serif 4', serif",
              fontSize: '1.6rem',
              marginBottom: '0.75rem',
              color: '#12202E',
            }}>
              Application Error
            </h2>
            <p style={{
              color: '#6B7D8D',
              fontSize: '0.95rem',
              marginBottom: '1.5rem',
              lineHeight: 1.5,
            }}>
              An unexpected error occurred while loading this view.
            </p>
            {this.state.error?.message && (
              <pre style={{
                backgroundColor: '#EDE9DF',
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                color: '#A83B3B',
                fontFamily: "'IBM Plex Mono', monospace",
                marginBottom: '1.5rem',
                overflowX: 'auto',
                textAlign: 'left',
              }}>
                {this.state.error.message}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  backgroundColor: '#2E6E5E',
                  color: '#fff',
                  border: 'none',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  backgroundColor: 'transparent',
                  color: '#3A4D5E',
                  border: '1px solid #DED7C9',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '6px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Clear State &amp; Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
