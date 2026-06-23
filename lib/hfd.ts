/**
 * HFD ERP delivery service integration
 * API docs: https://api.hfd.co.il/docs
 */

const HFD_BASE = process.env.HFD_API_URL || "https://api.hfd.co.il/rest/v2";
const HFD_TOKEN = process.env.HFD_TOKEN || "";
const HFD_CLIENT_NUMBER = Number(process.env.HFD_CLIENT_NUMBER || 0);
const HFD_SHIPMENT_TYPE_CODE = Number(process.env.HFD_SHIPMENT_TYPE_CODE || 0);
const HFD_EPOST_SHIPMENT_TYPE_CODE = Number(process.env.HFD_EPOST_SHIPMENT_TYPE_CODE || process.env.HFD_SHIPMENT_TYPE_CODE || 0);
const HFD_STAGE_CODE = Number(process.env.HFD_STAGE_CODE || 0);
const HFD_CARGO_TYPE = Number(process.env.HFD_CARGO_TYPE || 0);
const HFD_EPOST_CARGO_TYPE = Number(process.env.HFD_EPOST_CARGO_TYPE || process.env.HFD_CARGO_TYPE || 0);
const HFD_ORDERER_NAME = process.env.HFD_ORDERER_NAME || "SWEBO";

function headers() {
  return {
    "Content-Type": "application/json",
    ...(HFD_TOKEN ? { Authorization: `Bearer ${HFD_TOKEN}` } : {}),
  };
}

export interface HFDShipmentResult {
  shipmentNumber: number;
  randNumber: string;
  referenceNumber1: string;
  referenceNumber2: string;
  errorCode: string;
  errorMessage: string;
  existingShipmentNumber: number;
}

export interface HFDTrackingResult {
  ship_no: string;
  consignee_name: string;
  destination_city: string;
  destination_street: string;
  destination_home: string;
  ship_delivered_yn: string;
  ship_canceled_yn: string;
  shipment_type_name: string;
  due_date: string;
  status: Array<{
    status_code: string;
    status_desc: string;
    status_date: string;
    status_time: string;
  }>;
}

/**
 * Create a new delivery shipment in HFD.
 * Returns the result object (check errorCode === "0" for success).
 */
export async function createHFDShipment(order: {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  city: string;
  total: number;
  pudoCodeDestination?: number;
  isEpost?: boolean;
}): Promise<HFDShipmentResult | null> {
  if (!HFD_CLIENT_NUMBER) return null; // Not configured

  const isEpost = order.isEpost ?? !!order.pudoCodeDestination;

  // Parse address — street name and house number may be combined or separate
  const addressParts = order.address.split(",")[0].trim();
  const houseMatch = addressParts.match(/\s+(\d+\w*)$/);
  const streetName = houseMatch ? addressParts.slice(0, houseMatch.index) : addressParts;
  const houseNum = houseMatch ? houseMatch[1] : "";

  const payload = {
    clientNumber: HFD_CLIENT_NUMBER,
    mesiraIsuf: "מסירה",
    shipmentTypeCode: isEpost ? HFD_EPOST_SHIPMENT_TYPE_CODE : HFD_SHIPMENT_TYPE_CODE,
    stageCode: HFD_STAGE_CODE,
    ordererName: HFD_ORDERER_NAME,
    cargoTypeHaloch: isEpost ? HFD_EPOST_CARGO_TYPE : HFD_CARGO_TYPE,
    cargoTypeHazor: 0,
    packsHaloch: "1",
    packsHazor: 0,
    nameTo: order.customerName.slice(0, 20),
    cityCode: "",
    cityName: order.city,
    streetCode: "",
    streetName: isEpost ? "" : streetName.slice(0, 30),
    houseNum: isEpost ? "" : houseNum.slice(0, 5),
    entrance: "",
    floor: "",
    apartment: "",
    telFirst: order.customerPhone.replace(/\D/g, "").slice(0, 20),
    telSecond: "",
    addressRemarks: "",
    shipmentRemarks: `הזמנה #${order.id.slice(-6).toUpperCase()}`,
    referenceNum1: order.id.slice(-12),
    referenceNum2: "",
    futureDate: "",
    futureTime: "",
    pudoCodeOrigin: 0,
    pudoCodeDestination: order.pudoCodeDestination ?? 0,
    autoBindPudo: isEpost ? "Y" : "N",
    email: order.customerEmail.slice(0, 100),
    productsPrice: order.total,
    productPriceCurrency: "ILS",
    shipmentWeight: 500,
    govina: { code: 0, sum: 0, date: "", remarks: "" },
  };

  try {
    console.log("[HFD] createShipment payload", JSON.stringify({ ...payload, clientNumber: "***", email: "***" }));
    const res = await fetch(`${HFD_BASE}/shipments/create`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("[HFD] createShipment HTTP error", res.status, text);
      return null;
    }
    const result = JSON.parse(text) as HFDShipmentResult;
    if (result.errorCode !== "0") {
      console.error("[HFD] createShipment API error", result.errorCode, result.errorMessage, "| payload:", JSON.stringify({ shipmentTypeCode: payload.shipmentTypeCode, cargoTypeHaloch: payload.cargoTypeHaloch, pudoCodeDestination: payload.pudoCodeDestination, autoBindPudo: payload.autoBindPudo }));
    }
    return result;
  } catch (err) {
    console.error("[HFD] createShipment error", err);
    return null;
  }
}

/**
 * Get tracking information for a shipment.
 */
export async function getHFDTracking(shipmentNumber: string): Promise<HFDTrackingResult | null> {
  try {
    const res = await fetch(`${HFD_BASE}/shipments/${shipmentNumber}`, {
      headers: headers(),
    });
    if (!res.ok) return null;
    return await res.json() as HFDTrackingResult;
  } catch {
    return null;
  }
}

/**
 * Cancel a shipment (only possible before driver pickup).
 */
export async function cancelHFDShipment(randId: string): Promise<{ status: string; status_desc: string } | null> {
  try {
    const res = await fetch(`${HFD_BASE}/shipments/${randId}`, {
      method: "DELETE",
      headers: headers(),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Returns the URL to download a shipping label PDF.
 */
export function getHFDLabelUrl(shipmentNumber: string): string {
  return `${HFD_BASE}/shipments/${shipmentNumber}/label`;
}
