import { Component, type ReactNode } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Wraps routed page content so a crash in one page (e.g. an unexpected API
 * response shape) shows a retry state instead of blanking the whole app.
 * Resets when the user navigates (key={pathname} from the caller) or clicks retry.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Route render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          message={`This page failed to load (${this.state.error.message}).`}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
