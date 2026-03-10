import clsx from 'clsx';

interface LoaderProps {
  /** Size of the spinner in pixels */
  size?: number;
  /** Additional CSS classes */
  className?: string;
  /** Text displayed below the spinner */
  text?: string;
}

export default function Loader({ size = 48, className, text }: LoaderProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-4', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-border"
          style={{ width: size, height: size }}
        />
        {/* Spinning arc */}
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin"
          style={{ width: size, height: size }}
        />
        {/* Inner pulsing dot */}
        <div
          className="absolute rounded-full bg-accent animate-pulse"
          style={{
            width: size * 0.25,
            height: size * 0.25,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>
      {text && (
        <p className="text-sm text-text-secondary animate-pulse">{text}</p>
      )}
    </div>
  );
}
