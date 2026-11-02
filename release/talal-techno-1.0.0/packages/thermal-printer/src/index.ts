/**
 * ESC/POS thermal printing facade.
 *
 * The default transport is an in-memory mock. A production deployment can add
 * a network transport (port 9100), USB or Bluetooth driver without changing
 * the ticket builders. Arabic code pages differ per printer and must be
 * validated against the exact hardware model.
 */
import {
  MockTransport,
  buildKitchenTicket,
  buildReceipt,
  printKitchen,
  printReceipt,
  stripControlBytes,
  toEscPos
} from '@talaltechno/domain';
import type { Invoice } from '@talaltechno/domain';

export {
  MockTransport,
  buildKitchenTicket,
  buildReceipt,
  printKitchen,
  printReceipt,
  stripControlBytes,
  toEscPos
};

export interface PrinterSettings {
  name?: string;
  width?: number;
  footer?: string;
  openDrawer?: boolean;
  store?: {
    name?: string;
    branch?: string;
    vatNumber?: string;
    phone?: string;
  };
}

export interface PrintResult {
  id: string;
  kind: string;
  number: string;
  printer: string;
  bytes: number;
  text: string;
  createdAt: string;
}

export class EscPosPrinter {
  readonly transport: MockTransport;
  private settings: PrinterSettings;

  constructor(settings: PrinterSettings = {}) {
    this.settings = settings;
    this.transport = new MockTransport();
  }

  configure(settings: PrinterSettings): void {
    this.settings = { ...this.settings, ...settings };
  }

  printReceipt(invoice: Invoice): PrintResult {
    return printReceipt(invoice, this.settings as Record<string, unknown>, this.transport) as PrintResult;
  }

  printKitchen(order: Record<string, unknown>): PrintResult {
    return printKitchen(order, this.settings as Record<string, unknown>, this.transport) as PrintResult;
  }

  jobs(): PrintResult[] {
    return this.transport.jobs as PrintResult[];
  }

  last(): PrintResult | null {
    return this.transport.last() as PrintResult | null;
  }
}
