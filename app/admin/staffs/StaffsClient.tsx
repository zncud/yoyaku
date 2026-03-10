"use client";

import { useState, useCallback } from "react";
import type { Staff } from "@/lib/types";

/* ── 型定義 ── */
interface StaffFormData {
  name: string;
  description: string;
}

const EMPTY_FORM: StaffFormData = {
  name: "",
  description: "",
};

const INPUT_CLASS =
  "w-full rounded-lg border border-greige-light bg-ivory px-4 py-2.5 text-sm " +
  "text-charcoal placeholder:text-greige " +
  "transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30";

/* ── コンポーネント ── */
export default function StaffsClient({
  storeId,
  storeName,
  initialStaffs,
}: {
  storeId: string;
  storeName: string;
  initialStaffs: Staff[];
}) {
  const [staffs, setStaffs] = useState<Staff[]>(initialStaffs);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<StaffFormData>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  /* ── データ再取得 ── */
  const refreshStaffs = useCallback(async () => {
    const res = await fetch(`/api/admin/staffs?store_id=${storeId}`);
    if (res.ok) {
      const data = await res.json();
      setStaffs(data.staffs);
    }
  }, [storeId]);

  /* ── メッセージ表示（3秒後に消える） ── */
  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  /* ── モーダル操作 ── */
  const openCreateModal = () => {
    setEditingStaff(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (staff: Staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      description: staff.description ?? "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
    setFormData(EMPTY_FORM);
  };

  /* ── 保存（追加 or 更新） ── */
  const handleSave = async () => {
    if (!formData.name.trim()) {
      showMessage("error", "スタッフ名を入力してください");
      return;
    }

    setIsSaving(true);

    try {
      const isEdit = !!editingStaff;
      const url = "/api/admin/staffs";
      const method = isEdit ? "PUT" : "POST";
      const body = isEdit
        ? { id: editingStaff.id, store_id: storeId, ...formData }
        : { store_id: storeId, ...formData };

      const res = await fetch(url, {
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
      await refreshStaffs();
      showMessage("success", isEdit ? "スタッフを更新しました" : "スタッフを追加しました");
    } catch {
      showMessage("error", "通信エラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  /* ── 削除 ── */
  const handleDelete = async (id: string) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/staffs", {
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
      await refreshStaffs();
      showMessage("success", "スタッフを削除しました");
    } catch {
      showMessage("error", "通信エラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  /* ── アバター頭文字 ── */
  const getInitial = (name: string) => name.charAt(0);

  const activeStaffs = staffs.filter((s) => s.is_active);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* ── Header ── */}
      <header className="mb-8 border-b border-greige-light pb-6">
        <p className="text-xs font-semibold tracking-widest text-gold uppercase">
          {storeName}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-wider text-charcoal">
            スタッフ管理
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

      {/* ── スタッフ一覧 ── */}
      {activeStaffs.length === 0 ? (
        <div className="rounded-2xl border border-greige-light bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ivory-dark">
            <svg className="h-8 w-8 text-greige" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <p className="text-sm text-greige">スタッフが登録されていません</p>
          <button
            onClick={openCreateModal}
            className="mt-4 text-sm font-bold text-gold hover:text-gold-light transition-colors"
          >
            最初のスタッフを追加する
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {activeStaffs.map((staff) => (
            <StaffCard
              key={staff.id}
              staff={staff}
              getInitial={getInitial}
              onEdit={() => openEditModal(staff)}
              onDelete={() => setDeleteConfirmId(staff.id)}
              isDeleteConfirm={deleteConfirmId === staff.id}
              onDeleteConfirm={() => handleDelete(staff.id)}
              onDeleteCancel={() => setDeleteConfirmId(null)}
              isSaving={isSaving}
            />
          ))}

        </div>
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
                {editingStaff ? "スタッフを編集" : "スタッフを追加"}
              </h2>

              <div className="mt-6 space-y-4">
                {/* 名前 */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wider text-greige uppercase">
                    名前 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例：山田 太郎"
                    className={INPUT_CLASS}
                    autoFocus
                  />
                </div>

                {/* 説明 */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wider text-greige uppercase">
                    紹介文
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="得意な施術やプロフィールなど"
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

/* ── スタッフカード ── */
function StaffCard({
  staff,
  getInitial,
  onEdit,
  onDelete,
  isDeleteConfirm,
  onDeleteConfirm,
  onDeleteCancel,
  isSaving,
}: {
  staff: Staff;
  getInitial: (name: string) => string;
  onEdit: () => void;
  onDelete: () => void;
  isDeleteConfirm: boolean;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="rounded-xl border border-greige-light bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold/15 text-base font-black text-gold-dark">
          {getInitial(staff.name)}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-charcoal">{staff.name}</p>
          {staff.description && (
            <p className="mt-1 text-xs leading-relaxed text-slate">{staff.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onEdit}
            className="rounded-lg border border-greige-light p-2 text-slate transition-colors hover:border-greige hover:bg-ivory-dark"
            title="編集"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
          <button
            onClick={onDelete}
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
      {isDeleteConfirm && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            「{staff.name}」を削除しますか？
          </p>
          <p className="mt-1 text-xs text-red-600">
            削除したスタッフは元に戻せません。関連する予約データは保持されます。
          </p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={onDeleteCancel}
              disabled={isSaving}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              onClick={onDeleteConfirm}
              disabled={isSaving}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-red-700 active:scale-[0.97] disabled:opacity-50"
            >
              {isSaving ? "処理中..." : "削除する"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
