"use client";

import { forwardRef } from "react";
import { AgGridReact, type AgGridReactProps } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type GridOptions,
} from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * Reclaim's AG Grid theme — Quartz tuned to the design tokens in globals.css:
 * white sheet, hairline rows, indigo accent, Inter body, tabular numbers.
 */
export const reclaimGridTheme = themeQuartz.withParams({
  accentColor: "#4647d3",
  backgroundColor: "#ffffff",
  foregroundColor: "#14142b",
  textColor: "#14142b",
  borderColor: "rgba(20, 20, 43, 0.07)",
  chromeBackgroundColor: "#fafafb",
  headerBackgroundColor: "#fafafb",
  headerTextColor: "#5c5c72",
  headerFontWeight: 600,
  headerFontSize: 11,
  headerHeight: 44,
  rowHeight: 60,
  fontFamily: "inherit",
  fontSize: 14,
  dataFontSize: 14,
  rowHoverColor: "rgba(70, 71, 211, 0.04)",
  selectedRowBackgroundColor: "rgba(70, 71, 211, 0.08)",
  oddRowBackgroundColor: "#ffffff",
  wrapperBorder: false,
  wrapperBorderRadius: 0,
  columnBorder: false,
  headerColumnBorder: false,
  headerColumnResizeHandleColor: "rgba(20, 20, 43, 0.12)",
  cellHorizontalPadding: 20,
  spacing: 8,
  borderRadius: 8,
  inputFocusBorder: { color: "#105bff", width: 1 },
  focusShadow: { radius: 3, spread: 0, color: "rgba(16, 91, 255, 0.3)" },
  iconSize: 14,
  browserColorScheme: "light",
});

export type ReclaimGridProps<T> = AgGridReactProps<T> & {
  /** Height of the grid area. Use "auto" with domLayout="autoHeight". */
  height?: number | string;
  className?: string;
};

const defaultGridOptions: GridOptions = {
  suppressCellFocus: false,
  animateRows: true,
  suppressMovableColumns: true,
  enableCellTextSelection: true,
  ensureDomOrder: true,
};

function ReclaimGridInner<T>(
  { height = "auto", className = "", ...props }: ReclaimGridProps<T>,
  ref: React.ForwardedRef<AgGridReact<T>>,
) {
  const autoHeight = height === "auto";
  return (
    <div
      className={`reclaim-grid w-full ${className}`}
      style={autoHeight ? undefined : { height }}
    >
      <AgGridReact<T>
        ref={ref}
        theme={reclaimGridTheme}
        domLayout={autoHeight ? "autoHeight" : "normal"}
        {...defaultGridOptions}
        {...props}
      />
    </div>
  );
}

export const ReclaimGrid = forwardRef(ReclaimGridInner) as <T>(
  props: ReclaimGridProps<T> & { ref?: React.ForwardedRef<AgGridReact<T>> },
) => ReturnType<typeof ReclaimGridInner>;
