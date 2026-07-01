"use client";

import { users, type Priority, type User } from "@/app/lib/boards";
import { detailsExpanded } from "@/app/lib/composer-disclosure";
import { renderDescription } from "@/app/lib/description";
import { RichTextarea } from "@/app/lib/rich-textarea";
import { cn } from "@/app/lib/utils";
import { Avatar, AvatarImage } from "@/ui/avatar";
import { Button } from "@/ui/button";
import { Calendar as CalendarPicker } from "@/ui/calendar";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import {
  Calendar,
  Code,
  Flag,
  Inbox,
  Megaphone,
  Paintbrush,
  Search,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useCollapse } from "react-collapsed";
import "vest/date";
import classnames from "vest/classnames";
import { create, enforce, omitWhen, test, type SuiteResult } from "vest/vest";

export type AddTaskStatus = { id: string; label: string };
export type AddTaskTeam = {
  id: string;
  label: string;
  statuses: AddTaskStatus[];
};
export type AddTaskValues = {
  title: string;
  teamId: string;
  statusId: string;
  due: string;
  priority: Priority;
  assignee: User;
  description: string;
};

type AddTaskFormData = {
  title: string;
  teamId: string | null;
  statusId: string | null;
  due: Date | null;
  priority: Priority | null;
  assignee: User | null;
  estimate: string;
  description: string;
};

const teamIcons: Record<string, ComponentType<{ className?: string }>> = {
  design: Paintbrush,
  engineering: Code,
  research: Search,
  marketing: Megaphone,
  dev: Code,
  docs: Inbox,
};

const priorities: { id: Priority; swatch: string }[] = [
  { id: "Urgent", swatch: "bg-red-light" },
  { id: "Medium", swatch: "bg-brand-light" },
  { id: "Normal", swatch: "bg-secondary-50" },
  { id: "Low", swatch: "bg-primary-100" },
];

// Figma popover spec: 200w, 12px radius, 40px items, primary-100 hover.
const menuClasses =
  "w-50 min-w-0 rounded-[12px] p-1 shadow-[0_8px_16px_rgba(0,0,0,0.08)] ring-black/8";
const menuItemClasses =
  "h-10 gap-[9px] rounded-md px-2 text-xs text-primary-400 focus:bg-primary-100 focus:text-primary-400 not-data-[variant=destructive]:focus:**:text-primary-400";

function formatDue(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

const chipFieldNames = [
  "teamId",
  "statusId",
  "due",
  "priority",
  "assignee",
] as const;

type FormField =
  | "title"
  | "estimate"
  | "description"
  | (typeof chipFieldNames)[number];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function parseEstimateHours(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*h?$/i);
  if (!match) return null;
  return Number(match[1]);
}

const suite = create((data: AddTaskFormData, teams: AddTaskTeam[]) => {
  test("title", () => {
    enforce(data.title)
      .message("Title is required")
      .isNotEmpty()
      .message("Title must be less than 250 characters")
      .maxLength(250);
  });
  test("teamId", () => {
    enforce(data.teamId)
      .message("Team is required")
      .isNotEmpty()
      .message("Team must be one of the available teams")
      .inside(teams.map((t) => t.id));
  });
  omitWhen(!data.teamId, () => {
    test("statusId", () => {
      const team = teams.find((t) => t.id === data.teamId);
      const validStatusIds = team?.statuses.map((s) => s.id) ?? [];
      enforce(data.statusId)
        .message("Status is required")
        .isNotEmpty()
        .message("Status must belong to the selected team")
        .inside(validStatusIds);
    });
  });
  omitWhen(!data.statusId, () => {
    test("due", () => {
      enforce(data.due).message("Due date is required").isNotNull();
      const today = startOfDay(new Date()).getTime();
      const dueDay = startOfDay(data.due!).getTime();
      enforce(dueDay)
        .message("Due date must be today or later")
        .greaterThanOrEquals(today);
    });
  });
  omitWhen(!data.due, () => {
    test("priority", () => {
      enforce(data.priority)
        .message("Priority is required")
        .isNotEmpty()
        .message("Priority must be one of the available priorities")
        .inside(priorities.map((p) => p.id));
    });
  });
  omitWhen(!data.priority, () => {
    test("assignee", () => {
      enforce(data.assignee?.email)
        .message("Assignee is required")
        .isNotEmpty()
        .message("Assignee must be one of the available assignees")
        .inside(users.map((u) => u.email));
    });
  });
  test("estimate", () => {
    enforce(data.estimate).message("Estimate is required").isNotEmpty();
    enforce(parseEstimateHours(data.estimate))
      .message("Estimate must be a valid number in hours")
      .isNotNull()
      .isNumeric();
  });
  test("description", () => {
    enforce(data.description)
      .message("Description is required")
      .isNotEmpty()
      .message("Description must be less than 500 characters")
      .maxLength(500);
  });
});

