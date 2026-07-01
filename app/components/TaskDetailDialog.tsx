"use client";

import {
  type Board,
  type Card,
  type Comment,
  type Priority,
  type Swimlane,
  users,
} from "@/app/lib/boards";
import { renderDescription } from "@/app/lib/description";
import { CommentMarkdown } from "@/app/lib/markdown";
import { progressPercent } from "@/app/lib/progress";
import { RichTextarea } from "@/app/lib/rich-textarea";
import { cn } from "@/app/lib/utils";
import { Avatar, AvatarImage } from "@/ui/avatar";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/ui/dialog";
import { formatDistance } from "date-fns";
import { Calendar, ChevronLeft } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

type TaskRef = { cardId: number; fromSwimlane: string; fromColumn: string };

const priorityStyles: Record<Priority, string> = {
  Urgent: "bg-red-light text-red",
  Medium: "bg-brand-light text-brand",
  Normal: "bg-secondary-50 text-secondary-400",
  Low: "bg-primary-100 text-primary-400",
};

function taskKeyFromTitle(title: string) {
  const key = title
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.replace(/[^a-zA-Z0-9]/g, "").charAt(0))
    .filter(Boolean)
    .join("")
    .toUpperCase();
  return key || "TASK";
}

function formatTaskNumber(projectTitle: string, cardId: number) {
  return `${taskKeyFromTitle(projectTitle)}-${cardId}`;
}

function CardDetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-primary-400">
        {label}
      </span>
      <div className="text-sm text-primary-600">{children}</div>
    </div>
  );
}

