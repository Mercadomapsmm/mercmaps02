import LZString from 'lz-string';
import QRCode from 'qrcode';
import { ShoppingList, ShoppingItem, CategoryId, UnitType } from '@/types/shopping';
import { CATEGORIES } from '@/lib/categories';

export interface ShareListOptions {
  onlyPending?: boolean;
  includePrices?: boolean;
  includeLink?: boolean;
  appUrl?: string;
}

export interface CompactListItem {
  n: string; // name
  q: number; // quantity
  u?: string; // unit
  c?: string; // category
  p?: number; // estimatedPrice
  b?: number; // isBought (0 or 1)
}

export interface CompactListPayload {
  v: number; // version 1
  id?: string;
  name: string;
  icon?: string;
  color?: string;
  items: CompactListItem[];
}

/**
 * Retorna a URL base atual da aplicação no navegador ou fallback
 */
export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}${window.location.pathname}`;
  }
  return 'https://mercadolist.app';
}

/**
 * Compacta e codifica a lista em uma URL encurtada com LZ-String
 */
export function encodeListToUrl(list: ShoppingList, baseUrl?: string): string {
  const base = baseUrl || getAppBaseUrl();

  const compactPayload: CompactListPayload = {
    v: 1,
    name: list.name,
    icon: list.icon || '🛒',
    color: list.color || '#059669',
    items: list.items.map(item => ({
      n: item.name,
      q: item.quantity,
      u: item.unit,
      c: item.category,
      p: item.estimatedPrice,
      b: item.isBought ? 1 : 0,
    })),
  };

  const jsonStr = JSON.stringify(compactPayload);
  const compressed = LZString.compressToEncodedURIComponent(jsonStr);

  const cleanBase = base.split('?')[0].split('#')[0];
  return `${cleanBase}?importList=${compressed}`;
}

/**
 * Descompacta e valida uma lista a partir da string codificada na URL
 */
export function decodeListFromUrl(encodedString: string): ShoppingList | null {
  if (!encodedString || typeof encodedString !== 'string') return null;

  try {
    // 1. Tentar descompactar com LZString
    let jsonStr: string | null = LZString.decompressFromEncodedURIComponent(encodedString);

    // 2. Fallback caso venha como base64 simples ou URI component
    if (!jsonStr) {
      try {
        const decoded = decodeURIComponent(encodedString);
        jsonStr = LZString.decompressFromEncodedURIComponent(decoded);
      } catch {
        // ignore
      }
    }

    if (!jsonStr) {
      try {
        // Tenta base64 pura
        if (typeof window !== 'undefined' && window.atob) {
          jsonStr = decodeURIComponent(escape(window.atob(encodedString)));
        }
      } catch {
        // ignore
      }
    }

    if (!jsonStr) {
      // Tenta JSON direto
      jsonStr = decodeURIComponent(encodedString);
    }

    const payload = JSON.parse(jsonStr);
    if (!payload || typeof payload !== 'object' || !payload.name) {
      return null;
    }

    const rawItems: any[] = Array.isArray(payload.items) ? payload.items : [];

    const items: ShoppingItem[] = rawItems.map((raw, index) => {
      // Suporta formato compacto ou formato completo
      const name: string = String(raw.n || raw.name || 'Item sem nome').trim();
      const quantity: number = typeof raw.q === 'number' ? raw.q : typeof raw.quantity === 'number' ? raw.quantity : 1;
      const unit: UnitType = (raw.u || raw.unit || 'un') as UnitType;
      const category: CategoryId = (raw.c || raw.category || 'outros') as CategoryId;
      const estimatedPrice: number | undefined =
        typeof raw.p === 'number' ? raw.p : typeof raw.estimatedPrice === 'number' ? raw.estimatedPrice : undefined;
      const isBought: boolean = Boolean(raw.b === 1 || raw.isBought === true);

      return {
        id: `item-import-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 5)}`,
        name,
        quantity: Math.max(0.1, quantity),
        unit,
        category,
        estimatedPrice: estimatedPrice && estimatedPrice > 0 ? estimatedPrice : undefined,
        isBought,
        createdAt: Date.now() + index,
      };
    });

    const newList: ShoppingList = {
      id: `list-import-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: String(payload.name).trim() || 'Lista Compartilhada',
      icon: payload.icon || '🛒',
      color: payload.color || '#059669',
      items,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return newList;
  } catch (err) {
    console.warn('Erro ao decodificar lista compartilhada da URL:', err);
    return null;
  }
}

/**
 * Gera texto formatado e elegante da lista de compras para envio no WhatsApp, Telegram ou Clipboard
 */
