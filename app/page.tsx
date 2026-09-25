'use client';

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ShoppingList, ShoppingItem, AccessibilitySettings, CategoryId, UnitType } from '@/types/shopping';
import { AccessibilityBar } from '@/components/AccessibilityBar';
import { AddItemBar } from '@/components/AddItemBar';
import { ItemRow } from '@/components/ItemRow';
import { ShoppingListSummary } from '@/components/ShoppingListSummary';
import { ListSelector } from '@/components/ListSelector';
import { VoiceModal } from '@/components/VoiceModal';
import { MercadoLivreBanner } from '@/components/MercadoLivreBanner';
import { PwaRegister } from '@/components/PwaRegister';
import { CONTRAST_THEMES, THEME_LIST } from '@/lib/contrastThemes';
import { CATEGORIES, detectCategory } from '@/lib/categories';
import { agruparItensPorTabela } from '@/lib/productTable';
import { ParsedVoiceItem, speakListItems, stopSpeaking } from '@/lib/speech';
import { playCheckSound, playUncheckSound, playCompleteSound, playAddSound, playShareSound } from '@/lib/sound';
import { decodeListFromUrl, decodeSharedDataFromUrl } from '@/lib/sharing';
import { ShareModal } from '@/components/ShareModal';
import { ImportListModal } from '@/components/ImportListModal';
import { Mic, Search, CheckCircle, ShoppingCart, Layers, Share2 } from 'lucide-react';

const INITIAL_LISTS: ShoppingList[] = [
  {
    id: 'list-supermercado',
    name: 'Supermercado Semanal',
    icon: '🛒',
    color: '#059669',
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now(),
    items: [
      {
        id: 'item-1',
        name: 'Arroz agulhinha tipo 1',
        quantity: 1,
        unit: 'pct',
        category: 'mercearia',
        estimatedPrice: 28.50,
        isBought: false,
        createdAt: Date.now() - 50000,
      },
      {
        id: 'item-2',
        name: 'Feijão carioca',
        quantity: 1,
        unit: 'kg',
        category: 'mercearia',
        estimatedPrice: 8.90,
        isBought: false,
        createdAt: Date.now() - 40000,
      },
      {
        id: 'item-3',
        name: 'Leite integral',
        quantity: 3,
        unit: 'cx',
        category: 'laticinios',
        estimatedPrice: 5.20,
        isBought: true,
        createdAt: Date.now() - 30000,
      },
      {
        id: 'item-4',
        name: 'Ovos brancos grandes',
        quantity: 1,
        unit: 'dz',
        category: 'laticinios',
        estimatedPrice: 16.00,
        isBought: false,
        createdAt: Date.now() - 20000,
      },
      {
        id: 'item-5',
        name: 'Banana prata',
        quantity: 1,
        unit: 'dz',
        category: 'hortifruti',
        estimatedPrice: 9.50,
        isBought: false,
        createdAt: Date.now() - 15000,
      },
      {
        id: 'item-6',
        name: 'Tomate para salada',
        quantity: 1.5,
        unit: 'kg',
        category: 'hortifruti',
        estimatedPrice: 7.00,
        isBought: false,
        createdAt: Date.now() - 10000,
      },
      {
        id: 'item-7',
        name: 'Detergente de coco',
        quantity: 2,
        unit: 'un',
        category: 'limpeza',
        estimatedPrice: 2.80,
        isBought: true,
        createdAt: Date.now() - 5000,
      },
    ],
  },
  {
    id: 'list-feira',
    name: 'Feira & Frutas',
    icon: '🍎',
    color: '#d97706',
    createdAt: Date.now() - 3600000 * 12,
    updatedAt: Date.now(),
    items: [
      {
        id: 'item-f1',
        name: 'Maçã gala',
        quantity: 1,
        unit: 'kg',
        category: 'hortifruti',
        estimatedPrice: 11.90,
        isBought: false,
        createdAt: Date.now() - 3000,
      },
      {
        id: 'item-f2',
        name: 'Batata inglesa',
        quantity: 2,
        unit: 'kg',
        category: 'hortifruti',
        estimatedPrice: 6.50,
        isBought: false,
        createdAt: Date.now() - 2000,
      },
      {
        id: 'item-f3',
        name: 'Alface americana',
        quantity: 1,
        unit: 'un',
        category: 'hortifruti',
        estimatedPrice: 4.50,
        isBought: false,
        createdAt: Date.now() - 1000,
      },
    ],
  },
  {
    id: 'list-limpeza',
    name: 'Limpeza & Casa',
    icon: '🧹',
    color: '#0d9488',
    createdAt: Date.now() - 3600000 * 4,
    updatedAt: Date.now(),
    items: [
      {
        id: 'item-l1',
        name: 'Sabão em pó',
        quantity: 1,
        unit: 'cx',
        category: 'limpeza',
        estimatedPrice: 18.90,
        isBought: false,
        createdAt: Date.now() - 2500,
      },
      {
        id: 'item-l2',
        name: 'Água sanitária',
        quantity: 1,
        unit: 'garrafa',
        category: 'limpeza',
        estimatedPrice: 6.90,
        isBought: false,
        createdAt: Date.now() - 1500,
      },
    ],
  },
];

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize: 'normal',
  highContrast: false,
  contrastTheme: 'padrao',
  soundFeedback: true,
  groupByCategory: false,
  speechSpeed: 1.0,
};

