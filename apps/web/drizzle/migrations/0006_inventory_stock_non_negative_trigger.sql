-- Migration: 0006_inventory_stock_non_negative_trigger
-- Purpose: Prevent onHandQty from going negative via database trigger,
--          ensuring checkout batch transactions roll back on race-condition oversell.

CREATE TRIGGER IF NOT EXISTS trg_inventory_stock_non_negative
BEFORE UPDATE ON inventoryStock
FOR EACH ROW
WHEN NEW.onHandQty < 0 OR NEW.availableQty < 0
BEGIN
    SELECT RAISE(ABORT, 'Insufficient stock: onHandQty would go negative');
END;
