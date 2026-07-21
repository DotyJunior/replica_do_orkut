import React from 'react';
import { AVAILABLE_THEMES } from '../data/themes';

interface ThemeSelectorProps {
  currentTheme: string;
  onThemeChange: (themeId: string) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ currentTheme, onThemeChange }) => {
  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-bold mb-4">Escolha um Tema</h3>
      <div className="grid grid-cols-2 gap-4">
        {AVAILABLE_THEMES.map((theme) => (
          <button
            key={theme.id}
            onClick={() => onThemeChange(theme.id)}
            className={`p-3 border rounded-md text-sm ${
              currentTheme === theme.id ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-300'
            } hover:border-orange-400 transition-all`}
          >
            {theme.name}
          </button>
        ))}
      </div>
    </div>
  );
};