export function generateShareableListText(list: ShoppingList, options?: ShareListOptions): string {
  const {
    onlyPending = false,
    includePrices = true,
    includeLink = true,
    appUrl,
  } = options || {};

  const itemsToShare = onlyPending ? list.items.filter(i => !i.isBought) : list.items;
  const pendingItems = itemsToShare.filter(i => !i.isBought);
  const boughtItems = itemsToShare.filter(i => i.isBought);

  const lines: string[] = [];

  // Cabeçalho
  lines.push(`🛒 *${list.name}*`);
  lines.push(`📋 Total de ${itemsToShare.length} ${itemsToShare.length === 1 ? 'item' : 'itens'}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);

  if (itemsToShare.length === 0) {
    lines.push(`(Nenhum item nesta lista no momento)`);
  } else {
    // Agrupa por categoria
    const categoriesMap: Record<string, ShoppingItem[]> = {};

    // Adiciona os itens pendentes agrupados por categoria
    for (const item of pendingItems) {
      const catKey = item.category || 'outros';
      if (!categoriesMap[catKey]) {
        categoriesMap[catKey] = [];
      }
      categoriesMap[catKey].push(item);
    }

    const catKeys = Object.keys(categoriesMap);
    for (const catKey of catKeys) {
      const catInfo = CATEGORIES[catKey as CategoryId] || CATEGORIES.outros;
      const catItems = categoriesMap[catKey];
      lines.push(``);
      lines.push(`📂 *${catInfo.name.toUpperCase()}*`);

      for (const item of catItems) {
        const qtyFormatted = Number.isInteger(item.quantity) ? `${item.quantity}` : `${item.quantity.toString().replace('.', ',')}`;
        let line = `◻️ ${qtyFormatted} ${item.unit} - ${item.name}`;

        if (includePrices && item.estimatedPrice && item.estimatedPrice > 0) {
          const itemTotal = item.estimatedPrice * item.quantity;
          line += ` (R$ ${itemTotal.toFixed(2).replace('.', ',')})`;
        }
        lines.push(line);
      }
    }

    // Itens já comprados (se houver e não for onlyPending)
    if (!onlyPending && boughtItems.length > 0) {
      lines.push(``);
      lines.push(`✅ *JÁ NO CARRINHO (${boughtItems.length}):*`);
      for (const item of boughtItems) {
        const qtyFormatted = Number.isInteger(item.quantity) ? `${item.quantity}` : `${item.quantity.toString().replace('.', ',')}`;
        let line = `✓ ~${qtyFormatted} ${item.unit} - ${item.name}~`;
        if (includePrices && item.estimatedPrice && item.estimatedPrice > 0) {
          line += ` (R$ ${(item.estimatedPrice * item.quantity).toFixed(2).replace('.', ',')})`;
        }
        lines.push(line);
      }
    }

    // Total financeiro
    if (includePrices) {
      const totalEstimated = itemsToShare.reduce((acc, item) => {
        return acc + (item.estimatedPrice ? item.estimatedPrice * item.quantity : 0);
      }, 0);

      if (totalEstimated > 0) {
        lines.push(``);
        lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
        lines.push(`💰 *Total Estimado:* R$ ${totalEstimated.toFixed(2).replace('.', ',')}`);
      }
    }
  }

  // Link para importar / abrir
  if (includeLink) {
    const importUrl = encodeListToUrl(list, appUrl);
    lines.push(``);
    lines.push(`📲 *Abra ou importe esta lista no MercadoList:*`);
    lines.push(importUrl);
  } else {
    lines.push(``);
    lines.push(`Criado com 🛒 MercadoList`);
  }

  return lines.join('\n');
}

/**
 * Gera texto de compartilhamento e recomendação do Aplicativo MercadoList
 */
export function generateAppShareText(appUrl?: string): string {
  const url = appUrl || getAppBaseUrl();
  return (
    `🛒 *MercadoList - Sua Lista de Compras Inteligente*\n\n` +
    `Estou usando o MercadoList para fazer compras no supermercado de forma super rápida e organizada!\n\n` +
    `✨ *Destaques:*\n` +
    `• 🎙️ Adicione itens falando em voz alta\n` +
    `• 📂 Separação automática por categorias (Hortifrúti, Mercearia, Limpeza...)\n` +
    `• 💰 Controle do total previsto e itens no carrinho\n` +
    `• 📲 Compartilhamento fácil com a família e sincronização por link ou QR Code\n` +
    `• ♿ Alto contraste e leitura falada da lista\n\n` +
    `Acesse grátis no seu celular ou computador:\n${url}`
  );
}

/**
 * Compartilhamento nativo do sistema (Web Share API)
 */
export async function shareViaNative(data: {
  title: string;
  text: string;
  url?: string;
}): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const shareData: ShareData = {
        title: data.title,
        text: data.text,
      };
      if (data.url) {
        shareData.url = data.url;
      }
      await navigator.share(shareData);
      return true;
    } catch (err: any) {
      // Usuário cancelou ou navegador bloqueou
      if (err.name !== 'AbortError') {
        console.warn('Erro ao compartilhar nativamente:', err);
      }
      return false;
    }
  }
  return false;
}

/**
 * Dispara envio direto pelo WhatsApp
 */
export function shareViaWhatsApp(text: string): void {
  if (typeof window === 'undefined') return;
  const encodedText = encodeURIComponent(text);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Dispara envio direto pelo Telegram
 */
export function shareViaTelegram(text: string, url?: string): void {
  if (typeof window === 'undefined') return;
  const encodedText = encodeURIComponent(text);
  const targetUrl = url ? `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodedText}` : `https://t.me/share/url?url=&text=${encodedText}`;
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Dispara envio por E-mail
 */
export function shareViaEmail(subject: string, body: string): void {
  if (typeof window === 'undefined') return;
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
}

/**
 * Copia texto para a área de transferência com fallback robusto
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Tenta fallback
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

/**
 * Gera Data URL do QR Code
 */
export async function generateQRCodeDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Erro ao gerar QR code:', err);
    throw err;
  }
}

