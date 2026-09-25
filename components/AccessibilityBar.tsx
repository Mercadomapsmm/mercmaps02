'use client';

import React from 'react';
import { AccessibilitySettings } from '@/types/shopping';
import { Volume2, VolumeX, Volume } from 'lucide-react';
import { CONTRAST_THEMES } from '@/lib/contrastThemes';

interface AccessibilityBarProps {
  settings: AccessibilitySettings;
  onUpdateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  onReadList: () => void;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
  remainingCount: number;
}

export const AccessibilityBar: React.FC<AccessibilityBarProps> = ({
  settings,
  onUpdateSettings,
  onReadList,
  isSpeaking,
  onStopSpeaking,
  remainingCount,
}) => {
  const currentThemeId = settings.contrastTheme || (settings.highContrast ? 'amarelo-preto' : 'padrao');
  const activeTheme = CONTRAST_THEMES[currentThemeId] || CONTRAST_THEMES.padrao;

  return (
    <aside
      id="accessibility-bar"
      aria-label="Ajustes de Acessibilidade e Visualização"
      className={`w-full transition-colors border-none ${activeTheme.bgAccessibility}`}
    >
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-end gap-2 text-sm">
        {/* Som & Leitura da Lista */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Sound Toggle */}
          <button
            id="toggle-sound-feedback"
            type="button"
            onClick={() => onUpdateSettings({ soundFeedback: !settings.soundFeedback })}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              settings.soundFeedback
                ? 'bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border-emerald-500'
                : 'bg-black/10 dark:bg-white/10 border-current/30 opacity-70'
            }`}
            title={settings.soundFeedback ? 'Sons ativados' : 'Sons desativados'}
          >
            {settings.soundFeedback ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">Sons</span>
          </button>

          {/* Read List Aloud */}
          {isSpeaking ? (
            <button
              id="stop-reading-button"
              type="button"
              onClick={onStopSpeaking}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs sm:text-sm animate-pulse hover:bg-rose-700 cursor-pointer"
              title="Parar leitura em voz alta"
            >
              <VolumeX className="w-4 h-4" />
              Parar Leitura
            </button>
          ) : (
            <button
              id="read-list-button"
              type="button"
              onClick={onReadList}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-transform active:scale-95 cursor-pointer"
              title="Ouvir lista de compras em voz alta"
            >
              <Volume className="w-4 h-4" />
              <span>Ouvir Lista</span>
              {remainingCount > 0 && (
                <span className="bg-emerald-900 text-white text-[11px] px-1.5 py-0.2 rounded-full font-bold">
                  {remainingCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
