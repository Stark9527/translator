import { LanguageCode } from '../types';
import { SUPPORTED_LANGUAGES } from '../utils/constants';
import './LanguageSelector.css';

interface LanguageSelectorProps {
  value: LanguageCode;
  onChange: (lang: LanguageCode) => void;
  showAuto?: boolean;
  label?: string;
  className?: string;
}

export function LanguageSelector({
  value,
  onChange,
  showAuto = true,
  label,
  className = '',
}: LanguageSelectorProps) {
  const languages = showAuto
    ? SUPPORTED_LANGUAGES
    : SUPPORTED_LANGUAGES.filter((lang) => lang.code !== 'auto');

  return (
    <div className={`language-selector ${className}`}>
      {label && <label className="language-selector-label">{label}</label>}
      <select
        className="language-selector-select"
        value={value}
        onChange={(e) => onChange(e.target.value as LanguageCode)}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}
