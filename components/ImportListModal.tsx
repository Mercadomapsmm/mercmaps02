'use client';

import React from 'react';
import { ShoppingList, FontSizeOption, ContrastThemeId } from '@/types/shopping';
import { CONTRAST_THEMES } from '@/lib/contrastThemes';
import { CATEGORIES } from '@/lib/categories';
import { PlusCircle, Layers, X, ShoppingBag, ArrowRight, CheckCircle2 } from 'lucide-react';

interface ImportListModalProps {
  isOpen: boolean;
  onClose: () => void;
  sharedList?: ShoppingList | null;
  sharedLists?: ShoppingList[] | null;
  activeListName: string;
  onImportAsNew: (list: ShoppingList) => void;
  onMergeWithActive: (list: ShoppingList) => void;
  onImportAllLists?: (lists: ShoppingList[]) => void;
  onMergeAllWithActive?: (lists: ShoppingList[]) => void;
  fontSize: FontSizeOption;
  highContrast: boolean;
  contrastTheme?: ContrastThemeId;
}

export const ImportListModal: React.FC<ImportListModalProps> = ({
  isOpen,
  onClose,
  sharedList,
  sharedLists,
  activeListName,
  onImportAsNew,
  onMergeWithActive,
  onImportAllLists,
  onMergeAllWithActive,
  fontSize,
  highContrast,
  contrastTheme,
}) => {
  const currentThemeId = contrastTheme || (highContrast ? 'amarelo-preto' : 'padrao');
  const activeTheme = CONTRAST_THEMES[currentThemeId] || CONTRAST_THEMES.padrao;

  if (!isOpen) return null;

  const isMultiple = Boolean(sharedLists && sharedLists.length > 0);
  if (!isMultiple && !sharedList) return null;

  const listsToImport = isMultiple && sharedLists ? sharedLists : sharedList ? [sharedList] : [];
  const totalItemsCount = listsToImport.reduce((acc, l) => acc + l.items.length, 0);
  const totalEstimated = listsToImport.reduce((acc, l) => {
    return acc + l.items.reduce((sub, it) => sub + (it.estimatedPrice ? it.estimatedPrice * it.quantity : 0), 0);
  }, 0);

  const titleFontSize = {
    normal: 'text-lg sm:text-xl font-extrabold',
    large: 'text-xl sm:text-2xl font-black',
    extra: 'text-2xl sm:text-3xl font-black',
  }[fontSize];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all ${activeTheme.bgCard} ${activeTheme.borderCard} ${activeTheme.textPrimary}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-current/15 bg-emerald-500/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {isMultiple ? 'Pacote de Listas Recebido' : 'Lista Compartilhada Recebida'}
              </span>
              <h2 id="import-modal-title" className={titleFontSize}>
                {isMultiple
                  ? `${listsToImport.length} Listas de Compras`
                  : sharedList?.name || 'Lista de Compras'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
          <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-current/10 flex items-center justify-between text-xs sm:text-sm font-bold">
            <div>
              <span className="opacity-75 block text-[11px] uppercase">
                {isMultiple ? 'Total de Listas e Itens' : 'Quantidade de Itens'}
              </span>
              <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                {isMultiple ? `${listsToImport.length} listas • ` : ''}
                {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'}
              </span>
            </div>

            {totalEstimated > 0 && (
              <div className="text-right">
                <span className="opacity-75 block text-[11px] uppercase">Total Previsto</span>
                <span className="text-base font-extrabold">
                  R$ {totalEstimated.toFixed(2).replace('.', ',')}
                </span>
              </div>
            )}
          </div>

          {/* Prévia das Listas e Itens */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider opacity-75 block">
              {isMultiple ? 'Listas inclusas no pacote:' : 'Itens inclusos nesta lista:'}
            </span>

            <div className="max-h-60 overflow-y-auto rounded-xl border border-current/15 divide-y divide-current/10 bg-white/50 dark:bg-black/20">
              {isMultiple ? (
                listsToImport.map((list, lIdx) => (
                  <div key={list.id || lIdx} className="p-3 space-y-1">
                    <div className="flex items-center justify-between font-extrabold text-xs sm:text-sm">
                      <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                        <span>{list.icon || '🛒'}</span>
                        <span>{list.name}</span>
                      </span>
                      <span className="text-xs opacity-75">
                        {list.items.length} {list.items.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>

                    {/* Exibe alguns itens como amostra */}
                    <div className="text-[11px] opacity-75 truncate">
                      {list.items.slice(0, 4).map(it => it.name).join(', ')}
                      {list.items.length > 4 ? ` e mais ${list.items.length - 4}...` : ''}
                    </div>
                  </div>
                ))
              ) : sharedList && sharedList.items.length > 0 ? (
                sharedList.items.map((item, idx) => {
                  const cat = CATEGORIES[item.category] || CATEGORIES.outros;
                  const qtyFormatted = Number.isInteger(item.quantity)
                    ? item.quantity
                    : item.quantity.toString().replace('.', ',');

                  return (
                    <div
                      key={item.id || idx}
                      className="px-3.5 py-2 flex items-center justify-between text-xs sm:text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          {qtyFormatted} {item.unit}
                        </span>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-[10px] opacity-60 hidden sm:inline">
                          ({cat.name})
                        </span>
                      </div>

                      {item.estimatedPrice && item.estimatedPrice > 0 ? (
                        <span className="font-bold opacity-80">
                          R$ {(item.estimatedPrice * item.quantity).toFixed(2).replace('.', ',')}
                        </span>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs opacity-60">
                  Nenhum item gravado.
                </div>
              )}
            </div>
          </div>

          <p className="text-xs opacity-75">
            {isMultiple
              ? 'Como você deseja adicionar estas listas ao seu MercadoList?'
              : 'Como você deseja adicionar esta lista ao seu MercadoList?'}
          </p>
        </div>

        {/* Ações de Importação */}
        <div className="p-4 sm:p-5 border-t border-current/15 bg-black/5 dark:bg-white/5 space-y-2">
          {isMultiple ? (
            <>
              {/* Importar Todas as Listas */}
              <button
                type="button"
                onClick={() => {
                  if (onImportAllLists) {
                    onImportAllLists(listsToImport);
                  }
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-base shadow-md shadow-emerald-600/20 transition-transform active:scale-98 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Importar Todas as {listsToImport.length} Listas</span>
                </span>
                <ArrowRight className="w-4 h-4 opacity-80" />
              </button>

              {/* Mesclar Tudo na Lista Atual */}
              <button
                type="button"
                onClick={() => {
                  if (onMergeAllWithActive) {
                    onMergeAllWithActive(listsToImport);
                  }
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl border border-current/25 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 font-bold text-xs sm:text-sm transition-all active:scale-98 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Mesclar tudo na lista atual (&quot;{activeListName}&quot;)</span>
                </span>
                <span className="text-xs opacity-70">+{totalItemsCount} itens</span>
              </button>
            </>
          ) : sharedList ? (
            <>
              {/* Opção 1: Nova Lista */}
              <button
                type="button"
                onClick={() => onImportAsNew(sharedList)}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-base shadow-md shadow-emerald-600/20 transition-transform active:scale-98 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5" />
                  <span>Importar como Nova Lista</span>
                </span>
                <ArrowRight className="w-4 h-4 opacity-80" />
              </button>

              {/* Opção 2: Mesclar com Lista Ativa */}
              <button
                type="button"
                onClick={() => onMergeWithActive(sharedList)}
                className="w-full flex items-center justify-between p-3 rounded-2xl border border-current/25 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 font-bold text-xs sm:text-sm transition-all active:scale-98 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Adicionar à lista atual (&quot;{activeListName}&quot;)</span>
                </span>
                <span className="text-xs opacity-70">+{sharedList.items.length} itens</span>
              </button>
            </>
          ) : null}

          {/* Descartar */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-center text-xs font-semibold opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          >
            Não importar agora
          </button>
        </div>
      </div>
    </div>
  );
};