function ComposerDetails({
  estimate,
  onEstimateChange,
  error,
}: {
  estimate: string;
  onEstimateChange: (value: string) => void;
  error?: string;
}) {
  const { setExpanded, getToggleProps, getCollapseProps } = useCollapse({
    defaultExpanded: detailsExpanded(Boolean(error)),
  });

  useEffect(() => {
    if (error) setExpanded(detailsExpanded(true));
  }, [error, setExpanded]);

  return (
    <div className="border-t border-primary-100 px-4 py-3">
      <Button
        variant="ghost"
        type="button"
        {...getToggleProps()}
        className="text-primary-500"
        size="xs"
      >
        Details
      </Button>
      <div {...getCollapseProps()} data-testid="composer-details-panel">
        <div className="pt-2">
          <label className="text-[10px] uppercase text-primary-400">
            Estimate
          </label>
          <input
            data-testid="composer-estimate"
            placeholder="e.g. 2h"
            value={estimate}
            onChange={(e) => onEstimateChange(e.target.value)}
            aria-invalid={Boolean(error) || undefined}
            className={cn(
              "mt-1 w-full rounded-md border bg-transparent px-2 py-1 text-sm outline-none placeholder:text-primary-300",
              error ? "border-red" : "border-primary-200",
            )}
          />
          {error && (
            <p
              data-testid="composer-error"
              role="alert"
              className="mt-1 text-xs text-red"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function AddTaskDialog({
  open,
  onOpenChange,
  teams,
  defaultTeamId = null,
  defaultStatusId = null,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: AddTaskTeam[];
  defaultTeamId?: string | null;
  defaultStatusId?: string | null;
  onCreate: (values: AddTaskValues) => void;
}) {
  const [title, setTitle] = useState("");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [statusId, setStatusId] = useState<string | null>(null);
  const [due, setDue] = useState<Date | null>(null);
  const [dueOpen, setDueOpen] = useState(false);
  const [priority, setPriority] = useState<Priority | null>(null);
  const [assignee, setAssignee] = useState<User | null>(null);
  const [estimate, setEstimate] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [validationSnapshot, setValidationSnapshot] =
    useState<SuiteResult | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const formData = useMemo<AddTaskFormData>(
    () => ({
      title: title.trim(),
      teamId,
      statusId,
      due,
      priority,
      assignee,
      estimate,
      description: description.trim(),
    }),
    [title, teamId, statusId, due, priority, assignee, estimate, description],
  );

  useEffect(() => {
    if (!open) return;
    suite.reset();
    setSubmitted(false);
    setValidationSnapshot(null);
    setTitle("");
    setTeamId(defaultTeamId);
    setStatusId(defaultStatusId);
    setDue(null);
    setDueOpen(false);
    setPriority(null);
    setAssignee(null);
    setEstimate("");
    setDescription("");
  }, [open, defaultTeamId, defaultStatusId]);

  const currentValidation = useMemo(() => {
    if (!submitted) return null;
    return suite.run(formData, teams);
  }, [submitted, formData, teams]);

  function resolveFieldError(field: FormField) {
    if (!submitted || !validationSnapshot) return undefined;
    const snapshotError = validationSnapshot.getError(field);
    if (!snapshotError) return undefined;
    if (!currentValidation?.hasErrors(field)) return undefined;
    return snapshotError;
  }

  const chipClassnames = useMemo(() => {
    if (!submitted || !currentValidation) return null;
    return classnames(currentValidation, {
      valid: "ring-1 ring-inset ring-secondary-400",
    });
  }, [submitted, currentValidation]);

  function getChipResolvedClass(field: (typeof chipFieldNames)[number]) {
    if (!chipClassnames || !validationSnapshot?.hasErrors(field)) return "";
    if (resolveFieldError(field)) return "";
    return chipClassnames(field);
  }

  const team = teams.find((t) => t.id === teamId) ?? null;
  const statusSource = team ?? teams[0];
  const status = statusSource?.statuses.find((s) => s.id === statusId) ?? null;

  function submit() {
    setSubmitted(true);
    const next = suite.run(formData, teams);
    setValidationSnapshot(next);
    if (
      next.hasErrors() ||
      !due ||
      !priority ||
      !assignee ||
      !teamId ||
      !statusId
    )
      return;
    onCreate({
      title: formData.title,
      teamId,
      statusId,
      due: formatDue(due),
      priority,
      assignee,
      description: formData.description,
    });
    onOpenChange(false);
  }

  const TeamIcon = (team && teamIcons[team.id.toLowerCase()]) || Users;
  const titleError = resolveFieldError("title");
  const estimateError = resolveFieldError("estimate");
  const descriptionError = resolveFieldError("description");
  const chipErrors = chipFieldNames.flatMap((field) => {
    const error = resolveFieldError(field);
    return error ? [error] : [];
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="add-task-dialog"
        showCloseButton={false}
        overlayClassName="bg-primary-600/60 supports-backdrop-filter:backdrop-blur-none"
        className="w-[667px] gap-0 rounded-[16px] bg-white p-0 text-popover-foreground shadow-[2px_4px_40px_10px_rgba(31,53,51,0.10)] ring-0 sm:max-w-[667px]"
        initialFocus={titleRef}
      >
        <div className="flex items-center justify-between border-b border-primary-100 px-5 py-4">
          <DialogTitle className="text-base font-medium text-primary-600">
            Add Task
          </DialogTitle>
          <DialogClose
            data-testid="add-task-close"
            aria-label="Close"
            className="-m-1 cursor-pointer p-1 text-primary-500 hover:text-primary-600"
          >
            <X className="size-3" strokeWidth={2.4} />
          </DialogClose>
        </div>

        <div className="flex flex-col gap-4 px-4 pt-6 pb-4">
          <div>
            <div
              className={cn(
                "border-b",
                titleError ? "border-red" : "border-primary-200",
              )}
            >
              <textarea
                ref={titleRef}
                data-testid="task-title-input"
                rows={1}
                value={title}
                placeholder="Write a new task"
                aria-invalid={Boolean(titleError) || undefined}
                onChange={(e) => {
                  setTitle(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                className="w-full resize-none bg-transparent pb-1.5 text-sm text-black/87 outline-none placeholder:text-primary-400"
              />
            </div>
            {titleError && (
              <p role="alert" className="mt-1 text-xs text-red">
                {titleError}
              </p>
            )}
          </div>

          <div>
            <RichTextarea
              value={description}
              onChange={setDescription}
              render={(v) => renderDescription(v, { transparent: true })}
              rows={3}
              data-testid="composer-description"
              placeholder="Add detail… use #tags and @mentions"
              className={cn(
                "w-full resize-none rounded-lg border bg-transparent p-3 text-sm text-primary-500 outline-none placeholder:text-primary-400",
                descriptionError ? "border-red" : "border-primary-200",
              )}
            />
            {descriptionError && (
              <p role="alert" className="mt-1 text-xs text-red">
                {descriptionError}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <DropdownMenu>
                <ChipTrigger
                  testid="chip-team"
                  selected={Boolean(team)}
                  invalid={Boolean(resolveFieldError("teamId"))}
                  resolvedClass={getChipResolvedClass("teamId")}
                  icon={<TeamIcon className="size-3 text-primary-400" />}
                  label={team ? team.label : "Team"}
                />
                <DropdownMenuContent
                  data-testid="team-menu"
                  sideOffset={4}
                  className={menuClasses}
                >
                  {teams.map((t) => {
                    const Icon = teamIcons[t.id.toLowerCase()] || Users;
                    return (
                      <DropdownMenuItem
                        key={t.id}
                        data-testid={`team-option-${t.id}`}
                        className={menuItemClasses}
                        onClick={() => {
                          setTeamId(t.id);
                          if (!t.statuses.some((s) => s.id === statusId)) {
                            setStatusId(null);
                          }
                        }}
                      >
                        <Icon className="size-3 text-primary-400" />
                        {t.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <ChipTrigger
                  testid="chip-status"
                  selected={Boolean(status)}
                  invalid={Boolean(resolveFieldError("statusId"))}
                  resolvedClass={getChipResolvedClass("statusId")}
                  icon={<Inbox className="size-3 text-primary-400" />}
                  label={status ? status.label : "Status"}
                  disabled={!team}
                />
                <DropdownMenuContent
                  data-testid="status-menu"
                  sideOffset={4}
                  className={menuClasses}
                >
                  {(statusSource?.statuses ?? []).map((s) => (
                    <DropdownMenuItem
                      key={s.id}
                      data-testid={`status-option-${s.id}`}
                      className={menuItemClasses}
                      onClick={() => {
                        if (!team && statusSource) setTeamId(statusSource.id);
                        setStatusId(s.id);
                      }}
                    >
                      {s.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu open={dueOpen} onOpenChange={setDueOpen}>
                <ChipTrigger
                  testid="chip-due"
                  selected={Boolean(due)}
                  invalid={Boolean(resolveFieldError("due"))}
                  resolvedClass={getChipResolvedClass("due")}
                  icon={<Calendar className="size-3 text-primary-400" />}
                  label={due ? formatDue(due) : "Due Date"}
                  labelClass={due ? "text-primary-400" : undefined}
                  disabled={!status}
                />
                <DropdownMenuContent
                  data-testid="due-calendar"
                  sideOffset={4}
                  className="w-[250px] min-w-0 rounded-[12px] p-0 ring-primary-100 shadow-none"
                >
                  <p className="px-4 pt-2.5 text-lg font-medium text-primary-600">
                    {(due ?? new Date()).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <CalendarPicker
                    mode="single"
                    selected={due ?? undefined}
                    onSelect={(d) => {
                      if (d) {
                        setDue(d);
                        setDueOpen(false);
                      }
                    }}
                    defaultMonth={due ?? undefined}
                    weekStartsOn={1}
                    disableNavigation
                    showOutsideDays
                    formatters={{
                      formatWeekdayName: (d) =>
                        d
                          .toLocaleDateString("en-US", { weekday: "narrow" })
                          .toLowerCase(),
                      formatDay: (d) => d.getDate().toString().padStart(2, "0"),
                    }}
                    className={cn(
                      "w-full bg-transparent p-2.5 [--cell-size:calc(var(--cell-step)*7.5)]",
                      "[&_button[data-day]]:rounded-full [&_button[data-day]]:text-[10px] [&_button[data-day]]:text-primary-600 [&_button[data-day]:hover]:bg-primary-100",
                      "[&_button[data-day][data-selected-single=true]]:bg-[#2d4644] [&_button[data-day][data-selected-single=true]]:text-white",
                      "[&_.rdp-outside_button[data-day]]:text-primary-300",
                    )}
                    classNames={{
                      nav: "hidden",
                      month_caption: "hidden",
                      month: "flex w-full flex-col gap-1",
                      weekday:
                        "flex-1 text-[10px] font-normal text-primary-600",
                      week: "mt-0 flex w-full",
                      today: "bg-transparent",
                    }}
                  />
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <ChipTrigger
                  testid="chip-priority"
                  selected={Boolean(priority)}
                  invalid={Boolean(resolveFieldError("priority"))}
                  resolvedClass={getChipResolvedClass("priority")}
                  icon={<Flag className="size-3 text-primary-400" />}
                  label={priority ?? "Priority"}
                  disabled={!due}
                />
                <DropdownMenuContent
                  data-testid="priority-menu"
                  align="end"
                  sideOffset={4}
                  className={menuClasses}
                >
                  {priorities.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      data-testid={`priority-option-${p.id.toLowerCase()}`}
                      className={menuItemClasses}
                      onClick={() => setPriority(p.id)}
                    >
                      <span
                        data-testid={`priority-swatch-${p.id.toLowerCase()}`}
                        className={cn("size-3 rounded-[4px]", p.swatch)}
                      />
                      {p.id}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <ChipTrigger
                  testid="chip-assignee"
                  selected={Boolean(assignee)}
                  invalid={Boolean(resolveFieldError("assignee"))}
                  resolvedClass={getChipResolvedClass("assignee")}
                  icon={<UserIcon className="size-3 text-primary-400" />}
                  label={assignee ? assignee.name : "Assign to"}
                  disabled={!priority}
                />
                <DropdownMenuContent
                  data-testid="assignee-menu"
                  align="end"
                  sideOffset={4}
                  className={menuClasses}
                >
                  {users.map((u, i) => (
                    <DropdownMenuItem
                      key={u.email}
                      data-testid={`assignee-option-${i}`}
                      className={menuItemClasses}
                      onClick={() => setAssignee(u)}
                    >
                      <Avatar size="sm" className="size-5!">
                        <AvatarImage src={u.src} alt={u.name} />
                      </Avatar>
                      {u.name}
                      {i === 0 && " (Me)"}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {chipErrors.length > 0 && (
              <div role="alert" className="text-xs text-red">
                <p>Errors:</p>
                <ul className="mt-1 list-disc pl-4">
                  {chipErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <ComposerDetails
          estimate={estimate}
          onEstimateChange={setEstimate}
          error={estimateError}
        />

        <div className="flex justify-end rounded-b-[16px] border-t border-primary-100 bg-primary-50 px-4 py-3">
          <Button
            data-testid="add-task-submit"
            size="xs"
            onClick={submit}
            className="h-8 px-3 bg-secondary-400 hover:bg-secondary-400/90 text-white"
          >
            Add Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChipTrigger({
  testid,
  selected,
  invalid = false,
  resolvedClass,
  icon,
  label,
  labelClass,
  disabled = false,
}: {
  testid: string;
  selected: boolean;
  invalid?: boolean;
  resolvedClass?: string;
  icon: ReactNode;
  label: string;
  labelClass?: string;
  disabled?: boolean;
}) {
  return (
    <DropdownMenuTrigger
      data-testid={testid}
      data-selected={selected || undefined}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex h-8 flex-1 cursor-pointer items-center justify-center gap-1 rounded-md border px-3 transition-colors outline-none",
        invalid
          ? "border-red bg-white"
          : cn(
              selected
                ? "border-primary-200 bg-primary-200"
                : "border-primary-200 bg-white hover:bg-primary-100",
              resolvedClass,
            ),
        disabled && "cursor-not-allowed opacity-50",
      )}
      disabled={disabled}
    >
      {icon}
      <span className={cn("truncate text-xs text-primary-500", labelClass)}>
        {label}
      </span>
    </DropdownMenuTrigger>
  );
}
