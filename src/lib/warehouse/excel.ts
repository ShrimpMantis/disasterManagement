import * as XLSX from "xlsx";
import { hydrateWarehouse, isWarehouseFacilityType } from "@/lib/warehouse/model";
import type {
  WarehouseFacilityType,
  WarehouseLocation,
  WarehouseStatus,
} from "@/types/warehouseModule";
import { FACILITY_TYPE_LABELS, WAREHOUSE_STATUS_LABELS } from "@/types/warehouseModule";

const EXPORT_HEADERS = [
  "warehouseId",
  "warehouseName",
  "facilityType",
  "district",
  "revenueCircle",
  "villageTown",
  "address",
  "lat",
  "lng",
  "ownerName",
  "pointOfContactName",
  "pointOfContactPhone",
  "totalCapacityTons",
  "currentStockTons",
  "outstandingCapacityTons",
  "fillPercentage",
  "capacityStatus",
  "lastAuditedTimestamp",
] as const;

export type WarehouseExcelParseError = {
  row: number;
  field: string;
  value: string;
  message: string;
};

export type WarehouseExcelParseResult = {
  warehouses: WarehouseLocation[];
  errors: WarehouseExcelParseError[];
};

function cellString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function cellNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(cellString(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeFacilityType(raw: string): WarehouseFacilityType | null {
  const value = raw.trim();
  if (isWarehouseFacilityType(value)) return value;
  const upper = value.toUpperCase().replace(/\s+/g, "_");
  if (isWarehouseFacilityType(upper)) return upper;
  const byLabel = (
    Object.entries(FACILITY_TYPE_LABELS) as Array<[WarehouseFacilityType, string]>
  ).find(([, label]) => label.toLowerCase() === value.toLowerCase());
  return byLabel?.[0] ?? null;
}

function normalizeStatus(raw: string): WarehouseStatus | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  const upper = value.toUpperCase().replace(/[\s/-]+/g, "_");
  const statuses: WarehouseStatus[] = [
    "EMPTY",
    "PARTIALLY_FILLED",
    "NEAR_CAPACITY",
    "FULL",
    "OFFLINE_FLOODED",
  ];
  if (statuses.includes(upper as WarehouseStatus)) {
    return upper as WarehouseStatus;
  }
  const byLabel = (
    Object.entries(WAREHOUSE_STATUS_LABELS) as Array<[WarehouseStatus, string]>
  ).find(([, label]) => label.toLowerCase() === value.toLowerCase());
  return byLabel?.[0];
}

export function exportWarehousesToExcel(
  warehouses: WarehouseLocation[],
  filename = "warehouse-directory.xlsx",
): string {
  const rows = warehouses.map((entry) => ({
    warehouseId: entry.warehouseId,
    warehouseName: entry.warehouseName,
    facilityType: entry.facilityType,
    district: entry.district,
    revenueCircle: entry.revenueCircle,
    villageTown: entry.villageTown,
    address: entry.address,
    lat: entry.coordinates.lat,
    lng: entry.coordinates.lng,
    ownerName: entry.ownerName,
    pointOfContactName: entry.pointOfContactName,
    pointOfContactPhone: entry.pointOfContactPhone,
    totalCapacityTons: entry.totalCapacityTons,
    currentStockTons: entry.currentStockTons,
    outstandingCapacityTons: entry.outstandingCapacityTons,
    fillPercentage: entry.fillPercentage,
    capacityStatus: entry.capacityStatus,
    lastAuditedTimestamp: entry.lastAuditedTimestamp,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: [...EXPORT_HEADERS],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Warehouses");
  XLSX.writeFile(workbook, filename);
  return filename;
}

export async function parseWarehouseExcelFile(
  buffer: ArrayBuffer,
): Promise<WarehouseExcelParseResult> {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      warehouses: [],
      errors: [
        {
          row: 1,
          field: "sheet",
          value: "",
          message: "Workbook has no sheets.",
        },
      ],
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  const warehouses: WarehouseLocation[] = [];
  const errors: WarehouseExcelParseError[] = [];

  matrix.forEach((row, index) => {
    const excelRow = index + 2;
    const warehouseName = cellString(
      row.warehouseName ?? row["Warehouse Name"] ?? row.Name,
    );
    const district = cellString(row.district ?? row.District);
    const revenueCircle = cellString(
      row.revenueCircle ?? row["Revenue Circle"] ?? row.Circle,
    );
    const villageTown = cellString(
      row.villageTown ?? row["Village / Town"] ?? row.Village ?? row.Town,
    );
    const address = cellString(row.address ?? row.Address);
    const ownerName = cellString(row.ownerName ?? row.Owner ?? row["Owner Name"]);
    const pointOfContactName = cellString(
      row.pointOfContactName ?? row.POC ?? row["POC Name"] ?? row.Contact,
    );
    const pointOfContactPhone = cellString(
      row.pointOfContactPhone ?? row.Phone ?? row["POC Phone"],
    );
    const facilityType = normalizeFacilityType(
      cellString(row.facilityType ?? row["Facility Type"] ?? row.Type),
    );
    const lat = cellNumber(row.lat ?? row.Latitude ?? row.latitude);
    const lng = cellNumber(row.lng ?? row.Longitude ?? row.longitude);
    const totalCapacityTons = cellNumber(
      row.totalCapacityTons ?? row["Total Capacity (MT)"] ?? row.Capacity,
    );
    const currentStockTons = cellNumber(
      row.currentStockTons ?? row["Current Stock (MT)"] ?? row.Stock,
    );
    const warehouseId =
      cellString(row.warehouseId ?? row["Warehouse ID"] ?? row.ID) ||
      `wh-upload-${Date.now()}-${index}`;

    const required: Array<[string, string]> = [
      ["warehouseName", warehouseName],
      ["district", district],
      ["revenueCircle", revenueCircle],
      ["villageTown", villageTown],
      ["address", address],
      ["ownerName", ownerName],
      ["pointOfContactName", pointOfContactName],
      ["pointOfContactPhone", pointOfContactPhone],
    ];

    for (const [field, value] of required) {
      if (!value) {
        errors.push({
          row: excelRow,
          field,
          value: "",
          message: `Row ${excelRow}: ${field} is required.`,
        });
      }
    }

    if (!facilityType) {
      errors.push({
        row: excelRow,
        field: "facilityType",
        value: cellString(row.facilityType),
        message: `Row ${excelRow}: facilityType must be CENTRAL_HUB, FIELD_STAGING, or TEMPORARY_SHELTER.`,
      });
    }
    if (lat === null || lng === null) {
      errors.push({
        row: excelRow,
        field: "coordinates",
        value: `${cellString(row.lat)},${cellString(row.lng)}`,
        message: `Row ${excelRow}: lat and lng are required numbers.`,
      });
    }
    if (totalCapacityTons === null || totalCapacityTons < 0) {
      errors.push({
        row: excelRow,
        field: "totalCapacityTons",
        value: cellString(row.totalCapacityTons),
        message: `Row ${excelRow}: totalCapacityTons must be a non-negative number.`,
      });
    }
    if (currentStockTons === null || currentStockTons < 0) {
      errors.push({
        row: excelRow,
        field: "currentStockTons",
        value: cellString(row.currentStockTons),
        message: `Row ${excelRow}: currentStockTons must be a non-negative number.`,
      });
    }

    if (
      !warehouseName ||
      !district ||
      !revenueCircle ||
      !villageTown ||
      !address ||
      !ownerName ||
      !pointOfContactName ||
      !pointOfContactPhone ||
      !facilityType ||
      lat === null ||
      lng === null ||
      totalCapacityTons === null ||
      currentStockTons === null
    ) {
      return;
    }

    const capacityStatus = normalizeStatus(
      cellString(row.capacityStatus ?? row.Status),
    );

    warehouses.push(
      hydrateWarehouse({
        warehouseId,
        warehouseName,
        facilityType,
        district,
        revenueCircle,
        villageTown,
        address,
        coordinates: { lat, lng },
        ownerName,
        pointOfContactName,
        pointOfContactPhone,
        totalCapacityTons,
        currentStockTons,
        capacityStatus:
          capacityStatus === "OFFLINE_FLOODED" ? "OFFLINE_FLOODED" : undefined,
        lastAuditedTimestamp:
          cellString(row.lastAuditedTimestamp) || new Date().toISOString(),
      }),
    );
  });

  return { warehouses, errors };
}
