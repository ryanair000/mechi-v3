"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  EmptyState,
  GameChip,
  PageHeader,
  ProgressBar,
  StatusBadge,
} from "@/components/marketing/ui";
import { requestJson } from "@/lib/api-client";
import {
  formatDateRange,
  formatDayTypeLabel,
  formatKes,
  formatLongDate,
} from "@/lib/format";
import type { Tournament, WeekDetailData } from "@/lib/types";

function buildTournamentForm(tournament: Tournament | null, week: WeekDetailData["week"]) {
  return {
    game: tournament?.game ?? week.tournament_game,
    date: tournament?.date ?? week.week_end,
    prize_pool_kes: tournament?.prize_pool_kes ?? 1000,
    status: tournament?.status ?? "upcoming",
    participant_count: tournament?.participant_count ?? 0,
    first_place_name: tournament?.first_place_name ?? "",
    first_place_phone: tournament?.first_place_phone ?? "",
    first_place_kes: tournament?.first_place_kes ?? 700,
    first_place_paid: tournament?.first_place_paid ?? false,
    second_place_name: tournament?.second_place_name ?? "",
    second_place_phone: tournament?.second_place_phone ?? "",
    second_place_kes: tournament?.second_place_kes ?? 300,
    second_place_paid: tournament?.second_place_paid ?? false,
    winner_screenshot_url: tournament?.winner_screenshot_url ?? "",
    notes: tournament?.notes ?? "",
  };
}

