"use client";

import { useState, useCallback } from "react";
import type { Menu } from "@/lib/types";

/* ── 型定義 ── */
interface MenuFormData {
  name: string;
  description: string;
  duration_minutes: number;
}

const EMPTY_FORM: MenuFormData = {
  name: "",
  description: "",
  duration_minutes: 30,
};

const INPUT_CLASS =
  "w-full rounded-lg border border-greige-light bg-ivory px-4 py-2.5 text-sm " +
  "text-charcoal placeholder:text-greige " +
  "transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30";

/* ── コンポーネント ── */
export default function MenusClient({
  storeId,
  storeName,
  initialMenus,
}: {
  storeId: string;
  storeName: string;
  initialMenus: Menu[];
}) {
  const [menus, setMenus] = useState<Menu[]>(initialMenus);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [formData, setFormData] = useState<MenuFormData>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activeMenus = menus.filter((m) => m.is_active);
  const inactiveMenus = menus.filter((m) => !m.is_active);

  /* ── データ再取得 ── */
  const refreshMenus = useCallback(async () => {
    const res = await fetch(`/api/admin/menus?store_id=${storeId}`);
    if (res.ok) {
      const data = await res.json();
      setMenus(data.menus);
    }
  }, [storeId]);

  /* ── メッセージ表示 ── */
  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  /* ── モーダル操作 ── */
  const openCreateModal = () => {
    setEditingMenu(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (menu: Menu) => {
    setEditingMenu(menu);
    setFormData({
      name: menu.name,
      description: menu.description ?? "",
      duration_minutes: menu.duration_minutes,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMenu(null);
    setFormData(EMPTY_FORM);
  };

  /* ── 保存（追加 or 更新） ── */
  const handleSave = async () => {
    if (!formData.name.trim()) {
      showMessage("error", "メニュー名を入力してください");
      return;
    }
    if (formData.duration_minutes <= 0) {
      showMessage("error", "施術時間は1分以上で入力してください");
      return;
    }

    setIsSaving(true);

    try {
      const isEdit = !!editingMenu;
      const method = isEdit ? "PUT" : "POST";
      const body = isEdit
        ? { id: editingMenu.id, store_id: storeId, ...formData }
        : { store_id: storeId, ...formData };

      const res = await fetch("/api/admin/menus", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage("error", data.error || "保存に失敗しました");
        return;
      }

      closeModal();
      await refreshMenus();
      showMessage("success", isEdit ? "メニューを更新しました" : "メニューを追加しました");
    } catch {
      showMessage("error", "通信エラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  /* ── 並び替え ── */
  const handleMove = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= activeMenus.length) return;

    // UI を即座に更新（楽観的更新）
    const newActiveMenus = [...activeMenus];
    [newActiveMenus[index], newActiveMenus[swapIndex]] = [newActiveMenus[swapIndex], newActiveMenus[index]];
    setMenus([...newActiveMenus, ...inactiveMenus]);

    setIsReordering(true);

    try {
      const order = newActiveMenus.map((m) => m.id);
      const res = await fetch("/api/admin/menus", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId, order }),
      });

      if (!res.ok) {
        // 失敗時はロールバック
        await refreshMenus();
        showMessage("error", "並び替えに失敗しました");
      }
    } catch {
      await refreshMenus();
      showMessage("error", "通信エラーが発生しました");
    } finally {
      setIsReordering(false);
    }
  };

  /* ── 削除 ── */
  const handleDelete = async (id: string) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/menus", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, store_id: storeId }),
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage("error", data.error || "削除に失敗しました");
        return;
      }

      setDeleteConfirmId(null);
      await refreshMenus();
      showMessage("success", "メニューを削除しました");
    } catch {
      showMessage("error", "通信エラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  /* ── 有効/無効トグル ── */
  const handleToggleActive = async (menu: Menu) => {
    try {
      const res = await fetch("/api/admin/menus", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: menu.id,
          store_id: storeId,
          is_active: !menu.is_active,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        showMessage("error", data.error || "更新に失敗しました");
        return;
      }

      await refreshMenus();
      showMessage("success", menu.is_active ? "メニューを非公開にしました" : "メニューを公開しました");
    } catch {
      showMessage("error", "通信エラーが発生しました");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* ── Header ── */}
      <header className="mb-8 border-b border-greige-light pb-6">
        <p className="text-xs font-semibold tracking-widest text-gold uppercase">
          {storeName}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-wider text-charcoal">
            メニュー管理
          </h1>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-white shadow-md shadow-gold/20 transition-all hover:bg-gold-light active:scale-[0.97]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            追加
          </button>
        </div>
      </header>

      {/* ── メッセージ ── */}
      {message && (
        <div
          className={`mb-6 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
            message.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ── メニュー一覧 ── */}
      {activeMenus.length === 0 && inactiveMenus.length === 0 ? (
        <div className="rounded-2xl border border-greige-light bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ivory-dark">
            <svg className="h-8 w-8 text-greige" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <p className="text-sm text-greige">メニューが登録されていません</p>
          <button
            onClick={openCreateModal}
            className="mt-4 text-sm font-bold text-gold hover:text-gold-light transition-colors"
          >
            最初のメニューを追加する
          </button>
        </div>
      ) : (
        <>
          {/* 並び替えのヒント */}
          {activeMenus.length > 1 && (
            <p className="mb-3 text-xs text-greige">
              <span className="inline-block mr-1">
                <svg className="inline h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                </svg>
              </span>
              矢印ボタンで並び順を変更できます
            </p>
          )}

          <div className="space-y-2">
            {activeMenus.map((menu, index) => (
              <div
                key={menu.id}
                className="group rounded-xl border border-greige-light bg-white p-4 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {/* 順序番号 */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ivory-dark text-xs font-black text-greige">
                    {index + 1}
                  </div>

                  {/* メニュー情報 */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-charcoal">{menu.name}</p>
                      <span className="rounded-full bg-gold/10 px-2.5 py-0.5 text-[11px] font-bold text-gold-dark">
                        {menu.duration_minutes}分
                      </span>
                    </div>
                    {menu.description && (
                      <p className="mt-0.5 text-xs text-slate truncate">{menu.description}</p>
                    )}
                  </div>

                  {/* 並び替えボタン */}
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      onClick={() => handleMove(index, "up")}
                      disabled={index === 0 || isReordering}
                      className="rounded p-1 text-greige transition-colors hover:bg-ivory-dark hover:text-charcoal disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-greige"
                      title="上へ移動"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMove(index, "down")}
                      disabled={index === activeMenus.length - 1 || isReordering}
                      className="rounded p-1 text-greige transition-colors hover:bg-ivory-dark hover:text-charcoal disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-greige"
                      title="下へ移動"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                  </div>

                  {/* 操作ボタン */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(menu)}
                      className="rounded-lg border border-greige-light p-2 text-slate transition-colors hover:border-greige hover:bg-ivory-dark"
                      title="編集"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggleActive(menu)}
                      className="rounded-lg border border-greige-light p-2 text-slate transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-500"
                      title="非公開にする"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(menu.id)}
                      className="rounded-lg border border-greige-light p-2 text-slate transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                      title="削除"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 削除確認 */}
                {deleteConfirmId === menu.id && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-800">
                      「{menu.name}」を削除しますか？
                    </p>
                    <p className="mt-1 text-xs text-red-600">
                      削除したメニューは元に戻せません。
                    </p>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        disabled={isSaving}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => handleDelete(menu.id)}
                        disabled={isSaving}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-red-700 active:scale-[0.97] disabled:opacity-50"
                      >
                        {isSaving ? "処理中..." : "削除する"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── 非公開メニュー ── */}
          {inactiveMenus.length > 0 && (
            <>
              <h2 className="mt-8 mb-3 text-xs font-bold tracking-wider text-greige uppercase">
                非公開メニュー
              </h2>
              <div className="space-y-2">
                {inactiveMenus.map((menu) => (
                  <div
                    key={menu.id}
                    className="rounded-xl border border-greige-light/60 bg-white/60 p-4 opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-400">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-charcoal-light">{menu.name}</p>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-400 border border-gray-200">
                            非公開
                          </span>
                          <span className="text-[11px] text-greige">{menu.duration_minutes}分</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(menu)}
                          className="rounded-lg border border-greige-light px-3 py-1.5 text-xs font-medium text-slate transition-colors hover:bg-ivory-dark"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleToggleActive(menu)}
                          className="rounded-lg border border-greige-light px-3 py-1.5 text-xs font-medium text-gold-dark transition-colors hover:bg-gold/10"
                        >
                          公開する
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(menu.id)}
                          className="rounded-lg border border-greige-light px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-50"
                        >
                          削除
                        </button>
                      </div>
                    </div>

                    {/* 削除確認 */}
                    {deleteConfirmId === menu.id && (
                      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-4">
                        <p className="text-sm font-medium text-red-800">
                          「{menu.name}」を削除しますか？
                        </p>
                        <p className="mt-1 text-xs text-red-600">
                          削除したメニューは元に戻せません。
                        </p>
                        <div className="mt-3 flex items-center justify-end gap-2">
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            disabled={isSaving}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={() => handleDelete(menu.id)}
                            disabled={isSaving}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-red-700 active:scale-[0.97] disabled:opacity-50"
                          >
                            {isSaving ? "処理中..." : "削除する"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── モーダル ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Gold bar */}
            <div className="h-1 bg-gradient-to-r from-gold via-gold-light to-gold" />

            <div className="p-6">
              <h2 className="text-lg font-black tracking-wider text-charcoal">
                {editingMenu ? "メニューを編集" : "メニューを追加"}
              </h2>

              <div className="mt-6 space-y-4">
                {/* メニュー名 */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wider text-greige uppercase">
                    メニュー名 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例：カット"
                    className={INPUT_CLASS}
                    autoFocus
                  />
                </div>

                {/* 施術時間 */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wider text-greige uppercase">
                    施術時間 <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      step={5}
                      value={formData.duration_minutes}
                      onChange={(e) =>
                        setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })
                      }
                      className={INPUT_CLASS + " max-w-[120px]"}
                    />
                    <span className="text-sm font-medium text-slate">分</span>
                  </div>
                  {/* クイック選択 */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[15, 30, 45, 60, 90, 120].map((min) => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => setFormData({ ...formData, duration_minutes: min })}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                          formData.duration_minutes === min
                            ? "bg-gold/15 text-gold-dark border border-gold/30"
                            : "bg-ivory-dark text-slate hover:bg-greige-light"
                        }`}
                      >
                        {min}分
                      </button>
                    ))}
                  </div>
                </div>

                {/* 説明 */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wider text-greige uppercase">
                    説明
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="メニューの詳細説明"
                    rows={3}
                    className={INPUT_CLASS + " resize-none"}
                  />
                </div>
              </div>

              {/* ボタン */}
              <div className="mt-8 flex items-center justify-end gap-3">
                <button
                  onClick={closeModal}
                  disabled={isSaving}
                  className="rounded-lg border border-greige-light px-5 py-2.5 text-sm font-medium text-slate transition-colors hover:bg-ivory-dark disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-gold/20 transition-all hover:bg-gold-light active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      保存中
                    </span>
                  ) : (
                    "保存"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
