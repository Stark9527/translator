import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
}

export function LoadingSpinner({ size = 'medium' }: LoadingSpinnerProps) {
  return (
    <div className={`loading-spinner-container ${size}`}>
      <div className="spinner"></div>
    </div>
  );
}
