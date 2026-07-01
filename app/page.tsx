"use client";

import {
  AddTaskDialog,
  type AddTaskTeam,
  type AddTaskValues,
} from "@/app/components/AddTaskDialog";
import {
  type Board,
  type Card,
  type Column,
  type Priority,
  type Swimlane,
  getBoard,
  users,
} from "@/app/lib/boards";
import { cn } from "@/app/lib/utils";
import { Avatar, AvatarImage } from "@/ui/avatar";
import { Button } from "@/ui/button";
import { Separator } from "@/ui/separator";
import {
  BookUser,
  Box,
  Calendar,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  UserPlus,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import CardDetailDialog from "./components/TaskDetailDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./components/ui/tooltip";

const priorityStyles: Record<Priority, string> = {
  Urgent: "bg-red-light text-red",
  Medium: "bg-brand-light text-brand",
  Normal: "bg-secondary-50 text-secondary-400",
  Low: "bg-primary-100 text-primary-400",
};

const COLUMN_EXPANDED_WIDTH = 232;
const COLUMN_NARROW_WIDTH = 140;
const COLUMN_COLLAPSED_WIDTH = 52;
const COLUMN_GAP = 8;
const COLUMN_SHRINK_RANGE = COLUMN_EXPANDED_WIDTH - COLUMN_COLLAPSED_WIDTH;
const COLUMN_HEADER_WIP_MIN_WIDTH = 210;
const COLUMN_HEADER_PLUS_MIN_WIDTH = 170;
const COLUMN_CARD_PRIORITY_MIN_WIDTH = 160;
const COLUMN_HEADER_MORE_MIN_WIDTH = 150;
const STICKY_EDGE_SHADOW =
  "shadow-[0px_1px_3px_0px_#0000004D,0px_4px_8px_3px_#00000026]";
const SWIMLANE_PAGE = 360;
const LANE_HEADER_HEIGHT = 60;
const LANE_SWITCH_SPAN = 160;
const LANE_EXPANDED_MIN = LANE_HEADER_HEIGHT + 16 + 444 + 48;

function columnWidthAtScroll(index: number, scrollLeft: number) {
  const collapseStart = index * COLUMN_SHRINK_RANGE;
  const shrink = Math.min(
    Math.max(scrollLeft - collapseStart, 0),
    COLUMN_SHRINK_RANGE,
  );
  return COLUMN_EXPANDED_WIDTH - shrink;
}

function stickyLeftAtScroll(columnIndex: number, scrollLeft: number) {
  let left = 0;
  for (let i = 0; i < columnIndex; i++) {
    left += columnWidthAtScroll(i, scrollLeft) + COLUMN_GAP;
  }
  return left;
}

function totals(board: Board) {
  let tasks = 0;
  let swimlanes = 0;
  for (const s of board.swimlanes) {
    swimlanes += 1;
    for (const c of s.columns) tasks += c.cards.length;
  }
  return { tasks, swimlanes };
}

export default function KanbanPage() {
  return (
    <Suspense fallback={<KanbanPageFallback />}>
      <KanbanBoard />
    </Suspense>
  );
}

function KanbanPageFallback() {
  return (
    <div className="h-full w-full animate-pulse bg-primary-50" aria-hidden />
  );
}

function KanbanBoard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const boardId = searchParams.get("board");
  const board = useMemo(() => getBoard(boardId), [boardId]);

  const [swimlanes, setSwimlanes] = useState<Swimlane[]>(board.swimlanes);
  const [activeLane, setActiveLane] = useState(0);
  const laneScrollRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragOver, setDragOver] = useState<DragTarget | null>(null);
  const [clickDrag, setClickDrag] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerDefaults, setComposerDefaults] = useState<{
    teamId?: string;
    statusId?: string;
  }>({});
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const highlightTimer = useRef<number | null>(null);
  const [detail, setDetail] = useState<DropPayload | null>(null);

  const openCardDetail = useCallback(
    (payload: DropPayload) => setDetail(payload),
    [],
  );

  const updateCard = useCallback(
    (target: DropPayload, patch: Partial<Card>) => {
      setSwimlanes((prev) =>
        prev.map((s) =>
          s.id !== target.fromSwimlane
            ? s
            : {
                ...s,
                columns: s.columns.map((c) =>
                  c.id !== target.fromColumn
                    ? c
                    : {
                        ...c,
                        cards: c.cards.map((card) =>
                          card.id === target.cardId
                            ? { ...card, ...patch }
                            : card,
                        ),
                      },
                ),
              },
        ),
      );
    },
    [],
  );

  const teams = useMemo<AddTaskTeam[]>(
    () =>
      swimlanes.map((s) => ({
        id: s.id,
        label: s.title,
        statuses: s.columns.map((c) => ({ id: c.id, label: c.title })),
      })),
    [swimlanes],
  );

  const openComposer = useCallback((teamId?: string, statusId?: string) => {
    setComposerDefaults({ teamId, statusId });
    setComposerOpen(true);
  }, []);

  // Command palette routes here with ?new-task=1 to launch the composer.
  const wantsNewTask = searchParams.get("new-task");
  useEffect(() => {
    if (!wantsNewTask) return;
    openComposer();
    router.replace("/", { scroll: false });
  }, [wantsNewTask, openComposer, router]);

  const stageMinHeight = swimlanes.reduce(
    (sum, lane, i) =>
      sum +
      (i === activeLane && lane.columns.length > 0
        ? LANE_EXPANDED_MIN
        : LANE_HEADER_HEIGHT),
    0,
  );
  const stageOverflow = Math.max(0, stageMinHeight - viewportHeight);
  const laneSegment = Math.max(SWIMLANE_PAGE, stageOverflow + LANE_SWITCH_SPAN);

  const laneRunway = (swimlanes.length - 1) * laneSegment;

  const applyLaneScroll = useCallback(
    (scrollTop: number) => {
      const next = Math.min(
        swimlanes.length - 1,
        Math.max(0, Math.floor(scrollTop / laneSegment)),
      );
      setActiveLane(next);
      const stage = stageRef.current;
      if (stage) {
        // Past the runway the sticky budget is exhausted and the stage
        // scrolls naturally, which already provides the scroll-through.
        const natural = Math.max(0, scrollTop - laneRunway);
        const within = Math.max(
          0,
          Math.min(Math.max(scrollTop - next * laneSegment, 0), stageOverflow) -
            natural,
        );
        stage.style.transform = `translateY(-${within}px)`;
      }
    },
    [swimlanes.length, laneSegment, stageOverflow],
  );

  const handleLaneScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      applyLaneScroll(e.currentTarget.scrollTop);
    },
    [applyLaneScroll],
  );

  // Jumps the (visually inert) runway scroller; the accordion tween itself
  // is the visible motion, so an instant jump keeps the expand animation's
  // start deterministic relative to the click.
  function scrollToLane(index: number) {
    laneScrollRef.current?.scrollTo({ top: index * laneSegment });
  }

  useEffect(() => {
    const el = laneScrollRef.current;
    if (!el) return;
    const measure = () => setViewportHeight(el.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = laneScrollRef.current;
    if (el) applyLaneScroll(el.scrollTop);
  }, [applyLaneScroll]);

  function liftCard(payload: DropPayload, height: number) {
    setDrag({ ...payload, height });
    setDragOver({
      swimlaneId: payload.fromSwimlane,
      columnId: payload.fromColumn,
    });
  }

  function clickLiftCard(
    payload: DropPayload,
    height: number,
    x: number,
    y: number,
  ) {
    liftCard(payload, height);
    setClickDrag(true);
    setPointer({ x, y });
  }

  function endDrag() {
    setDrag(null);
    setDragOver(null);
    setClickDrag(false);
  }

  const carriedCard = useMemo(() => {
    if (!drag) return null;
    for (const lane of swimlanes) {
      for (const col of lane.columns) {
        const found = col.cards.find((c) => c.id === drag.cardId);
        if (found) return found;
      }
    }
    return null;
  }, [drag, swimlanes]);

  const detailData = useMemo(() => {
    if (!detail) return null;
    const lane = swimlanes.find((s) => s.id === detail.fromSwimlane);
    const col = lane?.columns.find((c) => c.id === detail.fromColumn);
    const card = col?.cards.find((c) => c.id === detail.cardId);
    if (!lane || !col || !card) return null;
    return {
      card,
      columnTitle: col.title,
      swimlaneTitle: lane.title,
      swimlane: lane,
    };
  }, [detail, swimlanes]);

  useEffect(() => {
    if (!clickDrag) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") endDrag();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clickDrag]);

  function handleColumnDragOver(
    swimlaneId: string,
    columnId: string,
    over: boolean,
  ) {
    setDragOver((prev) => {
      const matches =
        prev != null &&
        prev.swimlaneId === swimlaneId &&
        prev.columnId === columnId;
      if (over) return matches ? prev : { swimlaneId, columnId };
      return matches ? null : prev;
    });
  }

  useEffect(() => {
    setSwimlanes(board.swimlanes);
    setActiveLane(0);
    laneScrollRef.current?.scrollTo({ top: 0 });
  }, [board]);

  function moveCard(
    cardId: number,
    fromSwimlane: string,
    fromColumn: string,
    toSwimlane: string,
    toColumn: string,
  ) {
    if (fromSwimlane === toSwimlane && fromColumn === toColumn) return;
    setSwimlanes((prev) => {
      let moved: Card | undefined;
      const stripped = prev.map((s) =>
        s.id !== fromSwimlane
          ? s
          : {
              ...s,
              columns: s.columns.map((c) => {
                if (c.id !== fromColumn) return c;
                const idx = c.cards.findIndex((card) => card.id === cardId);
                if (idx === -1) return c;
                moved = c.cards[idx];
                return {
                  ...c,
                  cards: c.cards.filter((_, i) => i !== idx),
                };
              }),
            },
      );
      if (!moved) return prev;
      return stripped.map((s) =>
        s.id !== toSwimlane
          ? s
          : {
              ...s,
              columns: s.columns.map((c) =>
                c.id !== toColumn ? c : { ...c, cards: [...c.cards, moved!] },
              ),
            },
      );
    });
  }

  function createTask(values: AddTaskValues) {
    const id = Date.now();
    setSwimlanes((prev) =>
      prev.map((s) =>
        s.id !== values.teamId
          ? s
          : {
              ...s,
              columns: s.columns.map((c) =>
                c.id !== values.statusId
                  ? c
                  : {
                      ...c,
                      cards: [
                        {
                          id,
                          title: values.title,
                          priority: values.priority,
                          due: values.due,
                          tag: s.title,
                          assignee: values.assignee,
                          description: values.description,
                        },
                        ...c.cards,
                      ],
                    },
              ),
            },
      ),
    );
    setHighlightId(id);
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(
      () => setHighlightId(null),
      3000,
    );
  }

  const stats = totals({ ...board, swimlanes });

  return (
    <div
      className="h-full w-full flex flex-col bg-primary-50"
      onMouseMove={
        clickDrag
          ? (e) => setPointer({ x: e.clientX, y: e.clientY })
          : undefined
      }
      onClick={clickDrag ? () => endDrag() : undefined}
    >
      <CardDetailDialog
        open={detailData != null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        card={detailData?.card ?? null}
        board={board}
        columnTitle={detailData?.columnTitle ?? ""}
        swimlaneTitle={detailData?.swimlaneTitle ?? ""}
        swimlane={detailData?.swimlane ?? null}
        onUpdateCard={(patch) => {
          if (detail) updateCard(detail, patch);
        }}
        onSetStatus={(ref, toColumnId) => {
          moveCard(
            ref.cardId,
            ref.fromSwimlane,
            ref.fromColumn,
            ref.fromSwimlane,
            toColumnId,
          );
          setDetail((d) =>
            d &&
            d.cardId === ref.cardId &&
            d.fromSwimlane === ref.fromSwimlane &&
            d.fromColumn === ref.fromColumn
              ? { ...d, fromColumn: toColumnId }
              : d,
          );
        }}
        onOpenTask={openCardDetail}
      />
      {clickDrag && drag && carriedCard && (
        <div
          data-testid="drag-ghost"
          aria-hidden
          className="pointer-events-none fixed z-200 w-[216px] -translate-x-1/2 -translate-y-1/2 rotate-2 rounded-lg border border-primary-100 bg-white p-3 shadow-[0px_8px_24px_rgba(31,53,51,0.18)]"
          style={{ left: pointer.x, top: pointer.y }}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-xs",
                priorityStyles[carriedCard.priority],
              )}
            >
              {carriedCard.priority}
            </span>
            {carriedCard.due && (
              <span className="flex items-center gap-1.5 rounded bg-primary-100 px-1.5 py-0.5 text-xs text-primary-400">
                <Calendar className="size-3" />
                {carriedCard.due}
              </span>
            )}
          </div>
          <p className="mt-3 line-clamp-2 text-sm text-primary-500">
            {carriedCard.title}
          </p>
          <div
            data-testid="card-footer"
            className="flex items-center justify-between"
          >
            <span className="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] text-primary-400">
              {carriedCard.tag}
            </span>
            <Avatar size="sm" data-testid="card-assignee" className="size-5!">
              <AvatarImage
                src={carriedCard.assignee.src}
                alt="User profile pic"
              />
            </Avatar>
          </div>
        </div>
      )}
      <div
        data-testid="page-header"
        className="border-b border-primary-200 px-3 h-[58px] flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <h3
            data-testid="page-title"
            className="text-base text-primary-600 font-medium"
          >
            {board.title}
          </h3>
          <Pencil className="size-4 text-primary-400" />
          <Separator orientation="vertical" />
          <p
            data-testid="muted-text-sample"
            className="text-primary-400 text-xs"
          >
            {stats.swimlanes} swimlanes
          </p>
          <Separator orientation="vertical" />
          <p className="text-primary-400 text-xs">{stats.tasks} tasks</p>
          <Separator orientation="vertical" />
          <div className="flex items-center">
            {Array.from({ length: Math.min(board.memberCount, 3) }).map(
              (_, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger>
                    <Avatar
                      data-testid="member-avatar"
                      className={cn(
                        "size-5 border-[3px] border-primary-50",
                        i < 2 && "-mr-1",
                      )}
                    >
                      <AvatarImage src={users[i].src} alt="User profile pic" />
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div>
                      <div className="flex items-center gap-2">
                        <Avatar data-testid="member-avatar" size="sm">
                          <AvatarImage
                            src={users[i].src}
                            alt="User profile pic"
                          />
                        </Avatar>
                        <div>
                          <p className="font-semibold">
                            {users[i].email}
                            {users[i].isAdmin && (
                              <span className="ml-2 text-primary-400/70 text-[9px] rounded-sm border border-primary-300 px-1 py-0.5">
                                Admin
                              </span>
                            )}
                          </p>
                          <p className="text-primary-400/70 text-xs">
                            {users[i].name}
                          </p>
                        </div>
                      </div>
                      <Separator
                        orientation="horizontal"
                        className="my-1 bg-primary-300/50"
                      />
                      <div className="flex items-center gap-1 mb-0.5">
                        <div
                          className={cn(
                            "size-1.5 rounded-full",
                            users[i].status === "Online"
                              ? "bg-green-500 animate-pulse"
                              : "bg-primary-400/75",
                          )}
                        />
                        <p>{users[i].status}</p>
                      </div>
                      <div className="flex items-center gap-1 mb-0.5">
                        <BookUser className="size-3.5" />
                        <p>{users[i].role}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Box className="size-3.5" />
                        <p>
                          {board.title}
                          <span className="ml-1 text-primary-400/70">
                            +{users[i].boardCount - 1}
                          </span>
                        </p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ),
            )}
          </div>
          <p
            data-testid="member-count-label"
            className="text-primary-400 text-xs"
          >
            {board.memberCount} members
          </p>
          <Button size="sm" variant="outline">
            <UserPlus />
            Invite
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-primary-400 text-xs">Group by:</p>
          <Button size="sm" variant="outline">
            Swimlane
            <ChevronDown />
          </Button>
          <Button
            size="sm"
            data-testid="add-task"
            onClick={() => openComposer()}
            className="bg-secondary-400 text-white hover:bg-secondary-400/90"
          >
            <Plus />
            Add Task
          </Button>
        </div>
      </div>

      <AddTaskDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        teams={teams}
        defaultTeamId={composerDefaults.teamId ?? null}
        defaultStatusId={composerDefaults.statusId ?? null}
        onCreate={createTask}
      />

      <div
        ref={laneScrollRef}
        data-testid="swimlane-stack"
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-none"
        onScroll={handleLaneScroll}
      >
        <div
          ref={stageRef}
          className="sticky top-0 h-full flex flex-col"
          style={{ minHeight: stageMinHeight }}
        >
          {swimlanes.map((swimlane, laneIdx) => {
            const hasColumns = swimlane.columns.length > 0;
            const isActive = laneIdx === activeLane;
            const expanded = isActive && hasColumns;
            return (
              <motion.div
                key={swimlane.id}
                data-testid="swimlane-lane"
                data-active={isActive}
                className="flex min-h-0 flex-col overflow-hidden border-b border-primary-200"
                initial={false}
                animate={{ flexGrow: expanded ? 1 : 0 }}
                transition={{ type: "tween", duration: 0.28, ease: "easeOut" }}
                style={{
                  flexBasis: LANE_HEADER_HEIGHT,
                  flexShrink: 0,
                }}
              >
                <Button
                  data-testid={`lane-header-${swimlane.id}`}
                  variant="ghost"
                  onClick={() => scrollToLane(laneIdx)}
                  className="gap-3 self-start p-0 h-fit hover:bg-transparent border-0 px-3 pt-4"
                >
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary-200 text-primary-500">
                    {expanded ? (
                      <ChevronUp className="size-3" />
                    ) : (
                      <ChevronDown className="size-3" />
                    )}
                  </span>
                  <span
                    data-testid="eyebrow-label"
                    className="text-xs font-medium uppercase text-primary-600"
                  >
                    {swimlane.title}
                  </span>
                </Button>
                {hasColumns && (
                  <div
                    className={cn(
                      "flex-1 min-h-0 overflow-hidden",
                      !expanded && "pointer-events-none",
                    )}
                  >
                    <SwimlaneColumns
                      board={board}
                      columns={swimlane.columns}
                      swimlaneId={swimlane.id}
                      drag={drag}
                      dragOver={dragOver}
                      onCardLift={liftCard}
                      onCardClickLift={clickLiftCard}
                      onCardDragEnd={endDrag}
                      onCardOpen={openCardDetail}
                      onColumnDragOver={(columnId, over) =>
                        handleColumnDragOver(swimlane.id, columnId, over)
                      }
                      highlightId={highlightId}
                      onAddCard={(columnId) =>
                        openComposer(swimlane.id, columnId)
                      }
                      onDropCard={(payload, columnId) => {
                        endDrag();
                        moveCard(
                          payload.cardId,
                          payload.fromSwimlane,
                          payload.fromColumn,
                          swimlane.id,
                          columnId,
                        );
                      }}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
        <div aria-hidden style={{ height: laneRunway }} />
      </div>
    </div>
  );
}

type DropPayload = {
  cardId: number;
  fromSwimlane: string;
  fromColumn: string;
};

type DragState = DropPayload & { height: number };

type DragTarget = { swimlaneId: string; columnId: string };

function SwimlaneColumns({
  board,
  columns,
  swimlaneId,
  drag,
  dragOver,
  highlightId,
  onCardLift,
  onCardClickLift,
  onCardDragEnd,
  onCardOpen,
  onColumnDragOver,
  onAddCard,
  onDropCard,
}: {
  board: Board;
  columns: Column[];
  swimlaneId: string;
  drag: DragState | null;
  dragOver: DragTarget | null;
  highlightId: number | null;
  onCardLift: (payload: DropPayload, height: number) => void;
  onCardClickLift: (
    payload: DropPayload,
    height: number,
    x: number,
    y: number,
  ) => void;
  onCardDragEnd: () => void;
  onCardOpen: (payload: DropPayload) => void;
  onColumnDragOver: (columnId: string, over: boolean) => void;
  onAddCard: (columnId: string) => void;
  onDropCard: (payload: DropPayload, columnId: string) => void;
}) {
  const [scrollLeft, setScrollLeft] = useState(0);
  const [endDockedCol, setEndDockedCol] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<number | null>(null);
  const lastScrollLeft = useRef(0);
  const lastDirection = useRef(1);

  const SCRUB_SPAN = COLUMN_EXPANDED_WIDTH - COLUMN_NARROW_WIDTH;

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const node = e.currentTarget;
      const s = node.scrollLeft;
      const prev = lastScrollLeft.current;
      if (s !== prev) {
        lastDirection.current = s > prev ? 1 : -1;
        lastScrollLeft.current = s;
      }
      setScrollLeft(s);

      const maxScroll = node.scrollWidth - node.clientWidth;
      if (s < maxScroll - 2) setEndDockedCol(null);

      const zoneIdx = Math.floor(s / COLUMN_SHRINK_RANGE);
      const inZone = s % COLUMN_SHRINK_RANGE > SCRUB_SPAN;
      const wasInSameZone =
        prev % COLUMN_SHRINK_RANGE > SCRUB_SPAN &&
        Math.floor(prev / COLUMN_SHRINK_RANGE) === zoneIdx;
      if (inZone && !wasInSameZone) {
        const target =
          lastDirection.current > 0
            ? Math.min((zoneIdx + 1) * COLUMN_SHRINK_RANGE, maxScroll)
            : zoneIdx * COLUMN_SHRINK_RANGE + SCRUB_SPAN;
        if (Math.abs(target - s) > 1) {
          node.scrollTo({ left: target, behavior: "smooth" });
        }
      }

      if (settleTimer.current != null) window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(() => {
        const el = scrollRef.current;
        if (!el) return;
        const cur = el.scrollLeft;
        const zone = cur % COLUMN_SHRINK_RANGE;
        if (zone <= SCRUB_SPAN) return;
        const idx = Math.floor(cur / COLUMN_SHRINK_RANGE);
        const max = el.scrollWidth - el.clientWidth;
        const target =
          lastDirection.current > 0
            ? Math.min((idx + 1) * COLUMN_SHRINK_RANGE, max)
            : idx * COLUMN_SHRINK_RANGE + SCRUB_SPAN;
        if (Math.abs(target - cur) > 1) {
          el.scrollTo({ left: target, behavior: "smooth" });
        } else if (lastDirection.current > 0 && target === max) {
          setEndDockedCol(idx);
        }
      }, 0);
    },
    [SCRUB_SPAN],
  );

  useEffect(
    () => () => {
      if (settleTimer.current != null) window.clearTimeout(settleTimer.current);
    },
    [],
  );

  const dragScrollDir = useRef(0);
  const dragScrollRaf = useRef<number | null>(null);

  const stopDragScroll = useCallback(() => {
    dragScrollDir.current = 0;
    if (dragScrollRaf.current != null) {
      cancelAnimationFrame(dragScrollRaf.current);
      dragScrollRaf.current = null;
    }
  }, []);

  // Native drags don't auto-scroll the column track; nudge scrollLeft while
  // a lifted card hovers near the container's left or right edge so every
  // column stays reachable mid-drag. Scrolling feeds the normal scrub/dock
  // machinery, so columns dock out of the way as the drag pushes across.
  const handleDragAutoScroll = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!drag) return;
      const node = scrollRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const zone = 80;
      dragScrollDir.current =
        e.clientX < rect.left + zone
          ? -1
          : e.clientX > rect.right - zone
            ? 1
            : 0;
      if (dragScrollDir.current !== 0 && dragScrollRaf.current == null) {
        const step = () => {
          const el = scrollRef.current;
          if (!el || dragScrollDir.current === 0) {
            dragScrollRaf.current = null;
            return;
          }
          el.scrollLeft += dragScrollDir.current * 14;
          dragScrollRaf.current = requestAnimationFrame(step);
        };
        dragScrollRaf.current = requestAnimationFrame(step);
      }
    },
    [drag],
  );

  useEffect(() => {
    if (!drag) stopDragScroll();
    return stopDragScroll;
  }, [drag, stopDragScroll]);

  return (
    <div
      ref={scrollRef}
      data-testid="swimlane-columns"
      className="h-full overflow-x-auto px-3 py-8"
      onScroll={handleScroll}
      onDragOver={handleDragAutoScroll}
    >
      <div
        className="flex h-full items-stretch gap-2"
        style={{
          width:
            columns.length * COLUMN_EXPANDED_WIDTH +
            (columns.length - 1) * COLUMN_GAP,
        }}
      >
        {columns.map((column, colIdx) => (
          <SwimlaneSlot
            board={board}
            key={column.id}
            column={column}
            colIdx={colIdx}
            scrollLeft={scrollLeft}
            endDocked={endDockedCol === colIdx}
            swimlaneId={swimlaneId}
            drag={drag}
            isDragOver={
              dragOver != null &&
              dragOver.swimlaneId === swimlaneId &&
              dragOver.columnId === column.id
            }
            highlightId={highlightId}
            onCardLift={onCardLift}
            onCardClickLift={onCardClickLift}
            onCardDragEnd={onCardDragEnd}
            onCardOpen={onCardOpen}
            onDragOverChange={(over) => onColumnDragOver(column.id, over)}
            onAddCard={() => onAddCard(column.id)}
            onDropCard={(payload) => onDropCard(payload, column.id)}
          />
        ))}
      </div>
    </div>
  );
}

function SwimlaneSlot({
  board,
  column,
  colIdx,
  scrollLeft,
  endDocked,
  swimlaneId,
  drag,
  isDragOver,
  highlightId,
  onCardLift,
  onCardClickLift,
  onCardDragEnd,
  onCardOpen,
  onDragOverChange,
  onAddCard,
  onDropCard,
}: {
  board: Board;
  column: Column;
  colIdx: number;
  scrollLeft: number;
  endDocked: boolean;
  swimlaneId: string;
  drag: DragState | null;
  isDragOver: boolean;
  highlightId: number | null;
  onCardLift: (payload: DropPayload, height: number) => void;
  onCardClickLift: (
    payload: DropPayload,
    height: number,
    x: number,
    y: number,
  ) => void;
  onCardDragEnd: () => void;
  onCardOpen: (payload: DropPayload) => void;
  onDragOverChange: (over: boolean) => void;
  onAddCard: () => void;
  onDropCard: (payload: DropPayload) => void;
}) {
  const slotWidth = columnWidthAtScroll(colIdx, scrollLeft);
  const collapsed = slotWidth < COLUMN_NARROW_WIDTH;
  const dragExpand = collapsed && isDragOver && drag != null;
  const width = dragExpand
    ? COLUMN_EXPANDED_WIDTH
    : endDocked
      ? COLUMN_COLLAPSED_WIDTH
      : slotWidth;
  const widthMode = dragExpand ? "drag" : endDocked ? "end" : "slot";
  const [widthTransition, setWidthTransition] = useState(false);
  const prevWidthMode = useRef(widthMode);

  useEffect(() => {
    if (prevWidthMode.current === widthMode) return;
    prevWidthMode.current = widthMode;
    setWidthTransition(true);
    const timer = window.setTimeout(() => setWidthTransition(false), 220);
    return () => window.clearTimeout(timer);
  }, [widthMode]);

  return (
    <div
      className="sticky shrink-0 self-stretch pointer-events-none"
      style={{
        left: stickyLeftAtScroll(colIdx, scrollLeft),
        width: slotWidth,
        zIndex: dragExpand ? 99 : colIdx + 1,
      }}
    >
      <div
        className={cn(
          "h-full pointer-events-auto",
          widthTransition && "transition-[width] duration-150 ease-out",
        )}
        style={{
          width,
          maxWidth: dragExpand ? undefined : slotWidth,
        }}
      >
        <KanbanColumn
          board={board}
          column={column}
          swimlaneId={swimlaneId}
          testId={`kanban-column-${colIdx}`}
          width={dragExpand ? COLUMN_EXPANDED_WIDTH : width}
          collapsed={collapsed && !dragExpand}
          drag={drag}
          isDragOver={isDragOver}
          highlightId={highlightId}
          onCardLift={onCardLift}
          onCardClickLift={onCardClickLift}
          onCardDragEnd={onCardDragEnd}
          onCardOpen={onCardOpen}
          onDragOverChange={onDragOverChange}
          onAddCard={onAddCard}
          onDropCard={onDropCard}
        />
      </div>
    </div>
  );
}

function KanbanColumn({
  board,
  column,
  swimlaneId,
  testId,
  width,
  collapsed = false,
  drag,
  isDragOver,
  highlightId,
  onCardLift,
  onCardClickLift,
  onCardDragEnd,
  onCardOpen,
  onDragOverChange,
  onAddCard,
  onDropCard,
}: {
  board: Board;
  column: Column;
  swimlaneId: string;
  testId: string;
  width: number;
  collapsed?: boolean;
  drag: DragState | null;
  isDragOver: boolean;
  highlightId: number | null;
  onCardLift: (payload: DropPayload, height: number) => void;
  onCardClickLift: (
    payload: DropPayload,
    height: number,
    x: number,
    y: number,
  ) => void;
  onCardDragEnd: () => void;
  onCardOpen: (payload: DropPayload) => void;
  onDragOverChange: (over: boolean) => void;
  onAddCard: () => void;
  onDropCard: (payload: DropPayload) => void;
}) {
  const showWip = column.wip != null && width > COLUMN_HEADER_WIP_MIN_WIDTH;
  const showPlus = width > COLUMN_HEADER_PLUS_MIN_WIDTH;
  const showMore = width > COLUMN_HEADER_MORE_MIN_WIDTH;
  const showHeaderActions = showWip || showPlus || showMore;
  const showDropzone = isDragOver && drag != null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edgeShadow, setEdgeShadow] = useState({ top: false, bottom: false });

  const updateEdgeShadow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setEdgeShadow({
      top: scrollTop > 0,
      bottom: scrollTop + clientHeight < scrollHeight - 1,
    });
  }, []);

  useLayoutEffect(() => {
    if (collapsed) return;
    updateEdgeShadow();
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateEdgeShadow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [collapsed, column.cards.length, updateEdgeShadow]);

  const headerInner = (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate text-xs text-primary-600">{column.title}</p>
        <span
          data-testid="column-count"
          className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-200 text-[10px] text-primary-500"
        >
          {column.cards.length}
        </span>
      </div>
      {showHeaderActions && (
        <div className="flex shrink-0 items-center gap-2">
          {showWip && (
            <span className="rounded border border-primary-200 px-1.5 py-0.5 text-[10px] text-primary-400">
              WIP: {column.wip}
            </span>
          )}
          {showPlus && <Plus className="size-4 text-primary-400" />}
          {showMore && <MoreHorizontal className="size-4 text-primary-400" />}
        </div>
      )}
    </>
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    try {
      const data = JSON.parse(
        e.dataTransfer.getData("application/json"),
      ) as DropPayload;
      onDropCard(data);
    } catch {}
  }

  return (
    <div
      data-testid={testId}
      onDragOver={(e) => {
        if (!drag) return;
        e.preventDefault();
        if (!isDragOver) onDragOverChange(true);
      }}
      onDragLeave={(e) => {
        if (!drag) return;
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          onDragOverChange(false);
        }
      }}
      onDrop={handleDrop}
      onMouseEnter={() => {
        if (drag) onDragOverChange(true);
      }}
      onClick={(e) => {
        if (!drag) return;
        e.stopPropagation();
        onDropCard(drag);
      }}
      className={cn(
        "flex w-full flex-col overflow-hidden bg-white shadow-[2px_4px_40px_10px_rgba(31,53,51,0.04)] transition-[colors,shadow]",
        "h-111 rounded-2xl",
        showDropzone &&
          "shadow-[0px_1px_3px_0px_#0000004D,0px_4px_8px_3px_#00000026]",
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {collapsed ? (
          <motion.div
            key="rail"
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <div
              data-testid="column-header"
              className="flex flex-col items-center gap-2 border-b border-primary-200 bg-primary-50 px-4 pt-3 pb-5 rounded-t-2xl"
            >
              <p className="text-[10px] font-medium text-primary-600 [writing-mode:vertical-rl]">
                {column.title}
              </p>
              <span
                data-testid="column-count"
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-200 text-[10px] text-primary-500"
              >
                {column.cards.length}
              </span>
            </div>
            <div className="flex flex-col gap-3 items-center justify-center py-2">
              {column.cards.map((card) => (
                <div
                  key={card.id}
                  className={cn(
                    "rounded size-3",
                    priorityStyles[card.priority],
                  )}
                ></div>
              ))}
            </div>
            <Button
              size="icon-sm"
              data-testid="add-card"
              onClick={onAddCard}
              aria-label="Add card"
              className="mt-auto mb-3 self-center rounded-lg border-dashed border-primary-300 bg-transparent text-primary-400"
            >
              <Plus className="size-4" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <div
              ref={scrollRef}
              className="flex min-h-0 flex-1 flex-col overflow-y-auto"
              onScroll={updateEdgeShadow}
            >
              <div
                data-testid="column-header"
                className={cn(
                  "sticky top-0 z-10 flex items-center justify-between border-b border-primary-200 bg-primary-50 px-3 py-2 rounded-t-2xl transition-shadow",
                  edgeShadow.top && STICKY_EDGE_SHADOW,
                )}
              >
                {headerInner}
              </div>
              <div className="flex flex-col gap-2 pt-2 flex-1">
                {column.cards.length > 0 ? (
                  <div className="flex flex-col gap-2 mx-2">
                    {column.cards.map((card) => {
                      const isLifted = drag?.cardId === card.id;
                      return (
                        <Fragment key={card.id}>
                          <KanbanCard
                            board={board}
                            card={card}
                            swimlaneId={swimlaneId}
                            columnId={column.id}
                            width={width}
                            lifted={isLifted}
                            dragActive={drag != null}
                            highlighted={card.id === highlightId}
                            onLift={onCardLift}
                            onClickLift={onCardClickLift}
                            onDragEnd={onCardDragEnd}
                            onCardOpen={onCardOpen}
                          />
                          {isLifted && showDropzone && drag && (
                            <motion.div
                              data-testid="card-dropzone"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.12 }}
                              className="shrink-0 rounded-lg bg-primary-100"
                              style={{ height: drag.height }}
                            />
                          )}
                        </Fragment>
                      );
                    })}
                    <AnimatePresence>
                      {showDropzone &&
                        drag &&
                        !(
                          drag.fromSwimlane === swimlaneId &&
                          drag.fromColumn === column.id
                        ) && (
                          <motion.div
                            key="dropzone"
                            data-testid="card-dropzone"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.12 }}
                            className="shrink-0 rounded-lg bg-primary-100"
                            style={{ height: drag.height }}
                          />
                        )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 flex-col justify-center items-center mb-6 mt-21 max-w-40 mx-auto px-2">
                      <div className="bg-primary-100 size-8 flex items-center justify-center rounded-full">
                        <Lock className="text-primary-400 size-4" />
                      </div>
                      <p className="text-sm text-primary-500 text-center">
                        No {column.title.toLowerCase()} tasks
                      </p>
                      <p className="text-xs text-primary-400 text-center">
                        Tasks that are {column.title.toLowerCase()} will appear
                        here
                      </p>
                    </div>
                    <AnimatePresence>
                      {showDropzone && drag && (
                        <motion.div
                          key="dropzone-empty"
                          data-testid="card-dropzone"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.12 }}
                          className="shrink-0 rounded-lg border border-dashed border-primary-300 bg-primary-100 mx-2"
                          style={{ height: drag.height + 8 }}
                        />
                      )}
                    </AnimatePresence>
                  </>
                )}
                <div
                  className={cn(
                    "sticky bottom-0 z-10 bg-white px-2 pb-2 transition-shadow",
                    edgeShadow.bottom &&
                      `${STICKY_EDGE_SHADOW} border-t border-primary-200 pt-2`,
                  )}
                >
                  <Button
                    size="sm"
                    data-testid="add-card"
                    onClick={onAddCard}
                    className="w-full rounded-lg border-dashed border-primary-300 text-xs bg-transparent"
                  >
                    <Plus className="size-4" />
                    Add card
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CardTitle({ title }: { title: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () =>
      setTruncated(
        el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth,
      );
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [title]);

  return (
    <Tooltip>
      <TooltipTrigger
        disabled={!truncated}
        delay={300}
        closeOnClick={false}
        render={(props) => (
          <span
            {...props}
            ref={(node) => {
              ref.current = node;
              if (typeof props.ref === "function") {
                props.ref(node);
              } else if (props.ref) {
                props.ref.current = node;
              }
            }}
            data-testid="card-title"
            className={cn(
              "min-w-0 line-clamp-2 text-sm text-primary-500",
              props.className,
            )}
            draggable={false}
            onDragStart={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            {title}
          </span>
        )}
      />
      <TooltipContent side="top">
        <p>{title}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function KanbanCard({
  board,
  card,
  swimlaneId,
  columnId,
  width,
  lifted = false,
  dragActive = false,
  highlighted = false,
  onLift,
  onClickLift,
  onDragEnd,
  onCardOpen,
}: {
  board: Board;
  card: Card;
  swimlaneId: string;
  columnId: string;
  width: number;
  lifted?: boolean;
  dragActive?: boolean;
  highlighted?: boolean;
  onLift: (payload: DropPayload, height: number) => void;
  onClickLift: (
    payload: DropPayload,
    height: number,
    x: number,
    y: number,
  ) => void;
  onDragEnd: () => void;
  onCardOpen: (payload: DropPayload) => void;
}) {
  const showPriority = width > COLUMN_CARD_PRIORITY_MIN_WIDTH;
  const nativeDragRef = useRef(false);
  const payload: DropPayload = {
    cardId: card.id,
    fromSwimlane: swimlaneId,
    fromColumn: columnId,
  };
  const cardHeight = (target: HTMLElement) => {
    const el = target.closest('[data-testid="kanban-card"]');
    return el ? el.getBoundingClientRect().height : 0;
  };
  return (
    <div
      data-testid="kanban-card"
      onClick={(e) => {
        if (dragActive) return;
        e.stopPropagation();
        onCardOpen(payload);
      }}
      data-highlighted={highlighted || undefined}
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-primary-100 bg-primary-50 p-3 cursor-pointer transition-[box-shadow,background-color] duration-200",
        !dragActive &&
          "hover:shadow-[0px_1px_3px_0px_#0000004D,0px_4px_8px_3px_#00000026]",
        lifted && "hidden",
        highlighted && "bg-primary-100",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            data-testid="card-grip"
            aria-label="Drag card"
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              nativeDragRef.current = true;
              e.dataTransfer.setData(
                "application/json",
                JSON.stringify(payload),
              );
              e.dataTransfer.effectAllowed = "move";
              const el = e.currentTarget.closest(
                '[data-testid="kanban-card"]',
              ) as HTMLElement | null;
              const height = el ? el.getBoundingClientRect().height : 0;
              if (el) e.dataTransfer.setDragImage(el, 16, 16);
              window.setTimeout(() => onLift(payload, height), 0);
            }}
            onDragEnd={(e) => {
              e.stopPropagation();
              onDragEnd();
              window.setTimeout(() => {
                nativeDragRef.current = false;
              }, 0);
            }}
            onClick={(e) => {
              if (nativeDragRef.current) return;
              if (dragActive) return;
              e.stopPropagation();
              onClickLift(
                payload,
                cardHeight(e.currentTarget),
                e.clientX,
                e.clientY,
              );
            }}
            className="shrink-0 cursor-grab text-primary-300 transition-colors hover:text-primary-500 active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
          <span
            data-testid={`priority-badge-${card.priority.toLowerCase()}`}
            className={cn(
              "rounded",
              priorityStyles[card.priority],
              !showPriority ? "size-3" : "px-1.5 py-0.5 text-xs",
            )}
          >
            {showPriority && card.priority}
          </span>
        </div>
        {card.due && (
          <span className="flex items-center gap-1.5 rounded bg-primary-100 px-1.5 py-0.5 text-xs text-primary-400">
            <Calendar className="size-3" />
            {card.due}
          </span>
        )}
      </div>
      <CardTitle title={card.title} />
      <div
        data-testid="card-footer"
        className="flex items-center justify-between"
      >
        <span className="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] text-primary-400">
          {card.tag}
        </span>
        <Tooltip>
          <TooltipTrigger>
            <Avatar size="sm" data-testid="card-assignee" className="size-5!">
              <AvatarImage src={card.assignee.src} alt="User profile pic" />
            </Avatar>
          </TooltipTrigger>
          <TooltipContent data-testid="assignee-tooltip">
            <div>
              <div className="flex items-center gap-2">
                <Avatar data-testid="member-avatar" size="sm">
                  <AvatarImage src={card.assignee.src} alt="User profile pic" />
                </Avatar>
                <div>
                  <p className="font-semibold">
                    {card.assignee.email}
                    {card.assignee.isAdmin && (
                      <span className="ml-2 text-primary-400/70 text-[9px] rounded-sm border border-primary-300 px-1 py-0.5">
                        Admin
                      </span>
                    )}
                  </p>
                  <p className="text-primary-400/70 text-xs">
                    {card.assignee.name}
                  </p>
                </div>
              </div>
              <Separator
                orientation="horizontal"
                className="my-1 bg-primary-300/50"
              />
              <div className="flex items-center gap-1">
                <div
                  className={cn(
                    "size-1.5 rounded-full",
                    card.assignee.status === "Online"
                      ? "bg-green-500 animate-pulse"
                      : "bg-primary-400/75",
                  )}
                />
                <p>{card.assignee.status}</p>
              </div>
              <div className="flex items-center gap-1 mb-0.5">
                <BookUser className="size-3.5" />
                <p>{card.assignee.role}</p>
              </div>
              <div className="flex items-center gap-1 mb-0.5">
                <Box className="size-3.5" />
                <p>
                  {board.title}
                  <span className="ml-1 text-primary-400/70">
                    +{card.assignee.boardCount - 1}
                  </span>
                </p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
