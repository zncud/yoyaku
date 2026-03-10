"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

type Store = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  owner_id: string;
  created_at: string;
};

type OwnerMap = Record<string, { email: string; full_name: string | null }>;

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

export default function StoreListClient({
  initialStores,
  ownerMap: initialOwnerMap,
}: {
  initialStores: Store[];
  ownerMap: OwnerMap;
}) {
  const [stores, setStores] = useState(initialStores);
  const [ownerMap, setOwnerMap] = useState<OwnerMap>(initialOwnerMap);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingOwnerId, setEditingOwnerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [candidates, setCandidates] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [updatingOwner, setUpdatingOwner] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const searchProfiles = useCallback(async (q: string) => {
    if (!q.trim()) {
      setCandidates([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/super-admin/profiles?q=${encodeURIComponent(q.trim())}`,
      );
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.profiles ?? []);
      }
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setCandidates([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      searchProfiles(searchQuery);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, searchProfiles]);

  // 外側クリックで閉じる
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setEditingOwnerId(null);
        setSearchQuery("");
        setCandidates([]);
      }
    }
    if (editingOwnerId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [editingOwnerId]);

  async function handleDelete(store: Store) {
    const confirmed = window.confirm(
      `「${store.name}」を削除しますか？関連する予約・スタッフ等のデータもすべて削除されます。`,
    );
    if (!confirmed) return;

    setDeletingId(store.id);

    const res = await fetch("/api/super-admin/stores", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store_id: store.id }),
    });

    if (res.ok) {
      setStores((prev) => prev.filter((s) => s.id !== store.id));
    } else {
      const data = await res.json();
      alert(data.error || "削除に失敗しました");
    }

    setDeletingId(null);
  }

  async function handleOwnerChange(storeId: string, profile: Profile) {
    setUpdatingOwner(true);

    const res = await fetch("/api/super-admin/stores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store_id: storeId, owner_id: profile.id }),
    });

    if (res.ok) {
      // stores の owner_id を更新
      setStores((prev) =>
        prev.map((s) =>
          s.id === storeId ? { ...s, owner_id: profile.id } : s,
        ),
      );
      // ownerMap を更新
      setOwnerMap((prev) => ({
        ...prev,
        [profile.id]: {
          email: profile.email ?? "",
          full_name: profile.full_name,
        },
      }));
    } else {
      const data = await res.json();
      alert(data.error || "オーナーの変更に失敗しました");
    }

    setUpdatingOwner(false);
    setEditingOwnerId(null);
    setSearchQuery("");
    setCandidates([]);
  }

  return (
    <>
      {stores.length === 0 ? (
        <div className="rounded-2xl border border-greige-light bg-white px-6 py-16 text-center">
          <p className="text-sm text-greige">店舗がまだ登録されていません</p>
          <Link
            href="/super-admin/create"
            className="mt-4 inline-block rounded-lg bg-gold px-6 py-2 text-sm font-bold text-white"
          >
            店舗を作成
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {stores.map((store) => {
            const owner = ownerMap[store.owner_id];
            const isEditingThis = editingOwnerId === store.id;
            return (
              <div
                key={store.id}
                className="rounded-xl border border-greige-light bg-white p-5 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-black text-charcoal">{store.name}</p>
                    <p className="mt-0.5 text-xs text-greige">/{store.slug}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={`/${store.slug}`}
                      target="_blank"
                      className="rounded-lg border border-greige-light px-3 py-1.5 text-xs font-medium text-slate transition-colors hover:bg-ivory-dark"
                    >
                      サイトを表示
                    </a>
                    <button
                      onClick={() => handleDelete(store)}
                      disabled={deletingId === store.id}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === store.id ? "削除中..." : "削除"}
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-ivory-dark pt-3 text-xs text-slate">
                  <span className="relative">
                    <span className="text-greige">オーナー:</span>{" "}
                    {owner?.full_name || owner?.email || "不明"}
                    {!isEditingThis && (
                      <button
                        onClick={() => {
                          setEditingOwnerId(store.id);
                          setSearchQuery("");
                          setCandidates([]);
                        }}
                        className="ml-2 rounded border border-greige-light px-1.5 py-0.5 text-[10px] font-medium text-greige transition-colors hover:bg-ivory-dark hover:text-charcoal"
                      >
                        変更
                      </button>
                    )}
                  </span>
                  {store.phone && (
                    <span>
                      <span className="text-greige">電話:</span> {store.phone}
                    </span>
                  )}
                  <span>
                    <span className="text-greige">ID:</span>{" "}
                    <span className="font-mono text-[10px]">{store.id.slice(0, 8)}...</span>
                  </span>
                </div>
                {isEditingThis && (
                  <div ref={containerRef} className="relative mt-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="名前またはメールで検索..."
                        autoFocus
                        className="w-64 rounded-lg border border-greige-light px-3 py-1.5 text-xs text-charcoal placeholder:text-greige focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                      />
                      <button
                        onClick={() => {
                          setEditingOwnerId(null);
                          setSearchQuery("");
                          setCandidates([]);
                        }}
                        className="rounded-lg border border-greige-light px-2 py-1.5 text-xs text-greige transition-colors hover:bg-ivory-dark"
                      >
                        キャンセル
                      </button>
                    </div>
                    {(searching || candidates.length > 0) && (
                      <div className="absolute z-10 mt-1 max-h-48 w-80 overflow-y-auto rounded-lg border border-greige-light bg-white shadow-lg">
                        {searching && candidates.length === 0 && (
                          <p className="px-3 py-2 text-xs text-greige">
                            検索中...
                          </p>
                        )}
                        {candidates.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleOwnerChange(store.id, p)}
                            disabled={updatingOwner}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-ivory disabled:opacity-50"
                          >
                            <span className="font-medium text-charcoal">
                              {p.full_name || "名前未設定"}
                            </span>
                            <span className="text-greige">
                              {p.email}
                            </span>
                          </button>
                        ))}
                        {!searching &&
                          searchQuery.trim() &&
                          candidates.length === 0 && (
                            <p className="px-3 py-2 text-xs text-greige">
                              該当するユーザーが見つかりません
                            </p>
                          )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
