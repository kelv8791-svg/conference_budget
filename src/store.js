export const DEFAULT_INVENTORY = [
  // BUTCHERY
  { id: "B01", cat: "BUTCHERY", name: "BEEF CHOMA SAUSAGE", unit: "KG", price: 650, stock: 50 },
  { id: "B02", cat: "BUTCHERY", name: "BEEF FILLET", unit: "KG", price: 900, stock: 30 },
  { id: "B03", cat: "BUTCHERY", name: "CHICKEN BROILER", unit: "PCS", price: 500, stock: 100 },
  { id: "B04", cat: "BUTCHERY", name: "MINCED MEAT", unit: "KG", price: 750, stock: 25 },
  { id: "B05", cat: "BUTCHERY", name: "PORK CHOPS", unit: "KG", price: 850, stock: 20 },
  { id: "B06", cat: "BUTCHERY", name: "LAMB CHOPS", unit: "KG", price: 1200, stock: 15 },
  { id: "B07", cat: "BUTCHERY", name: "BACON", unit: "PKT", price: 450, stock: 40 },
  { id: "B08", cat: "BUTCHERY", name: "GOAT MEAT", unit: "KG", price: 800, stock: 35 },

  // FRUITS
  { id: "F01", cat: "FRUITS", name: "PAWPAW", unit: "PCS", price: 80, stock: 60 },
  { id: "F02", cat: "FRUITS", name: "WATERMELON", unit: "PCS", price: 250, stock: 20 },
  { id: "F03", cat: "FRUITS", name: "BANANAS (RIPE)", unit: "CRATE", price: 1200, stock: 5 },
  { id: "F04", cat: "FRUITS", name: "ORANGES", unit: "NET", price: 800, stock: 10 },
  { id: "F05", cat: "FRUITS", name: "PINEAPPLES", unit: "PCS", price: 150, stock: 30 },
  { id: "F06", cat: "FRUITS", name: "APPLES", unit: "KG", price: 350, stock: 25 },
  { id: "F07", cat: "FRUITS", name: "MANGOES", unit: "PCS", price: 50, stock: 80 },

  // VEGETABLES
  { id: "V01", cat: "VEGETABLES", name: "CABBAGES", unit: "PCS", price: 60, stock: 100 },
  { id: "V02", cat: "VEGETABLES", name: "TOMATOES", unit: "CRATE", price: 4500, stock: 3 },
  { id: "V03", cat: "VEGETABLES", name: "ONIONS", unit: "NET", price: 1800, stock: 5 },
  { id: "V04", cat: "VEGETABLES", name: "CARROTS", unit: "BAG", price: 2500, stock: 2 },
  { id: "V05", cat: "VEGETABLES", name: "GREEN PEAS", unit: "KG", price: 200, stock: 40 },
  { id: "V06", cat: "VEGETABLES", name: "POTATOES (IRISH)", unit: "BAG", price: 3500, stock: 8 },
  { id: "V07", cat: "VEGETABLES", name: "SPINACH", unit: "BUNCH", price: 30, stock: 150 },
  { id: "V08", cat: "VEGETABLES", name: "DANANIA", unit: "BUNCH", price: 20, stock: 200 },

  // SUPERMARKET
  { id: "SM01", cat: "SUPERMARKET", name: "AJINO MOTO", unit: "PCS", price: 350, stock: 12 },
  { id: "SM02", cat: "SUPERMARKET", name: "COOKING OIL", unit: "LTR", price: 320, stock: 100 },
  { id: "SM03", cat: "SUPERMARKET", name: "RICE (BASMATI)", unit: "KG", price: 250, stock: 200 },
  { id: "SM04", cat: "SUPERMARKET", name: "SALT", unit: "PKT", price: 40, stock: 50 },
  { id: "SM05", cat: "SUPERMARKET", name: "SUGAR", unit: "KG", price: 180, stock: 150 },
  { id: "SM06", cat: "SUPERMARKET", name: "TEA LEAVES", unit: "PKT", price: 120, stock: 80 },
  { id: "SM07", cat: "SUPERMARKET", name: "COFFEE", unit: "TIN", price: 650, stock: 30 },
  { id: "SM08", cat: "SUPERMARKET", name: "FLOUR (WHEAT)", unit: "BALE", price: 1950, stock: 10 },
  { id: "SM09", cat: "SUPERMARKET", name: "FLOUR (MAIZE)", unit: "BALE", price: 1600, stock: 15 },

  // SUPPLEMENTARIES
  { id: "S01", cat: "SUPPLEMENTARIES", name: "MILK", unit: "LTR", price: 70, stock: 120 },
  { id: "S02", cat: "SUPPLEMENTARIES", name: "YOGURT", unit: "LTR", price: 250, stock: 40 },
  { id: "S03", cat: "SUPPLEMENTARIES", name: "EGGS", unit: "TRAY", price: 600, stock: 20 },
  { id: "S04", cat: "SUPPLEMENTARIES", name: "CHEESE", unit: "KG", price: 1500, stock: 5 },
  { id: "S05", cat: "SUPPLEMENTARIES", name: "BUTTER", unit: "PCS", price: 450, stock: 25 },
];

