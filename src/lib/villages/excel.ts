import * as XLSX from "xlsx";
import {
  EXCEL_HEADERS,
  FULFILLMENT_STATUSES,
  VULNERABILITY_LEVELS,
  type ExcelField,
  type ValidationError,
  type VillageReliefRow,
} from "./types";

const FIELD_KEYS = Object.keys(EXCEL_HEADERS) as ExcelField[];

const HEADER_ALIASES: Record<string, ExcelField> = {
  ...Object.fromEntries(
    FIELD_KEYS.map((key) => [normalizeHeader(EXCEL_HEADERS[key]), key]),
  ),
  ...Object.fromEntries(FIELD_KEYS.map((key) => [normalizeHeader(key), key])),
  villagename: "villageName",
  "name of village": "villageName",
  "area of the village": "area",
  "area of village": "area",
  "no of people likely affected": "peopleLikelyAffected",
  "number of people likely affected": "peopleLikelyAffected",
  "people affected": "peopleLikelyAffected",
  "vulnerability level": "vulnerability",
  "revenue circle": "revenueCircle",
  "fulfiliment status": "fulfillmentStatus",
  "unmet needs": "unmetNeeds",
  "last relief delivered": "lastReliefDelivered",
};

const COLUMN_LETTERS: Record<ExcelField, string> = {
  villageName: "A",
  area: "B",
  peopleLikelyAffected: "C",
  vulnerability: "D",
  revenueCircle: "E",
  district: "F",
  fulfillmentStatus: "G",
  unmetNeeds: "H",
  lastReliefDelivered: "I",
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function cellString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return String(value).trim();
}

function indexToColumnLetter(index: number): string {
  let n = index + 1;
  let letter = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function makeError(
  row: number,
  field: ExcelField,
  value: string,
  detail: string,
  columnByField?: Partial<Record<ExcelField, string>>,
): ValidationError {
  const label =
    field === "vulnerability"
      ? "vulnerability level"
      : EXCEL_HEADERS[field].toLowerCase();
  const column = columnByField?.[field] ?? COLUMN_LETTERS[field];

  return {
    row,
    column,
    field,
    value,
    message: `row ${row} invalid ${label}${value ? ` ${value}` : ""}${
      detail ? ` — ${detail}` : ""
    }`,
  };
}

function parsePeopleAffected(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/,/g, "");
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num < 0) {
    return Number.NaN;
  }
  return Math.round(num);
}

function isAllowed(
  value: string,
  allowed: readonly string[],
): boolean {
  return allowed.some((item) => item.toLowerCase() === value.toLowerCase());
}

function canonicalize(
  value: string,
  allowed: readonly string[],
): string {
  const match = allowed.find((item) => item.toLowerCase() === value.toLowerCase());
  return match ?? value;
}

export function validateVillageRows(
  rows: Array<Partial<Record<ExcelField, unknown>>>,
  options?: {
    excelRowOffset?: number;
    columnByField?: Partial<Record<ExcelField, string>>;
  },
): { validRows: VillageReliefRow[]; errors: ValidationError[] } {
  const excelRowOffset = options?.excelRowOffset ?? 2;
  const columnByField = options?.columnByField;
  const errors: ValidationError[] = [];
  const validRows: VillageReliefRow[] = [];

  rows.forEach((raw, index) => {
    const excelRow = index + excelRowOffset;
    const villageName = cellString(raw.villageName);
    const revenueCircle = cellString(raw.revenueCircle);
    const area = cellString(raw.area);
    const vulnerability = cellString(raw.vulnerability);
    const district = cellString(raw.district);
    const fulfillmentStatus = cellString(raw.fulfillmentStatus);
    const unmetNeeds = cellString(raw.unmetNeeds);
    const lastReliefDelivered = cellString(raw.lastReliefDelivered);
    const peopleRaw = cellString(raw.peopleLikelyAffected);
    const peopleLikelyAffected = parsePeopleAffected(peopleRaw);

    let rowHasError = false;

    if (!villageName) {
      errors.push(
        makeError(
          excelRow,
          "villageName",
          villageName,
          "village name is mandatory",
          columnByField,
        ),
      );
      rowHasError = true;
    }

    if (!revenueCircle) {
      errors.push(
        makeError(
          excelRow,
          "revenueCircle",
          revenueCircle,
          "revenue circle is mandatory",
          columnByField,
        ),
      );
      rowHasError = true;
    }

    if (peopleRaw && Number.isNaN(peopleLikelyAffected)) {
      errors.push(
        makeError(
          excelRow,
          "peopleLikelyAffected",
          peopleRaw,
          "must be a non-negative number",
          columnByField,
        ),
      );
      rowHasError = true;
    }

    if (vulnerability && !isAllowed(vulnerability, VULNERABILITY_LEVELS)) {
      errors.push(
        makeError(
          excelRow,
          "vulnerability",
          vulnerability,
          `allowed: ${VULNERABILITY_LEVELS.join(", ")}`,
          columnByField,
        ),
      );
      rowHasError = true;
    }

    if (fulfillmentStatus && !isAllowed(fulfillmentStatus, FULFILLMENT_STATUSES)) {
      errors.push(
        makeError(
          excelRow,
          "fulfillmentStatus",
          fulfillmentStatus,
          `allowed: ${FULFILLMENT_STATUSES.join(", ")}`,
          columnByField,
        ),
      );
      rowHasError = true;
    }

    if (rowHasError) {
      return;
    }

    validRows.push({
      id: `upload-${excelRow}-${Date.now()}-${index}`,
      villageName,
      area,
      peopleLikelyAffected:
        peopleLikelyAffected == null || Number.isNaN(peopleLikelyAffected)
          ? null
          : peopleLikelyAffected,
      vulnerability: vulnerability
        ? canonicalize(vulnerability, VULNERABILITY_LEVELS)
        : "",
      revenueCircle,
      district,
      fulfillmentStatus: fulfillmentStatus
        ? canonicalize(fulfillmentStatus, FULFILLMENT_STATUSES)
        : "",
      unmetNeeds,
      lastReliefDelivered,
    });
  });

  return { validRows, errors };
}