export default function ShoppingListPage() {
  const [hasMounted, setHasMounted] = useState(false);
  const [lists, setLists] = useState<ShoppingList[]>(INITIAL_LISTS);
  const [activeListId, setActiveListId] = useState<string>('list-supermercado');
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);

  const [filter, setFilter] = useState<'all' | 'pending' | 'bought'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Estados de Compartilhamento e Importação
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTargetListId, setShareTargetListId] = useState<string>('list-supermercado');
  const [shareInitialTab, setShareInitialTab] = useState<'list' | 'app'>('list');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [incomingSharedList, setIncomingSharedList] = useState<ShoppingList | null>(null);
  const [incomingSharedLists, setIncomingSharedLists] = useState<ShoppingList[] | null>(null);

  // Alternância de posições entre bans-01 e bani-01 a cada 30 segundos
  const [topBannerId, setTopBannerId] = useState<'bans-01' | 'bani-01'>('bans-01');
  const bottomBannerId: 'bans-01' | 'bani-01' = topBannerId === 'bans-01' ? 'bani-01' : 'bans-01';

  useEffect(() => {
    const bannerSwapInterval = setInterval(() => {
      setTopBannerId((prev) => (prev === 'bans-01' ? 'bani-01' : 'bans-01'));
    }, 30000);

    return () => clearInterval(bannerSwapInterval);
  }, []);

  const isInitialMount = useRef(true);

  // Load from localStorage on mount and check for shared_data in URL
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        let currentLists = INITIAL_LISTS;
        let isUntouched = true;
        const savedLists = localStorage.getItem('lista_compras_domestica_lists');
        if (savedLists) {
          try {
            const parsed = JSON.parse(savedLists);
            if (Array.isArray(parsed) && parsed.length > 0) {
              currentLists = parsed;
              isUntouched = false;
            }
          } catch {
            // Ignore
          }
        }

        const savedActiveId = localStorage.getItem('lista_compras_domestica_active_id');
        const savedSettings = localStorage.getItem('lista_compras_domestica_settings');
        if (savedSettings) {
          try {
            setSettings(JSON.parse(savedSettings));
          } catch {
            // Ignore
          }
        }

        // Restaura os dados locais
        if (!isUntouched) {
          setLists(currentLists);
        }
        if (savedActiveId) {
          setActiveListId(savedActiveId);
        }

        // Verifica se há lista(s) compartilhada(s) recebida(s) na URL (?importList=...)
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const importData = urlParams.get('importList');
          if (importData) {
            const decoded = decodeSharedDataFromUrl(importData);
            if (decoded) {
              if (decoded.type === 'single' && decoded.list) {
                setIncomingSharedList(decoded.list);
                setIncomingSharedLists(null);
                setIsImportModalOpen(true);
              } else if (decoded.type === 'all' && decoded.lists && decoded.lists.length > 0) {
                setIncomingSharedLists(decoded.lists);
                setIncomingSharedList(null);
                setIsImportModalOpen(true);
              }
            }
            // Remove o parâmetro da barra de endereço de forma limpa
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, '', cleanUrl);
          }
        }
      } catch (err) {
        console.error('Erro na inicialização do app:', err);
      }

      isInitialMount.current = false;
      setHasMounted(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Save to localStorage when state updates after mount
  useEffect(() => {
    if (!hasMounted || isInitialMount.current) return;
    try {
      localStorage.setItem('lista_compras_domestica_lists', JSON.stringify(lists));
      localStorage.setItem('lista_compras_domestica_settings', JSON.stringify(settings));
      localStorage.setItem('lista_compras_domestica_active_id', activeListId);
    } catch {
      // Ignore
    }
  }, [lists, settings, activeListId, hasMounted]);

  const activeList = lists.find(l => l.id === activeListId) || lists[0];

  const handleUpdateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleSelectList = (id: string) => {
    setActiveListId(id);
    stopSpeaking();
    setIsSpeaking(false);
  };

  const handleCreateList = (name: string) => {
    const newList: ShoppingList = {
      id: `list-${Date.now()}`,
      name,
      icon: '🛒',
      color: '#059669',
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setLists(prev => [newList, ...prev]);
    setActiveListId(newList.id);
  };

  const handleDeleteList = (id: string) => {
    if (lists.length <= 1) return;
    const remaining = lists.filter(l => l.id !== id);
    setLists(remaining);
    if (activeListId === id) {
      setActiveListId(remaining[0].id);
    }
  };

  const handleAddItem = (itemData: Omit<ShoppingItem, 'id' | 'createdAt' | 'isBought'>) => {
    // Classifica automaticamente de acordo com as categorias de supermercado se for 'outros' ou não especificado
    const detected = detectCategory(itemData.name);
    const finalCategory = (!itemData.category || itemData.category === 'outros') ? detected : itemData.category;

    const newItem: ShoppingItem = {
      ...itemData,
      category: finalCategory,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      isBought: false,
    };

    setLists(prev =>
      prev.map(l => {
        if (l.id === activeListId) {
          return {
            ...l,
            items: [newItem, ...l.items],
            updatedAt: Date.now(),
          };
        }
        return l;
      })
    );
  };

  const handleAddMultipleVoiceItems = (parsedItems: ParsedVoiceItem[]) => {
    const newItems: ShoppingItem[] = parsedItems.map((p, idx) => {
      const detected = detectCategory(p.name);
      const finalCategory = (!p.category || p.category === 'outros') ? detected : p.category;
      return {
        id: `item-${Date.now()}-${idx}`,
        name: p.name,
        quantity: p.quantity,
        unit: p.unit as UnitType,
        category: finalCategory as CategoryId,
        estimatedPrice: p.estimatedPrice !== undefined && p.estimatedPrice > 0 ? p.estimatedPrice : undefined,
        isBought: false,
        createdAt: Date.now() + idx,
      };
    });

    setLists(prev =>
      prev.map(l => {
        if (l.id === activeListId) {
          return {
            ...l,
            items: [...newItems, ...l.items],
            updatedAt: Date.now(),
          };
        }
        return l;
      })
    );
  };

  const handleToggleBought = (itemId: string) => {
    let nowCompleted = false;

    setLists(prev =>
      prev.map(l => {
        if (l.id === activeListId) {
          const updatedItems = l.items.map(item => {
            if (item.id === itemId) {
              const newBought = !item.isBought;
              if (settings.soundFeedback) {
                if (newBought) {
                  playCheckSound();
                } else {
                  playUncheckSound();
                }
              }
              return { ...item, isBought: newBought };
            }
            return item;
          });

          // Check if all items are now bought!
          const allBought = updatedItems.length > 0 && updatedItems.every(i => i.isBought);
          if (allBought) {
            nowCompleted = true;
          }

          return { ...l, items: updatedItems, updatedAt: Date.now() };
        }
        return l;
      })
    );

    if (nowCompleted) {
      if (settings.soundFeedback) playCompleteSound();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Confetti fallback
      }
    }
  };

  const handleDeleteItem = (itemId: string) => {
    setLists(prev =>
      prev.map(l => {
        if (l.id === activeListId) {
          return {
            ...l,
            items: l.items.filter(i => i.id !== itemId),
            updatedAt: Date.now(),
          };
        }
        return l;
      })
    );
  };

  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    setLists(prev =>
      prev.map(l => {
        if (l.id === activeListId) {
          return {
            ...l,
            items: l.items.map(item =>
              item.id === itemId ? { ...item, quantity: Math.max(0.1, newQty) } : item
            ),
            updatedAt: Date.now(),
          };
        }
        return l;
      })
    );
  };

  const handleUpdateCategory = (itemId: string, newCategory: CategoryId) => {
    setLists(prev =>
      prev.map(l => {
        if (l.id === activeListId) {
          return {
            ...l,
            items: l.items.map(item =>
              item.id === itemId ? { ...item, category: newCategory } : item
            ),
            updatedAt: Date.now(),
          };
        }
        return l;
      })
    );
  };

  const handleUpdatePrice = (itemId: string, newPrice: number) => {
    setLists(prev =>
      prev.map(l => {
        if (l.id === activeListId) {
          return {
            ...l,
            items: l.items.map(item =>
              item.id === itemId ? { ...item, estimatedPrice: Math.max(0, newPrice) } : item
            ),
            updatedAt: Date.now(),
          };
        }
        return l;
      })
    );
  };

  const handleUpdateUnit = (itemId: string, newUnit: UnitType) => {
    setLists(prev =>
      prev.map(l => {
        if (l.id === activeListId) {
          return {
            ...l,
            items: l.items.map(item =>
              item.id === itemId ? { ...item, unit: newUnit } : item
            ),
            updatedAt: Date.now(),
          };
        }
        return l;
      })
    );
  };

  const handleClearBought = () => {
    if (!confirm('Deseja remover todos os itens que já foram colocados no carrinho?')) return;
    setLists(prev =>
      prev.map(l => {
        if (l.id === activeListId) {
          return {
            ...l,
            items: l.items.filter(i => !i.isBought),
            updatedAt: Date.now(),
          };
        }
        return l;
      })
    );
  };

  const handleReadList = () => {
    if (!activeList) return;
    setIsSpeaking(true);
    speakListItems(activeList.items, settings.speechSpeed);

    // Watch when speech ends
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const checkInterval = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          setIsSpeaking(false);
          clearInterval(checkInterval);
        }
      }, 500);
    }
  };

  const handleStopSpeaking = () => {
    stopSpeaking();
    setIsSpeaking(false);
  };

  const handleOpenShareModal = (listId?: string, initialTab: 'list' | 'app' = 'list') => {
    setShareTargetListId(listId || activeListId);
    setShareInitialTab(initialTab);
    setIsShareModalOpen(true);
  };

  const handleImportAsNew = (sharedList: ShoppingList) => {
    const newId = `list-${Date.now()}`;
    // Se já existe uma lista com o mesmo nome exato, adiciona sufixo
    const nameExists = lists.some(l => l.name.toLowerCase() === sharedList.name.toLowerCase());
    const finalName = nameExists ? `${sharedList.name} (Compartilhada)` : sharedList.name;

    const importedList: ShoppingList = {
      ...sharedList,
      id: newId,
      name: finalName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: sharedList.items.map((item, idx) => ({
        ...item,
        id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      })),
    };

    setLists(prev => [importedList, ...prev]);
    setActiveListId(newId);
    setIsImportModalOpen(false);
    setIncomingSharedList(null);

    if (settings.soundFeedback) playCompleteSound();
    try {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  const handleMergeWithActive = (sharedList: ShoppingList) => {
    if (!activeList) return;

    const newItems: ShoppingItem[] = sharedList.items.map((item, idx) => ({
      ...item,
      id: `item-merge-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now() + idx,
    }));

    setLists(prev =>
      prev.map(l => {
        if (l.id === activeListId) {
          return {
            ...l,
            items: [...newItems, ...l.items],
            updatedAt: Date.now(),
          };
        }
        return l;
      })
    );

    setIsImportModalOpen(false);
    setIncomingSharedList(null);

    if (settings.soundFeedback) playAddSound();
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  const handleImportAllLists = (newLists: ShoppingList[]) => {
    if (!newLists || newLists.length === 0) return;

    const imported: ShoppingList[] = newLists.map((l, lIdx) => {
      const nameExists = lists.some(existing => existing.name.toLowerCase() === l.name.toLowerCase());
      const finalName = nameExists ? `${l.name} (Compartilhada)` : l.name;
      const newId = `list-${Date.now()}-${lIdx}`;

      return {
        ...l,
        id: newId,
        name: finalName,
        createdAt: Date.now() + lIdx,
        updatedAt: Date.now() + lIdx,
        items: l.items.map((item, itIdx) => ({
          ...item,
          id: `item-${Date.now()}-${lIdx}-${itIdx}-${Math.random().toString(36).substring(2, 6)}`,
        })),
      };
    });

    setLists(prev => [...imported, ...prev]);
    setActiveListId(imported[0].id);
    setIsImportModalOpen(false);
    setIncomingSharedLists(null);
    setIncomingSharedList(null);

    if (settings.soundFeedback) playCompleteSound();
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  const handleMergeAllWithActive = (listsToMerge: ShoppingList[]) => {
    if (!activeList || !listsToMerge || listsToMerge.length === 0) return;

    const allNewItems: ShoppingItem[] = [];
    listsToMerge.forEach((l, lIdx) => {
      l.items.forEach((it, itIdx) => {
        allNewItems.push({
          ...it,
          id: `item-merge-${Date.now()}-${lIdx}-${itIdx}-${Math.random().toString(36).substring(2, 6)}`,
          createdAt: Date.now() + lIdx * 100 + itIdx,
        });
      });
    });

    setLists(prev =>
      prev.map(l => {
        if (l.id === activeListId) {
          return {
            ...l,
            items: [...allNewItems, ...l.items],
            updatedAt: Date.now(),
          };
        }
        return l;
      })
    );

    setIsImportModalOpen(false);
    setIncomingSharedLists(null);
    setIncomingSharedList(null);

    if (settings.soundFeedback) playAddSound();
    try {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  // Filter items
  const filteredItems = (activeList?.items || []).filter(item => {
    if (filter === 'pending' && item.isBought) return false;
    if (filter === 'bought' && !item.isBought) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const catName = CATEGORIES[item.category]?.name.toLowerCase() || '';
      const matchCat = catName.includes(q);
      if (!matchName && !matchCat) return false;
    }
    return true;
  });

  const pendingItems = (activeList?.items || []).filter(i => !i.isBought);
  const boughtItems = (activeList?.items || []).filter(i => i.isBought);

  // Agrupamento dos produtos utilizando a Tabela de Produtos e Classificação de Categorias
  const groupedItems = React.useMemo(() => {
    if (!settings.groupByCategory) return null;
    return agruparItensPorTabela(filteredItems);
  }, [filteredItems, settings.groupByCategory]);

  const containerPaddingClass = {
    normal: 'p-4 sm:p-6',
    large: 'p-5 sm:p-7',
    extra: 'p-6 sm:p-8',
  }[settings.fontSize];

  const currentThemeId = settings.contrastTheme || (settings.highContrast ? 'amarelo-preto' : 'padrao');
  const activeTheme = CONTRAST_THEMES[currentThemeId] || CONTRAST_THEMES.padrao;

  // Carregamento inicial rápido para sincronizar estado e evitar hydration mismatch
  if (!hasMounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 animate-pulse mb-3">
          <ShoppingCart className="w-8 h-8" />
        </div>
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Carregando Lista de Compras...</p>
      </div>
    );
  }

  return (
    <div
      id="app-root"
      suppressHydrationWarning
      className={`min-h-screen transition-colors ${activeTheme.bgPage}`}
    >
      {/* Banner Mercado Livre Superior (alterna com o inferior a cada 30 segundos: bans-01 <-> bani-01) */}
      <div id="top-banner-wrapper" className="w-full">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 py-1.5 transition-all duration-500">
          <MercadoLivreBanner
            key={`top-${topBannerId}`}
            position="top"
            internalName={topBannerId}
            highContrast={settings.highContrast}
          />
        </div>
      </div>

      {/* Banners Mercado Livre Ocultos (bans-02..05 idênticos ao bans-01; bani-02..05 idênticos ao bani-01) */}
      <div id="hidden-banners-container" className="hidden" aria-hidden="true" style={{ display: 'none' }}>
        <MercadoLivreBanner
          internalName="bans-02"
          position="top"
          hidden={true}
          highContrast={settings.highContrast}
        />
        <MercadoLivreBanner
          internalName="bans-03"
          position="top"
          hidden={true}
          highContrast={settings.highContrast}
        />
        <MercadoLivreBanner
          internalName="bans-04"
          position="top"
          hidden={true}
          highContrast={settings.highContrast}
        />
        <MercadoLivreBanner
          internalName="bans-05"
          position="top"
          hidden={true}
          highContrast={settings.highContrast}
        />
        <MercadoLivreBanner
          internalName="bani-02"
          position="bottom"
          hidden={true}
          highContrast={settings.highContrast}
        />
        <MercadoLivreBanner
          internalName="bani-03"
          position="bottom"
          hidden={true}
          highContrast={settings.highContrast}
        />
        <MercadoLivreBanner
          internalName="bani-04"
          position="bottom"
          hidden={true}
          highContrast={settings.highContrast}
        />
        <MercadoLivreBanner
          internalName="bani-05"
          position="bottom"
          hidden={true}
          highContrast={settings.highContrast}
        />
      </div>

      {/* Barra de Acessibilidade */}
      <AccessibilityBar
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onReadList={handleReadList}
        isSpeaking={isSpeaking}
        onStopSpeaking={handleStopSpeaking}
        remainingCount={pendingItems.length}
      />

      {/* Header Principal do App com Título sempre em Destaque, Cores e Ações */}
      <header className="max-w-4xl mx-auto px-3 sm:px-4 pt-3 pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <div
              id="app-default-icon"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shadow-md shrink-0"
              aria-hidden="true"
            >
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1
              id="app-main-title"
              className={`text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-none ${activeTheme.titleColor}`}
            >
              Lista de Compras
            </h1>
          </div>

          {/* Botões das cores logo abaixo do nome "Lista de Compras" (sem escrever o nome das cores) */}
          <div
            id="header-color-buttons"
            className="flex items-center gap-1.5 flex-wrap pt-0.5"
            aria-label="Paleta de cores"
          >
            {THEME_LIST.map((theme, index) => {
              const isSelected = currentThemeId === theme.id;
              const isFirst = index === 0;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() =>
                    handleUpdateSettings({
                      contrastTheme: theme.id,
                      highContrast: theme.id !== 'padrao',
                    })
                  }
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all active:scale-90 cursor-pointer flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'ring-2 ring-emerald-500 ring-offset-2 scale-110 shadow-sm'
                      : 'hover:scale-110 opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: theme.dotColor,
                    border: isFirst
                      ? '2px solid #334155'
                      : `1.5px solid ${theme.borderDot || '#94a3b8'}`,
                    boxShadow: isFirst ? '0 0 0 1px rgba(0,0,0,0.2)' : undefined,
                  }}
                  title={theme.name}
                  aria-label={theme.name}
                >
                  {isSelected && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          theme.dotColor === '#FFFFFF' ||
                          theme.dotColor === '#F8FAFC' ||
                          theme.dotColor === '#FEF08A' ||
                          theme.dotColor === '#94A3B8' ||
                          theme.dotColor === '#CBD5E1'
                            ? '#000000'
                            : '#FFFFFF',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
          {/* Botão de Compartilhar App e Listas */}
          <button
            id="header-share-button"
            type="button"
            onClick={() => handleOpenShareModal(activeListId, 'list')}
            className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-bold transition-all active:scale-95 text-xs sm:text-sm border border-current/25 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer ${activeTheme.textPrimary}`}
            title="Compartilhar lista de compras ou o aplicativo"
          >
            <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Compartilhar</span>
          </button>

          {/* Quick Voice Command CTA Banner */}
          <button
            id="header-voice-cta-button"
            type="button"
            onClick={() => setIsVoiceModalOpen(true)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 text-xs sm:text-sm ${activeTheme.bgButtonPrimary} ${activeTheme.textButtonPrimary} cursor-pointer`}
            title="Ditar itens para a lista usando a voz"
          >
            <Mic className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            <span>Adicionar por Voz</span>
          </button>
        </div>
      </header>

      {/* ÁREA FIXA NA TELA: Suas Listas de Compras */}
      <div
        id="fixed-screen-area"
        className={`sticky top-0 z-30 w-full transition-colors border-none backdrop-blur-md ${activeTheme.bgStickyHeader}`}
      >
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5">
          {/* List Navigation Tabs */}
          <ListSelector
            lists={lists}
            activeListId={activeListId}
            onSelectList={handleSelectList}
            onCreateList={handleCreateList}
            onDeleteList={handleDeleteList}
            onShareList={(id) => handleOpenShareModal(id, 'list')}
            fontSize={settings.fontSize}
            highContrast={settings.highContrast}
            contrastTheme={currentThemeId}
            soundEnabled={settings.soundFeedback}
          />
        </div>
      </div>

      {/* Main Container */}
      <main className={`max-w-4xl mx-auto ${containerPaddingClass} pt-4 pb-12 space-y-5 sm:space-y-6`}>
        {/* Add Item Form / Quick Staples */}
        <AddItemBar
          onAddItem={handleAddItem}
          onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
          fontSize={settings.fontSize}
          highContrast={settings.highContrast}
          contrastTheme={currentThemeId}
          soundEnabled={settings.soundFeedback}
        />

        {/* Shopping Progress & Summary Card */}
        {activeList && (
          <ShoppingListSummary
            items={activeList.items}
            filter={filter}
            onFilterChange={setFilter}
            onClearBought={handleClearBought}
            onReadList={handleReadList}
            onShareList={() => handleOpenShareModal(activeListId, 'list')}
            listName={activeList.name}
            fontSize={settings.fontSize}
            highContrast={settings.highContrast}
            contrastTheme={currentThemeId}
          />
        )}

        {/* Search Bar & Group by Categories Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-items-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar item ou categoria nesta lista..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${activeTheme.bgInput} ${activeTheme.borderInput} text-current text-sm sm:text-base font-semibold focus:ring-2 focus:ring-emerald-500`}
            />
          </div>

          {/* Botão para agrupar por categorias */}
          <button
            id="group-by-category-button"
            type="button"
            onClick={() => handleUpdateSettings({ groupByCategory: !settings.groupByCategory })}
            className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all shrink-0 active:scale-95 ${
              settings.groupByCategory
                ? `${activeTheme.bgButtonPrimary} ${activeTheme.textButtonPrimary} border-transparent ring-2 ring-current`
                : `${activeTheme.bgCard} ${activeTheme.borderCard} ${activeTheme.textPrimary}`
            }`}
            title="Agrupar os produtos da lista por categorias de supermercado"
          >
            <Layers className="w-4 h-4" />
            <span>{settings.groupByCategory ? 'Agrupado por Categorias' : 'Agrupar por Categorias'}</span>
          </button>
        </div>

        {/* Items Listing Section */}
        <section
          id="items-list-container"
          aria-label="Itens da lista de compras"
          className="space-y-2.5"
        >
          {filteredItems.length === 0 ? (
            <div className="p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-200">
                {activeList?.items.length === 0
                  ? 'Sua lista está vazia!'
                  : 'Nenhum item encontrado no filtro atual.'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {activeList?.items.length === 0
                  ? 'Adicione itens escrevendo no campo acima ou toque em "Adicionar por Voz" para ditar sua lista.'
                  : 'Mude os filtros para "Todos" ou limpe o termo de busca.'}
              </p>
            </div>
          ) : settings.groupByCategory && groupedItems ? (
            <div className="space-y-4">
              {groupedItems.map(group => {
                const boughtInGroup = group.items.filter(i => i.isBought).length;

                return (
                  <div
                    key={group.categoryId}
                    id={`category-group-${group.categoryId}`}
                    className="space-y-2"
                  >
                    {/* Category Header Banner */}
                    <div
                      className={`flex items-center justify-between px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold ${
                        settings.highContrast || (settings.contrastTheme && settings.contrastTheme !== 'padrao')
                          ? `${activeTheme.bgCard} ${activeTheme.borderCard} ${activeTheme.titleColor}`
                          : `${group.category.bgColor} ${group.category.color} ${group.category.borderColor}`
                      }`}
                    >
                      <span className="uppercase tracking-wider font-extrabold">
                        {group.category.name}
                      </span>
                      <span className="text-xs font-semibold opacity-90">
                        {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                        {boughtInGroup > 0 && ` (${boughtInGroup} no carrinho)`}
                      </span>
                    </div>

                    {/* Category Products */}
                    <div className="space-y-2">
                      {group.items.map(item => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          onToggleBought={handleToggleBought}
                          onDelete={handleDeleteItem}
                          onUpdateQuantity={handleUpdateQuantity}
                          onUpdateCategory={handleUpdateCategory}
                          onUpdatePrice={handleUpdatePrice}
                          onUpdateUnit={handleUpdateUnit}
                          fontSize={settings.fontSize}
                          highContrast={settings.highContrast}
                          contrastTheme={currentThemeId}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map(item => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onToggleBought={handleToggleBought}
                  onDelete={handleDeleteItem}
                  onUpdateQuantity={handleUpdateQuantity}
                  onUpdateCategory={handleUpdateCategory}
                  onUpdatePrice={handleUpdatePrice}
                  onUpdateUnit={handleUpdateUnit}
                  fontSize={settings.fontSize}
                  highContrast={settings.highContrast}
                  contrastTheme={currentThemeId}
                />
              ))}
            </div>
          )}
        </section>

        {/* Banner Mercado Livre no rodapé (alterna com o superior a cada 30 segundos: bani-01 <-> bans-01) */}
        <div id="footer-banner-wrapper" className="pt-2">
          <div className="transition-all duration-500">
            <MercadoLivreBanner
              key={`bottom-${bottomBannerId}`}
              position="bottom"
              internalName={bottomBannerId}
              highContrast={settings.highContrast}
            />
          </div>
        </div>
      </main>

      {/* Voice Recognition Modal */}
      <VoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onAddItems={handleAddMultipleVoiceItems}
        fontSize={settings.fontSize}
        highContrast={settings.highContrast}
        soundEnabled={settings.soundFeedback}
      />

      {/* Modal de Compartilhamento do App e Listas */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        lists={lists}
        activeListId={shareTargetListId}
        fontSize={settings.fontSize}
        highContrast={settings.highContrast}
        contrastTheme={currentThemeId}
        soundEnabled={settings.soundFeedback}
        initialTab={shareInitialTab}
      />

      {/* Modal de Importação de Lista Compartilhada via Link ou QR Code */}
      <ImportListModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setIncomingSharedList(null);
          setIncomingSharedLists(null);
        }}
        sharedList={incomingSharedList}
        sharedLists={incomingSharedLists}
        activeListName={activeList?.name || 'Lista Atual'}
        onImportAsNew={handleImportAsNew}
        onMergeWithActive={handleMergeWithActive}
        onImportAllLists={handleImportAllLists}
        onMergeAllWithActive={handleMergeAllWithActive}
        fontSize={settings.fontSize}
        highContrast={settings.highContrast}
        contrastTheme={currentThemeId}
      />

      {/* Service Worker Cleanup (Desregistra qualquer versão anterior de PWA) */}
      <PwaRegister />
    </div>
  );
}
