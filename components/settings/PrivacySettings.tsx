"use client";

import { useEffect, useState } from "react";

type Settings = {
  profile_visibility: "public" | "friends" | "private";
  who_can_message: "everyone" | "friends" | "nobody";
  who_can_send_friend_request: "everyone" | "nobody";
  show_online_status: boolean;
  show_last_seen: boolean;
  moment_visibility: "public" | "friends" | "private";
};

const VISIBILITY_OPTIONS = [
  { value: "public", label: "همه" },
  { value: "friends", label: "دوستان" },
  { value: "private", label: "فقط خودم" },
];

const MESSAGE_OPTIONS = [
  { value: "everyone", label: "همه" },
  { value: "friends", label: "دوستان" },
  { value: "nobody", label: "هیچ‌کس" },
];

const REQUEST_OPTIONS = [
  { value: "everyone", label: "همه" },
  { value: "nobody", label: "هیچ‌کس" },
];

export function PrivacySettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setSettings(data.settings));
  }, []);

  async function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    if (!settings) return;
    const prev = settings;
    setSettings({ ...settings, [key]: value }); // optimistic
    setSaving(key);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) setSettings(prev); // revert on failure
    } catch {
      setSettings(prev);
    } finally {
      setSaving(null);
    }
  }

  if (!settings) {
    return <div className="text-xs text-ink-muted">در حال بارگذاری تنظیمات...</div>;
  }

  return (
    <div className="space-y-2 text-sm">
      <SelectRow
        label="نمایش پروفایل"
        value={settings.profile_visibility}
        options={VISIBILITY_OPTIONS}
        onChange={(v) => update("profile_visibility", v as Settings["profile_visibility"])}
        busy={saving === "profile_visibility"}
      />
      <SelectRow
        label="چه کسانی پیام بدهند"
        value={settings.who_can_message}
        options={MESSAGE_OPTIONS}
        onChange={(v) => update("who_can_message", v as Settings["who_can_message"])}
        busy={saving === "who_can_message"}
      />
      <SelectRow
        label="درخواست دوستی از"
        value={settings.who_can_send_friend_request}
        options={REQUEST_OPTIONS}
        onChange={(v) => update("who_can_send_friend_request", v as Settings["who_can_send_friend_request"])}
        busy={saving === "who_can_send_friend_request"}
      />
      <SelectRow
        label="نمایش لحظه‌ها"
        value={settings.moment_visibility}
        options={VISIBILITY_OPTIONS}
        onChange={(v) => update("moment_visibility", v as Settings["moment_visibility"])}
        busy={saving === "moment_visibility"}
      />
      <ToggleRow
        label="نمایش وضعیت آنلاین"
        checked={settings.show_online_status}
        onChange={(v) => update("show_online_status", v)}
        busy={saving === "show_online_status"}
      />
      <ToggleRow
        label="نمایش آخرین بازدید"
        checked={settings.show_last_seen}
        onChange={(v) => update("show_last_seen", v)}
        busy={saving === "show_last_seen"}
      />
    </div>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
  busy,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  busy: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-y bg-y-soft/50 px-4 py-3">
      <span>{label}</span>
      <select
        value={value}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-ink-muted text-sm outline-none disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  busy,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  busy: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-y bg-y-soft/50 px-4 py-3">
      <span>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        disabled={busy}
        aria-pressed={checked}
        className={`w-10 h-6 rounded-full transition-colors relative disabled:opacity-50 ${
          checked ? "bg-y-royal" : "bg-y-lavender/50"
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-surface-light transition-transform ${
            checked ? "translate-x-[-1.125rem]" : "translate-x-[-0.125rem]"
          } right-0.5`}
        />
      </button>
    </div>
  );
}