/**
 * Abre janela de impressão formatada especificamente para papel / geladeira
 */
export function printFormattedList(list: ShoppingList, options?: { onlyPending?: boolean }): void {
  if (typeof window === 'undefined') return;

  const onlyPending = options?.onlyPending ?? false;
  const items = onlyPending ? list.items.filter(i => !i.isBought) : list.items;

  // Agrupa por categoria
  const groups: Record<string, ShoppingItem[]> = {};
  for (const item of items) {
    const cat = item.category || 'outros';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }

  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    alert('Por favor, permita popups para imprimir sua lista de compras.');
    return;
  }

  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalEstimated = items.reduce((acc, item) => {
    return acc + (item.estimatedPrice ? item.estimatedPrice * item.quantity : 0);
  }, 0);

  let htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>Lista: ${list.name} - MercadoList</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          margin: 24px;
          color: #0f172a;
          line-height: 1.4;
        }
        .header {
          border-bottom: 2px solid #059669;
          padding-bottom: 12px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        h1 {
          margin: 0;
          font-size: 24px;
          color: #059669;
        }
        .date {
          font-size: 13px;
          color: #64748b;
        }
        .category-block {
          margin-bottom: 18px;
          page-break-inside: avoid;
        }
        .category-title {
          font-size: 14px;
          font-weight: 800;
          text-transform: uppercase;
          background: #f1f5f9;
          padding: 6px 10px;
          border-radius: 6px;
          margin-bottom: 8px;
        }
        .item-row {
          display: flex;
          align-items: center;
          padding: 6px 8px;
          border-bottom: 1px dotted #cbd5e1;
          font-size: 15px;
        }
        .checkbox {
          width: 18px;
          height: 18px;
          border: 1.5px solid #0f172a;
          border-radius: 3px;
          margin-right: 12px;
          flex-shrink: 0;
        }
        .item-info {
          flex: 1;
        }
        .item-qty {
          font-weight: 700;
          margin-right: 6px;
        }
        .item-price {
          font-weight: 600;
          color: #475569;
          font-size: 13px;
        }
        .footer {
          margin-top: 24px;
          padding-top: 14px;
          border-top: 1.5px solid #059669;
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: bold;
        }
        @media print {
          body { margin: 10mm; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>🛒 ${list.name}</h1>
          <div class="date">Gerado em ${dateStr} • MercadoList</div>
        </div>
        <div style="text-align: right;">
          <strong>${items.length} ${items.length === 1 ? 'item' : 'itens'}</strong>
        </div>
      </div>
  `;

  for (const catKey of Object.keys(groups)) {
    const cat = CATEGORIES[catKey as CategoryId] || CATEGORIES.outros;
    const catItems = groups[catKey];
    htmlContent += `
      <div class="category-block">
        <div class="category-title">${cat.name} (${catItems.length})</div>
    `;

    for (const item of catItems) {
      const isCrossed = item.isBought && !onlyPending;
      const qty = Number.isInteger(item.quantity) ? item.quantity : item.quantity.toString().replace('.', ',');
      const priceText = item.estimatedPrice ? `R$ ${(item.estimatedPrice * item.quantity).toFixed(2).replace('.', ',')}` : '';

      htmlContent += `
        <div class="item-row" style="${isCrossed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
          <div class="checkbox">${item.isBought ? '✓' : ''}</div>
          <div class="item-info">
            <span class="item-qty">${qty} ${item.unit}</span>
            <span>${item.name}</span>
          </div>
          ${priceText ? `<div class="item-price">${priceText}</div>` : ''}
        </div>
      `;
    }

    htmlContent += `</div>`;
  }

  htmlContent += `
      <div class="footer">
        <div>Total de Itens: ${items.length}</div>
        ${totalEstimated > 0 ? `<div>Total Previsto: R$ ${totalEstimated.toFixed(2).replace('.', ',')}</div>` : ''}
      </div>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
