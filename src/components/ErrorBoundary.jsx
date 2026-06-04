import React from "react";
import { DEV } from "../utils/env";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "50px",
            textAlign: "center",
            fontFamily: "sans-serif",
          }}
        >
          <h1>Something went wrong.</h1>
          <p>
            We're sorry, but the application encountered an unexpected error.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              marginTop: "20px",
              cursor: "pointer",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "5px",
            }}
          >
            Reload Page
          </button>
          {DEV && (
            <details
              style={{
                whiteSpace: "pre-wrap",
                marginTop: "20px",
                textAlign: "left",
                background: "#f8f9fa",
                padding: "20px",
              }}
            >
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
