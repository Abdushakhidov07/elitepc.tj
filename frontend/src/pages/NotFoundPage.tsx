import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <h1 className="text-6xl font-extrabold text-primary mb-4">404</h1>
      <p className="text-xl text-text-secondary mb-8">Страница не найдена</p>
      <Link
        to="/"
        className="inline-block bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-lg font-medium transition-colors"
      >
        На главную
      </Link>
    </div>
  );
}
