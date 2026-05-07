"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, GameChip, PageHeader, StatusBadge } from "@/components/marketing/ui";
import { downloadCsv, requestJson } from "@/lib/api-client";
import { formatKes, formatLongDate } from "@/lib/format";
import type { Tournament, TournamentsPageData } from "@/lib/types";

function blankForm(tournament: Tournament) {
  return {
    status: tournament.status,
    participant_count: tournament.participant_count ?? 0,
    first_place_name: tournament.first_place_name ?? "",
    first_place_phone: tournament.first_place_phone ?? "",
    first_place_kes: tournament.first_place_kes ?? 700,
    first_place_paid: tournament.first_place_paid,
    second_place_name: tournament.second_place_name ?? "",
    second_place_phone: tournament.second_place_phone ?? "",
    second_place_kes: tournament.second_place_kes ?? 300,
    second_place_paid: tournament.second_place_paid,
    winner_screenshot_url: tournament.winner_screenshot_url ?? "",
    notes: tournament.notes ?? "",
  };
}

export function TournamentsClient({ initialData }: { initialData: TournamentsPageData }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(initialData.tournaments[0]?.id ?? "");
  const [form, setForm] = useState(
    initialData.tournaments[0] ? blankForm(initialData.tournaments[0]) : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const data = initialData;

  const weekMap = Object.fromEntries(data.weeks.map((week) => [week.id, week]));
  const selectedTournament =
    data.tournaments.find((tournament) => tournament.id === selectedId) ?? null;
  const totalPrizePool = data.tournaments.reduce(
    (total, tournament) => total + tournament.prize_pool_kes,
    0,
  );

  const handleSave = async () => {
    if (!selectedTournament || !form) return;

    try {
      await requestJson(`/api/tournaments/${selectedTournament.id}`, {
        method: "PATCH",
        json: form,
      });
      setNotice("Tournament updated.");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to update tournament");
    }
  };

  const exportRows = useMemo(
    () =>
      data.tournaments.map((tournament) => ({
        Week: weekMap[tournament.week_id]?.week_number ?? "",
        Game: weekMap[tournament.week_id]?.tournament_game ?? tournament.game,
        Date: tournament.date,
        Participants: tournament.participant_count ?? "",
        FirstPlace: tournament.first_place_name ?? "",
        SecondPlace: tournament.second_place_name ?? "",
        PrizePaid: tournament.paid ? "Paid" : "Pending",
        Status: tournament.status,
      })),
    [data.tournaments, weekMap],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tournament operations"
        title="All tournaments"
        description="Track the 4 tournament checkpoints, edit podium details, and export the campaign view as CSV."
        actions={
          <button
            type="button"
            className="btn-ghost"
            onClick={() => downloadCsv("marketing-tournaments.csv", exportRows)}
          >
            Export CSV
          </button>
        }
      />

      {notice ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white/[0.04] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {notice}
        </div>
      ) : null}

      <Card>
        <div className="table-shell overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-[var(--text-soft)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Week</th>
                <th className="px-4 py-3 font-semibold">Game</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Participants</th>
                <th className="px-4 py-3 font-semibold">1st Place</th>
                <th className="px-4 py-3 font-semibold">2nd Place</th>
                <th className="px-4 py-3 font-semibold">Prize Paid</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.tournaments.map((tournament) => (
                <tr
                  key={tournament.id}
                  className="cursor-pointer border-t border-[var(--border)] transition-colors hover:bg-white/[0.03]"
                  onClick={() => {
                    setSelectedId(tournament.id);
                    setForm(blankForm(tournament));
                  }}
                >
                  <td className="px-4 py-3 text-white">
                    Week {weekMap[tournament.week_id]?.week_number ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <GameChip game={tournament.game} />
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {formatLongDate(tournament.date)}
                  </td>
                  <td className="px-4 py-3 text-white">{tournament.participant_count ?? "-"}</td>
                  <td className="px-4 py-3 text-white">{tournament.first_place_name ?? "-"}</td>
                  <td className="px-4 py-3 text-white">{tournament.second_place_name ?? "-"}</td>
                  <td className="px-4 py-3 text-white">{tournament.paid ? "Paid" : "Pending"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={tournament.status} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-[var(--border)] bg-white/[0.04]">
              <tr>
                <td className="px-4 py-3 font-bold text-white" colSpan={8}>
                  Running prize total: {formatKes(totalPrizePool)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {selectedTournament && form ? (
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow">Inline editor</p>
            <GameChip game={selectedTournament.game} />
            <StatusBadge status={selectedTournament.status} />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="input-label">Status</label>
              <select
                className="field-base"
                value={form.status}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? { ...current, status: event.target.value as Tournament["status"] }
                      : current,
                  )
                }
              >
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="input-label">Participant count</label>
              <input
                className="field-base"
                type="number"
                value={form.participant_count}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, participant_count: Number(event.target.value) } : current,
                  )
                }
              />
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="panel-muted p-4">
              <p className="eyebrow">1st place</p>
              <div className="mt-3 space-y-3">
                <input
                  className="field-base"
                  placeholder="Winner name"
                  value={form.first_place_name}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, first_place_name: event.target.value } : current,
                    )
                  }
                />
                <input
                  className="field-base"
                  placeholder="Phone"
                  value={form.first_place_phone}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, first_place_phone: event.target.value } : current,
                    )
                  }
                />
                <input
                  className="field-base"
                  type="number"
                  placeholder="KES"
                  value={form.first_place_kes}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, first_place_kes: Number(event.target.value) } : current,
                    )
                  }
                />
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={form.first_place_paid}
                    onChange={(event) =>
                      setForm((current) =>
                        current ? { ...current, first_place_paid: event.target.checked } : current,
                      )
                    }
                  />
                  Mark 1st place paid
                </label>
              </div>
            </div>
            <div className="panel-muted p-4">
              <p className="eyebrow">2nd place</p>
              <div className="mt-3 space-y-3">
                <input
                  className="field-base"
                  placeholder="Winner name"
                  value={form.second_place_name}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, second_place_name: event.target.value } : current,
                    )
                  }
                />
                <input
                  className="field-base"
                  placeholder="Phone"
                  value={form.second_place_phone}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, second_place_phone: event.target.value } : current,
                    )
                  }
                />
                <input
                  className="field-base"
                  type="number"
                  placeholder="KES"
                  value={form.second_place_kes}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, second_place_kes: Number(event.target.value) }
                        : current,
                    )
                  }
                />
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={form.second_place_paid}
                    onChange={(event) =>
                      setForm((current) =>
                        current ? { ...current, second_place_paid: event.target.checked } : current,
                      )
                    }
                  />
                  Mark 2nd place paid
                </label>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="input-label">Winner screenshot URL</label>
              <input
                className="field-base"
                placeholder="https://..."
                value={form.winner_screenshot_url}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, winner_screenshot_url: event.target.value } : current,
                  )
                }
              />
            </div>
            <div>
              <label className="input-label">Notes</label>
              <textarea
                className="field-base min-h-32"
                value={form.notes}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, notes: event.target.value } : current,
                  )
                }
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className="btn-primary" onClick={handleSave} disabled={isPending}>
              Save tournament
            </button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
