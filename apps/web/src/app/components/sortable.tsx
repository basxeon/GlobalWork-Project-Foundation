"use client";

import { useCallback, useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";
export type SortState<K extends string> = { key: K; direction: SortDirection };

/**
 * Column sorting for the shared `.data-table` pattern. Callers supply a value
 * accessor per column; null/undefined always sorts last regardless of
 * direction, so rows with no due date never crowd out the urgent ones.
 */
export function useSort<Row, K extends string>(
  rows: Row[],
  accessors: Record<K, (row: Row) => string | number | null | undefined>,
  // NoInfer keeps the column union coming from `accessors`; without it the
  // initial sort key alone would narrow K to a single literal.
  initial: SortState<NoInfer<K>>,
) {
  const [sort, setSort] = useState<SortState<K>>(initial);

  const toggle = useCallback((key: K) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  }, []);

  const sorted = useMemo(() => {
    const read = accessors[sort.key];
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((left, right) => {
      const a = read(left);
      const b = read(right);
      const aEmpty = a === null || a === undefined || a === "";
      const bEmpty = b === null || b === undefined || b === "";
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      if (typeof a === "number" && typeof b === "number") {
        return (a - b) * factor;
      }
      return String(a).localeCompare(String(b), undefined, { numeric: true }) * factor;
    });
    // `accessors` is rebuilt on every render by callers, so it is deliberately
    // not a dependency; the sort key and the rows are what change the result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);

  return { sort, toggle, sorted };
}

export function SortHeader<K extends string>({
  label,
  column,
  sort,
  onSort,
}: {
  label: string;
  column: K;
  sort: SortState<K>;
  onSort: (key: K) => void;
}) {
  const active = sort.key === column;
  return (
    <th
      aria-sort={
        active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        className={`sort-header${active ? " active" : ""}`}
        onClick={() => onSort(column)}
      >
        {label}
        <span aria-hidden="true">
          {active ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}