export const CATEGORY_COLORS = {
  BUTCHERY: { color: "#7C3AED", bg: "#F5F3FF" },
  FRUITS: { color: "#059669", bg: "#ECFDF5" },
  VEGETABLES: { color: "#16A34A", bg: "#F0FDF4" },
  SUPERMARKET: { color: "#2563EB", bg: "#EFF6FF" },
  SUPPLEMENTARIES: { color: "#D97706", bg: "#FFFBEB" }
};

/**
 * Normalizes item properties and merges duplicates based on ID or Name+Category.
 */
export function cleanAndMergeInventory(inventory) {
  if (!Array.isArray(inventory) || inventory.length === 0) {
    return DEFAULT_INVENTORY;
  }

  const map = new Map();

  for (const rawItem of inventory) {
    if (!rawItem || typeof rawItem !== 'object') continue;

    const cleanId = String(rawItem.id || '').trim().toUpperCase();
    const cleanName = String(rawItem.name || '').trim().toUpperCase();
    const cleanCat = String(rawItem.cat || 'SUPERMARKET').trim().toUpperCase();
    const cleanUnit = String(rawItem.unit || 'PCS').trim().toUpperCase();
    const numPrice = Number(rawItem.price) || 0;
    const numStock = Number(rawItem.stock) || 0;

    if (!cleanName && !cleanId) continue;

    // Deduplication Key: Priority by ID if valid, otherwise by Name+Cat
    const key = cleanId ? `ID:${cleanId}` : `NAME:${cleanCat}:${cleanName}`;

    if (map.has(key)) {
      const existing = map.get(key);
      // Merge stock and update price if existing is 0
      map.set(key, {
        ...existing,
        name: rawItem.name ? rawItem.name.trim() : existing.name,
        price: numPrice > 0 ? numPrice : existing.price,
        stock: (existing.stock || 0) + numStock,
        unit: cleanUnit || existing.unit
      });
    } else {
      // Check if another item has the exact same name under the same category under a different key
      const nameKey = `NAME:${cleanCat}:${cleanName}`;
      if (cleanName && map.has(nameKey)) {
        const existing = map.get(nameKey);
        map.set(nameKey, {
          ...existing,
          price: numPrice > 0 ? numPrice : existing.price,
          stock: (existing.stock || 0) + numStock,
          unit: cleanUnit || existing.unit
        });
      } else {
        const itemObj = {
          id: cleanId || `ITEM_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          cat: cleanCat,
          name: rawItem.name ? rawItem.name.trim() : cleanName,
          unit: cleanUnit,
          price: numPrice,
          stock: numStock
        };
        map.set(key, itemObj);
        if (cleanName) {
          map.set(nameKey, itemObj);
        }
      }
    }
  }

  // Filter out redundant name keys and return unique array
  return Array.from(new Set(map.values()));
}