export function WeekDetailClient({
  initialData,
  focus,
}: {
  initialData: WeekDetailData;
  focus?: string | null;
}) {
  const router = useRouter();
  const [tournamentForm, setTournamentForm] = useState(
    buildTournamentForm(initialData.tournament, initialData.week),
  );
  const [weekNotes, setWeekNotes] = useState(initialData.week.notes ?? "");
  const [bountyForm, setBountyForm] = useState({
    title: "",
    description: "",
    trigger_label: "",
    game: "",
    prize_kes: 50,
  });
  const [customContentForm, setCustomContentForm] = useState({
    scheduled_date: initialData.week.week_start,
    title: "",
    description: "",
    notes: "",
  });
  const [adForm, setAdForm] = useState({
    platform: "meta",
    amount_kes: 0,
    description: "",
    date: initialData.week.week_start,
  });
  const [claimForms, setClaimForms] = useState<
    Record<string, { winner_name: string; winner_phone: string }>
  >({});
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const data = initialData;

  const runAndRefresh = async (work: () => Promise<void>, successMessage: string) => {
    try {
      await work();
      setNotice(successMessage);
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  const handleTournamentSave = () => {
    const tournament = data.tournament;
    if (!tournament) return;

    return runAndRefresh(
      () =>
        requestJson(`/api/tournaments/${tournament.id}`, {
          method: "PATCH",
          json: tournamentForm,
        }),
      "Tournament updated.",
    );
  };

  const updateBounty = (bountyId: string, payload: Record<string, unknown>, message: string) =>
    runAndRefresh(
      () =>
        requestJson(`/api/bounties/${bountyId}`, {
          method: "PATCH",
          json: payload,
        }),
      message,
    );

  const addBounty = () =>
    runAndRefresh(
      () =>
        requestJson("/api/bounties", {
          method: "POST",
          json: {
            week_id: data.week.id,
            ...bountyForm,
            game: bountyForm.game || null,
          },
        }),
      "Bounty added.",
    );

  const saveContentField = (itemId: string, payload: Record<string, unknown>) =>
    runAndRefresh(
      () =>
        requestJson(`/api/content/${itemId}`, {
          method: "PATCH",
          json: payload,
        }),
      "Content item updated.",
    );

  const addCustomContent = () =>
    runAndRefresh(
      () =>
        requestJson("/api/content", {
          method: "POST",
          json: {
            week_id: data.week.id,
            day_type: "custom",
            ...customContentForm,
          },
        }),
      "Custom content item added.",
    );

  const addAdEntry = () =>
    runAndRefresh(
      () =>
        requestJson("/api/ads", {
          method: "POST",
          json: {
            week_id: data.week.id,
            ...adForm,
          },
        }),
      "Ad spend logged.",
    );

  const saveWeekNotes = () =>
    runAndRefresh(
      () =>
        requestJson("/api/weeks", {
          method: "PATCH",
          json: { id: data.week.id, notes: weekNotes },
        }),
      "Week notes saved.",
    );

  const weeklyAdTotal = data.adSpendEntries.reduce((total, entry) => total + entry.amount_kes, 0);
  const weeklyBudgets = {
    meta: Math.round(data.settings.meta_budget_kes / 4),
    tiktok: Math.round(data.settings.tiktok_budget_kes / 4),
    twitter: Math.round(data.settings.twitter_budget_kes / 4),
  };

  const spendByPlatform = {
    meta: data.adSpendEntries
      .filter((entry) => entry.platform === "meta")
      .reduce((total, entry) => total + entry.amount_kes, 0),
    tiktok: data.adSpendEntries
      .filter((entry) => entry.platform === "tiktok")
      .reduce((total, entry) => total + entry.amount_kes, 0),
    twitter: data.adSpendEntries
      .filter((entry) => entry.platform === "twitter")
      .reduce((total, entry) => total + entry.amount_kes, 0),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Week ${data.week.week_number}`}
        title={`Week ${data.week.week_number} - ${data.week.tournament_game === "efootball" ? "eFootball" : data.week.tournament_game.toUpperCase()}`}
        description={`Campaign window ${formatDateRange(data.week.week_start, data.week.week_end)}.`}
      />

      {notice ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white/[0.04] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className={focus === "tournament-live" ? "ring-2 ring-[rgba(50,224,196,0.24)]" : ""}>
          <div className="flex items-center gap-3">
            <p className="eyebrow">Tournament</p>
            <GameChip game={tournamentForm.game} />
            <StatusBadge status={tournamentForm.status} />
          </div>

          {data.tournament ? (
            <>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div>
                  <label className="input-label">Status</label>
                  <select
                    className="field-base"
                    value={tournamentForm.status}
                    onChange={(event) =>
                      setTournamentForm((current) => ({
                        ...current,
                        status: event.target.value as Tournament["status"],
                      }))
                    }
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Date</label>
                  <input
                    className="field-base"
                    type="date"
                    value={tournamentForm.date}
                    onChange={(event) =>
                      setTournamentForm((current) => ({ ...current, date: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="input-label">Prize pool</label>
                  <input
                    className="field-base"
                    type="number"
                    value={tournamentForm.prize_pool_kes}
                    onChange={(event) =>
                      setTournamentForm((current) => ({
                        ...current,
                        prize_pool_kes: Number(event.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="input-label">Participant count</label>
                <input
                  className="field-base"
                  type="number"
                  value={tournamentForm.participant_count}
                  onChange={(event) =>
                    setTournamentForm((current) => ({
                      ...current,
                      participant_count: Number(event.target.value),
                    }))
                  }
                />
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="panel-muted p-4">
                  <p className="eyebrow">1st place</p>
                  <div className="mt-3 space-y-3">
                    <input
                      className="field-base"
                      placeholder="Winner name"
                      value={tournamentForm.first_place_name}
                      onChange={(event) =>
                        setTournamentForm((current) => ({
                          ...current,
                          first_place_name: event.target.value,
                        }))
                      }
                    />
                    <input
                      className="field-base"
                      placeholder="Phone"
                      value={tournamentForm.first_place_phone}
                      onChange={(event) =>
                        setTournamentForm((current) => ({
                          ...current,
                          first_place_phone: event.target.value,
                        }))
                      }
                    />
                    <input
                      className="field-base"
                      type="number"
                      value={tournamentForm.first_place_kes}
                      onChange={(event) =>
                        setTournamentForm((current) => ({
                          ...current,
                          first_place_kes: Number(event.target.value),
                        }))
                      }
                    />
                    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={tournamentForm.first_place_paid}
                        onChange={(event) =>
                          setTournamentForm((current) => ({
                            ...current,
                            first_place_paid: event.target.checked,
                          }))
                        }
                      />
                      Paid
                    </label>
                  </div>
                </div>
                <div className="panel-muted p-4">
                  <p className="eyebrow">2nd place</p>
                  <div className="mt-3 space-y-3">
                    <input
                      className="field-base"
                      placeholder="Winner name"
                      value={tournamentForm.second_place_name}
                      onChange={(event) =>
                        setTournamentForm((current) => ({
                          ...current,
                          second_place_name: event.target.value,
                        }))
                      }
                    />
                    <input
                      className="field-base"
                      placeholder="Phone"
                      value={tournamentForm.second_place_phone}
                      onChange={(event) =>
                        setTournamentForm((current) => ({
                          ...current,
                          second_place_phone: event.target.value,
                        }))
                      }
                    />
                    <input
                      className="field-base"
                      type="number"
                      value={tournamentForm.second_place_kes}
                      onChange={(event) =>
                        setTournamentForm((current) => ({
                          ...current,
                          second_place_kes: Number(event.target.value),
                        }))
                      }
                    />
                    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={tournamentForm.second_place_paid}
                        onChange={(event) =>
                          setTournamentForm((current) => ({
                            ...current,
                            second_place_paid: event.target.checked,
                          }))
                        }
                      />
                      Paid
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="input-label">Winner screenshot URL</label>
                  <input
                    className="field-base"
                    value={tournamentForm.winner_screenshot_url}
                    onChange={(event) =>
                      setTournamentForm((current) => ({
                        ...current,
                        winner_screenshot_url: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="input-label">Notes</label>
                  <textarea
                    className="field-base min-h-28"
                    value={tournamentForm.notes}
                    onChange={(event) =>
                      setTournamentForm((current) => ({ ...current, notes: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="mt-5">
                <button type="button" className="btn-primary" onClick={handleTournamentSave} disabled={isPending}>
                  Save tournament
                </button>
              </div>
            </>
          ) : (
            <EmptyState
              title="No tournament record"
              description="Run the seed or create the week assets to generate the Friday tournament automatically."
            />
          )}
        </Card>

        <Card className={focus === "bounty-winner" ? "ring-2 ring-[rgba(50,224,196,0.24)]" : ""}>
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Bounties</p>
            <span className="text-sm font-semibold text-white">{data.bounties.length} items</span>
          </div>

          <div className="mt-5 space-y-3">
            {data.bounties.map((bounty) => {
              const claim = claimForms[bounty.id] ?? {
                winner_name: bounty.winner_name ?? "",
                winner_phone: bounty.winner_phone ?? "",
              };

              return (
                <div key={bounty.id} className="panel-muted p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-bold text-white">{bounty.title}</p>
                    <StatusBadge status={bounty.status} />
                    <span className="text-sm text-[var(--text-secondary)]">
                      {formatKes(bounty.prize_kes)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{bounty.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {bounty.status === "draft" ? (
                      <button
                        type="button"
                        className="btn-secondary min-h-9 px-3 py-2 text-xs"
                        onClick={() => updateBounty(bounty.id, { status: "active" }, "Bounty activated.")}
                      >
                        Go Live
                      </button>
                    ) : null}
                    {bounty.status === "claimed" && !bounty.paid ? (
                      <button
                        type="button"
                        className="btn-secondary min-h-9 px-3 py-2 text-xs"
                        onClick={() => updateBounty(bounty.id, { paid: true }, "Bounty marked as paid.")}
                      >
                        Mark Paid
                      </button>
                    ) : null}
                  </div>

                  {bounty.status !== "claimed" ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <input
                        className="field-base"
                        placeholder="Winner name"
                        value={claim.winner_name}
                        onChange={(event) =>
                          setClaimForms((current) => ({
                            ...current,
                            [bounty.id]: { ...claim, winner_name: event.target.value },
                          }))
                        }
                      />
                      <input
                        className="field-base"
                        placeholder="Winner phone"
                        value={claim.winner_phone}
                        onChange={(event) =>
                          setClaimForms((current) => ({
                            ...current,
                            [bounty.id]: { ...claim, winner_phone: event.target.value },
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() =>
                          updateBounty(
                            bounty.id,
                            {
                              status: "claimed",
                              winner_name: claim.winner_name,
                              winner_phone: claim.winner_phone,
                            },
                            "Bounty claimed.",
                          )
                        }
                      >
                        Mark Claimed
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-t border-[var(--border)] pt-5">
            <p className="eyebrow">Add bounty</p>
            <div className="mt-4 space-y-3">
              <input
                className="field-base"
                placeholder="Title"
                value={bountyForm.title}
                onChange={(event) =>
                  setBountyForm((current) => ({ ...current, title: event.target.value }))
                }
              />
              <textarea
                className="field-base min-h-24"
                placeholder="Description"
                value={bountyForm.description}
                onChange={(event) =>
                  setBountyForm((current) => ({ ...current, description: event.target.value }))
                }
              />
              <input
                className="field-base"
                placeholder="Trigger label"
                value={bountyForm.trigger_label}
                onChange={(event) =>
                  setBountyForm((current) => ({ ...current, trigger_label: event.target.value }))
                }
              />
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  className="field-base"
                  value={bountyForm.game}
                  onChange={(event) =>
                    setBountyForm((current) => ({ ...current, game: event.target.value }))
                  }
                >
                  <option value="">Platform-wide</option>
                  <option value="efootball">eFootball</option>
                  <option value="codm">CODM</option>
                  <option value="pubgm">PUBGM</option>
                </select>
                <select
                  className="field-base"
                  value={bountyForm.prize_kes}
                  onChange={(event) =>
                    setBountyForm((current) => ({
                      ...current,
                      prize_kes: Number(event.target.value),
                    }))
                  }
                >
                  <option value={50}>KES 50</option>
                  <option value={100}>KES 100</option>
                  <option value={200}>KES 200</option>
                </select>
              </div>
              <button type="button" className="btn-primary" onClick={addBounty}>
                Add bounty
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <p className="eyebrow">Content calendar</p>
          <div className="mt-5 space-y-3">
            {data.contentItems.map((item) => (
              <div key={item.id} className="panel-muted p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-bold text-white">{item.title}</p>
                  <StatusBadge status={item.day_type === "custom" ? "draft" : "completed"} />
                  <span className="text-sm text-[var(--text-secondary)]">
                    {formatLongDate(item.scheduled_date)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {formatDayTypeLabel(item.day_type)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {([
                    ["posted_tiktok", "TikTok"],
                    ["posted_instagram", "Instagram"],
                    ["posted_twitter", "X"],
                    ["posted_whatsapp", "WhatsApp"],
                  ] as const).map(([field, label]) => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => saveContentField(item.id, { [field]: !item[field] })}
                      className={
                        item[field]
                          ? "btn-secondary min-h-9 px-3 py-2 text-xs"
                          : "btn-ghost min-h-9 px-3 py-2 text-xs"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <textarea
                  className="field-base mt-4 min-h-24"
                  placeholder="Notes"
                  defaultValue={item.notes ?? ""}
                  onBlur={(event) => saveContentField(item.id, { notes: event.target.value })}
                />
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-[var(--border)] pt-5">
            <p className="eyebrow">Add custom content item</p>
            <div className="mt-4 space-y-3">
              <input
                className="field-base"
                type="date"
                value={customContentForm.scheduled_date}
                onChange={(event) =>
                  setCustomContentForm((current) => ({
                    ...current,
                    scheduled_date: event.target.value,
                  }))
                }
              />
              <input
                className="field-base"
                placeholder="Title"
                value={customContentForm.title}
                onChange={(event) =>
                  setCustomContentForm((current) => ({ ...current, title: event.target.value }))
                }
              />
              <textarea
                className="field-base min-h-24"
                placeholder="Description"
                value={customContentForm.description}
                onChange={(event) =>
                  setCustomContentForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
              <textarea
                className="field-base min-h-24"
                placeholder="Notes"
                value={customContentForm.notes}
                onChange={(event) =>
                  setCustomContentForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
              <button type="button" className="btn-primary" onClick={addCustomContent}>
                Add content item
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <p className="eyebrow">Ad spend</p>
          <p className="mt-2 text-2xl font-black text-white">{formatKes(weeklyAdTotal)}</p>
          <div className="mt-5 space-y-4">
            {([
              ["meta", "Meta", spendByPlatform.meta, weeklyBudgets.meta],
              ["tiktok", "TikTok", spendByPlatform.tiktok, weeklyBudgets.tiktok],
              ["twitter", "Twitter/X", spendByPlatform.twitter, weeklyBudgets.twitter],
            ] as const).map(([key, label, spent, budget]) => {
              const percent = budget === 0 ? 0 : Math.round((spent / budget) * 100);

              return (
                <div key={key} className="panel-muted p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-white">{label}</p>
                    <span className="text-sm text-[var(--text-secondary)]">
                      {formatKes(spent)} / {formatKes(budget)}
                    </span>
                  </div>
                  <div className="mt-3">
                    <ProgressBar
                      value={percent}
                      tone={percent > 100 ? "danger" : percent >= 80 ? "warning" : "accent"}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 space-y-3">
            {data.adSpendEntries.map((entry) => (
              <div key={entry.id} className="panel-muted flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-bold text-white">{formatKes(entry.amount_kes)}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {entry.platform} - {formatLongDate(entry.date)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {entry.description ?? "-"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-[var(--border)] pt-5">
            <p className="eyebrow">Log spend</p>
            <div className="mt-4 space-y-3">
              <select
                className="field-base"
                value={adForm.platform}
                onChange={(event) =>
                  setAdForm((current) => ({ ...current, platform: event.target.value }))
                }
              >
                <option value="meta">Meta</option>
                <option value="tiktok">TikTok</option>
                <option value="twitter">Twitter</option>
              </select>
              <input
                className="field-base"
                type="number"
                placeholder="Amount in KES"
                value={adForm.amount_kes}
                onChange={(event) =>
                  setAdForm((current) => ({ ...current, amount_kes: Number(event.target.value) }))
                }
              />
              <input
                className="field-base"
                placeholder="Description"
                value={adForm.description}
                onChange={(event) =>
                  setAdForm((current) => ({ ...current, description: event.target.value }))
                }
              />
              <input
                className="field-base"
                type="date"
                value={adForm.date}
                onChange={(event) => setAdForm((current) => ({ ...current, date: event.target.value }))}
              />
              <button type="button" className="btn-primary" onClick={addAdEntry}>
                Log spend
              </button>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <p className="eyebrow">Week notes</p>
        <label className="mt-4 block text-sm font-semibold text-white">
          What worked / what didn&apos;t
        </label>
        <textarea
          className="field-base mt-3 min-h-40"
          value={weekNotes}
          onChange={(event) => setWeekNotes(event.target.value)}
          onBlur={saveWeekNotes}
        />
      </Card>
    </div>
  );
}
