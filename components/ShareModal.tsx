'use client';

import React, { useState, useEffect, useId } from 'react';
import { ShoppingList, FontSizeOption, ContrastThemeId } from '@/types/shopping';
import { CONTRAST_THEMES } from '@/lib/contrastThemes';
import {
  generateShareableListText,
  generateAppShareText,
  encodeListToUrl,
  getAppBaseUrl,
  shareViaWhatsApp,
  shareViaTelegram,
  shareViaNative,
  copyToClipboard,
  generateQRCodeDataUrl,
  printFormattedList,
} from '@/lib/sharing';
import { playShareSound } from '@/lib/sound';
import {
  X,
  Share2,
  Copy,
  Check,
  Smartphone,
  Printer,
  QrCode,
  Send,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Layers,
  Eye,
  Download,
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  lists: ShoppingList[];
  activeListId: string;
  fontSize: FontSizeOption;
  highContrast: boolean;
  contrastTheme?: ContrastThemeId;
  soundEnabled: boolean;
  initialTab?: 'list' | 'app';
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  lists,
  activeListId,
  fontSize,
  highContrast,
  contrastTheme,
  soundEnabled,
  initialTab = 'list',
}) => {
  const currentThemeId = contrastTheme || (highContrast ? 'amarelo-preto' : 'padrao');
  const activeTheme = CONTRAST_THEMES[currentThemeId] || CONTRAST_THEMES.padrao;

  const [activeTab, setActiveTab] = useState<'list' | 'app'>(initialTab);
  const [selectedListId, setSelectedListId] = useState<string>(activeListId);
  const [prevActiveListId, setPrevActiveListId] = useState(activeListId);
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);

  if (activeListId !== prevActiveListId) {
    setPrevActiveListId(activeListId);
    setSelectedListId(activeListId);
  }
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab);
  }

  // Opções de compartilhamento da lista
  const [onlyPending, setOnlyPending] = useState(false);
  const [includePrices, setIncludePrices] = useState(true);
  const [includeLink, setIncludeLink] = useState(true);

  // Estados de cópia e QR code
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedAppUrl, setCopiedAppUrl] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [appQrCodeDataUrl, setAppQrCodeDataUrl] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const currentList = lists.find(l => l.id === selectedListId) || lists[0];

  // Gera o texto atualizado da lista
  const listShareText = currentList
    ? generateShareableListText(currentList, {
        onlyPending,
        includePrices,
        includeLink,
      })
    : '';

  // Gera o link atualizado da lista
  const listShareUrl = currentList ? encodeListToUrl(currentList) : getAppBaseUrl();

  // Gera texto de compartilhamento do app
  const appShareText = generateAppShareText();
  const appUrl = getAppBaseUrl();

  // Gera QR Code para a lista quando muda
  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === 'list' && currentList) {
      generateQRCodeDataUrl(listShareUrl)
        .then(url => setQrCodeDataUrl(url))
        .catch(() => setQrCodeDataUrl(''));
    } else if (activeTab === 'app') {
      generateQRCodeDataUrl(appUrl)
        .then(url => setAppQrCodeDataUrl(url))
        .catch(() => setAppQrCodeDataUrl(''));
    }
  }, [isOpen, activeTab, listShareUrl, appUrl, currentList]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    const success = await copyToClipboard(listShareUrl);
    if (success) {
      setCopiedLink(true);
      if (soundEnabled) playShareSound();
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyText = async () => {
    const success = await copyToClipboard(listShareText);
    if (success) {
      setCopiedText(true);
      if (soundEnabled) playShareSound();
      setTimeout(() => setCopiedText(false), 2500);
    }
  };

  const handleCopyAppUrl = async () => {
    const success = await copyToClipboard(appUrl);
    if (success) {
      setCopiedAppUrl(true);
      if (soundEnabled) playShareSound();
      setTimeout(() => setCopiedAppUrl(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    if (activeTab === 'list') {
      shareViaWhatsApp(listShareText);
    } else {
      shareViaWhatsApp(appShareText);
    }
    if (soundEnabled) playShareSound();
  };

  const handleTelegramShare = () => {
    if (activeTab === 'list') {
      shareViaTelegram(listShareText);
    } else {
      shareViaTelegram(appShareText, appUrl);
    }
    if (soundEnabled) playShareSound();
  };

  const handleNativeShare = async () => {
    if (soundEnabled) playShareSound();
    if (activeTab === 'list' && currentList) {
      await shareViaNative({
        title: `Lista: ${currentList.name}`,
        text: listShareText,
        url: includeLink ? listShareUrl : undefined,
      });
    } else {
      await shareViaNative({
        title: 'MercadoList - Lista de Compras Inteligente',
        text: appShareText,
        url: appUrl,
      });
    }
  };

  const handlePrint = () => {
    if (currentList) {
      printFormattedList(currentList, { onlyPending });
    }
  };

  const handleDownloadQr = (dataUrl: string, filename: string) => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const titleFontSize = {
    normal: 'text-lg sm:text-xl font-extrabold',
    large: 'text-xl sm:text-2xl font-black',
    extra: 'text-2xl sm:text-3xl font-black',
  }[fontSize];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all ${activeTheme.bgCard} ${activeTheme.borderCard} ${activeTheme.textPrimary}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-current/15">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shadow-md shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="share-modal-title" className={titleFontSize}>
                Compartilhar
              </h2>
              <p className="text-xs opacity-75 font-semibold">
                Envie suas listas para familiares ou recomende o aplicativo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fechar janela de compartilhamento"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-current/15 px-5 pt-3 gap-2 bg-black/5 dark:bg-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 pb-3 px-3 border-b-2 font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Compartilhar Lista</span>
            {currentList && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {currentList.items.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('app')}
            className={`flex items-center gap-2 pb-3 px-3 border-b-2 font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'app'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Compartilhar o App</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
          {activeTab === 'list' && currentList && (
            <>
              {/* Seleção de Lista se houver mais de uma */}
              {lists.length > 1 && (
                <div className="space-y-1.5">
                  <label htmlFor="share-list-select" className="text-xs font-bold uppercase tracking-wider opacity-75">
                    Escolha a lista para compartilhar:
                  </label>
                  <div className="relative">
                    <select
                      id="share-list-select"
                      value={selectedListId}
                      onChange={(e) => setSelectedListId(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500 ${activeTheme.bgInput} ${activeTheme.borderInput} text-current`}
                    >
                      {lists.map(l => (
                        <option key={l.id} value={l.id} className="text-slate-900 bg-white">
                          {l.icon || '🛒'} {l.name} ({l.items.length} itens)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                  </div>
                </div>
              )}

              {/* Destaque da Lista Selecionada */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{currentList.icon || '🛒'}</span>
                  <div>
                    <h3 className="font-extrabold text-base text-emerald-950 dark:text-emerald-100">
                      {currentList.name}
                    </h3>
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      {currentList.items.length} {currentList.items.length === 1 ? 'item' : 'itens'} no total
                      {' • '}
                      {currentList.items.filter(i => !i.isBought).length} pendentes
                    </p>
                  </div>
                </div>
              </div>

              {/* Opções de Personalização do Envio */}
              <div className="p-3 rounded-2xl border border-current/15 bg-black/5 dark:bg-white/5 space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider opacity-75 block">
                  Opções da mensagem:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm font-medium">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={onlyPending}
                      onChange={(e) => setOnlyPending(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Apenas itens a comprar ({currentList.items.filter(i => !i.isBought).length})</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includePrices}
                      onChange={(e) => setIncludePrices(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Incluir preços estimados</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={includeLink}
                      onChange={(e) => setIncludeLink(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Incluir link interativo para importar no app</span>
                  </label>
                </div>
              </div>

              {/* Botões Principais de Compartilhamento */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider opacity-75 block">
                  Enviar via:
                </span>

                {/* WhatsApp (Destaque Principal) */}
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-600/30 transition-all active:scale-98 cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5 fill-current" />
                  <span>Enviar no WhatsApp</span>
                </button>

                {/* Grid de Ações Secundárias */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {/* Compartilhar Nativo */}
                  {hasNativeShare && (
                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-current/20 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Outros Apps</span>
                    </button>
                  )}

                  {/* Copiar Link Interativo */}
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border border-current/20 text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer ${
                      copiedLink ? 'bg-emerald-600 text-white border-transparent' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'
                    }`}
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-blue-500" />}
                    <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
                  </button>

                  {/* Copiar Texto Formatado */}
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border border-current/20 text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer ${
                      copiedText ? 'bg-emerald-600 text-white border-transparent' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'
                    }`}
                  >
                    {copiedText ? <Check className="w-4 h-4 text-white" /> : <Send className="w-4 h-4 text-indigo-500" />}
                    <span>{copiedText ? 'Texto Copiado!' : 'Copiar Texto'}</span>
                  </button>

                  {/* Telegram */}
                  <button
                    type="button"
                    onClick={handleTelegramShare}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-current/20 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-sky-500" />
                    <span>Telegram</span>
                  </button>

                  {/* Imprimir / Salvar PDF */}
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-current/20 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    <span>Imprimir / PDF</span>
                  </button>
                </div>
              </div>

              {/* Seção QR Code da Lista */}
              <div className="p-4 rounded-2xl border border-current/15 bg-black/5 dark:bg-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <h4 className="font-extrabold text-sm">QR Code da Lista</h4>
                      <p className="text-xs opacity-75">
                        Escaneie com a câmera do celular para abrir ou importar
                      </p>
                    </div>
                  </div>

                  {qrCodeDataUrl && (
                    <button
                      type="button"
                      onClick={() => handleDownloadQr(qrCodeDataUrl, `lista-${currentList.name.toLowerCase().replace(/\s+/g, '-')}-qrcode.png`)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-current/20 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      title="Baixar imagem do QR Code"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar</span>
                    </button>
                  )}
                </div>

                {qrCodeDataUrl ? (
                  <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-inner border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCodeDataUrl}
                      alt={`QR Code para a lista ${currentList.name}`}
                      className="w-44 h-44 sm:w-52 sm:h-52 object-contain"
                    />
                    <span className="text-[11px] font-bold text-slate-600 mt-2 text-center">
                      Aponte a câmera para abrir &quot;{currentList.name}&quot;
                    </span>
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center text-xs opacity-60">
                    Gerando QR Code...
                  </div>
                )}
              </div>

              {/* Prévia expansível da mensagem formatada */}
              <div className="border border-current/15 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="w-full flex items-center justify-between p-3.5 text-xs font-extrabold uppercase tracking-wider opacity-85 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-500" />
                    <span>Ver Prévia do Texto ({currentList.items.length} itens)</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showPreview ? 'rotate-180' : ''}`} />
                </button>

                {showPreview && (
                  <div className="p-3 bg-black/10 dark:bg-white/10 border-t border-current/15">
                    <pre className="text-xs font-mono whitespace-pre-wrap select-all leading-relaxed max-h-48 overflow-y-auto">
                      {listShareText}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'app' && (
            <div className="space-y-4">
              {/* Apresentação do App */}
              <div className="p-4 rounded-2xl bg-linear-to-r from-emerald-600 to-teal-700 text-white shadow-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <h3 className="font-black text-base sm:text-lg">
                    MercadoList - Inteligente &amp; Rápido
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-emerald-100 font-medium">
                  Ajude seus amigos e familiares a economizar tempo e dinheiro no supermercado com listas por voz, categorias automáticas e cálculo de gastos!
                </p>
              </div>

              {/* Botões de Ação para o App */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-600/30 transition-all active:scale-98 cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5 fill-current" />
                  <span>Recomendar no WhatsApp</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyAppUrl}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border border-current/20 text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer ${
                      copiedAppUrl ? 'bg-emerald-600 text-white border-transparent' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'
                    }`}
                  >
                    {copiedAppUrl ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-blue-500" />}
                    <span>{copiedAppUrl ? 'Link Copiado!' : 'Copiar Link do App'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTelegramShare}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-current/20 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-sky-500" />
                    <span>Telegram</span>
                  </button>
                </div>

                {hasNativeShare && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-current/20 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Outras Opções de Envio do Celular</span>
                  </button>
                )}
              </div>

              {/* QR Code do Aplicativo */}
              <div className="p-4 rounded-2xl border border-current/15 bg-black/5 dark:bg-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <h4 className="font-extrabold text-sm">QR Code do Aplicativo</h4>
                      <p className="text-xs opacity-75">
                        Mostre na tela para outra pessoa escanear e abrir o app
                      </p>
                    </div>
                  </div>

                  {appQrCodeDataUrl && (
                    <button
                      type="button"
                      onClick={() => handleDownloadQr(appQrCodeDataUrl, 'mercadolist-qrcode.png')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-current/20 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      title="Baixar imagem do QR Code do App"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar</span>
                    </button>
                  )}
                </div>

                {appQrCodeDataUrl && (
                  <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-inner border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={appQrCodeDataUrl}
                      alt="QR Code do Aplicativo MercadoList"
                      className="w-44 h-44 sm:w-52 sm:h-52 object-contain"
                    />
                    <span className="text-[11px] font-bold text-slate-600 mt-2 text-center">
                      Aponte a câmera para abrir o MercadoList
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-current/15 flex items-center justify-end bg-black/5 dark:bg-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-current/25 font-bold text-xs sm:text-sm hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
