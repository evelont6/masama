const money = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

export function assignedPeople(itemId, assignments, people) {
  const valid = [...new Set((Array.isArray(assignments[itemId]) ? assignments[itemId] : []).filter(id => people.some(p => p.id === id)))];
  return valid.length ? valid : people.map(p => p.id);
}

export function calculateBill({ items, people, assignments, taxMode, taxValue, serviceMode, serviceValue, discountValue }) {
  const computedSubtotal = items.reduce((sum, it) => sum + (money(it.price)), 0);
  const taxAmount = taxMode === "percent" ? (computedSubtotal * (money(taxValue))) / 100 : money(taxValue);
  const serviceAmount =
    serviceMode === "percent" ? (computedSubtotal * (money(serviceValue))) / 100 : money(serviceValue);
  const discount = Math.min(Math.max(0, money(discountValue)), computedSubtotal + taxAmount + serviceAmount);
  const grandTotal = computedSubtotal + taxAmount + serviceAmount - discount;

  const perPerson = (() => {
    if (people.length === 0) return [];
    const raw = {};
    people.forEach((p) => (raw[p.id] = 0));
    items.forEach((it) => {
      const assigned = assignedPeople(it.id, assignments, people);
      if (assigned.length === 0) return;
      const share = (money(it.price)) / assigned.length;
      assigned.forEach((pid) => {
        if (raw[pid] !== undefined) raw[pid] += share;
      });
    });
    const extra = taxAmount + serviceAmount - discount;
    const totalRaw = computedSubtotal;
    const results = people.map((p) => {
      const subtotalShare = raw[p.id] || 0;
      const extraShare = totalRaw > 0 ? (subtotalShare / totalRaw) * extra : extra / people.length;
      const breakdown = items
        .map((it) => {
          const assigned = assignedPeople(it.id, assignments, people);
          if (!assigned.includes(p.id)) return null;
          return {
            id: it.id,
            name: it.name || "Item",
            totalPrice: money(it.price),
            share: money(it.price) / assigned.length,
            splitCount: assigned.length,
          };
        })
        .filter(Boolean);
      const ratio = totalRaw > 0 ? subtotalShare / totalRaw : 1 / people.length;
      const taxShare = taxAmount * ratio;
      const serviceShare = serviceAmount * ratio;
      const discountShare = discount * ratio;
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        subtotalShare,
        extraShare,
        taxShare,
        serviceShare,
        discountShare,
        exact: subtotalShare + extraShare,
        breakdown,
      };
    });
    const rounded = results.map((r) => ({ ...r, amount: Math.floor(Math.max(0, r.exact)) }));
    const roundedSum = rounded.reduce((s, r) => s + r.amount, 0);
    const target = Math.round(grandTotal);
    const diff = target - roundedSum;
    const order = rounded.map((r, i) => ({ i, fraction: r.exact - r.amount })).sort((a, b) => b.fraction - a.fraction);
    for (let i = 0; i < diff; i++) rounded[order[i % order.length].i].amount += 1;
    return rounded;
  })();

  return { computedSubtotal, taxAmount, serviceAmount, discount, grandTotal, perPerson };
}