export default function CardDetailDialog({
  open,
  onOpenChange,
  card,
  board,
  columnTitle,
  swimlaneTitle,
  swimlane,
  onUpdateCard,
  onSetStatus,
  onOpenTask,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: Card | null;
  board: Board;
  columnTitle: string;
  swimlaneTitle: string;
  swimlane: Swimlane | null;
  onUpdateCard: (patch: Partial<Card>) => void;
  onSetStatus: (payload: TaskRef, toColumnId: string) => void;
  onOpenTask: (payload: TaskRef) => void;
}) {
  const [view, setView] = useState<"detail" | "epic">("detail");
  useEffect(() => {
    setView("detail");
  }, [card?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="card-detail-dialog"
        className="flex max-h-[95vh] flex-col overflow-hidden rounded-2xl sm:max-w-3xl"
      >
        {card && view === "detail" && (
          <CardDetailBody
            key={card.id}
            card={card}
            board={board}
            columnTitle={columnTitle}
            swimlaneTitle={swimlaneTitle}
            onUpdateCard={onUpdateCard}
            onOpenEpic={() => setView("epic")}
          />
        )}
        {card && view === "epic" && swimlane && (
          <SwimlaneEpicView
            swimlane={swimlane}
            board={board}
            onBack={() => setView("detail")}
            onSetStatus={onSetStatus}
            onOpenTask={(payload) => {
              setView("detail");
              onOpenTask(payload);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CardDetailBody({
  card,
  board,
  columnTitle,
  swimlaneTitle,
  onUpdateCard,
  onOpenEpic,
}: {
  card: Card;
  board: Board;
  columnTitle: string;
  swimlaneTitle: string;
  onUpdateCard: (patch: Partial<Card>) => void;
  onOpenEpic: () => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(card.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(card.description ?? "");

  const saveTitle = () => {
    const next = titleDraft.trim();
    if (next && next !== card.title) onUpdateCard({ title: next });
    setEditingTitle(false);
  };

  const saveDesc = () => {
    onUpdateCard({ description: descDraft.trim() });
    setEditingDesc(false);
  };

  const taskNumber = formatTaskNumber(board.title, card.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-5">
        <div className="flex flex-col gap-1 pr-8">
          <span className="text-xs text-primary-400">
            {board.title} ·{" "}
            <span
              data-testid="swimlane-epic-link"
              className="hover:underline hover:text-primary-600 cursor-pointer transition-colors"
              onClick={onOpenEpic}
            >
              {swimlaneTitle}
            </span>{" "}
            ·{" "}
            <span
              className="hover:underline hover:text-primary-600 cursor-pointer transition-colors"
              onClick={() => {
                navigator.clipboard.writeText(taskNumber);
              }}
            >
              {taskNumber}
            </span>
          </span>
          <DialogTitle
            render={<div className="text-lg font-medium text-primary-600" />}
          >
            {editingTitle ? (
              <input
                data-testid="card-detail-title-input"
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveTitle();
                  }
                  if (e.key === "Escape") {
                    setTitleDraft(card.title);
                    setEditingTitle(false);
                  }
                }}
                className="w-full rounded border border-primary-300 px-2 py-1 text-lg font-medium text-primary-600 outline-none"
              />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                data-testid="card-detail-title"
                onClick={() => {
                  setTitleDraft(card.title);
                  setEditingTitle(true);
                }}
                className="-mx-2 block w-full rounded px-2 py-1 text-left hover:bg-primary-100"
              >
                {card.title}
              </Button>
            )}
          </DialogTitle>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <CardDetailField label="Status">
            <span className="inline-flex rounded bg-primary-100 px-1.5 py-0.5 text-xs text-primary-500">
              {columnTitle}
            </span>
          </CardDetailField>
          <CardDetailField label="Priority">
            <span
              className={cn(
                "inline-flex rounded px-1.5 py-0.5 text-xs",
                priorityStyles[card.priority],
              )}
            >
              {card.priority}
            </span>
          </CardDetailField>
          <CardDetailField label="Assignee">
            <span className="flex items-center gap-2">
              <Avatar size="sm" className="size-5!">
                <AvatarImage src={card.assignee.src} alt="User profile pic" />
              </Avatar>
              {card.assignee.name}
            </span>
          </CardDetailField>
          <CardDetailField label="Due">
            {card.due ? (
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary-400" />
                {card.due}
              </span>
            ) : (
              <span className="text-primary-400">No due date</span>
            )}
          </CardDetailField>
          <CardDetailField label="Label">
            <span className="inline-flex rounded bg-primary-100 px-1.5 py-0.5 text-xs text-primary-400">
              {card.tag}
            </span>
          </CardDetailField>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-primary-400">
            Description
          </span>
          {editingDesc ? (
            <div className="flex flex-col gap-2">
              <RichTextarea
                value={descDraft}
                onChange={setDescDraft}
                render={(v) => renderDescription(v, { transparent: true })}
                rows={4}
                data-testid="card-detail-description-input"
                placeholder="Add a description… use #tags and @mentions"
                className="w-full resize-none rounded-lg border border-primary-300 bg-transparent p-3 text-sm text-primary-600 outline-none placeholder:text-primary-400"
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDescDraft(card.description ?? "");
                    setEditingDesc(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  data-testid="card-detail-description-save"
                  onClick={saveDesc}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              data-testid="card-detail-description"
              onClick={() => {
                setDescDraft(card.description ?? "");
                setEditingDesc(true);
              }}
              className="whitespace-pre-wrap rounded-lg border border-primary-100 bg-primary-50 p-3 text-left text-sm text-primary-600 hover:border-primary-200"
            >
              {card.description ? (
                renderDescription(card.description)
              ) : (
                <span className="text-primary-400">Add a description…</span>
              )}
            </button>
          )}
        </div>
      </div>

      <CommentThread
        comments={card.comments ?? []}
        onAdd={(body) => {
          const id =
            (card.comments ?? []).reduce((m, c) => Math.max(m, c.id), 0) + 1;
          onUpdateCard({
            comments: [
              ...(card.comments ?? []),
              {
                id,
                author: users[0],
                createdAt: COMMENT_REFERENCE.toISOString(),
                body,
              },
            ],
          });
        }}
      />
    </div>
  );
}

const COMMENT_REFERENCE = new Date("2026-06-21T13:00:00Z");

function commentTimestamp(iso: string): string {
  return formatDistance(new Date(iso), COMMENT_REFERENCE, { addSuffix: true });
}

function CommentThread({
  comments,
  onAdd,
}: {
  comments: Comment[];
  onAdd: (body: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-primary-400">
        Comments
      </span>
      <div
        data-testid="comment-list"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain"
      >
        {comments.length === 0 ? (
          <p className="text-sm text-primary-400">No comments yet.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} data-testid="comment-item" className="flex gap-2">
              <Avatar size="sm" className="mt-0.5 size-6! shrink-0">
                <AvatarImage src={c.author.src} alt="User profile pic" />
              </Avatar>
              <div className="min-w-0 flex-1 rounded-lg border border-primary-100 bg-primary-50 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-primary-600">
                    {c.author.name}
                  </span>
                  <span
                    data-testid="comment-time"
                    className="text-[11px] text-primary-400"
                  >
                    {commentTimestamp(c.createdAt)}
                  </span>
                </div>
                <CommentMarkdown className="mt-1">{c.body}</CommentMarkdown>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        <textarea
          data-testid="comment-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="Add a comment… markdown supported"
          className="w-full resize-none rounded-lg border border-primary-200 bg-transparent p-2.5 text-sm text-primary-600 outline-none placeholder:text-primary-400"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            data-testid="comment-submit"
            disabled={!draft.trim()}
            onClick={() => {
              onAdd(draft.trim());
              setDraft("");
            }}
          >
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}

function statusCategory(columnId: string): "done" | "inprogress" | "todo" {
  if (columnId === "done" || columnId === "archived") return "done";
  if (columnId === "in-progress" || columnId === "in-review")
    return "inprogress";
  return "todo";
}

function SwimlaneEpicView({
  swimlane,
  board,
  onBack,
  onSetStatus,
  onOpenTask,
}: {
  swimlane: Swimlane;
  board: Board;
  onBack: () => void;
  onSetStatus: (payload: TaskRef, toColumnId: string) => void;
  onOpenTask: (payload: TaskRef) => void;
}) {
  const tasks = swimlane.columns.flatMap((col) =>
    col.cards.map((card) => ({ card, columnId: col.id })),
  );
  const total = tasks.length;
  const doneCount = tasks.filter(
    (t) => statusCategory(t.columnId) === "done",
  ).length;
  const inProgressCount = tasks.filter(
    (t) => statusCategory(t.columnId) === "inprogress",
  ).length;
  const donePct = progressPercent(doneCount, total);
  const inProgressPct = progressPercent(inProgressCount, total);
  const statuses = swimlane.columns.map((c) => ({ id: c.id, title: c.title }));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-1 pr-8">
        <button
          type="button"
          data-testid="epic-back"
          onClick={onBack}
          className="-ml-1 flex w-fit items-center gap-1 rounded px-1 text-xs text-primary-400 transition-colors hover:text-primary-600"
        >
          <ChevronLeft className="size-3.5" />
          Back to task
        </button>
        <DialogTitle
          render={<div className="text-lg font-medium text-primary-600" />}
        >
          {swimlane.title}
        </DialogTitle>
        <span className="text-xs text-primary-400">{board.title} epic</span>
      </div>

      <div
        data-testid="epic-progress"
        className="flex shrink-0 flex-col gap-1.5"
      >
        <div className="flex h-2 overflow-hidden rounded-full bg-primary-100">
          <div
            data-testid="epic-progress-fill"
            className="h-full shrink-0 bg-secondary-400 transition-[width]"
            style={{ width: `${donePct}%` }}
          />
          <div
            data-testid="epic-progress-inflight"
            className="h-full shrink-0 bg-secondary-300 transition-[width]"
            style={{ width: `${inProgressPct}%` }}
          />
        </div>
        <span
          data-testid="epic-progress-label"
          className="text-xs text-primary-400"
        >
          {donePct}% Done · {doneCount}/{total} issues
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-primary-400">
          Child issues
        </span>
        <div
          data-testid="epic-task-list"
          className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-y-contain"
        >
          {tasks.map(({ card, columnId }) => {
            const ref: TaskRef = {
              cardId: card.id,
              fromSwimlane: swimlane.id,
              fromColumn: columnId,
            };
            return (
              <EpicChildRow
                key={`${columnId}-${card.id}`}
                card={card}
                board={board}
                columnId={columnId}
                statuses={statuses}
                onOpen={() => onOpenTask(ref)}
                onSetStatus={(toColumnId) => onSetStatus(ref, toColumnId)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EpicChildRow({
  card,
  board,
  columnId,
  statuses,
  onOpen,
  onSetStatus,
}: {
  card: Card;
  board: Board;
  columnId: string;
  statuses: { id: string; title: string }[];
  onOpen: () => void;
  onSetStatus: (toColumnId: string) => void;
}) {
  const taskNumber = formatTaskNumber(board.title, card.id);
  const done = statusCategory(columnId) === "done";
  return (
    <div
      data-testid="epic-task"
      className="flex items-center gap-3 rounded-lg border border-primary-100 bg-primary-50 p-2.5"
    >
      <button
        type="button"
        data-testid="epic-task-title"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="shrink-0 font-mono text-[11px] font-medium text-primary-400">
          {taskNumber}
        </span>
        <span className="line-clamp-1 text-sm text-primary-600 hover:underline">
          {card.title}
        </span>
      </button>
      <Avatar size="sm" className="size-5! shrink-0">
        <AvatarImage src={card.assignee.src} alt="User profile pic" />
      </Avatar>
      <select
        data-testid="epic-task-status"
        value={columnId}
        onChange={(e) => onSetStatus(e.target.value)}
        className={cn(
          "shrink-0 cursor-pointer rounded border-none px-1.5 py-0.5 text-[11px] font-medium uppercase outline-none",
          done
            ? "bg-secondary-50 text-secondary-400"
            : "bg-primary-100 text-primary-500",
        )}
      >
        {statuses.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </select>
    </div>
  );
}
