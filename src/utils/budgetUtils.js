export function isConcludedStatus(status) {
  if (!status) return false;
  return ["Completed", "Cancelled", "Archived", "Completed (Surplus Returned)", "Completed Early"].includes(status)
    || String(status).includes("Returned");
}

export function migrateEventGroups(budget) {
  if (!budget) return [];

  if (Array.isArray(budget.eventGroups) && budget.eventGroups.length > 0) {
    return budget.eventGroups.map(group => ({
      name: String(group.name || "").trim(),
      pax: toNonNegativeNumber(group.pax),
      startDate: String(group.startDate || ""),
      endDate: String(group.endDate || ""),
      rate: toNonNegativeNumber(group.rate)
    }));
  }

  const main = {
    name: String(budget.orgName || "").split(",")[0].trim(),
    pax: toNonNegativeNumber(budget.pax),
    startDate: String(budget.startDate || ""),
    endDate: String(budget.endDate || ""),
    rate: toNonNegativeNumber(budget.conferenceRate)
  };

  const subGroups = Array.isArray(budget.subGroups)
    ? budget.subGroups.map(group => ({
        name: String(group.orgName || "").trim(),
        pax: toNonNegativeNumber(group.pax),
        startDate: String(group.startDate || ""),
        endDate: String(group.endDate || ""),
        rate: toNonNegativeNumber(group.conferenceRate)
      }))
    : [];

  return [main, ...subGroups];
}

export function toNonNegativeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

export function calculateGroupDays(startDate, endDate) {
  if (!startDate || !endDate) return 1;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const days = Math.round((end - start) / 86400000) + 1;
  return days > 0 ? days : 1;
}

export function getBudgetDetails(budget) {
  const groups = migrateEventGroups(budget);
  const totalPax = groups.reduce((total, group) => total + toNonNegativeNumber(group.pax), 0);
  const totalWorkshopAmount = groups.reduce((total, group) =>
    total + toNonNegativeNumber(group.pax) * toNonNegativeNumber(group.rate) * calculateGroupDays(group.startDate, group.endDate), 0);
  const starts = groups.map(group => group.startDate).filter(Boolean).sort();
  const ends = groups.map(group => group.endDate).filter(Boolean).sort();
  const days = groups.reduce((total, group) => total + calculateGroupDays(group.startDate, group.endDate), 0);

  return {
    groups,
    totalPax,
    totalWorkshopAmount,
    days,
    startDate: starts[0] || "",
    endDate: ends[ends.length - 1] || ""
  };
}