export function parseExcelFile(file: ArrayBuffer): {
  validRows: VillageReliefRow[];
  errors: ValidationError[];
} {
  const workbook = XLSX.read(file, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return {
      validRows: [],
      errors: [
        {
          row: 1,
          column: "A",
          field: "villageName",
          value: "",
          message: "row 1 column A invalid file — workbook has no sheets",
        },
      ],
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (matrix.length === 0) {
    return {
      validRows: [],
      errors: [
        {
          row: 1,
          column: "A",
          field: "villageName",
          value: "",
          message: "row 1 column A invalid file — sheet is empty",
        },
      ],
    };
  }

  const headerRow = (matrix[0] ?? []).map((cell) => cellString(cell));
  const fieldByIndex: Array<ExcelField | null> = headerRow.map((header) => {
    if (!header) return null;
    return HEADER_ALIASES[normalizeHeader(header)] ?? null;
  });

  const columnByField: Partial<Record<ExcelField, string>> = {};
  fieldByIndex.forEach((field, colIndex) => {
    if (field && !columnByField[field]) {
      columnByField[field] = indexToColumnLetter(colIndex);
    }
  });

  const hasVillage = fieldByIndex.includes("villageName");
  const hasCircle = fieldByIndex.includes("revenueCircle");

  if (!hasVillage || !hasCircle) {
    const missing = [
      !hasVillage ? "Village Name" : null,
      !hasCircle ? "Revenue Circle" : null,
    ]
      .filter(Boolean)
      .join(" and ");

    return {
      validRows: [],
      errors: [
        {
          row: 1,
          column: "A",
          field: "villageName",
          value: headerRow.join(", "),
          message: `row 1 invalid header — missing mandatory column(s): ${missing}`,
        },
      ],
    };
  }

  const dataRows: Array<Partial<Record<ExcelField, unknown>>> = [];

  for (let i = 1; i < matrix.length; i += 1) {
    const excelRow = matrix[i] ?? [];
    const isBlank = excelRow.every((cell) => cellString(cell) === "");
    if (isBlank) continue;

    const mapped: Partial<Record<ExcelField, unknown>> = {};
    fieldByIndex.forEach((field, colIndex) => {
      if (!field) return;
      mapped[field] = excelRow[colIndex] ?? "";
    });
    dataRows.push(mapped);
  }

  if (dataRows.length === 0) {
    return {
      validRows: [],
      errors: [
        {
          row: 2,
          column: columnByField.villageName ?? "A",
          field: "villageName",
          value: "",
          message: "row 2 invalid file — no data rows found",
        },
      ],
    };
  }

  return validateVillageRows(dataRows, { excelRowOffset: 2, columnByField });
}

export function exportVillagesToExcel(
  rows: VillageReliefRow[],
  filename = "village-relief-data.xlsx",
): void {
  const sheetRows = rows.map((row) => ({
    [EXCEL_HEADERS.villageName]: row.villageName,
    [EXCEL_HEADERS.area]: row.area,
    [EXCEL_HEADERS.peopleLikelyAffected]: row.peopleLikelyAffected ?? "",
    [EXCEL_HEADERS.vulnerability]: row.vulnerability,
    [EXCEL_HEADERS.revenueCircle]: row.revenueCircle,
    [EXCEL_HEADERS.district]: row.district,
    [EXCEL_HEADERS.fulfillmentStatus]: row.fulfillmentStatus,
    [EXCEL_HEADERS.unmetNeeds]: row.unmetNeeds,
    [EXCEL_HEADERS.lastReliefDelivered]: row.lastReliefDelivered,
  }));

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Villages");
  XLSX.writeFile(workbook, filename);
}

export function downloadTemplate(): void {
  exportVillagesToExcel(
    [
      {
        id: "template",
        villageName: "Example Village",
        area: "10 sq km",
        peopleLikelyAffected: 1000,
        vulnerability: "High",
        revenueCircle: "Example Circle",
        district: "Example District",
        fulfillmentStatus: "Pending",
        unmetNeeds: "Water, shelter",
        lastReliefDelivered: "2026-07-01",
      },
    ],
    "village-relief-template.xlsx",
  );
}
